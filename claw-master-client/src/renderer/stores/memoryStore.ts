import { create } from 'zustand'

export interface Memory {
  id: string
  content: string
  type: 'short_term' | 'long_term'
  tags: string[]
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
  expiresAt?: number
}

export interface MemorySearchRequest {
  query: string
  type?: 'short_term' | 'long_term' | 'all'
  limit?: number
  threshold?: number
  tags?: string[]
}

export interface MemorySearchResult {
  memories: Memory[]
  scores: number[]
}

interface MemoryState {
  memories: Memory[]
  loading: boolean
  error: string | null
  fetch: (type?: 'short_term' | 'long_term') => Promise<void>
  search: (request: MemorySearchRequest) => Promise<MemorySearchResult>
  add: (content: string, type?: 'short_term' | 'long_term', tags?: string[]) => Promise<Memory | null>
  update: (id: string, data: Partial<Memory>) => Promise<void>
  remove: (id: string) => Promise<void>
  cleanup: () => Promise<void>
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  loading: false,
  error: null,

  fetch: async (type) => {
    set({ loading: true, error: null })
    try {
      const memories = await window.electron.api.listMemories(type)
      set({ memories, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false, memories: [] })
    }
  },

  search: async (request) => {
    try {
      return await window.electron.api.searchMemories(request)
    } catch {
      return { memories: [], scores: [] }
    }
  },

  add: async (content, type, tags) => {
    try {
      const memory = await window.electron.api.addMemory(content, type, tags)
      await get().fetch()
      return memory
    } catch (error: any) {
      set({ error: error.message })
      return null
    }
  },

  update: async (id, data) => {
    try {
      await window.electron.api.updateMemory(id, data)
      await get().fetch()
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  remove: async (id) => {
    try {
      await window.electron.api.deleteMemory(id)
      set((state) => ({ memories: state.memories.filter((m) => m.id !== id) }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  cleanup: async () => {
    try {
      await window.electron.api.cleanupMemories()
      await get().fetch()
    } catch (error: any) {
      set({ error: error.message })
    }
  },
}))