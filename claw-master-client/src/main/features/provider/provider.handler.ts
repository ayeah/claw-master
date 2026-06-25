import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import * as providerService from './provider.service'
import { getDatabase } from '../../data/db'
import type { CreateProviderInput, UpdateProviderInput } from './provider.types'

export function registerProviderHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROVIDER_LIST, () => {
    return providerService.listProviders()
  })

  ipcMain.handle(IPC_CHANNELS.PROVIDER_CREATE, (_, input: CreateProviderInput) => {
    return providerService.createProvider(input)
  })

  ipcMain.handle(
    IPC_CHANNELS.PROVIDER_UPDATE,
    (_, id: string, input: UpdateProviderInput) => {
      return providerService.updateProvider(id, input)
    }
  )

  ipcMain.handle(IPC_CHANNELS.PROVIDER_DELETE, (_, id: string) => {
    return providerService.deleteProvider(id)
  })

  ipcMain.handle(IPC_CHANNELS.PROVIDER_FETCH_MODELS, async (_, providerId: string) => {
    const provider = providerService.getProvider(providerId)
    if (!provider) return { success: false, error: 'Provider not found' }
    
    const models = await providerService.fetchModelsFromProvider(provider)
    if (models.length > 0) {
      providerService.saveModelsToProvider(providerId, models)
    }
    
    return { success: true, models }
  })

  ipcMain.handle(IPC_CHANNELS.PROVIDER_ADD_MODEL, (_, providerId: string, model: { id: string, name: string }) => {
    const provider = providerService.getProvider(providerId)
    if (!provider) return { success: false, error: 'Provider not found' }
    
    const newModel = {
      id: model.id,
      name: model.name || model.id,
      providerId,
      contextLength: 4096,
      maxOutput: 4096,
      supportTools: false,
      supportVision: false,
    }
    
    getDatabase().prepare(
      `INSERT OR REPLACE INTO models (id, name, provider_id, context_length, max_output, support_tools, support_vision)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(newModel.id, newModel.name, providerId, newModel.contextLength, newModel.maxOutput, 0, 0)
    
    return { success: true, model: newModel }
  })

  ipcMain.handle(IPC_CHANNELS.PROVIDER_DELETE_MODEL, (_, providerId: string, modelId: string) => {
    getDatabase().prepare('DELETE FROM models WHERE id = ? AND provider_id = ?').run(modelId, providerId)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.PROVIDER_TEST_CONNECTION, async (_, providerId: string) => {
    const provider = providerService.getProvider(providerId)
    if (!provider) return { success: false, error: 'Provider not found', latency: 0 }
    return providerService.testProviderConnection(provider)
  })
}
