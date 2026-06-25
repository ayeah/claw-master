import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/ipc-channels';
import { dockerService } from './docker.service';

export function registerDockerHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DOCKER_CHECK, async () => {
    return dockerService.checkDocker();
  });

  ipcMain.handle(IPC_CHANNELS.DOCKER_LIST_CONTAINERS, async () => {
    return dockerService.getContainers();
  });

  ipcMain.handle(IPC_CHANNELS.DOCKER_GENERATE_CONFIG, async (_, options: any) => {
    return dockerService.generateComposeConfig(options.projectName, options);
  });

  ipcMain.handle(IPC_CHANNELS.DOCKER_SAVE_CONFIG, async (_, config: any) => {
    await dockerService.saveComposeConfig(config);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.DOCKER_START, async () => {
    return dockerService.startServices();
  });

  ipcMain.handle(IPC_CHANNELS.DOCKER_STOP, async () => {
    return dockerService.stopServices();
  });

  ipcMain.handle(IPC_CHANNELS.DOCKER_STATUS, async () => {
    return dockerService.getServicesStatus();
  });

  ipcMain.handle(IPC_CHANNELS.DOCKER_PULL, async () => {
    return dockerService.pullImages();
  });

  ipcMain.handle(IPC_CHANNELS.DOCKER_LOGS, async (_, service: string, lines?: number) => {
    return dockerService.getLogs(service, lines);
  });

  ipcMain.handle(IPC_CHANNELS.DOCKER_REMOVE_VOLUMES, async () => {
    return dockerService.removeVolumes();
  });
}