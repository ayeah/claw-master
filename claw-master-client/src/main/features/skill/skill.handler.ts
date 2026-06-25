import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/ipc-channels';
import { skillService } from './skill.service';

export function registerSkillHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SKILL_CREATE, async (_, data: any) => {
    return skillService.createSkill(data);
  });

  ipcMain.handle(IPC_CHANNELS.SKILL_LIST, async () => {
    return skillService.listSkills();
  });

  ipcMain.handle(IPC_CHANNELS.SKILL_GET, async (_, id: string) => {
    return skillService.getSkill(id);
  });

  ipcMain.handle(IPC_CHANNELS.SKILL_UPDATE, async (_, id: string, data: any) => {
    return skillService.updateSkill(id, data);
  });

  ipcMain.handle(IPC_CHANNELS.SKILL_DELETE, async (_, id: string) => {
    return skillService.deleteSkill(id);
  });

  ipcMain.handle(IPC_CHANNELS.SKILL_EXECUTE, async (_, request: any) => {
    return skillService.executeSkill(request);
  });

  ipcMain.handle(IPC_CHANNELS.SKILL_DISCOVER, async (_, directory: string) => {
    return skillService.discoverSkills(directory);
  });
}