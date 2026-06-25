export interface WSLInfo {
  name: string;
  version: string;
  state: 'Running' | 'Stopped';
  default: boolean;
}

export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
  keyPath?: string;
  keyPassphrase?: string;
  sudoPassword?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SSHTestResult {
  login: { success: boolean; error?: string; latency?: number; details?: string; hostname?: string; username?: string; exitCode?: number; rawOutput?: string };
  docker: { available: boolean; error?: string; version?: string; details?: string };
  sudo: { available: boolean; error?: string; details?: string; rawOutput?: string };
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: string;
}

export interface FileTransferOptions {
  localPath: string;
  remotePath: string;
  direction: 'upload' | 'download';
  recursive?: boolean;
}

export interface ExecutionLog {
  id: string;
  targetType: 'wsl' | 'ssh';
  targetId: string;
  command: string;
  options?: ExecutionOptions;
  result: ExecutionResult;
  startedAt: number;
  finishedAt: number;
}

export interface CommandWhitelist {
  id: string;
  pattern: string;
  description?: string;
  enabled: boolean;
  createdAt: number;
}

export type ExecutionTarget = 
  | { type: 'wsl'; distro?: string }
  | { type: 'ssh'; connectionId: string };