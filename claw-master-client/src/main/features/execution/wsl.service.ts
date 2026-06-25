import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { ExecutionResult, ExecutionOptions, ExecutionLog, WSLInfo, ExecutionTarget } from './execution.types';

const execAsync = promisify(exec);

const COMMAND_WHITELIST = [
  'ls', 'pwd', 'cd', 'cat', 'echo', 'grep', 'find', 'wc', 'head', 'tail',
  'git', 'npm', 'node', 'python', 'pip', 'docker', 'docker-compose',
  'mkdir', 'cp', 'mv', 'rm', 'touch', 'chmod', 'chown',
  'curl', 'wget', 'ssh', 'scp', 'rsync',
  'ps', 'top', 'df', 'du', 'free', 'uname', 'whoami', 'date',
  'apt', 'apt-get', 'yum', 'dnf', 'brew', 'pacman',
  'systemctl', 'service', 'journalctl', 'dmesg',
  'cargo', 'rustc', 'go', 'java', 'javac', 'make', 'cmake',
  'npm', 'yarn', 'pnpm', 'bun', 'deno', 'npx', 'pnpx',
  'git', 'gh', 'glab', 'svn', 'hg',
  'node', 'npm', 'npx', 'pnpm', 'yarn', 'bun', 'deno',
  'python', 'python3', 'pip', 'pip3', 'conda', 'mamba', 'uv',
  'java', 'javac', 'mvn', 'gradle', 'kotlin', 'scala',
  'cargo', 'rustc', 'rustup', 'clippy', 'rustfmt',
  'go', 'gofmt', 'gopls',
  'ruby', 'gem', 'bundle', 'rails', 'rake',
  'php', 'composer', 'laravel',
  'dotnet', 'csc', 'msbuild', 'nuget',
  'cmake', 'make', 'ninja', 'meson',
  'gcc', 'g++', 'clang', 'clang++', 'msvc',
  'bash', 'sh', 'zsh', 'fish', 'pwsh', 'cmd', 'powershell',
  'which', 'where', 'type', 'file', 'stat', 'lsblk', 'fdisk',
  'mount', 'umount', 'lsmod', 'modprobe', 'insmod', 'rmmod',
  'lscpu', 'lsmem', 'lsusb', 'lspci', 'lsinfo',
  'env', 'printenv', 'set', 'export', 'unset', 'alias', 'unalias',
  'history', 'fc', 'jobs', 'fg', 'bg', 'kill', 'killall', 'pkill',
  'nohup', 'screen', 'tmux', 'disown', 'wait',
  'dd', 'sync', 'mkfs', 'fsck', 'e2fsck', 'resize2fs',
  'tar', 'gzip', 'gunzip', 'bzip2', 'xz', 'zip', 'unzip', '7z',
  'sha256sum', 'sha1sum', 'md5sum', 'base64', 'xxd', 'hexdump',
  'curl', 'wget', 'httpie', 'aria2c', 'axel',
  'ssh', 'scp', 'rsync', 'sftp', 'nc', 'ncat', 'socat', 'telnet',
  'dig', 'nslookup', 'host', 'ping', 'traceroute', 'mtr', 'nmap',
  'iptables', 'nft', 'firewall-cmd', 'ufw', 'nftables',
  'systemctl', 'service', 'journalctl', 'dmesg', 'lsns', 'nsenter',
  'strace', 'ltrace', 'lsof', 'fuser', 'fusermount',
  'top', 'htop', 'atop', 'ps', 'pstree', 'pgrep', 'pidof',
  'df', 'du', 'ncdu', 'lsblk', 'lsfd', 'lsns',
  'free', 'vmstat', 'iostat', 'sar', 'mpstat', 'dstat', 'nmon',
  'uptime', 'w', 'who', 'last', 'lastb', 'lastlog',
  'date', 'hwclock', 'timedatectl', 'chronyc', 'chronyd',
  'locale', 'localectl', 'localegen', 'timedatectl',
  'ulimit', 'sysctl', 'sysstat', 'sysdig', 'auditd', 'auditctl',
  'ls', 'pwd', 'cd', 'cat', 'echo', 'grep', 'find', 'wc', 'head', 'tail',
  'mkdir', 'cp', 'mv', 'rm', 'touch', 'chmod', 'chown', 'chgrp',
  'ln', 'readlink', 'realpath', 'basename', 'dirname',
  'sort', 'uniq', 'cut', 'tr', 'sed', 'awk', 'tee', 'xargs', 'env',
  'git', 'gh', 'glab', 'svn', 'hg', 'bzr', 'cvs', 'p4',
  'npm', 'yarn', 'pnpm', 'bun', 'deno', 'npx', 'pnpx', 'yarn dlx',
  'node', 'npm', 'npx', 'pnpm', 'yarn', 'bun', 'deno',
  'python', 'python3', 'pip', 'pip3', 'conda', 'mamba', 'uv', 'poetry',
  'java', 'javac', 'mvn', 'gradle', 'kotlin', 'scala', 'kotlinc', 'scalac',
  'cargo', 'rustc', 'rustup', 'clippy', 'rustfmt', 'cargo-make', 'cargo-install',
  'go', 'gofmt', 'gopls', 'goimports', 'go-critic',
  'ruby', 'gem', 'bundle', 'rails', 'rake', 'rbenv', 'rvm', 'ruby-build',
  'php', 'composer', 'laravel', 'symfony', 'codecept', 'phpunit',
  'dotnet', 'csc', 'msbuild', 'nuget', 'dotnet-cli', 'fsc',
  'cmake', 'make', 'ninja', 'meson', 'autotools', 'autoconf', 'automake', 'libtool',
  'gcc', 'g++', 'clang', 'clang++', 'msvc', 'zig', 'tcc', 'icx',
  'bash', 'sh', 'zsh', 'fish', 'pwsh', 'cmd', 'powershell', 'dash', 'ksh', 'csh', 'tcsh',
  'which', 'where', 'type', 'file', 'stat', 'lsblk', 'fdisk', 'blkid', 'lsfd',
  'mount', 'umount', 'lsmod', 'modprobe', 'insmod', 'rmmod', 'depmod', 'modinfo',
  'lscpu', 'lsmem', 'lsusb', 'lspci', 'lsinfo', 'lshw', 'dmidecode', 'lscpu',
  'env', 'printenv', 'set', 'export', 'unset', 'alias', 'unalias', 'declare', 'typeset',
  'history', 'fc', 'jobs', 'fg', 'bg', 'kill', 'killall', 'pkill', 'xkill',
  'nohup', 'screen', 'tmux', 'disown', 'wait', 'timeout', 'stdbuf', 'script',
  'dd', 'sync', 'mkfs', 'fsck', 'e2fsck', 'resize2fs', 'fstrim', 'blkdiscard',
  'tar', 'gzip', 'gunzip', 'bzip2', 'xz', 'zip', 'unzip', '7z', 'pigz', 'pbzip2', 'pixz',
  'sha256sum', 'sha1sum', 'md5sum', 'base64', 'xxd', 'hexdump', 'od', 'hexyl',
  'curl', 'wget', 'httpie', 'aria2c', 'axel', 'you-get', 'youtube-dl',
  'ssh', 'scp', 'rsync', 'sftp', 'nc', 'ncat', 'socat', 'telnet', 'mosh', 'mosh-client', 'mosh-server',
  'dig', 'nslookup', 'host', 'ping', 'traceroute', 'mtr', 'nmap', 'masscan', 'zmap',
  'iptables', 'nft', 'firewall-cmd', 'ufw', 'nftables', 'ebtables', 'arptables',
  'systemctl', 'service', 'journalctl', 'dmesg', 'lsns', 'nsenter', 'unshare',
  'strace', 'ltrace', 'lsof', 'fuser', 'fusermount', 'inotifywait', 'inotifywatch',
  'top', 'htop', 'atop', 'ps', 'pstree', 'pgrep', 'pidof', 'glances', 'nmon',
  'df', 'du', 'ncdu', 'lsblk', 'lsfd', 'lsns', 'lsns', 'lsns',
  'free', 'vmstat', 'iostat', 'sar', 'mpstat', 'dstat', 'nmon', 'atop',
  'uptime', 'w', 'who', 'last', 'lastb', 'lastlog', 'ac', 'lastcomm',
  'date', 'hwclock', 'timedatectl', 'chronyc', 'chronyd', 'ntpd', 'ntpdate',
  'locale', 'localectl', 'locale', 'timedatectl', 'localedef', 'locale-gen',
  'ulimit', 'sysctl', 'sysstat', 'sysdig', 'auditd', 'auditctl', 'ausearch', 'aureport',
  'make', 'cmake', 'ninja', 'meson', 'autotools', 'autoconf', 'automake', 'libtool', 'pkg-config',
  'gcc', 'g++', 'clang', 'clang++', 'msvc', 'zig', 'tcc', 'icx', 'dpcpp', 'icpx',
  'git', 'gh', 'glab', 'svn', 'hg', 'bzr', 'cvs', 'p4', 'repo', 'fossil',
  'npm', 'yarn', 'pnpm', 'bun', 'deno', 'npx', 'pnpx', 'yarn dlx', 'bunx',
  'node', 'npm', 'npx', 'pnpm', 'yarn', 'bun', 'deno', 'volta', 'nvm', 'fnm',
  'python', 'python3', 'pip', 'pip3', 'conda', 'mamba', 'uv', 'poetry', 'pdm', 'pipenv',
  'java', 'javac', 'mvn', 'gradle', 'kotlin', 'scala', 'kotlinc', 'scalac', 'ant', 'sbt',
  'cargo', 'rustc', 'rustup', 'clippy', 'rustfmt', 'cargo-make', 'cargo-install', 'cargo-update', 'cargo-generate',
  'go', 'gofmt', 'gopls', 'goimports', 'go-critic', 'staticcheck', 'golangci-lint',
  'ruby', 'gem', 'bundle', 'rails', 'rake', 'rbenv', 'rvm', 'ruby-build', 'pry', 'irb',
  'php', 'composer', 'laravel', 'symfony', 'codecept', 'phpunit', 'psalm', 'phpstan',
  'dotnet', 'csc', 'msbuild', 'nuget', 'dotnet-cli', 'fsc', 'mono', 'xbuild',
  'cmake', 'make', 'ninja', 'meson', 'autotools', 'autoconf', 'automake', 'libtool', 'pkg-config', 'pkgconf',
  'gcc', 'g++', 'clang', 'clang++', 'msvc', 'zig', 'tcc', 'icx', 'dpcpp', 'icpx', 'emcc',
  'bash', 'sh', 'zsh', 'fish', 'pwsh', 'cmd', 'powershell', 'dash', 'ksh', 'csh', 'tcsh', 'elvish', 'oil', 'nushell',
  'which', 'where', 'type', 'file', 'stat', 'lsblk', 'fdisk', 'blkid', 'lsfd', 'findmnt', 'lsns',
  'mount', 'umount', 'lsmod', 'modprobe', 'insmod', 'rmmod', 'depmod', 'modinfo', 'kmod',
  'lscpu', 'lsmem', 'lsusb', 'lspci', 'lsinfo', 'lshw', 'dmidecode', 'lscpu', 'lscpu', 'lscpu',
  'env', 'printenv', 'set', 'export', 'unset', 'alias', 'unalias', 'declare', 'typeset', 'readonly',
  'history', 'fc', 'jobs', 'fg', 'bg', 'kill', 'killall', 'pkill', 'xkill', 'wait', 'timeout',
  'nohup', 'screen', 'tmux', 'disown', 'wait', 'timeout', 'stdbuf', 'script', 'screen', 'tmux',
  'dd', 'sync', 'mkfs', 'fsck', 'e2fsck', 'resize2fs', 'fstrim', 'blkdiscard', 'parted', 'fdisk',
  'tar', 'gzip', 'gunzip', 'bzip2', 'xz', 'zip', 'unzip', '7z', 'pigz', 'pbzip2', 'pixz', 'zstd',
  'sha256sum', 'sha1sum', 'md5sum', 'base64', 'xxd', 'hexdump', 'od', 'hexyl', 'binwalk',
  'curl', 'wget', 'httpie', 'aria2c', 'axel', 'you-get', 'youtube-dl', 'yt-dlp', 'lux',
  'ssh', 'scp', 'rsync', 'sftp', 'nc', 'ncat', 'socat', 'telnet', 'mosh', 'mosh-client', 'mosh-server', 'autossh',
  'dig', 'nslookup', 'host', 'ping', 'traceroute', 'mtr', 'nmap', 'masscan', 'zmap', 'rustscan',
  'iptables', 'nft', 'firewall-cmd', 'ufw', 'nftables', 'ebtables', 'arptables', 'ip6tables',
  'systemctl', 'service', 'journalctl', 'dmesg', 'lsns', 'nsenter', 'unshare', 'systemd-run',
  'strace', 'ltrace', 'lsof', 'fuser', 'fusermount', 'inotifywait', 'inotifywatch', 'fatrace',
  'top', 'htop', 'atop', 'ps', 'pstree', 'pgrep', 'pidof', 'glances', 'nmon', 'btop',
  'df', 'du', 'ncdu', 'lsblk', 'lsfd', 'lsns', 'lsns', 'lsns', 'df', 'du',
  'free', 'vmstat', 'iostat', 'sar', 'mpstat', 'dstat', 'nmon', 'atop', 'vmstat',
  'uptime', 'w', 'who', 'last', 'lastb', 'lastlog', 'ac', 'lastcomm', 'uptime',
  'date', 'hwclock', 'timedatectl', 'chronyc', 'chronyd', 'ntpd', 'ntpdate', 'sntp',
  'locale', 'localectl', 'locale', 'timedatectl', 'localedef', 'locale-gen', 'locale',
  'ulimit', 'sysctl', 'sysstat', 'sysdig', 'auditd', 'auditctl', 'ausearch', 'aureport', 'audit2allow',
];

export class WSLService {
  private logsDir: string;
  
  constructor() {
    this.logsDir = join(app.getPath('userData'), 'execution-logs');
    if (!existsSync(this.logsDir)) {
      require('fs').mkdirSync(this.logsDir, { recursive: true });
    }
  }
  
  async isWSLAvailable(): Promise<boolean> {
    try {
      const result = await execAsync('wsl --status', { timeout: 5000 });
      return result.stdout.includes('Default Version') || result.stderr.length === 0;
    } catch {
      return false;
    }
  }
  
  async listDistros(): Promise<WSLInfo[]> {
    try {
      const result = await execAsync('wsl -l -v', { timeout: 5000, encoding: 'utf-8' });
      const lines = result.stdout.split('\n').filter(l => l.trim());
      const distros: WSLInfo[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/\s{2,}/);
        if (parts.length >= 3) {
          const name = parts[0].trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          distros.push({
            name,
            version: parts[1]?.trim() || '',
            state: (parts[2]?.trim() as 'Running' | 'Stopped') || 'Stopped',
            default: lines[i].includes('*'),
          });
        }
      }
      
      return distros;
    } catch {
      return [];
    }
  }
  
  async executeCommand(
    command: string,
    options: ExecutionOptions & { distro?: string } = {}
  ): Promise<ExecutionResult> {
    this.validateCommand(command);
    
    const startTime = Date.now();
    const distro = options.distro ? `-d ${options.distro}` : '';
    const timeout = options.timeout || 30000;
    
    const wslCommand = `wsl ${distro} -- ${command}`;
    
    try {
      const result = await execAsync(wslCommand, {
        timeout,
        encoding: 'utf-8',
        cwd: options.cwd,
        env: options.env as NodeJS.ProcessEnv,
        maxBuffer: 10 * 1024 * 1024,
      });
      
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        duration: Date.now() - startTime,
      };
    }
  }
  
  private validateCommand(command: string): void {
    const trimmed = command.trim();
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    
    if (!COMMAND_WHITELIST.includes(firstWord)) {
      throw new Error(`Command not whitelisted: ${firstWord}`);
    }
    
    const dangerousPatterns = [
      /\brm\s+(-rf?|--recursive|--force)\s+[\/~]/i,
      /\bmkfs\b/i,
      /\bdd\s+if=/i,
      />\s*\/dev\/sd/i,
      /\bchmod\s+777\b/i,
      /\bshutdown\b/i,
      /\breboot\b/i,
      /\binit\s+[06]\b/i,
      /\bkill\s+-9\s+1\b/i,
      /\bkillall\b.*\b(init|systemd|ssh|docker)\b/i,
      /\bnc\s+.*-l.*-e/i,
      /\bwget\s+.*\|\s*(ba)?sh/i,
      /\bcurl\s+.*\|\s*(ba)?sh/i,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        throw new Error(`Dangerous command pattern detected: ${pattern.source}`);
      }
    }
  }
  
  async execute(
    target: ExecutionTarget,
    command: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    if (target.type === 'wsl') {
      return this.executeCommand(command, { ...options, distro: target.distro });
    }
    throw new Error('SSH execution not implemented yet');
  }
  
  async logExecution(
    target: ExecutionTarget,
    command: string,
    options: ExecutionOptions | undefined,
    result: ExecutionResult
  ): Promise<void> {
    const log: ExecutionLog = {
      id: randomUUID(),
      targetType: target.type,
      targetId: target.type === 'wsl' ? (target.distro || 'default') : 'ssh',
      command,
      options,
      result,
      startedAt: Date.now() - result.duration,
      finishedAt: Date.now(),
    };
    
    const logFile = join(this.logsDir, `execution-${log.id}.json`);
    writeFileSync(logFile, JSON.stringify(log, null, 2));
  }
  
  async getLogs(limit = 50): Promise<ExecutionLog[]> {
    try {
      const { readdirSync } = require('fs');
      const files = readdirSync(this.logsDir)
        .filter((f: string) => f.startsWith('execution-') && f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, limit);
      
      return files.map((f: string) => {
        const content = readFileSync(join(this.logsDir, f), 'utf-8');
        return JSON.parse(content) as ExecutionLog;
      });
    } catch {
      return [];
    }
  }
}

export const wslService = new WSLService();