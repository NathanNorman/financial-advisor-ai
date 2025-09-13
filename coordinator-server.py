#!/usr/bin/env python3
"""
Multi-Agent Coordination Dashboard Server
Provides real-time status of the coordination system via HTTP API
"""

import json
import subprocess
import sys
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import time
from datetime import datetime

# Add coordination module to path
sys.path.insert(0, str(Path(__file__).parent / ".claude-work" / "coordination"))

try:
    from coordinator import TaskCoordinator
except ImportError:
    print("Warning: Coordinator module not found. Using mock data.")
    TaskCoordinator = None


class CoordinatorAPIHandler(SimpleHTTPRequestHandler):
    """HTTP handler for coordination API and static files"""

    def do_GET(self):
        """Handle GET requests"""
        parsed = urlparse(self.path)

        # API endpoints
        if parsed.path == "/api/status":
            self.send_json_response(self.get_status())
        elif parsed.path == "/api/refresh":
            self.send_json_response(self.refresh_status())
        elif parsed.path == "/api/command":
            params = parse_qs(parsed.query)
            cmd = params.get("cmd", [""])[0]
            self.send_json_response(self.run_command(cmd))
        elif parsed.path == "/coordinator-dashboard.html":
            # Serve the dashboard
            self.serve_dashboard()
        elif parsed.path == "/":
            # Redirect to dashboard
            self.send_response(301)
            self.send_header("Location", "/coordinator-dashboard.html")
            self.end_headers()
        else:
            # Serve static files
            super().do_GET()

    def serve_dashboard(self):
        """Serve the dashboard HTML with real API endpoints"""
        dashboard_path = Path(__file__).parent / "coordinator-dashboard.html"

        if dashboard_path.exists():
            with open(dashboard_path, "r") as f:
                content = f.read()

            # Inject real API endpoints
            content = content.replace(
                "// Mock data for demonstration",
                """// Connect to real backend
                const API_BASE = '';
                
                async function fetchStatus() {
                    try {
                        const response = await fetch('/api/status');
                        return await response.json();
                    } catch (error) {
                        console.error('Failed to fetch status:', error);
                        return mockData;
                    }
                }
                
                async function executeCommand(command) {
                    try {
                        const response = await fetch(`/api/command?cmd=${command}`);
                        const result = await response.json();
                        return result.output;
                    } catch (error) {
                        console.error('Failed to execute command:', error);
                        return 'Error executing command';
                    }
                }""",
            )

            # Update refresh function
            content = content.replace(
                "function refreshData() {",
                """async function refreshData() {
                    const data = await fetchStatus();""",
            )

            # Update command function
            content = content.replace(
                "function runCommand(command) {",
                """async function runCommand(command) {
                    const output = await executeCommand(command);""",
            )

            content = content.replace("${getCommandOutput(command)}", "${output}")

            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(content.encode())
        else:
            self.send_error(404, "Dashboard not found")

    def send_json_response(self, data):
        """Send JSON response"""
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def get_status(self):
        """Get current coordination status"""
        if not TaskCoordinator:
            return self.get_mock_status()

        try:
            tc = TaskCoordinator()

            # Get agents
            agents = []
            agents_dir = Path(".claude-work/agents")
            if agents_dir.exists():
                for agent_file in agents_dir.glob("agent-*.json"):
                    if "-task" not in agent_file.name:
                        try:
                            with open(agent_file) as f:
                                agent_data = json.load(f)
                                agents.append(
                                    {
                                        "id": agent_data["agent_id"],
                                        "task": agent_data.get("current_task"),
                                        "status": (
                                            "working"
                                            if agent_data.get("current_task")
                                            else "idle"
                                        ),
                                        "last_seen": agent_data.get("last_seen", 0),
                                    }
                                )
                        except Exception:
                            pass

            # Get issues from GitHub
            issues_data = []
            try:
                # Get all open issues
                cmd = [
                    "gh",
                    "issue",
                    "list",
                    "--repo",
                    tc.github_repo,
                    "--state",
                    "open",
                    "--json",
                    "number,title,labels",
                    "--limit",
                    "50",
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, check=True)
                open_issues = json.loads(result.stdout)

                # Get closed issues
                cmd[4] = "closed"
                result = subprocess.run(cmd, capture_output=True, text=True, check=True)
                closed_issues = json.loads(result.stdout)

                # Get locked issues
                locked = tc._get_locked_issues()

                # Process all 12 issues
                for i in range(1, 13):
                    # Find issue in open or closed
                    issue = None
                    for iss in open_issues + closed_issues:
                        if iss["number"] == i:
                            issue = iss
                            break

                    if issue:
                        labels = [label["name"] for label in issue.get("labels", [])]

                        # Determine status
                        if "completed" in labels or issue in closed_issues:
                            status = "completed"
                        elif i in locked or "in-progress" in labels:
                            status = "in-progress"
                            # Find which agent has it
                            agent = None
                            for a in agents:
                                if a["task"] == i:
                                    agent = a["id"]
                                    break
                        else:
                            # Check dependencies
                            deps = tc.dependencies.get(i, [])
                            completed_nums = {iss["number"] for iss in closed_issues}
                            completed_nums.update(
                                {
                                    iss["number"]
                                    for iss in open_issues
                                    if "completed"
                                    in [
                                        label["name"] for label in iss.get("labels", [])
                                    ]
                                }
                            )

                            if all(dep in completed_nums for dep in deps):
                                status = "available"
                            else:
                                status = "blocked"
                            agent = None

                        issues_data.append(
                            {
                                "number": i,
                                "title": issue["title"],
                                "status": status,
                                "agent": agent,
                                "dependencies": tc.dependencies.get(i, []),
                            }
                        )
                    else:
                        # Issue not found, use default
                        issues_data.append(
                            {
                                "number": i,
                                "title": f"Issue #{i}",
                                "status": "blocked",
                                "agent": None,
                                "dependencies": tc.dependencies.get(i, []),
                            }
                        )
            except Exception as e:
                print(f"Error getting GitHub issues: {e}")
                # Use defaults
                for i in range(1, 13):
                    issues_data.append(
                        {
                            "number": i,
                            "title": f"Issue #{i}",
                            "status": "blocked" if i > 1 else "available",
                            "agent": None,
                            "dependencies": tc.dependencies.get(i, []),
                        }
                    )

            return {"agents": agents, "issues": issues_data, "timestamp": time.time()}

        except Exception as e:
            print(f"Error getting status: {e}")
            return self.get_mock_status()

    def get_mock_status(self):
        """Get mock status for testing"""
        return {
            "agents": [
                {"id": "2d783198", "task": 1, "status": "working"},
                {"id": "mock-001", "task": None, "status": "idle"},
            ],
            "issues": [
                {
                    "number": i,
                    "title": f"Deliverable {i}",
                    "status": "in-progress" if i == 1 else "blocked",
                    "agent": "2d783198" if i == 1 else None,
                    "dependencies": self.get_mock_dependencies(i),
                }
                for i in range(1, 13)
            ],
            "timestamp": time.time(),
        }

    def get_mock_dependencies(self, issue_num):
        """Get mock dependencies"""
        deps = {
            1: [],
            2: [1],
            3: [1],
            4: [1],
            5: [1],
            6: [1],
            7: [2],
            8: [1],
            9: [2, 3, 4, 5, 6, 8],
            10: [2, 3, 4, 5, 6, 8],
            11: [1],
            12: [7],
        }
        return deps.get(issue_num, [])

    def refresh_status(self):
        """Force refresh of status"""
        return self.get_status()

    def run_command(self, command):
        """Run a coordination command"""
        valid_commands = ["task-status", "next-task", "task-release", "task-complete"]

        if command not in valid_commands:
            return {"error": "Invalid command", "output": ""}

        try:
            # Run the command
            result = subprocess.run(
                [f"./{command}"],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=Path(__file__).parent,
            )

            output = result.stdout
            if result.stderr:
                output += f"\n\nErrors:\n{result.stderr}"

            return {
                "command": command,
                "output": output,
                "exit_code": result.returncode,
                "timestamp": datetime.now().isoformat(),
            }
        except subprocess.TimeoutExpired:
            return {
                "error": "Command timeout",
                "output": "Command took too long to execute",
            }
        except Exception as e:
            return {"error": str(e), "output": f"Error executing command: {e}"}

    def log_message(self, format, *args):
        """Suppress default logging"""
        if "/api/" in format % args:
            # Only log API calls
            super().log_message(format, *args)
        # Suppress other logs for cleaner output


def find_available_port(start_port=8080, max_port=8999):
    """Find an available port in the given range"""
    import socket

    for port in range(start_port, max_port + 1):
        try:
            # Try to bind to the port
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("", port))
                s.close()
                return port
        except OSError:
            # Port is in use, try next one
            continue

    raise RuntimeError(f"No available ports found in range {start_port}-{max_port}")


def main():
    """Run the coordination dashboard server"""
    # Try to find an available port
    try:
        port = find_available_port()
    except RuntimeError as e:
        print(f"❌ Error: {e}")
        print("Please try closing other applications or using a different port range.")
        return

    server_address = ("", port)

    print(
        f"""
╔════════════════════════════════════════════════════════════╗
║     🚀 Multi-Agent Coordination Dashboard Server          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Dashboard URL:  http://localhost:{port:<5}                    ║
║  API Status:     http://localhost:{port}/api/status        ║
║                                                            ║
║  Press Ctrl+C to stop the server                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """
    )

    httpd = HTTPServer(server_address, CoordinatorAPIHandler)

    try:
        print(f"Server running on port {port}...")
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down server...")
        httpd.shutdown()
        print("Server stopped.")


if __name__ == "__main__":
    main()
