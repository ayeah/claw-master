import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

const api = {
  // Provider
  listProviders: () => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_LIST),
  createProvider: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_CREATE, data),
  updateProvider: (id: string, data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_UPDATE, id, data),
  deleteProvider: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_DELETE, id),
  fetchModels: (providerId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_FETCH_MODELS, providerId),
  addModel: (providerId: string, model: { id: string, name: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_ADD_MODEL, providerId, model),
  deleteModel: (providerId: string, modelId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_DELETE_MODEL, providerId, modelId),
  testConnection: (providerId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_TEST_CONNECTION, providerId),

  // Chat / Session
  listSessions: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_LIST),
  createSession: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_CREATE, data),
  updateSession: (id: string, data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.SESSION_UPDATE, id, data),
  deleteSession: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_DELETE, id),
  cloneSession: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_CLONE, id),

  // Messages
  listMessages: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.MESSAGES_LIST, sessionId),
  sendMessage: (sessionId: string, data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND, sessionId, data),

  // Chat Stream
  onChatStream: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown): void => callback(data)
    ipcRenderer.on(IPC_CHANNELS.CHAT_STREAM, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CHAT_STREAM, handler)
    }
  },
  cancelChat: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.CHAT_CANCEL, sessionId),

  // App
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO),
  quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),
  
  // Agent
  listAgents: (providerId?: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_LIST, providerId),
  createAgent: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_CREATE, data),
  getAgent: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET, id),
  updateAgent: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_UPDATE, id, data),
  deleteAgent: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_DELETE, id),
  invokeAgent: (request: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_INVOKE, request),
  getAgentStatus: (agentId: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_STATUS, agentId),
  discoverOpenClawAgents: (baseUrl: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_DISCOVER_OPENCLAW, baseUrl),
  discoverHermesAgents: (baseUrl: string, apiKey?: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_DISCOVER_HERMES, baseUrl, apiKey),
  
  // Agent Provider
  createAgentProvider: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_PROVIDER_CREATE, data),
  listAgentProviders: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_PROVIDER_LIST),
  getAgentProvider: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_PROVIDER_GET, id),
  updateAgentProvider: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_PROVIDER_UPDATE, id, data),
  deleteAgentProvider: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_PROVIDER_DELETE, id),
  
  // WSL
  checkWSL: () => ipcRenderer.invoke(IPC_CHANNELS.WSL_CHECK),
  listWSLDistros: () => ipcRenderer.invoke(IPC_CHANNELS.WSL_LIST_DISTROS),
  executeWSL: (command: string, options?: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.WSL_EXECUTE, command, options),
  
  // SSH
  createSSHConnection: (data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_CREATE_CONNECTION, data),
  listSSHConnections: () => ipcRenderer.invoke(IPC_CHANNELS.SSH_LIST_CONNECTIONS),
  getSSHConnection: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_GET_CONNECTION, id),
  updateSSHConnection: (id: string, data: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_UPDATE_CONNECTION, id, data),
  deleteSSHConnection: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_DELETE_CONNECTION, id),
  testSSHConnection: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_TEST_CONNECTION, id),
  testSSHConnectionFull: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_TEST_CONNECTION_FULL, id),
  detectSSHAgents: (connectionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_DETECT_AGENTS, connectionId),
  executeSSH: (connectionId: string, command: string, options?: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_EXECUTE, connectionId, command, options),
  uploadSSHFile: (connectionId: string, localPath: string, remotePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_UPLOAD_FILE, connectionId, localPath, remotePath),
  downloadSSHFile: (connectionId: string, remotePath: string, localPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_DOWNLOAD_FILE, connectionId, remotePath, localPath),

  // SSH Interactive Session
  openSSHSession: (connectionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_OPEN_SESSION, connectionId),
  onSSHSessionData: (callback: (connectionId: string, data: string) => void) => {
    const handler = (_event: any, connectionId: string, data: string): void => callback(connectionId, data)
    ipcRenderer.on(IPC_CHANNELS.SSH_SESSION_DATA, handler)
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.SSH_SESSION_DATA, handler) }
  },
  onSSHSessionClose: (callback: (connectionId: string) => void) => {
    const handler = (_event: any, connectionId: string): void => callback(connectionId)
    ipcRenderer.on(IPC_CHANNELS.SSH_SESSION_CLOSE, handler)
    return () => { ipcRenderer.removeListener(IPC_CHANNELS.SSH_SESSION_CLOSE, handler) }
  },
  writeSSHSession: (connectionId: string, data: string) =>
    ipcRenderer.send(IPC_CHANNELS.SSH_WRITE_SESSION, connectionId, data),
  resizeSSHSession: (connectionId: string, cols: number, rows: number) =>
    ipcRenderer.send(IPC_CHANNELS.SSH_RESIZE_SESSION, connectionId, cols, rows),
  closeSSHSession: (connectionId: string) =>
    ipcRenderer.send(IPC_CHANNELS.SSH_CLOSE_SESSION, connectionId),
  
  // Execution
  executeCommand: (target: unknown, command: string, options?: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_COMMAND, target, command, options),
  getExecutionLogs: (limit?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTION_GET_LOGS, limit),
  
  // Docker
  checkDocker: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_CHECK),
  listDockerContainers: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_LIST_CONTAINERS),
  generateDockerConfig: (options: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCKER_GENERATE_CONFIG, options),
  saveDockerConfig: (config: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCKER_SAVE_CONFIG, config),
  startDocker: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_START),
  stopDocker: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_STOP),
  getDockerStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_STATUS),
  pullDockerImages: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_PULL),
  getDockerLogs: (service: string, lines?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOCKER_LOGS, service, lines),
  removeDockerVolumes: () => ipcRenderer.invoke(IPC_CHANNELS.DOCKER_REMOVE_VOLUMES),
  
  // Skill
  createSkill: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_CREATE, data),
  listSkills: () => ipcRenderer.invoke(IPC_CHANNELS.SKILL_LIST),
  getSkill: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_GET, id),
  updateSkill: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_UPDATE, id, data),
  deleteSkill: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_DELETE, id),
  executeSkill: (request: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_EXECUTE, request),
  discoverSkills: (directory: string) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_DISCOVER, directory),
  
  // Memory
  addMemory: (content: string, type?: string, tags?: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.MEMORY_ADD, content, type, tags),
  getMemory: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_GET, id),
  updateMemory: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_UPDATE, id, data),
  deleteMemory: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_DELETE, id),
  searchMemories: (request: unknown) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_SEARCH, request),
  listMemories: (type?: string) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_LIST, type),
  cleanupMemories: () => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_CLEANUP),
  
  // File
  listFiles: (path?: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_LIST, path),
  readFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, path, content),
  deleteFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_DELETE, path),
  moveFile: (sourcePath: string, destPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_MOVE, sourcePath, destPath),
  copyFile: (sourcePath: string, destPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_COPY, sourcePath, destPath),
  mkdir: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_MKDIR, path),
  getFileTree: (path?: string, maxDepth?: number) => ipcRenderer.invoke(IPC_CHANNELS.FILE_TREE, path, maxDepth),
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', { api })
} else {
  // @ts-ignore
  window.electron = { api }
}
