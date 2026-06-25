import { create } from 'zustand'

export interface FileNode {
  id: string
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
  mimeType?: string
  content?: string
  children?: FileNode[]
  createdAt: number
  updatedAt: number
}

interface FileState {
  currentPath: string
  files: FileNode[]
  loading: boolean
  error: string | null
  openFile: FileNode | null
  openContent: string
  fetch: (path?: string) => Promise<void>
  readFile: (path: string) => Promise<void>
  writeFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  mkdir: (path: string) => Promise<void>
  clearOpen: () => void
}

export const useFileStore = create<FileState>((set, get) => ({
  currentPath: '/',
  files: [],
  loading: false,
  error: null,
  openFile: null,
  openContent: '',

  fetch: async (path) => {
    const target = path ?? get().currentPath
    set({ loading: true, error: null, currentPath: target })
    try {
      const files = await window.electron.api.listFiles(target)
      set({ files, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false, files: [] })
    }
  },

  readFile: async (path) => {
    set({ loading: true, error: null })
    try {
      const file = await window.electron.api.readFile(path)
      if (file) {
        set({ openFile: file, openContent: file.content || '', loading: false })
      } else {
        set({ loading: false, error: '文件不存在' })
      }
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  writeFile: async (path, content) => {
    try {
      await window.electron.api.writeFile(path, content)
      await get().fetch()
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  deleteFile: async (path) => {
    try {
      await window.electron.api.deleteFile(path)
      await get().fetch()
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  mkdir: async (path) => {
    try {
      await window.electron.api.mkdir(path)
      await get().fetch()
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  clearOpen: () => set({ openFile: null, openContent: '' }),
}))