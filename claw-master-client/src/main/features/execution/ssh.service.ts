import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { Client } from 'ssh2';
import { SSHConnection, SSHTestResult, ExecutionResult, ExecutionOptions } from './execution.types';

const CONNECTIONS_FILE = 'ssh-connections.json';

export class SSHService {
  private connectionsDir: string;
  private connections: SSHConnection[] = [];
  
  constructor() {
    this.connectionsDir = join(app.getPath('userData'), 'ssh-connections');
    if (!existsSync(this.connectionsDir)) {
      mkdirSync(this.connectionsDir, { recursive: true });
    }
    this.loadConnections();
  }
  
  private getFilePath(): string {
    return join(this.connectionsDir, CONNECTIONS_FILE);
  }
  
  private loadConnections(): void {
    const filePath = this.getFilePath();
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf-8');
      this.connections = JSON.parse(data);
    }
  }
  
  private saveConnections(): void {
    writeFileSync(this.getFilePath(), JSON.stringify(this.connections, null, 2));
  }
  
  private createSSHClient(conn: SSHConnection): Promise<Client> {
    return new Promise((resolve, reject) => {
      const client = new Client();
      const timeout = setTimeout(() => {
        client.end();
        reject(new Error('连接超时'));
      }, 15000);

      client.on('ready', () => {
        clearTimeout(timeout);
        resolve(client);
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      const connectOptions: any = {
        host: conn.host,
        port: conn.port,
        username: conn.username,
        readyTimeout: 15000,
        algorithms: {
          kex: [
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521',
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group14-sha1',
          ],
        },
      };

      if (conn.authType === 'key' && conn.keyPath) {
        try {
          connectOptions.privateKey = readFileSync(conn.keyPath);
          if (conn.keyPassphrase) {
            connectOptions.passphrase = conn.keyPassphrase;
          }
        } catch (err: any) {
          clearTimeout(timeout);
          reject(new Error(`无法读取私钥文件: ${err.message}`));
          return;
        }
      } else if (conn.password) {
        connectOptions.password = conn.password;
      }

      client.connect(connectOptions);
    });
  }
  
  private async executeOnClient(client: Client, command: string, timeout: number = 30000): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          client.end();
          resolve({
            stdout,
            stderr: stderr || '命令执行超时',
            exitCode: 1,
            duration: Date.now() - startTime,
          });
        }
      }, timeout);

      client.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          resolved = true;
          client.end();
          resolve({
            stdout: '',
            stderr: err.message,
            exitCode: 1,
            duration: Date.now() - startTime,
          });
          return;
        }

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('close', (code: number) => {
          if (!resolved) {
            clearTimeout(timer);
            resolved = true;
            client.end();
            resolve({
              stdout,
              stderr,
              exitCode: code ?? 0,
              duration: Date.now() - startTime,
            });
          }
        });
      });
    });
  }
  
  async createConnection(data: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<SSHConnection> {
    const connection: SSHConnection = {
      ...data,
      id: randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.connections.push(connection);
    this.saveConnections();
    return connection;
  }
  
  async listConnections(): Promise<SSHConnection[]> {
    return this.connections.map(c => ({
      ...c,
      password: c.password ? '***' : undefined,
      privateKey: undefined,
      keyPassphrase: undefined,
    }));
  }
  
  async getConnection(id: string): Promise<SSHConnection | null> {
    return this.connections.find(c => c.id === id) || null;
  }
  
  async updateConnection(id: string, data: Partial<SSHConnection>): Promise<SSHConnection | null> {
    const index = this.connections.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    this.connections[index] = {
      ...this.connections[index],
      ...data,
      id,
      updatedAt: Date.now(),
    };
    this.saveConnections();
    return this.connections[index];
  }
  
  async deleteConnection(id: string): Promise<boolean> {
    const index = this.connections.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    this.connections.splice(index, 1);
    this.saveConnections();
    return true;
  }
  
  async testConnection(id: string): Promise<ExecutionResult> {
    const conn = this.connections.find(c => c.id === id);
    if (!conn) {
      return { stdout: '', stderr: 'Connection not found', exitCode: 1, duration: 0 };
    }
    
    return this.executeCommand(id, 'echo "Connection successful" && uname -a');
  }
  
  async testConnectionFull(id: string): Promise<SSHTestResult> {
    const conn = this.connections.find(c => c.id === id);
    if (!conn) {
      return {
        login: { success: false, error: 'Connection not found', details: '连接配置不存在' },
        docker: { available: false, error: 'Connection not found', details: '连接配置不存在' },
        sudo: { available: false, error: 'Connection not found', details: '连接配置不存在' },
      };
    }
    
    const result: SSHTestResult = {
      login: { success: false },
      docker: { available: false },
      sudo: { available: false },
    };
    
    // Test 1: Login
    const loginStart = Date.now();
    try {
      const client = await this.createSSHClient(conn);
      result.login.latency = Date.now() - loginStart;
      
      const loginResult = await this.executeOnClient(client, 'echo "login_ok" && hostname && whoami');
      client.end();
      
      if (loginResult.exitCode === 0 && loginResult.stdout.includes('login_ok')) {
        result.login.success = true;
        const lines = loginResult.stdout.split('\n').filter(l => l.trim());
        result.login.hostname = lines[1]?.trim();
        result.login.username = lines[2]?.trim();
      } else {
        result.login.error = loginResult.stderr || loginResult.stdout || 'Login failed';
        result.login.details = this.parseSSLError(loginResult.stderr, loginResult.stdout, conn);
        result.login.exitCode = loginResult.exitCode;
        result.login.rawOutput = (loginResult.stdout + '\n' + loginResult.stderr).trim();
        return result;
      }
    } catch (err: any) {
      result.login.latency = Date.now() - loginStart;
      result.login.error = err.message || 'Connection failed';
      result.login.details = this.parseSSLError(err.message, '', conn);
      return result;
    }
    
    // Test 2: Docker
    try {
      const client = await this.createSSHClient(conn);
      const dockerResult = await this.executeOnClient(client, 'docker --version 2>&1 || echo "DOCKER_NOT_FOUND"');
      client.end();
      
      if (dockerResult.exitCode === 0 && !dockerResult.stdout.includes('DOCKER_NOT_FOUND')) {
        result.docker.available = true;
        const versionMatch = dockerResult.stdout.match(/Docker version ([\d.]+)/);
        result.docker.version = versionMatch ? versionMatch[1] : dockerResult.stdout.trim();
      } else {
        result.docker.error = 'Docker 未安装或无法访问';
        result.docker.details = '请在服务器上执行以下命令安装 Docker:\ncurl -fsSL https://get.docker.com | sh\n\n安装后将用户加入 docker 组:\nsudo usermod -aG docker $USER\n\n然后重新登录生效。';
      }
    } catch {
      result.docker.error = '检测 Docker 时连接失败';
    }
    
    // Test 3: Sudo (only if sudoPassword is provided)
    if (conn.sudoPassword) {
      try {
        const client = await this.createSSHClient(conn);
        const sudoResult = await this.executeOnClient(client, `echo '${conn.sudoPassword.replace(/'/g, "'\\''")}' | sudo -S -k whoami 2>&1`);
        client.end();
        
        if (sudoResult.exitCode === 0 && sudoResult.stdout.includes('root')) {
          result.sudo.available = true;
        } else {
          result.sudo.error = 'sudo 密码验证失败';
          result.sudo.details = this.parseSudoError(sudoResult.stderr, sudoResult.stdout);
          result.sudo.rawOutput = (sudoResult.stdout + '\n' + sudoResult.stderr).trim();
        }
      } catch {
        result.sudo.error = '检测 sudo 时连接失败';
      }
    } else {
      result.sudo.error = '未提供 sudo 密码';
      result.sudo.details = '如需在服务器上执行需要 root 权限的操作（如安装软件、管理服务等），请在添加连接时填写 Sudo 密码。';
    }
    
    return result;
  }
  
  private parseSSLError(stderr: string, stdout: string, conn: any): string {
    const output = (stderr + '\n' + stdout).toLowerCase();
    
    if (output.includes('connection refused')) {
      return `连接被拒绝。服务器 ${conn.host}:${conn.port} 上的 SSH 服务可能未运行。\n\n请在服务器上执行:\nsudo systemctl start sshd\nsudo systemctl enable sshd`;
    }
    if (output.includes('connection timed out') || output.includes('connect timeout') || output.includes('连接超时')) {
      return `连接超时。无法在 15 秒内连接到 ${conn.host}:${conn.port}。\n\n可能原因:\n1. IP 地址或端口不正确\n2. 防火墙阻止了 SSH 连接\n3. 服务器不可达\n\n请检查:\n- IP 地址和端口是否正确\n- 防火墙规则: sudo ufw status\n- 服务器网络连接是否正常`;
    }
    if (output.includes('no route to host')) {
      return `无法路由到主机 ${conn.host}。\n\n请检查:\n1. IP 地址是否正确\n2. 网络连接是否正常\n3. 是否在同一网络或已配置 VPN`;
    }
    if (output.includes('host key verification failed') || output.includes('handshake failed') || output.includes('invalid key')) {
      return `主机密钥验证失败。\n\n请执行以下命令清除旧密钥:\nssh-keygen -R ${conn.host}`;
    }
    if (output.includes('permission denied') || output.includes('authentication failed') || output.includes('auth')) {
      return `认证失败。用户名或密码不正确。\n\n请确认:\n1. 用户名是否正确: ${conn.username}\n2. 密码是否正确\n3. 服务器是否允许密码登录 (PasswordAuthentication yes)`;
    }
    if (output.includes('network is unreachable')) {
      return `网络不可达。\n\n请检查:\n1. 本机网络连接\n2. 是否需要 VPN 连接\n3. 路由配置是否正确`;
    }
    if (output.includes('econnrefused') || output.includes('econnreset')) {
      return `连接被拒绝或重置。服务器 ${conn.host}:${conn.port} 可能未运行 SSH 服务。`;
    }
    
    return `SSH 连接失败。\n\n原始错误信息:\n${stderr || stdout || '无'}`;
  }
  
  private parseSudoError(stderr: string, stdout: string): string {
    const output = (stderr + '\n' + stdout).toLowerCase();
    
    if (output.includes('sorry, try again')) {
      return 'sudo 密码不正确。请检查密码是否区分大小写。';
    }
    if (output.includes('not in the sudoers')) {
      return `用户不在 sudoers 文件中，没有 sudo 权限。\n\n请联系服务器管理员执行:\nsudo usermod -aG sudo ${stdout.split('\n')[0]?.trim() || 'username'}`;
    }
    if (output.includes('no tty present')) {
      return '无法分配 TTY。SSH 连接可能需要配置 RequestTTY。\n\n请在 ~/.ssh/config 中添加:\nHost *\n  RequestTTY yes';
    }
    
    return `sudo 执行失败。\n\n原始错误信息:\n${stderr || stdout || '无'}`;
  }
  
  async executeCommand(
    connectionId: string,
    command: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const conn = this.connections.find(c => c.id === connectionId);
    if (!conn) {
      return { stdout: '', stderr: 'Connection not found', exitCode: 1, duration: 0 };
    }
    
    const timeout = options.timeout || 30000;
    
    try {
      const client = await this.createSSHClient(conn);
      const result = await this.executeOnClient(client, command, timeout);
      return result;
    } catch (err: any) {
      return {
        stdout: '',
        stderr: err.message || 'SSH 连接失败',
        exitCode: 1,
        duration: 0,
      };
    }
  }
  
  async detectAgents(connectionId: string): Promise<Array<{name: string; type: string; port?: number; status: string; path?: string}>> {
    const agents: Array<{name: string; type: string; port?: number; status: string; path?: string}> = [];
    
    const conn = this.connections.find(c => c.id === connectionId);
    if (!conn) return agents;

    let client: any;
    try {
      client = await this.createSSHClient(conn);
    } catch {
      return agents;
    }

    const combinedCmd = [
      `ps aux | grep -E "(openclaw|hermes|agent|llama|ollama|vllm|text-generation|kobold)" | grep -v grep || echo "NO_AGENTS"`,
      `echo "---PORTS---" && (netstat -tlnp 2>/dev/null | grep -E ":(11434|8080|5000|8000|3000|9090)" || ss -tlnp 2>/dev/null | grep -E ":(11434|8080|5000|8000|3000|9090)" || echo "NO_PORTS")`,
      `echo "---SERVICES---" && (systemctl list-units --type=service --state=running 2>/dev/null | grep -E "(openclaw|hermes|ollama|llama|agent)" || echo "NO_SERVICES")`,
    ].join(' && ');

    try {
      const result = await this.executeOnClient(client, combinedCmd, 20000);
      client.end();

      const sections = result.stdout.split('---');
      
      // Parse processes
      const procSection = sections[0] || '';
      if (result.exitCode === 0 && !procSection.includes('NO_AGENTS')) {
        const lines = procSection.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const parts = line.split(/\s+/);
          const cmd = parts.slice(10).join(' ');
          if (cmd.includes('openclaw') || cmd.includes('OpenClaw')) {
            agents.push({ name: 'OpenClaw', type: 'openclaw', status: 'running', path: cmd });
          } else if (cmd.includes('hermes') || cmd.includes('Hermes')) {
            agents.push({ name: 'Hermes', type: 'hermes', status: 'running', path: cmd });
          } else if (cmd.includes('ollama')) {
            agents.push({ name: 'Ollama', type: 'ollama', status: 'running', path: cmd });
          } else if (cmd.includes('vllm')) {
            agents.push({ name: 'vLLM', type: 'vllm', status: 'running', path: cmd });
          } else if (cmd.includes('llama.cpp') || cmd.includes('llama-cpp')) {
            agents.push({ name: 'LLaMA.cpp', type: 'llama-cpp', status: 'running', path: cmd });
          }
        }
      }

      // Parse ports
      const portSection = sections.find(s => s.includes('PORTS')) || '';
      if (!portSection.includes('NO_PORTS')) {
        const portLines = portSection.split('\n').filter(l => l.trim());
        for (const line of portLines) {
          const portMatch = line.match(/:(\d+)/);
          if (portMatch) {
            const port = parseInt(portMatch[1]);
            if (!agents.find(a => a.port === port)) {
              if (port === 11434) {
                agents.push({ name: 'Ollama', type: 'ollama', port, status: 'listening' });
              } else if (port === 8080 || port === 5000 || port === 8000) {
                agents.push({ name: 'API Server', type: 'api-server', port, status: 'listening' });
              }
            }
          }
        }
      }

      // Parse services
      const svcSection = sections.find(s => s.includes('SERVICES')) || '';
      if (!svcSection.includes('NO_SERVICES')) {
        const serviceLines = svcSection.split('\n').filter(l => l.trim());
        for (const line of serviceLines) {
          const parts = line.split(/\s+/);
          const serviceName = parts[0];
          if (serviceName && !agents.find(a => a.name.toLowerCase() === serviceName.replace('.service', ''))) {
            agents.push({ 
              name: serviceName.replace('.service', ''), 
              type: 'systemd-service', 
              status: 'running',
              path: `/etc/systemd/system/${serviceName}`
            });
          }
        }
      }
    } catch {
      try { client.end(); } catch {}
    }

    return agents;
  }
  
  async uploadFile(
    connectionId: string,
    localPath: string,
    remotePath: string
  ): Promise<ExecutionResult> {
    const conn = this.connections.find(c => c.id === connectionId);
    if (!conn) {
      return { stdout: '', stderr: 'Connection not found', exitCode: 1, duration: 0 };
    }
    
    const startTime = Date.now();
    
    try {
      const client = await this.createSSHClient(conn);
      
      return await new Promise((resolve) => {
        client.sftp((err, sftp) => {
          if (err) {
            client.end();
            resolve({
              stdout: '',
              stderr: err.message,
              exitCode: 1,
              duration: Date.now() - startTime,
            });
            return;
          }
          
          sftp.fastPut(localPath, remotePath, (err) => {
            client.end();
            if (err) {
              resolve({
                stdout: '',
                stderr: err.message,
                exitCode: 1,
                duration: Date.now() - startTime,
              });
            } else {
              resolve({
                stdout: `File uploaded: ${localPath} -> ${remotePath}`,
                stderr: '',
                exitCode: 0,
                duration: Date.now() - startTime,
              });
            }
          });
        });
      });
    } catch (err: any) {
      return {
        stdout: '',
        stderr: err.message || 'Upload failed',
        exitCode: 1,
        duration: Date.now() - startTime,
      };
    }
  }
  
  async downloadFile(
    connectionId: string,
    remotePath: string,
    localPath: string
  ): Promise<ExecutionResult> {
    const conn = this.connections.find(c => c.id === connectionId);
    if (!conn) {
      return { stdout: '', stderr: 'Connection not found', exitCode: 1, duration: 0 };
    }
    
    const startTime = Date.now();
    
    try {
      const client = await this.createSSHClient(conn);
      
      return await new Promise((resolve) => {
        client.sftp((err, sftp) => {
          if (err) {
            client.end();
            resolve({
              stdout: '',
              stderr: err.message,
              exitCode: 1,
              duration: Date.now() - startTime,
            });
            return;
          }
          
          sftp.fastGet(remotePath, localPath, (err) => {
            client.end();
            if (err) {
              resolve({
                stdout: '',
                stderr: err.message,
                exitCode: 1,
                duration: Date.now() - startTime,
              });
            } else {
              resolve({
                stdout: `File downloaded: ${remotePath} -> ${localPath}`,
                stderr: '',
                exitCode: 0,
                duration: Date.now() - startTime,
              });
            }
          });
        });
      });
    } catch (err: any) {
      return {
        stdout: '',
        stderr: err.message || 'Download failed',
        exitCode: 1,
        duration: Date.now() - startTime,
      };
    }
  }

  // --- Interactive SSH Session Management ---
  private sessions: Map<string, { client: any; stream: any }> = new Map();

  async openSession(connectionId: string, onData: (data: string) => void, onClose: () => void): Promise<void> {
    const conn = this.connections.find(c => c.id === connectionId);
    if (!conn) throw new Error('Connection not found');

    const client = await this.createSSHClient(conn);

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        client.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err: any, stream: any) => {
          if (err) {
            client.end();
            reject(err);
            return;
          }

          this.sessions.set(connectionId, { client, stream });

          stream.on('data', (data: Buffer) => {
            onData(data.toString('utf-8'));
          });

          stream.stderr.on('data', (data: Buffer) => {
            onData(data.toString('utf-8'));
          });

          stream.on('close', () => {
            this.sessions.delete(connectionId);
            try { client.end(); } catch {}
            onClose();
          });

          resolve();
        });
      });

      client.on('error', (err: Error) => {
        this.sessions.delete(connectionId);
        reject(err);
      });

      const connectOptions: any = {
        host: conn.host,
        port: conn.port,
        username: conn.username,
        readyTimeout: 15000,
      };

      if (conn.authType === 'key' && conn.keyPath) {
        try {
          connectOptions.privateKey = readFileSync(conn.keyPath);
          if (conn.keyPassphrase) connectOptions.passphrase = conn.keyPassphrase;
        } catch (err: any) {
          reject(new Error(`Cannot read private key: ${err.message}`));
          return;
        }
      } else if (conn.password) {
        connectOptions.password = conn.password;
      }

      client.connect(connectOptions);
    });
  }

  writeSession(connectionId: string, data: string): void {
    const session = this.sessions.get(connectionId);
    if (session?.stream) {
      session.stream.write(data);
    }
  }

  resizeSession(connectionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(connectionId);
    if (session?.stream) {
      session.stream.setWindow(rows, cols, 0, 0);
    }
  }

  closeSession(connectionId: string): void {
    const session = this.sessions.get(connectionId);
    if (session) {
      try {
        session.stream.close();
      } catch {}
      try {
        session.client.end();
      } catch {}
      this.sessions.delete(connectionId);
    }
  }

  closeAllSessions(): void {
    for (const [id] of this.sessions) {
      this.closeSession(id);
    }
  }
}

export const sshService = new SSHService();
