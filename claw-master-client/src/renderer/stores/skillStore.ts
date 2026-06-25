import { create } from 'zustand'

export interface Skill {
  id: string
  name: string
  description: string
  version: string
  author: string
  enabled: boolean
  type: 'function' | 'http' | 'shell' | 'agent'
  schema: {
    input: Array<{
      name: string
      type: 'string' | 'number' | 'boolean' | 'object' | 'array'
      description?: string
      required?: boolean
      default?: unknown
    }>
    output: Array<{
      name: string
      type: 'string' | 'number' | 'boolean' | 'object' | 'array'
      description?: string
      required?: boolean
    }>
  }
  config: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

interface SkillState {
  skills: Skill[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
  create: (data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  update: (id: string, data: Partial<Skill>) => Promise<void>
  remove: (id: string) => Promise<void>
  execute: (id: string, input: Record<string, unknown>) => Promise<unknown>
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const skills = await window.electron.api.listSkills()
      set({ skills, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false, skills: [] })
    }
  },

  create: async (data) => {
    try {
      await window.electron.api.createSkill(data)
      await get().fetch()
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  update: async (id, data) => {
    try {
      await window.electron.api.updateSkill(id, data)
      await get().fetch()
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  remove: async (id) => {
    try {
      await window.electron.api.deleteSkill(id)
      set((state) => ({ skills: state.skills.filter((s) => s.id !== id) }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  execute: async (id, input) => {
    try {
      return await window.electron.api.executeSkill({ skillId: id, input })
    } catch (error: any) {
      set({ error: error.message })
      return { output: null, error: error.message, duration: 0 }
    }
  },
}))