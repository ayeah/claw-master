import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../../shared/ipc-channels';
import { agentService } from './agent.service';

export function registerAgentHandlers(): void {
  // Provider handlers
  ipcMain.handle(IPC_CHANNELS.AGENT_PROVIDER_CREATE, async (_, data: any) => {
    return agentService.createProvider(data);
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_PROVIDER_LIST, async () => {
    return agentService.listProviders();
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_PROVIDER_GET, async (_, id: string) => {
    return agentService.getProvider(id);
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_PROVIDER_UPDATE, async (_, id: string, data: any) => {
    return agentService.updateProvider(id, data);
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_PROVIDER_DELETE, async (_, id: string) => {
    return agentService.deleteProvider(id);
  });

  // Agent handlers
  ipcMain.handle(IPC_CHANNELS.AGENT_CREATE, async (_, data: any) => {
    return agentService.createAgent(data);
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_LIST, async (_, providerId?: string) => {
    return agentService.listAgents(providerId);
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_GET, async (_, id: string) => {
    return agentService.getAgent(id);
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_UPDATE, async (_, id: string, data: any) => {
    return agentService.updateAgent(id, data);
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_DELETE, async (_, id: string) => {
    return agentService.deleteAgent(id);
  });

  // Agent invocation
  ipcMain.handle(IPC_CHANNELS.AGENT_INVOKE, async (_, request: any) => {
    return agentService.invokeAgent(request);
  });

  // Agent status
  ipcMain.handle(IPC_CHANNELS.AGENT_STATUS, async (_, agentId: string) => {
    return agentService.getAgentStatus(agentId);
  });

  // Discovery
  ipcMain.handle(IPC_CHANNELS.AGENT_DISCOVER_OPENCLAW, async (_, baseUrl: string) => {
    return agentService.discoverOpenClawAgents(baseUrl);
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_DISCOVER_HERMES, async (_, baseUrl: string, apiKey?: string) => {
    return agentService.discoverHermesAgents(baseUrl, apiKey);
  });
}