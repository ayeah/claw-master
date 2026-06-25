import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/ipc-channels';
import { memoryService } from './memory.service';

export function registerMemoryHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.MEMORY_ADD, async (_, content: string, type?: string, tags?: string[]) => {
    return memoryService.addMemory(content, type as any, tags);
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_GET, async (_, id: string) => {
    return memoryService.getMemory(id);
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_UPDATE, async (_, id: string, data: any) => {
    return memoryService.updateMemory(id, data);
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_DELETE, async (_, id: string) => {
    return memoryService.deleteMemory(id);
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_SEARCH, async (_, request: any) => {
    return memoryService.searchMemories(request);
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_LIST, async (_, type?: string) => {
    return memoryService.listMemories(type as any);
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_CLEANUP, async () => {
    return memoryService.cleanupExpired();
  });
}