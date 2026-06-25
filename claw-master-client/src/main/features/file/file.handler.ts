import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/ipc-channels';
import { fileService } from './file.service';

export function registerFileHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.FILE_LIST, async (_, path?: string) => {
    return fileService.listFiles(path);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_, path: string) => {
    return fileService.readFile(path);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_WRITE, async (_, path: string, content: string) => {
    return fileService.writeFile(path, content);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_DELETE, async (_, path: string) => {
    return fileService.deleteFile(path);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_MOVE, async (_, sourcePath: string, destPath: string) => {
    return fileService.moveFile(sourcePath, destPath);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_COPY, async (_, sourcePath: string, destPath: string) => {
    return fileService.copyFile(sourcePath, destPath);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_MKDIR, async (_, path: string) => {
    return fileService.createDirectory(path);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_TREE, async (_, path?: string, maxDepth?: number) => {
    return fileService.getFileTree(path, maxDepth);
  });
}