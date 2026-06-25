import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerProviderHandlers } from './features/provider/provider.handler'
import { registerChatHandlers } from './features/chat/chat.handler'
import { registerExecutionHandlers } from './features/execution/execution.handler'
import { registerAgentHandlers } from './features/agent/agent.handler'
import { registerDockerHandlers } from './features/docker/docker.handler'
import { registerSkillHandlers } from './features/skill/skill.handler'
import { registerMemoryHandlers } from './features/memory/memory.handler'
import { registerFileHandlers } from './features/file/file.handler'
import { initDatabase } from './data/db'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.claw-master')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  registerProviderHandlers()
  registerChatHandlers()
  registerExecutionHandlers()
  registerAgentHandlers()
  registerDockerHandlers()
  registerSkillHandlers()
  registerMemoryHandlers()
  registerFileHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
