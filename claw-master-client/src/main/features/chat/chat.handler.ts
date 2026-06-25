import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import * as chatService from './chat.service'
import * as providerService from '../provider/provider.service'
import type { CreateSessionInput, UpdateSessionInput, SendMessageInput } from './chat.types'
import OpenAI from 'openai'

const cancelControllers = new Map<string, AbortController>()

export function registerChatHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SESSION_LIST, () => {
    return chatService.listSessions()
  })

  ipcMain.handle(IPC_CHANNELS.SESSION_CREATE, (_, input: CreateSessionInput) => {
    return chatService.createSession(input)
  })

  ipcMain.handle(IPC_CHANNELS.SESSION_UPDATE, (_, id: string, input: UpdateSessionInput) => {
    return chatService.updateSession(id, input)
  })

  ipcMain.handle(IPC_CHANNELS.SESSION_DELETE, (_, id: string) => {
    return chatService.deleteSession(id)
  })

  ipcMain.handle(IPC_CHANNELS.SESSION_CLONE, (_, id: string) => {
    return chatService.cloneSession(id)
  })

  ipcMain.handle(IPC_CHANNELS.MESSAGES_LIST, (_, sessionId: string) => {
    return chatService.listMessages(sessionId)
  })

  ipcMain.handle(IPC_CHANNELS.CHAT_CANCEL, async (_, sessionId: string) => {
    const ctrl = cancelControllers.get(sessionId)
    if (ctrl) {
      ctrl.abort()
      cancelControllers.delete(sessionId)
    }
    return { cancelled: true }
  })

  ipcMain.handle(
    IPC_CHANNELS.CHAT_SEND,
    async (event, sessionId: string, input: SendMessageInput) => {
      const session = chatService.getSession(sessionId)
      if (!session) throw new Error('Session not found')

      chatService.addMessage(sessionId, input.role || 'user', input.content)

      if (!session.providerId || !session.modelId) {
        const assistantMsg = chatService.addMessage(
          sessionId,
          'assistant',
          '请先在设置中配置模型商和选择模型。'
        )
        return assistantMsg
      }

      const provider = providerService.getProvider(session.providerId)
      if (!provider) throw new Error('Provider not found')

      const messages = chatService.listMessages(sessionId)
      const window = BrowserWindow.fromWebContents(event.sender)

      const abortController = new AbortController()
      cancelControllers.set(sessionId, abortController)

      try {
        const client = new OpenAI({
          apiKey: provider.apiKey,
          baseURL: provider.baseUrl,
          timeout: provider.config.timeout,
          maxRetries: 0,
        })

        const stream = await client.chat.completions.create(
          {
            model: session.modelId,
            messages: messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            })),
            stream: true,
          },
          { signal: abortController.signal }
        )

        let fullContent = ''

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            fullContent += delta
            if (window && !window.isDestroyed()) {
              window.webContents.send(IPC_CHANNELS.CHAT_STREAM, {
                type: 'text',
                content: delta,
              })
            }
          }
        }

        cancelControllers.delete(sessionId)

        const assistantMsg = chatService.addMessage(sessionId, 'assistant', fullContent)

        if (window && !window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.CHAT_STREAM, {
            type: 'done',
          })
        }

        return assistantMsg
      } catch (error: any) {
        cancelControllers.delete(sessionId)
        const cancelled = error?.name === 'APIUserAbortError' || abortController.signal.aborted
        const errorMsg = chatService.addMessage(
          sessionId,
          'assistant',
          cancelled ? '[生成已取消]' : `请求失败: ${error.message || '未知错误'}`
        )

        if (window && !window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.CHAT_STREAM, {
            type: cancelled ? 'done' : 'error',
            error: cancelled ? 'cancelled' : error.message,
          })
        }

        return errorMsg
      }
    }
  )
}
