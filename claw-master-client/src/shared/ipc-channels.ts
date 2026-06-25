export const IPC_CHANNELS = {
  // Provider
  PROVIDER_LIST: 'provider:list',
  PROVIDER_CREATE: 'provider:create',
  PROVIDER_UPDATE: 'provider:update',
  PROVIDER_DELETE: 'provider:delete',
  PROVIDER_FETCH_MODELS: 'provider:fetchModels',
  PROVIDER_ADD_MODEL: 'provider:addModel',
  PROVIDER_DELETE_MODEL: 'provider:deleteModel',
  PROVIDER_TEST_CONNECTION: 'provider:testConnection',

  // Chat
  CHAT_SEND: 'chat:send',
  CHAT_STREAM: 'chat:stream',
  CHAT_CANCEL: 'chat:cancel',

  // Session
  SESSION_LIST: 'session:list',
  SESSION_CREATE: 'session:create',
  SESSION_UPDATE: 'session:update',
  SESSION_DELETE: 'session:delete',
  SESSION_CLONE: 'session:clone',

  // Messages
  MESSAGES_LIST: 'messages:list',

  // Agent
  AGENT_LIST: 'agent:list',
  AGENT_INVOKE: 'agent:invoke',
  AGENT_CREATE: 'agent:create',
  AGENT_GET: 'agent:get',
  AGENT_UPDATE: 'agent:update',
  AGENT_DELETE: 'agent:delete',
  AGENT_STATUS: 'agent:status',
  AGENT_DISCOVER_OPENCLAW: 'agent:discoverOpenclaw',
  AGENT_DISCOVER_HERMES: 'agent:discoverHermes',
  AGENT_PROVIDER_CREATE: 'agentProvider:create',
  AGENT_PROVIDER_LIST: 'agentProvider:list',
  AGENT_PROVIDER_GET: 'agentProvider:get',
  AGENT_PROVIDER_UPDATE: 'agentProvider:update',
  AGENT_PROVIDER_DELETE: 'agentProvider:delete',

  // Execution
  EXEC_WSL: 'exec:wsl',
  EXEC_SSH: 'exec:ssh',
  EXEC_DOCKER: 'exec:docker',
  WSL_CHECK: 'wsl:check',
  WSL_LIST_DISTROS: 'wsl:listDistros',
  WSL_EXECUTE: 'wsl:execute',
  EXECUTE_COMMAND: 'execute:command',
  SSH_CREATE_CONNECTION: 'ssh:createConnection',
  SSH_LIST_CONNECTIONS: 'ssh:listConnections',
  SSH_GET_CONNECTION: 'ssh:getConnection',
  SSH_UPDATE_CONNECTION: 'ssh:updateConnection',
  SSH_DELETE_CONNECTION: 'ssh:deleteConnection',
  SSH_TEST_CONNECTION: 'ssh:testConnection',
  SSH_TEST_CONNECTION_FULL: 'ssh:testConnectionFull',
  SSH_EXECUTE: 'ssh:execute',
  SSH_DETECT_AGENTS: 'ssh:detectAgents',
  SSH_UPLOAD_FILE: 'ssh:uploadFile',
  SSH_DOWNLOAD_FILE: 'ssh:downloadFile',
  SSH_OPEN_SESSION: 'ssh:openSession',
  SSH_SESSION_DATA: 'ssh:sessionData',
  SSH_SESSION_CLOSE: 'ssh:sessionClose',
  SSH_WRITE_SESSION: 'ssh:writeSession',
  SSH_RESIZE_SESSION: 'ssh:resizeSession',
  SSH_CLOSE_SESSION: 'ssh:closeSession',
  EXECUTION_GET_LOGS: 'execution:getLogs',

  // File
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_LIST: 'file:list',

  // Memory
  MEMORY_SEARCH: 'memory:search',
  MEMORY_ADD: 'memory:add',
  MEMORY_DELETE: 'memory:delete',

  // Docker
  DOCKER_CHECK: 'docker:check',
  DOCKER_LIST_CONTAINERS: 'docker:listContainers',
  DOCKER_GENERATE_CONFIG: 'docker:generateConfig',
  DOCKER_SAVE_CONFIG: 'docker:saveConfig',
  DOCKER_START: 'docker:start',
  DOCKER_STOP: 'docker:stop',
  DOCKER_STATUS: 'docker:status',
  DOCKER_PULL: 'docker:pull',
  DOCKER_LOGS: 'docker:logs',
  DOCKER_REMOVE_VOLUMES: 'docker:removeVolumes',

  // Skill
  SKILL_CREATE: 'skill:create',
  SKILL_LIST: 'skill:list',
  SKILL_GET: 'skill:get',
  SKILL_UPDATE: 'skill:update',
  SKILL_DELETE: 'skill:delete',
  SKILL_EXECUTE: 'skill:execute',
  SKILL_DISCOVER: 'skill:discover',

  // Memory
  MEMORY_LIST: 'memory:list',
  MEMORY_GET: 'memory:get',
  MEMORY_UPDATE: 'memory:update',
  MEMORY_CLEANUP: 'memory:cleanup',

  // File
  FILE_MOVE: 'file:move',
  FILE_COPY: 'file:copy',
  FILE_MKDIR: 'file:mkdir',
  FILE_TREE: 'file:tree',

  // App
  APP_INFO: 'app:info',
  APP_QUIT: 'app:quit',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
