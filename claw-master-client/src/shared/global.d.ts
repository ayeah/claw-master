/**
 * Global ambient declarations for the renderer process.
 * Exposed by preload/index.ts via contextBridge as `window.electron.api`.
 *
 * NOTE: IPC payloads are intentionally typed as `any` here. The renderer
 * store/page layer is responsible for narrowing each response into its
 * concrete shape (`Session`, `Provider`, etc.).
 */

import type { JSX as ReactJSX } from 'react'

declare global {
  namespace JSX {
    type Element = ReactJSX.Element
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
    interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsync = (...args: any[]) => Promise<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any

export interface ElectronAPI {
  // Provider
  listProviders: AnyAsync
  createProvider: AnyAsync
  updateProvider: AnyAsync
  deleteProvider: AnyAsync
  fetchModels: AnyAsync
  addModel: AnyAsync
  deleteModel: AnyAsync
  testConnection: AnyAsync

  // Sessions / messages
  listSessions: AnyAsync
  createSession: AnyAsync
  updateSession: AnyAsync
  deleteSession: AnyAsync
  cloneSession: AnyAsync
  listMessages: AnyAsync
  sendMessage: AnyAsync
  onChatStream: (callback: (chunk: unknown) => void) => () => void
  cancelChat: AnyAsync

  // App
  getAppInfo: AnyAsync
  quit: AnyAsync

  // Agents
  listAgents: AnyAsync
  createAgent: AnyAsync
  getAgent: AnyAsync
  updateAgent: AnyAsync
  deleteAgent: AnyAsync
  invokeAgent: AnyAsync
  getAgentStatus: AnyAsync
  discoverOpenClawAgents: AnyAsync
  discoverHermesAgents: AnyAsync

  // Agent providers
  createAgentProvider: AnyAsync
  listAgentProviders: AnyAsync
  getAgentProvider: AnyAsync
  updateAgentProvider: AnyAsync
  deleteAgentProvider: AnyAsync

  // WSL
  checkWSL: AnyAsync
  listWSLDistros: AnyAsync
  executeWSL: AnyAsync

  // SSH
  createSSHConnection: AnyAsync
  listSSHConnections: AnyAsync
  getSSHConnection: AnyAsync
  updateSSHConnection: AnyAsync
  deleteSSHConnection: AnyAsync
  testSSHConnection: AnyAsync
  testSSHConnectionFull: AnyAsync
  detectSSHAgents: AnyAsync
  executeSSH: AnyAsync
  uploadSSHFile: AnyAsync
  downloadSSHFile: AnyAsync

  // SSH interactive session
  openSSHSession: AnyAsync
  onSSHSessionData: (callback: (connectionId: string, data: string) => void) => () => void
  onSSHSessionClose: (callback: (connectionId: string) => void) => () => void
  writeSSHSession: AnyFn
  resizeSSHSession: AnyFn
  closeSSHSession: AnyAsync

  // Execution
  executeCommand: AnyAsync
  getExecutionLogs: AnyAsync

  // Docker
  checkDocker: AnyAsync
  listDockerContainers: AnyAsync
  generateDockerConfig: AnyAsync
  saveDockerConfig: AnyAsync
  startDocker: AnyAsync
  stopDocker: AnyAsync
  getDockerStatus: AnyAsync
  pullDockerImages: AnyAsync
  getDockerLogs: AnyAsync
  removeDockerVolumes: AnyAsync

  // Skills
  createSkill: AnyAsync
  listSkills: AnyAsync
  getSkill: AnyAsync
  updateSkill: AnyAsync
  deleteSkill: AnyAsync
  executeSkill: AnyAsync
  discoverSkills: AnyAsync

  // Memory
  addMemory: AnyAsync
  getMemory: AnyAsync
  updateMemory: AnyAsync
  deleteMemory: AnyAsync
  searchMemories: AnyAsync
  listMemories: AnyAsync
  cleanupMemories: AnyAsync

  // Files
  listFiles: AnyAsync
  readFile: AnyAsync
  writeFile: AnyAsync
  deleteFile: AnyAsync
  moveFile: AnyAsync
  copyFile: AnyAsync
  mkdir: AnyAsync
  getFileTree: AnyAsync
}

declare global {
  interface Window {
    electron: { api: ElectronAPI }
  }
}

export {}
