#!/usr/bin/env python3
"""
Enhanced Lock Manager for Multi-Agent Coordination
Provides robust lock management with recovery mechanisms
"""

import json
import time
import subprocess
from pathlib import Path
from datetime import datetime


class EnhancedLockManager:
    def __init__(self, coordination_dir=".claude-work"):
        self.base_dir = Path(coordination_dir)
        self.locks_dir = self.base_dir / "locks"
        self.agents_dir = self.base_dir / "agents"
        self.logs_dir = self.base_dir / "logs"

        # Ensure directories exist
        for dir_path in [self.locks_dir, self.agents_dir, self.logs_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)

    def validate_all_locks(self) -> dict:
        """Validate all locks and return comprehensive status"""
        result = {
            "valid_locks": [],
            "expired_locks": [],
            "orphaned_locks": [],
            "corrupted_locks": [],
            "cleanup_actions": [],
        }

        for lock_file in self.locks_dir.glob("issue-*.lock"):
            try:
                with open(lock_file) as f:
                    lock_data = json.load(f)

                # Validate structure
                required_fields = [
                    "agent_id",
                    "issue_number",
                    "claimed_at",
                    "issue_title",
                ]
                if not all(field in lock_data for field in required_fields):
                    result["corrupted_locks"].append(
                        {
                            "file": lock_file.name,
                            "reason": "Missing required fields",
                            "data": lock_data,
                        }
                    )
                    continue

                # Check expiration
                claimed_at = lock_data.get("claimed_at", 0)
                age_hours = (time.time() - claimed_at) / 3600

                if age_hours > 4:  # 4 hour timeout
                    result["expired_locks"].append(
                        {
                            "issue": lock_data["issue_number"],
                            "agent": lock_data["agent_id"],
                            "age_hours": round(age_hours, 1),
                            "title": lock_data["issue_title"],
                        }
                    )
                    continue

                # Check if agent is still active
                agent_file = self.agents_dir / f"agent-{lock_data['agent_id']}.json"
                if not agent_file.exists():
                    result["orphaned_locks"].append(
                        {
                            "issue": lock_data["issue_number"],
                            "agent": lock_data["agent_id"],
                            "age_hours": round(age_hours, 1),
                            "title": lock_data["issue_title"],
                        }
                    )
                    continue

                # Valid lock
                result["valid_locks"].append(
                    {
                        "issue": lock_data["issue_number"],
                        "agent": lock_data["agent_id"],
                        "age_hours": round(age_hours, 1),
                        "title": lock_data["issue_title"],
                    }
                )

            except Exception as e:
                result["corrupted_locks"].append(
                    {
                        "file": lock_file.name,
                        "reason": f"JSON error: {str(e)}",
                        "data": None,
                    }
                )

        return result

    def cleanup_stale_locks(self, dry_run=False) -> dict:
        """Clean up stale locks with optional dry run"""
        validation = self.validate_all_locks()
        actions = []

        # Remove expired locks
        for lock in validation["expired_locks"]:
            action = f"Remove expired lock: Issue #{lock['issue']} (agent {lock['agent']}, {lock['age_hours']}h old)"
            actions.append(action)

            if not dry_run:
                lock_file = self.locks_dir / f"issue-{lock['issue']}.lock"
                if lock_file.exists():
                    lock_file.unlink()
                    self._remove_github_label(lock["issue"])
                    self._log(f"Cleaned expired lock: Issue #{lock['issue']}")

        # Remove orphaned locks
        for lock in validation["orphaned_locks"]:
            action = f"Remove orphaned lock: Issue #{lock['issue']} (inactive agent {lock['agent']})"
            actions.append(action)

            if not dry_run:
                lock_file = self.locks_dir / f"issue-{lock['issue']}.lock"
                if lock_file.exists():
                    lock_file.unlink()
                    self._remove_github_label(lock["issue"])
                    self._log(f"Cleaned orphaned lock: Issue #{lock['issue']}")

        # Remove corrupted locks
        for lock in validation["corrupted_locks"]:
            action = f"Remove corrupted lock: {lock['file']} ({lock['reason']})"
            actions.append(action)

            if not dry_run:
                lock_file = self.locks_dir / lock["file"]
                if lock_file.exists():
                    lock_file.unlink()
                    self._log(f"Cleaned corrupted lock: {lock['file']}")

        return {
            "actions_taken" if not dry_run else "actions_planned": actions,
            "expired_cleaned": len(validation["expired_locks"]),
            "orphaned_cleaned": len(validation["orphaned_locks"]),
            "corrupted_cleaned": len(validation["corrupted_locks"]),
            "valid_remaining": len(validation["valid_locks"]),
        }

    def force_release_issue(
        self, issue_number: int, reason: str = "Manual release"
    ) -> bool:
        """Force release an issue lock with logging"""
        lock_file = self.locks_dir / f"issue-{issue_number}.lock"

        if not lock_file.exists():
            return False

        try:
            # Get lock info for logging
            with open(lock_file) as f:
                lock_data = json.load(f)

            # Remove lock file
            lock_file.unlink()

            # Remove GitHub label
            self._remove_github_label(issue_number)

            # Clean up agent task file
            agent_id = lock_data.get("agent_id")
            if agent_id:
                task_file = self.agents_dir / f"agent-{agent_id}-task.json"
                if task_file.exists():
                    task_file.unlink()

            self._log(
                f"Force released Issue #{issue_number}: {reason} (was held by {agent_id})"
            )
            return True

        except Exception as e:
            self._log(f"Error force releasing Issue #{issue_number}: {e}")
            return False

    def get_lock_info(self, issue_number: int) -> dict:
        """Get detailed information about a specific lock"""
        lock_file = self.locks_dir / f"issue-{issue_number}.lock"

        if not lock_file.exists():
            return {"status": "unlocked", "issue": issue_number}

        try:
            with open(lock_file) as f:
                lock_data = json.load(f)

            claimed_at = lock_data.get("claimed_at", 0)
            age_hours = (time.time() - claimed_at) / 3600

            # Check agent status
            agent_id = lock_data.get("agent_id")
            agent_file = self.agents_dir / f"agent-{agent_id}.json"
            agent_active = agent_file.exists()

            return {
                "status": "locked",
                "issue": issue_number,
                "agent_id": agent_id,
                "agent_active": agent_active,
                "title": lock_data.get("issue_title", "Unknown"),
                "claimed_at": datetime.fromtimestamp(claimed_at).isoformat(),
                "age_hours": round(age_hours, 2),
                "expired": age_hours > 4,
                "orphaned": not agent_active,
            }

        except Exception as e:
            return {"status": "corrupted", "issue": issue_number, "error": str(e)}

    def health_check(self) -> dict:
        """Comprehensive health check of the locking system"""
        validation = self.validate_all_locks()

        # Count issues
        total_locks = sum(
            [
                len(validation["valid_locks"]),
                len(validation["expired_locks"]),
                len(validation["orphaned_locks"]),
                len(validation["corrupted_locks"]),
            ]
        )

        # Calculate health score
        if total_locks == 0:
            health_score = 100
        else:
            valid_count = len(validation["valid_locks"])
            health_score = (valid_count / total_locks) * 100

        return {
            "health_score": round(health_score, 1),
            "total_locks": total_locks,
            "valid_locks": len(validation["valid_locks"]),
            "issues_found": total_locks - len(validation["valid_locks"]),
            "needs_cleanup": total_locks > len(validation["valid_locks"]),
            "validation": validation,
        }

    def _remove_github_label(self, issue_number: int):
        """Remove in-progress label from GitHub issue"""
        try:
            subprocess.run(
                [
                    "gh",
                    "issue",
                    "edit",
                    str(issue_number),
                    "--repo",
                    "NathanNorman/financial-clarity",
                    "--remove-label",
                    "in-progress",
                ],
                capture_output=True,
                check=True,
            )
        except Exception:
            pass  # Non-critical if it fails

    def _log(self, message: str):
        """Log lock manager events"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file = (
            self.logs_dir / f"lock-manager-{datetime.now().strftime('%Y%m%d')}.log"
        )

        log_entry = f"[{timestamp}] {message}\n"
        with open(log_file, "a") as f:
            f.write(log_entry)


def main():
    """Command line interface for lock management"""
    import argparse

    parser = argparse.ArgumentParser(description="Enhanced Lock Manager")
    parser.add_argument(
        "command", choices=["validate", "cleanup", "force-release", "health", "info"]
    )
    parser.add_argument(
        "--issue", type=int, help="Issue number for force-release or info"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without doing it",
    )
    parser.add_argument(
        "--reason", default="Manual intervention", help="Reason for force release"
    )

    args = parser.parse_args()

    manager = EnhancedLockManager()

    if args.command == "validate":
        validation = manager.validate_all_locks()
        print("\n🔍 LOCK VALIDATION REPORT")
        print("=" * 50)
        print(f"✅ Valid locks: {len(validation['valid_locks'])}")
        print(f"⏰ Expired locks: {len(validation['expired_locks'])}")
        print(f"👻 Orphaned locks: {len(validation['orphaned_locks'])}")
        print(f"💥 Corrupted locks: {len(validation['corrupted_locks'])}")

        if validation["expired_locks"]:
            print("\n⏰ EXPIRED LOCKS:")
            for lock in validation["expired_locks"]:
                print(
                    f"  • Issue #{lock['issue']}: {lock['title'][:50]}... (Agent {lock['agent']}, {lock['age_hours']}h)"
                )

        if validation["orphaned_locks"]:
            print("\n👻 ORPHANED LOCKS:")
            for lock in validation["orphaned_locks"]:
                print(
                    f"  • Issue #{lock['issue']}: {lock['title'][:50]}... (Inactive agent {lock['agent']})"
                )

    elif args.command == "cleanup":
        result = manager.cleanup_stale_locks(dry_run=args.dry_run)
        action_type = "actions_planned" if args.dry_run else "actions_taken"

        print(f"\n🧹 LOCK CLEANUP {'(DRY RUN)' if args.dry_run else 'COMPLETE'}")
        print("=" * 50)
        print(f"Expired cleaned: {result['expired_cleaned']}")
        print(f"Orphaned cleaned: {result['orphaned_cleaned']}")
        print(f"Corrupted cleaned: {result['corrupted_cleaned']}")
        print(f"Valid remaining: {result['valid_remaining']}")

        if result[action_type]:
            print(f"\n📝 {'PLANNED ACTIONS:' if args.dry_run else 'ACTIONS TAKEN:'}")
            for action in result[action_type]:
                print(f"  • {action}")

    elif args.command == "force-release":
        if not args.issue:
            print("❌ --issue required for force-release")
            return

        success = manager.force_release_issue(args.issue, args.reason)
        if success:
            print(f"✅ Successfully released Issue #{args.issue}")
        else:
            print(f"❌ Failed to release Issue #{args.issue} (may not be locked)")

    elif args.command == "health":
        health = manager.health_check()
        print(f"\n🏥 LOCK SYSTEM HEALTH: {health['health_score']}%")
        print("=" * 50)
        print(f"Total locks: {health['total_locks']}")
        print(f"Valid locks: {health['valid_locks']}")
        print(f"Issues found: {health['issues_found']}")
        print(f"Needs cleanup: {'Yes' if health['needs_cleanup'] else 'No'}")

        if health["needs_cleanup"]:
            print("\n💡 Run 'python3 lock-manager.py cleanup' to fix issues")

    elif args.command == "info":
        if not args.issue:
            print("❌ --issue required for info")
            return

        info = manager.get_lock_info(args.issue)
        print(f"\n📋 ISSUE #{info['issue']} LOCK INFO")
        print("=" * 50)

        if info["status"] == "unlocked":
            print("Status: 🔓 Unlocked - Available to claim")
        elif info["status"] == "corrupted":
            print(f"Status: 💥 Corrupted - {info['error']}")
        else:
            print("Status: 🔒 Locked")
            print(
                f"Agent: {info['agent_id']} ({'Active' if info['agent_active'] else 'Inactive'})"
            )
            print(f"Title: {info['title']}")
            print(f"Claimed: {info['claimed_at']}")
            print(f"Age: {info['age_hours']} hours")

            if info["expired"]:
                print("⚠️  Lock is EXPIRED")
            if info["orphaned"]:
                print("👻 Lock is ORPHANED (agent inactive)")


if __name__ == "__main__":
    main()
