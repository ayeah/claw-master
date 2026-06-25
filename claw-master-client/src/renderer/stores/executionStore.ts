import { create } from 'zustand';
import { WSLInfo, SSHConnection, SSHTestResult, ExecutionResult, ExecutionLog } from '../features/execution/execution.types';

interface ExecutionState {
  wslAvailable: boolean;
  wslDistros: WSLInfo[];
  sshConnections: SSHConnection[];
  executionLogs: ExecutionLog[];
  isExecuting: boolean;
  lastResult: ExecutionResult | null;
  lastTestResult: SSHTestResult | null;
  
  checkWSL: () => Promise<void>;
  listWSLDistros: () => Promise<void>;
  executeWSL: (command: string, distro?: string) => Promise<ExecutionResult>;
  
  createSSHConnection: (data: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSSHConnection: (id: string, data: Partial<SSHConnection>) => Promise<void>;
  listSSHConnections: () => Promise<void>;
  deleteSSHConnection: (id: string) => Promise<void>;
  testSSHConnection: (id: string) => Promise<ExecutionResult>;
  testSSHConnectionFull: (id: string) => Promise<SSHTestResult>;
  executeSSH: (connectionId: string, command: string) => Promise<ExecutionResult>;
  detectSSHAgents: (connectionId: string) => Promise<Array<{name: string; type: string; port?: number; status: string; path?: string}>>;
  
  closeSSHSession: (connectionId: string) => Promise<void>;
  
  getExecutionLogs: (limit?: number) => Promise<void>;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  wslAvailable: false,
  wslDistros: [],
  sshConnections: [],
  executionLogs: [],
  isExecuting: false,
  lastResult: null,
  lastTestResult: null,
  
  checkWSL: async () => {
    try {
      const available = await window.electron.api.checkWSL();
      set({ wslAvailable: available });
    } catch (error) {
      set({ wslAvailable: false });
    }
  },
  
  listWSLDistros: async () => {
    try {
      const distros = await window.electron.api.listWSLDistros();
      set({ wslDistros: distros });
    } catch (error) {
      set({ wslDistros: [] });
    }
  },
  
  executeWSL: async (command: string, distro?: string) => {
    set({ isExecuting: true, lastResult: null });
    try {
      const result = await window.electron.api.executeWSL(command, { distro });
      set({ lastResult: result, isExecuting: false });
      return result;
    } catch (error) {
      const result: ExecutionResult = {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Execution failed',
        exitCode: 1,
        duration: 0,
      };
      set({ lastResult: result, isExecuting: false });
      return result;
    }
  },
  
  createSSHConnection: async (data) => {
    try {
      await window.electron.api.createSSHConnection(data);
      await get().listSSHConnections();
    } catch (error) {
      throw error;
    }
  },
  
  updateSSHConnection: async (id: string, data: Partial<SSHConnection>) => {
    try {
      await window.electron.api.updateSSHConnection(id, data);
      await get().listSSHConnections();
    } catch (error) {
      throw error;
    }
  },
  
  listSSHConnections: async () => {
    try {
      const connections = await window.electron.api.listSSHConnections();
      set({ sshConnections: connections });
    } catch (error) {
      set({ sshConnections: [] });
    }
  },
  
  deleteSSHConnection: async (id: string) => {
    try {
      await window.electron.api.deleteSSHConnection(id);
      await get().listSSHConnections();
    } catch (error) {
      throw error;
    }
  },
  
  testSSHConnection: async (id: string) => {
    set({ isExecuting: true, lastResult: null });
    try {
      const result = await window.electron.api.testSSHConnection(id);
      set({ lastResult: result, isExecuting: false });
      return result;
    } catch (error) {
      const result: ExecutionResult = {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Connection test failed',
        exitCode: 1,
        duration: 0,
      };
      set({ lastResult: result, isExecuting: false });
      return result;
    }
  },
  
  testSSHConnectionFull: async (id: string) => {
    set({ isExecuting: true, lastTestResult: null });
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timeout (30s)')), 30000)
      )
      
      const result = await Promise.race([
        window.electron.api.testSSHConnectionFull(id),
        timeoutPromise
      ])
      
      set({ lastTestResult: result, isExecuting: false });
      return result;
    } catch (error) {
      const result: SSHTestResult = {
        login: { success: false, error: error instanceof Error ? error.message : 'Test failed' },
        docker: { available: false, error: 'Connection test failed' },
        sudo: { available: false, error: 'Connection test failed' },
      };
      set({ lastTestResult: result, isExecuting: false });
      return result;
    }
  },
  
  executeSSH: async (connectionId: string, command: string) => {
    set({ isExecuting: true, lastResult: null });
    try {
      const result = await window.electron.api.executeSSH(connectionId, command);
      set({ lastResult: result, isExecuting: false });
      return result;
    } catch (error) {
      const result: ExecutionResult = {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'SSH execution failed',
        exitCode: 1,
        duration: 0,
      };
      set({ lastResult: result, isExecuting: false });
      return result;
    }
  },
  
  detectSSHAgents: async (connectionId: string) => {
    try {
      return await window.electron.api.detectSSHAgents(connectionId);
    } catch (error) {
      return [];
    }
  },
  
  closeSSHSession: async (connectionId: string) => {
    try {
      await window.electron.api.closeSSHSession(connectionId);
    } catch (error) {
      console.error('Failed to close SSH session:', error);
    }
  },
  
  getExecutionLogs: async (limit?: number) => {
    try {
      const logs = await window.electron.api.getExecutionLogs(limit);
      set({ executionLogs: logs });
    } catch (error) {
      set({ executionLogs: [] });
    }
  },
}));