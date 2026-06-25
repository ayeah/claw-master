import { create } from 'zustand'
import type { Provider, Model } from '../../shared/types'

interface ProviderState {
  providers: Provider[]
  loading: boolean
  error: string | null
  fetchProviders: () => Promise<void>
  createProvider: (input: {
    name: string
    type: Provider['type']
    baseUrl: string
    apiKey: string
    models?: Partial<Model>[]
  }) => Promise<Provider>
  updateProvider: (id: string, input: Partial<Provider>) => Promise<void>
  deleteProvider: (id: string) => Promise<void>
  fetchModels: (providerId: string) => Promise<Model[]>
  addModel: (providerId: string, model: { id: string; name: string }) => Promise<Model | null>
  deleteModel: (providerId: string, modelId: string) => Promise<void>
  testConnection: (providerId: string) => Promise<{ success: boolean; latency: number; error?: string }>
}

export const useProviderStore = create<ProviderState>((set, get) => ({
  providers: [],
  loading: false,
  error: null,

  fetchProviders: async () => {
    set({ loading: true, error: null })
    try {
      const providers = await window.electron.api.listProviders()
      set({ providers, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createProvider: async (input) => {
    const provider = await window.electron.api.createProvider(input)
    set((state) => ({ providers: [provider, ...state.providers] }))
    return provider
  },

  updateProvider: async (id, input) => {
    await window.electron.api.updateProvider(id, input)
    set((state) => ({
      providers: state.providers.map((p) => (p.id === id ? { ...p, ...input } : p)),
    }))
  },

  deleteProvider: async (id) => {
    await window.electron.api.deleteProvider(id)
    set((state) => ({
      providers: state.providers.filter((p) => p.id !== id),
    }))
  },

  fetchModels: async (providerId: string) => {
    set({ loading: true, error: null })
    try {
      const result = await window.electron.api.fetchModels(providerId)
      if (result.success) {
        await get().fetchProviders()
        return result.models
      } else {
        set({ error: result.error || 'Failed to fetch models', loading: false })
        return []
      }
    } catch (error: any) {
      set({ error: error.message, loading: false })
      return []
    }
  },

  addModel: async (providerId: string, model: { id: string; name: string }) => {
    try {
      const result = await window.electron.api.addModel(providerId, model)
      if (result.success) {
        await get().fetchProviders()
        return result.model
      }
      return null
    } catch (error: any) {
      set({ error: error.message })
      return null
    }
  },

  deleteModel: async (providerId: string, modelId: string) => {
    try {
      await window.electron.api.deleteModel(providerId, modelId)
      await get().fetchProviders()
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  testConnection: async (providerId: string) => {
    try {
      return await window.electron.api.testConnection(providerId)
    } catch (error: any) {
      return { success: false, latency: 0, error: error.message }
    }
  },
}))
