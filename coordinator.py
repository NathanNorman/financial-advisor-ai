#!/usr/bin/env python3
"""
Task Coordinator for Multi-Agent GitHub Issue Management
Manages task distribution across multiple Claude Code instances
"""

import os
import json
import time
import hashlib
import subprocess
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime


class TaskCoordinator:
    def __init__(self):
        self.base_dir = Path(".claude-work")
        self.locks_dir = self.base_dir / "locks"
        self.agents_dir = self.base_dir / "agents"
        self.logs_dir = self.base_dir / "logs"
        self.tasks_dir = self.base_dir / "tasks"

        # Create directories
        for dir_path in [
            self.locks_dir,
            self.agents_dir,
            self.logs_dir,
            self.tasks_dir,
        ]:
            dir_path.mkdir(parents=True, exist_ok=True)

        self.github_repo = self._detect_github_repo()
        self.lock_timeout_hours = 4
        self.cache_duration_seconds = 60
        self._issues_cache = None
        self._cache_timestamp = 0

        # Load issue dependencies from config or use defaults
        self.dependencies = self._load_dependencies()

    def get_agent_id(self) -> str:
        """Generate unique agent ID for this terminal session"""
        # Try to use Claude Code session ID if available
        session_id = os.environ.get("CLAUDE_SESSION_ID")

        if session_id:
            return hashlib.md5(session_id.encode()).hexdigest()[:8]

        # Otherwise use parent process ID which should be consistent for the terminal
        # This assumes commands are run from the same terminal/shell session
        session_info = f"terminal_{os.getppid()}"
        return hashlib.md5(session_info.encode()).hexdigest()[:8]

    def register_agent(self, agent_id: str) -> None:
        """Register an agent in the system"""
        # Clean up stale agents first
        self._cleanup_stale_agents()

        agent_file = self.agents_dir / f"agent-{agent_id}.json"
        agent_data = {
            "agent_id": agent_id,
            "registered_at": time.time(),
            "last_seen": time.time(),
            "pid": os.getpid(),
            "ppid": os.getppid(),
            "current_task": None,
        }
        with open(agent_file, "w") as f:
            json.dump(agent_data, f, indent=2)

        self._log(f"Agent {agent_id} registered")

    def get_next_task(self, agent_id: str) -> Optional[Dict]:
        """Main function - get next available task for an agent"""
        # Update agent heartbeat
        self.update_agent_heartbeat(agent_id)

        # 1. Get open issues from GitHub
        issues = self._get_open_issues()
        if not issues:
            self._log(f"Agent {agent_id}: No open issues found")
            return None

        # 2. Filter by dependencies and availability
        available_issues = self._filter_available_issues(issues)

        # 3. Try to claim one
        for issue in available_issues:
            if self._try_claim_issue(issue, agent_id):
                task = self._create_task_context(issue, agent_id)
                self._log(
                    f"Agent {agent_id} claimed issue #{issue['number']}: {issue['title']}"
                )
                return task

        self._log(f"Agent {agent_id}: No available tasks (all locked or blocked)")
        return None

    def _get_open_issues(self) -> List[Dict]:
        """Get open issues from GitHub with caching"""
        # Check cache
        now = time.time()
        if (
            self._issues_cache
            and (now - self._cache_timestamp) < self.cache_duration_seconds
        ):
            return self._issues_cache

        try:
            # Use GitHub CLI to get issues
            cmd = [
                "gh",
                "issue",
                "list",
                "--repo",
                self.github_repo,
                "--state",
                "open",
                "--json",
                "number,title,body,labels,assignees",
                "--limit",
                "50",
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            issues = json.loads(result.stdout)

            # Cache the results
            self._issues_cache = issues
            self._cache_timestamp = now

            return issues
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            self._log(f"Error fetching issues: {e}")
            return []

    def _filter_available_issues(self, issues: List[Dict]) -> List[Dict]:
        """Filter issues by dependencies and current locks"""
        available = []
        completed_issues = self._get_completed_issues()
        locked_issues = self._get_locked_issues()

        for issue in issues:
            issue_num = issue["number"]

            # Skip if already locked
            if issue_num in locked_issues:
                continue

            # Skip if has "in-progress" or "completed" label
            labels = [label["name"] for label in issue.get("labels", [])]
            if "in-progress" in labels or "completed" in labels:
                continue

            # Check dependencies
            deps = self.dependencies.get(issue_num, [])
            if all(dep in completed_issues for dep in deps):
                available.append(issue)

        # Sort by issue number (prioritize earlier issues)
        available.sort(key=lambda x: x["number"])
        return available

    def _get_completed_issues(self) -> set:
        """Get set of completed issue numbers"""
        try:
            cmd = [
                "gh",
                "issue",
                "list",
                "--repo",
                self.github_repo,
                "--state",
                "closed",
                "--json",
                "number",
                "--limit",
                "100",
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            closed_issues = json.loads(result.stdout)

            # Also check for 'completed' label on open issues
            cmd[4] = "open"
            cmd.extend(["--label", "completed"])
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            completed_open = json.loads(result.stdout)

            completed = {issue["number"] for issue in closed_issues}
            completed.update({issue["number"] for issue in completed_open})
            return completed
        except Exception:
            return set()

    def _get_locked_issues(self) -> set:
        """Get set of currently locked issue numbers and cleanup stale agents"""
        locked = set()

        # Clean up stale agents first
        self._cleanup_stale_agents()

        # Check lock files
        for lock_file in self.locks_dir.glob("issue-*.lock"):
            try:
                with open(lock_file) as f:
                    lock_data = json.load(f)

                # Check if lock is expired
                claimed_at = lock_data.get("claimed_at", 0)
                age_hours = (time.time() - claimed_at) / 3600

                if age_hours > self.lock_timeout_hours:
                    # Expired lock - remove it and clean GitHub
                    issue_num = lock_data.get("issue_number")
                    agent_id = lock_data.get("agent_id")
                    lock_file.unlink()
                    self._remove_github_in_progress_label(issue_num)

                    # Clear the agent's current task if they had this issue
                    if agent_id:
                        self._clear_agent_task_if_matches(agent_id, issue_num)

                    self._log(
                        f"Auto-removed expired lock for issue #{issue_num} (agent {agent_id}, {age_hours:.1f}h old)"
                    )
                else:
                    locked.add(lock_data.get("issue_number"))
            except Exception:
                # Invalid lock file - remove it
                lock_file.unlink()

        # Clean up orphaned agent task assignments (agents claiming tasks they don't have locks for)
        self._cleanup_orphaned_task_assignments(locked)

        return locked

    def _try_claim_issue(self, issue: Dict, agent_id: str) -> bool:
        """Atomically claim an issue using file locking"""
        issue_num = issue["number"]
        lock_file = self.locks_dir / f"issue-{issue_num}.lock"

        try:
            # O_EXCL ensures atomic creation - fails if file exists
            fd = os.open(str(lock_file), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            lock_data = {
                "agent_id": agent_id,
                "issue_number": issue_num,
                "claimed_at": time.time(),
                "issue_title": issue["title"],
            }
            os.write(fd, json.dumps(lock_data, indent=2).encode())
            os.close(fd)

            # Update agent's current task
            self._update_agent_task(agent_id, issue_num)

            # Update GitHub issue with in-progress label
            self._update_github_issue_status(issue_num, agent_id, "claimed")

            return True

        except FileExistsError:
            return False
        except Exception as e:
            self._log(f"Error claiming issue {issue_num}: {e}")
            return False

    def _create_task_context(self, issue: Dict, agent_id: str) -> Dict:
        """Create task context for the agent"""
        issue_num = issue["number"]
        task_dir = self.tasks_dir / f"issue-{issue_num}"
        task_dir.mkdir(exist_ok=True)

        return {
            "issue_number": issue_num,
            "title": issue["title"],
            "description": issue.get("body", ""),
            "labels": [label["name"] for label in issue.get("labels", [])],
            "agent_id": agent_id,
            "working_directory": str(task_dir),
            "github_url": f"https://github.com/{self.github_repo}/issues/{issue_num}",
            "dependencies": self.dependencies.get(issue_num, []),
            "claimed_at": datetime.now().isoformat(),
        }

    def release_task(self, issue_number: int, agent_id: str, completed: bool = False):
        """Release a task when completed or abandoned"""
        # Update agent heartbeat
        self.update_agent_heartbeat(agent_id)

        lock_file = self.locks_dir / f"issue-{issue_number}.lock"

        # Verify this agent owns the lock
        if lock_file.exists():
            try:
                with open(lock_file) as f:
                    lock_data = json.load(f)

                if lock_data.get("agent_id") == agent_id:
                    lock_file.unlink()
                    self._log(f"Agent {agent_id} released issue #{issue_number}")

                    # Update GitHub
                    if completed:
                        self._mark_issue_completed(issue_number, agent_id)
                    else:
                        self._mark_issue_available(issue_number, agent_id)

                    # Update agent's current task
                    self._update_agent_task(agent_id, None)
            except Exception:
                pass

    def _update_github_issue_status(
        self, issue_number: int, agent_id: str, action: str
    ):
        """Update GitHub issue status with proper error handling and label management"""
        try:
            # Ensure required labels exist
            self._ensure_labels_exist()

            if action == "claimed":
                # Add in-progress label
                cmd = [
                    "gh",
                    "issue",
                    "edit",
                    str(issue_number),
                    "--repo",
                    self.github_repo,
                    "--add-label",
                    "in-progress",
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    self._log(
                        f"Warning: Failed to add in-progress label to issue {issue_number}: {result.stderr}"
                    )

                # Add comment
                comment = f"🤖 Agent {agent_id} has claimed this task at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                cmd = [
                    "gh",
                    "issue",
                    "comment",
                    str(issue_number),
                    "--repo",
                    self.github_repo,
                    "--body",
                    comment,
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    self._log(
                        f"Warning: Failed to add claim comment to issue {issue_number}: {result.stderr}"
                    )
                else:
                    self._log(f"Successfully claimed issue {issue_number} on GitHub")

            elif action == "completed":
                # Remove in-progress, add completed
                cmd = [
                    "gh",
                    "issue",
                    "edit",
                    str(issue_number),
                    "--repo",
                    self.github_repo,
                    "--remove-label",
                    "in-progress",
                    "--add-label",
                    "completed",
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    self._log(
                        f"Warning: Failed to update labels for completed issue {issue_number}: {result.stderr}"
                    )

                # Add completion comment
                comment = f"✅ Agent {agent_id} completed this task at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                cmd = [
                    "gh",
                    "issue",
                    "comment",
                    str(issue_number),
                    "--repo",
                    self.github_repo,
                    "--body",
                    comment,
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    self._log(
                        f"Warning: Failed to add completion comment to issue {issue_number}: {result.stderr}"
                    )
                else:
                    self._log(
                        f"Successfully marked issue {issue_number} as completed on GitHub"
                    )

            elif action == "released":
                # Remove in-progress label
                cmd = [
                    "gh",
                    "issue",
                    "edit",
                    str(issue_number),
                    "--repo",
                    self.github_repo,
                    "--remove-label",
                    "in-progress",
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    self._log(
                        f"Warning: Failed to remove in-progress label from issue {issue_number}: {result.stderr}"
                    )

                # Add release comment
                comment = f"🔄 Agent {agent_id} released this task at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                cmd = [
                    "gh",
                    "issue",
                    "comment",
                    str(issue_number),
                    "--repo",
                    self.github_repo,
                    "--body",
                    comment,
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    self._log(
                        f"Warning: Failed to add release comment to issue {issue_number}: {result.stderr}"
                    )
                else:
                    self._log(f"Successfully released issue {issue_number} on GitHub")

        except Exception as e:
            self._log(f"Error updating GitHub status for issue {issue_number}: {e}")

    def _ensure_labels_exist(self):
        """Ensure required labels exist in the repository"""
        required_labels = {
            "in-progress": {
                "description": "Issue is currently being worked on",
                "color": "fbca04",
            },
            "completed": {"description": "Issue has been completed", "color": "0e8a16"},
        }

        try:
            # Get existing labels
            cmd = ["gh", "label", "list", "--repo", self.github_repo, "--json", "name"]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            existing_labels = {label["name"] for label in json.loads(result.stdout)}

            # Create missing labels
            for label_name, label_config in required_labels.items():
                if label_name not in existing_labels:
                    cmd = [
                        "gh",
                        "label",
                        "create",
                        label_name,
                        "--repo",
                        self.github_repo,
                        "--description",
                        label_config["description"],
                        "--color",
                        label_config["color"],
                    ]
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    if result.returncode == 0:
                        self._log(f"Created missing label: {label_name}")
                    else:
                        self._log(
                            f"Warning: Failed to create label {label_name}: {result.stderr}"
                        )

        except Exception as e:
            self._log(f"Error checking/creating labels: {e}")

    def _mark_issue_completed(self, issue_number: int, agent_id: str):
        """Mark an issue as completed on GitHub"""
        self._update_github_issue_status(issue_number, agent_id, "completed")

    def _mark_issue_available(self, issue_number: int, agent_id: str):
        """Mark an issue as available again on GitHub"""
        self._update_github_issue_status(issue_number, agent_id, "released")

    def _update_agent_task(self, agent_id: str, issue_number: Optional[int]):
        """Update agent's current task and heartbeat"""
        agent_file = self.agents_dir / f"agent-{agent_id}.json"
        if agent_file.exists():
            try:
                with open(agent_file) as f:
                    agent_data = json.load(f)
                agent_data["current_task"] = issue_number
                agent_data["last_seen"] = time.time()
                with open(agent_file, "w") as f:
                    json.dump(agent_data, f, indent=2)
            except Exception:
                pass

    def update_agent_heartbeat(self, agent_id: str):
        """Update agent heartbeat to show it's still alive"""
        agent_file = self.agents_dir / f"agent-{agent_id}.json"
        if agent_file.exists():
            try:
                with open(agent_file) as f:
                    agent_data = json.load(f)
                agent_data["last_seen"] = time.time()
                with open(agent_file, "w") as f:
                    json.dump(agent_data, f, indent=2)
            except Exception:
                pass

    def _cleanup_stale_agents(self):
        """Remove agent files that haven't been seen for over 30 minutes"""
        stale_threshold_minutes = (
            30  # More aggressive cleanup - 30 minutes instead of 1 hour
        )
        current_time = time.time()

        for agent_file in self.agents_dir.glob("agent-*.json"):
            try:
                with open(agent_file) as f:
                    agent_data = json.load(f)

                last_seen = agent_data.get("last_seen", 0)
                age_minutes = (current_time - last_seen) / 60

                if age_minutes > stale_threshold_minutes:
                    agent_id = agent_data.get("agent_id", "unknown")
                    agent_file.unlink()

                    # Also remove any associated task files
                    task_file = self.agents_dir / f"agent-{agent_id}-task.json"
                    if task_file.exists():
                        task_file.unlink()

                    self._log(
                        f"Cleaned up stale agent {agent_id} (last seen {age_minutes:.1f}m ago)"
                    )

            except Exception as e:
                # Invalid agent file - remove it
                agent_file.unlink()
                self._log(f"Removed invalid agent file {agent_file.name}: {e}")

    def _clear_agent_task_if_matches(self, agent_id: str, issue_number: int):
        """Clear an agent's current task if it matches the given issue number"""
        agent_file = self.agents_dir / f"agent-{agent_id}.json"
        if agent_file.exists():
            try:
                with open(agent_file) as f:
                    agent_data = json.load(f)

                # Only clear if the agent was working on this specific issue
                if agent_data.get("current_task") == issue_number:
                    agent_data["current_task"] = None
                    agent_data["last_seen"] = time.time()

                    with open(agent_file, "w") as f:
                        json.dump(agent_data, f, indent=2)

                    self._log(
                        f"Cleared orphaned task assignment for agent {agent_id} (issue #{issue_number})"
                    )

            except Exception as e:
                self._log(f"Error clearing task for agent {agent_id}: {e}")

    def _cleanup_orphaned_task_assignments(self, valid_locked_issues: set):
        """Clean up agents that claim to be working on tasks they don't have locks for"""
        for agent_file in self.agents_dir.glob("agent-*.json"):
            try:
                with open(agent_file) as f:
                    agent_data = json.load(f)

                current_task = agent_data.get("current_task")
                agent_id = agent_data.get("agent_id", "unknown")

                if current_task:
                    # Check if this agent actually owns the lock for their claimed task
                    lock_file = self.locks_dir / f"issue-{current_task}.lock"
                    has_valid_lock = False
                    lock_owner = None

                    if lock_file.exists():
                        try:
                            with open(lock_file) as f:
                                lock_data = json.load(f)
                            lock_owner = lock_data.get("agent_id")
                            has_valid_lock = lock_owner == agent_id
                        except Exception:
                            pass

                    # If agent claims a task but doesn't own the lock, clear it
                    if not has_valid_lock:
                        agent_data["current_task"] = None
                        agent_data["last_seen"] = time.time()

                        with open(agent_file, "w") as f:
                            json.dump(agent_data, f, indent=2)

                        if lock_owner and lock_owner != agent_id:
                            self._log(
                                f"Cleared orphaned task assignment for agent {agent_id} (issue #{current_task} is locked by {lock_owner})"
                            )
                        elif current_task in valid_locked_issues:
                            self._log(
                                f"Cleared orphaned task assignment for agent {agent_id} (issue #{current_task} is locked by different agent)"
                            )
                        else:
                            self._log(
                                f"Cleared orphaned task assignment for agent {agent_id} (issue #{current_task} has no valid lock)"
                            )

            except Exception as e:
                self._log(f"Error checking task assignment for {agent_file.name}: {e}")

    def _get_active_agents(self) -> List[Dict]:
        """Get list of currently active agents (seen within last 30 minutes)"""
        active_agents = []
        stale_threshold_minutes = 30  # Match cleanup threshold
        current_time = time.time()

        for agent_file in self.agents_dir.glob("agent-*.json"):
            try:
                with open(agent_file) as f:
                    agent_data = json.load(f)

                last_seen = agent_data.get("last_seen", 0)
                age_minutes = (current_time - last_seen) / 60

                if age_minutes <= stale_threshold_minutes:
                    active_agents.append(agent_data)

            except Exception:
                continue

        return active_agents

    def show_task_status(self) -> None:
        """Show status of all tasks and agents"""
        print("\n📊 TASK COORDINATION STATUS")
        print("=" * 60)

        # Get all issues
        all_issues = self._get_open_issues()
        completed = self._get_completed_issues()
        locked = self._get_locked_issues()

        # Build a map of which agent actually has each lock
        lock_owners = {}
        for lock_file in self.locks_dir.glob("issue-*.lock"):
            try:
                with open(lock_file) as f:
                    lock_data = json.load(f)
                issue_num = lock_data.get("issue_number")
                agent_id = lock_data.get("agent_id")
                if issue_num and agent_id:
                    lock_owners[issue_num] = agent_id
            except Exception:
                continue

        # Show only active agents (cleanup happens in _get_locked_issues)
        active_agents = self._get_active_agents()
        print(f"\n👥 ACTIVE AGENTS ({len(active_agents)}):")

        if not active_agents:
            print("  • No active agents")
        else:
            for agent in active_agents:
                last_seen_mins = int((time.time() - agent["last_seen"]) / 60)
                status = f"  • Agent {agent['agent_id']}: "

                current_task = agent["current_task"]
                if current_task and lock_owners.get(current_task) == agent["agent_id"]:
                    # Agent has a valid lock for their claimed task
                    status += f"Working on Issue #{current_task} ✓"
                elif current_task:
                    # Agent claims a task but doesn't have the lock
                    actual_owner = lock_owners.get(current_task, "none")
                    status += f"Idle (stale task claim #{current_task}, locked by {actual_owner})"
                else:
                    status += "Idle"
                status += f" (last seen {last_seen_mins}m ago)"
                print(status)

        # Show issues by status
        print("\n📋 ISSUE STATUS:")
        print(f"  ✅ Completed: {len(completed)} issues")
        print(f"  🔒 In Progress: {len(locked)} issues")
        print(
            f"  📂 Available: {len(self._filter_available_issues(all_issues))} issues"
        )
        print(
            f"  ⏳ Blocked: {len(all_issues) - len(locked) - len(self._filter_available_issues(all_issues))} issues"
        )

        # Show locked issues detail
        if locked:
            print("\n🔒 LOCKED ISSUES:")
            for lock_file in self.locks_dir.glob("issue-*.lock"):
                try:
                    with open(lock_file) as f:
                        lock = json.load(f)
                        age_mins = int((time.time() - lock["claimed_at"]) / 60)
                        print(
                            f"  • Issue #{lock['issue_number']}: {lock['issue_title'][:50]}..."
                        )
                        print(
                            f"    Agent: {lock['agent_id']}, Locked: {age_mins} mins ago"
                        )
                except Exception:
                    pass

        # Show available issues
        available = self._filter_available_issues(all_issues)
        if available:
            print("\n📂 AVAILABLE ISSUES:")
            for issue in available[:5]:  # Show first 5
                print(f"  • Issue #{issue['number']}: {issue['title'][:50]}...")

        print("\n" + "=" * 60)

    def _remove_github_in_progress_label(self, issue_number: int):
        """Remove in-progress label from GitHub issue"""
        try:
            cmd = [
                "gh",
                "issue",
                "edit",
                str(issue_number),
                "--repo",
                self.github_repo,
                "--remove-label",
                "in-progress",
            ]
            subprocess.run(cmd, capture_output=True, check=True)
        except Exception:
            pass  # Non-critical if it fails

    def _detect_github_repo(self) -> str:
        """Auto-detect GitHub repository from git remote"""
        try:
            result = subprocess.run(
                ["git", "remote", "get-url", "origin"],
                capture_output=True,
                text=True,
                check=True,
            )
            url = result.stdout.strip()

            # Parse different GitHub URL formats
            if url.startswith("git@github.com:"):
                # SSH format: git@github.com:user/repo.git
                repo = url.replace("git@github.com:", "").replace(".git", "")
            elif "github.com" in url:
                # HTTPS format: https://github.com/user/repo.git
                repo = url.split("github.com/")[1].replace(".git", "")
            else:
                raise ValueError("Not a GitHub repository")

            self._log(f"Auto-detected repository: {repo}")
            return repo

        except Exception as e:
            self._log(f"Could not auto-detect repository: {e}")
            return "unknown/repository"

    def _load_dependencies(self) -> Dict[int, List[int]]:
        """Load issue dependencies from config file or use defaults"""
        config_file = Path("coordination-config.json")

        if config_file.exists():
            try:
                with open(config_file) as f:
                    config = json.load(f)
                    deps = config.get("dependencies", {})
                    # Convert string keys to integers
                    return {int(k): v for k, v in deps.items()}
            except Exception as e:
                self._log(f"Error loading dependencies config: {e}")

        # Default dependencies for financial-clarity project
        if "financial-clarity" in self.github_repo:
            return {
                1: [],  # Data Pipeline - no dependencies
                2: [1],  # Main Dashboard - needs data pipeline
                3: [1],  # Cash Flow Simulator - needs data
                4: [1],  # Spending Patterns - needs data
                5: [1],  # What-If Calculator - needs data
                6: [1],  # Trend Analysis - needs data
                7: [2],  # LLM Export - needs main dashboard
                8: [1],  # Recurring Expenses - needs data
                9: [2, 3, 4, 5, 6, 8],  # Mobile Design - needs all dashboards
                10: [2, 3, 4, 5, 6, 8],  # Print Reports - needs all dashboards
                11: [1],  # Data Validation - can run with data pipeline
                12: [7],  # Documentation - needs core features
            }

        # Generic dependencies for other projects (no dependencies)
        return {}

    def _log(self, message: str):
        """Log coordinator events"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_file = (
            self.logs_dir / f"coordinator-{datetime.now().strftime('%Y%m%d')}.log"
        )

        log_entry = f"[{timestamp}] {message}\n"
        with open(log_file, "a") as f:
            f.write(log_entry)


def main():
    """Command line interface for the Task Coordinator"""
    import sys

    coordinator = TaskCoordinator()

    if len(sys.argv) == 1:
        # Default action - get next task
        agent_id = coordinator.get_agent_id()
        coordinator.register_agent(agent_id)
        task = coordinator.get_next_task(agent_id)

        if task:
            print(f"📋 Task assigned: Issue #{task['issue_number']}")
            print(f"📖 Title: {task['title']}")
            print(f"🔗 URL: {task['github_url']}")
            print(f"📁 Working dir: {task['working_directory']}")
        else:
            print("✅ No tasks available - all done or blocked by dependencies")

    elif sys.argv[1] == "status":
        coordinator.show_task_status()

    elif sys.argv[1] == "cleanup":
        # Manual cleanup command
        coordinator._cleanup_stale_agents()
        print("🧹 Cleaned up stale agents")

    elif sys.argv[1] == "test-cleanup":
        # Test cleanup by making an agent appear old
        agent_id = coordinator.get_agent_id()
        coordinator.register_agent(agent_id)

        # Make this agent appear old (2 hours ago)
        agent_file = coordinator.agents_dir / f"agent-{agent_id}.json"
        if agent_file.exists():
            with open(agent_file) as f:
                agent_data = json.load(f)
            # Set last_seen to 2 hours ago
            agent_data["last_seen"] = time.time() - (2 * 3600)
            with open(agent_file, "w") as f:
                json.dump(agent_data, f, indent=2)
            print(f"📅 Made agent {agent_id} appear 2 hours old")

            # Now run cleanup
            coordinator._cleanup_stale_agents()
            print("🧹 Ran cleanup - check if the old agent was removed")

    elif sys.argv[1] == "release" and len(sys.argv) >= 3:
        # Release a task: python coordinator.py release <issue_number> [completed]
        agent_id = coordinator.get_agent_id()
        issue_number = int(sys.argv[2])
        completed = len(sys.argv) > 3 and sys.argv[3].lower() == "completed"

        coordinator.release_task(issue_number, agent_id, completed)
        print(
            f"🔓 Released issue #{issue_number}"
            + (" as completed" if completed else "")
        )

    else:
        print("Usage:")
        print("  python coordinator.py           - Get next task")
        print("  python coordinator.py status   - Show status")
        print("  python coordinator.py cleanup  - Clean up stale agents")
        print("  python coordinator.py test-cleanup - Test cleanup logic")
        print("  python coordinator.py release <issue> [completed] - Release task")


if __name__ == "__main__":
    main()
