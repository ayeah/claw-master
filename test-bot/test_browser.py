"""
Browser E2E tests runner - invokes Playwright-based browser tests via Node.js
"""
import subprocess
import json
import sys
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).parent
TEST_LOGS_DIR = SCRIPT_DIR / 'test-logs'


def run_browser_tests():
    """Run the Playwright E2E browser tests"""
    print('\033[36m' + '=' * 50 + '\033[0m')
    print('\033[36m Starting Browser E2E Tests (Playwright)\033[0m')
    print('\033[36m' + '=' * 50 + '\033[0m')

    js_script = SCRIPT_DIR / 'test_browser.js'
    if not js_script.exists():
        print(f'\033[31mFAIL: {js_script} not found\033[0m')
        return None

    # Find node executable - check common paths
    import shutil
    node_cmd = shutil.which('node')
    if not node_cmd:
        # Try Windows node from WSL
        for candidate in ['/mnt/d/nodejs/node.exe', '/usr/local/bin/node', '/usr/bin/node']:
            if Path(candidate).exists():
                node_cmd = candidate
                break

    if not node_cmd:
        print('\033[33mWARN: node not found, skipping browser tests\033[0m')
        return 0

    # Convert WSL paths to Windows paths for node.exe
    js_script_win = js_script
    cwd_win = str(SCRIPT_DIR)
    try:
        result_wslpath = subprocess.run(['wslpath', '-w', str(js_script)], capture_output=True, text=True)
        if result_wslpath.returncode == 0:
            js_script_win = Path(result_wslpath.stdout.strip())
        result_cwd = subprocess.run(['wslpath', '-w', str(SCRIPT_DIR)], capture_output=True, text=True)
        if result_cwd.returncode == 0:
            cwd_win = result_cwd.stdout.strip()
    except FileNotFoundError:
        pass

    try:
        result = subprocess.run(
            [node_cmd, str(js_script_win)],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=cwd_win,
        )
        print(result.stdout)
        if result.stderr:
            print(f'\033[33mSTDERR: {result.stderr}\033[0m')
        return result.returncode
    except subprocess.TimeoutExpired:
        print('\033[31mFAIL: Browser tests timed out after 120s\033[0m')
        return 1
    except FileNotFoundError:
        print('\033[31mFAIL: node not found. Ensure Node.js is installed.\033[0m')
        return 1


def find_latest_report():
    """Find the most recent browser report in test-logs/"""
    if not TEST_LOGS_DIR.exists():
        return None
    report_dirs = sorted(
        [d for d in TEST_LOGS_DIR.iterdir() if d.is_dir() and d.name[0] == '2'],
        reverse=True
    )
    for d in report_dirs:
        report_json = d / 'report.json'
        if report_json.exists():
            return report_json
    return None


def parse_report(report_path):
    """Parse a browser report JSON and return list of test results"""
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            report = json.load(f)
        return report.get('results', [])
    except Exception as e:
        print(f'\033[33mWARN: Could not parse report: {e}\033[0m')
        return []


if __name__ == '__main__':
    exit_code = run_browser_tests()
    if exit_code is None:
        sys.exit(1)
    sys.exit(exit_code)
