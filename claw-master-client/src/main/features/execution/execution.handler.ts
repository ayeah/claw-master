import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../../shared/ipc-channels';
import { wslService } from './wsl.service';
import { sshService } from './ssh.service';
import { ExecutionTarget, ExecutionOptions } from './execution.types';

export function registerExecutionHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.WSL_CHECK, async () => {
    return wslService.isWSLAvailable();
  });
  
  ipcMain.handle(IPC_CHANNELS.WSL_LIST_DISTROS, async () => {
    return wslService.listDistros();
  });
  
  ipcMain.handle(IPC_CHANNELS.WSL_EXECUTE, async (_, command: string, options?: ExecutionOptions & { distro?: string }) => {
    return wslService.executeCommand(command, options);
  });
  
  ipcMain.handle(IPC_CHANNELS.EXECUTE_COMMAND, async (
    _,
    target: ExecutionTarget,
    command: string,
    options?: ExecutionOptions
  ) => {
    return wslService.execute(target, command, options);
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_CREATE_CONNECTION, async (_, data: any) => {
    return sshService.createConnection(data);
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_LIST_CONNECTIONS, async () => {
    return sshService.listConnections();
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_GET_CONNECTION, async (_, id: string) => {
    return sshService.getConnection(id);
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_UPDATE_CONNECTION, async (_, id: string, data: any) => {
    return sshService.updateConnection(id, data);
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_DELETE_CONNECTION, async (_, id: string) => {
    return sshService.deleteConnection(id);
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_TEST_CONNECTION, async (_, id: string) => {
    return sshService.testConnection(id);
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_TEST_CONNECTION_FULL, async (_, id: string) => {
    return sshService.testConnectionFull(id);
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_DETECT_AGENTS, async (_, connectionId: string) => {
    return sshService.detectAgents(connectionId);
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_EXECUTE, async (
    _,
    connectionId: string,
    command: string,
    options?: ExecutionOptions
  ) => {
    return sshService.executeCommand(connectionId, command, options);
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_UPLOAD_FILE, async (
    _,
    connectionId: string,
    localPath: string,
    remotePath: string
  ) => {
    return sshService.uploadFile(connectionId, localPath, remotePath);
  });
  
  ipcMain.handle(IPC_CHANNELS.SSH_DOWNLOAD_FILE, async (
    _,
    connectionId: string,
    remotePath: string,
    localPath: string
  ) => {
    return sshService.downloadFile(connectionId, remotePath, localPath);
  });
  
  ipcMain.handle(IPC_CHANNELS.EXECUTION_GET_LOGS, async (_, limit?: number) => {
    return wslService.getLogs(limit);
  });

  // SSH Interactive Session
  ipcMain.handle(IPC_CHANNELS.SSH_OPEN_SESSION, async (event, connectionId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    await sshService.openSession(
      connectionId,
      (data) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.SSH_SESSION_DATA, connectionId, data);
        }
      },
      () => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.SSH_SESSION_CLOSE, connectionId);
        }
      }
    );
    return { success: true };
  });

  ipcMain.on(IPC_CHANNELS.SSH_WRITE_SESSION, (_, connectionId: string, data: string) => {
    sshService.writeSession(connectionId, data);
  });

  ipcMain.on(IPC_CHANNELS.SSH_RESIZE_SESSION, (_, connectionId: string, cols: number, rows: number) => {
    sshService.resizeSession(connectionId, cols, rows);
  });

  ipcMain.on(IPC_CHANNELS.SSH_CLOSE_SESSION, (_, connectionId: string) => {
    sshService.closeSession(connectionId);
  });
}