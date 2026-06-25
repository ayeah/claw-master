import { create } from 'zustand'
import type { Session, Message } from '../../shared/types'

interface ChatState {
  sessions: Session[]
  currentSessionId: string | null
  messages: Message[]
  loading: boolean
  streaming: boolean
  error: string | null

  fetchSessions: () => Promise<void>
  createSession: (input?: { title?: string; modelId?: string; providerId?: string }) => Promise<Session>
  selectSession: (id: string) => Promise<void>
  updateSession: (id: string, input: Partial<Session>) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  cloneSession: (id: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  cancelStream: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  loading: false,
  streaming: false,
  error: null,

  fetchSessions: async () => {
    set({ loading: true, error: null })
    try {
      const sessions = await window.electron.api.listSessions()
      set({ sessions, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createSession: async (input) => {
    const session = await window.electron.api.createSession(input || {})
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: session.id,
      messages: [],
    }))
    return session
  },

  selectSession: async (id) => {
    set({ currentSessionId: id, messages: [], loading: true })
    try {
      const messages = await window.electron.api.listMessages(id)
      set({ messages, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  updateSession: async (id, input) => {
    await window.electron.api.updateSession(id, input)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...input } : s)),
    }))
  },

  deleteSession: async (id) => {
    await window.electron.api.deleteSession(id)
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id)
      const currentSessionId =
        state.currentSessionId === id ? (sessions[0]?.id || null) : state.currentSessionId
      return { sessions, currentSessionId }
    })
  },

  cloneSession: async (id) => {
    const session = await window.electron.api.cloneSession(id)
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: session.id,
    }))
  },

  sendMessage: async (content: string) => {
    const { currentSessionId } = get()
    if (!currentSessionId) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      sessionId: currentSessionId,
      role: 'user',
      content,
      toolCalls: null,
      metadata: {},
      createdAt: new Date().toISOString(),
    }

    set((state) => ({
      messages: [...state.messages, userMsg],
      streaming: true,
      error: null,
    }))

    const cleanup = window.electron.api.onChatStream((chunk: any) => {
      if (chunk.type === 'text') {
        set((state) => {
          const messages = [...state.messages]
          const lastMsg = messages[messages.length - 1]
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.id.startsWith('stream-')) {
            lastMsg.content += chunk.content
          } else {
            messages.push({
              id: 'stream-' + crypto.randomUUID(),
              sessionId: currentSessionId,
              role: 'assistant',
              content: chunk.content,
              toolCalls: null,
              metadata: {},
              createdAt: new Date().toISOString(),
            })
          }
          return { messages }
        })
      } else if (chunk.type === 'error') {
        const errorMsg: Message = {
          id: 'error-' + crypto.randomUUID(),
          sessionId: currentSessionId,
          role: 'assistant',
          content: `⚠️ ${chunk.error || '请求失败'}`,
          toolCalls: null,
          metadata: {},
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          messages: [...state.messages, errorMsg],
          streaming: false,
          error: chunk.error || '请求失败',
        }))
        cleanup()
        get().fetchSessions()
      } else if (chunk.type === 'done') {
        set({ streaming: false, error: null })
        cleanup()
        get().fetchSessions()
      }
    })

    try {
      await window.electron.api.sendMessage(currentSessionId, { content })
    } catch (error: any) {
      const errorMsg: Message = {
        id: 'error-' + crypto.randomUUID(),
        sessionId: currentSessionId,
        role: 'assistant',
        content: `⚠️ ${error.message || '发送失败'}`,
        toolCalls: null,
        metadata: {},
        createdAt: new Date().toISOString(),
      }
      set((state) => ({
        messages: [...state.messages, errorMsg],
        streaming: false,
        error: error.message,
      }))
      cleanup()
    }
  },

  cancelStream: () => {
    const { currentSessionId } = get()
    if (currentSessionId) {
      window.electron.api.cancelChat(currentSessionId)
    }
    set({ streaming: false })
  },
}))
