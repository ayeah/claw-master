import { randomUUID } from 'crypto'
import { getDatabase } from '../../data/db'
import type { Provider, CreateProviderInput, UpdateProviderInput, Model } from './provider.types'
import OpenAI from 'openai'

export async function fetchModelsFromProvider(provider: Provider): Promise<Model[]> {
  try {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      timeout: provider.config.timeout,
      maxRetries: provider.config.maxRetries,
    })

    const models = await client.models.list()
    
    return models.data
      .filter(m => m.id && !m.id.startsWith('gpt-4-vision') && !m.id.startsWith('whisper'))
      .slice(0, 50)
      .map((m) => ({
        id: m.id,
        name: m.id,
        providerId: provider.id,
        contextLength: m.context_window || 4096,
        maxOutput: 4096,
        supportTools: m.id.includes('gpt-4') || m.id.includes('gpt-3.5-turbo'),
        supportVision: m.id.includes('vision') || m.id.includes('4o'),
      }))
  } catch (error: any) {
    console.error('Failed to fetch models:', error.message)
    return []
  }
}

export async function testProviderConnection(provider: Provider): Promise<{ success: boolean; latency: number; error?: string }> {
  const start = Date.now()
  try {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      timeout: 30000,
      maxRetries: 0,
    })
    const models = await client.models.list()
    const modelId = models.data[0]?.id
    if (!modelId) {
      return { success: false, latency: Date.now() - start, error: '无可用模型' }
    }
    const response = await client.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 10,
    })
    const latency = Date.now() - start
    const reply = response.choices?.[0]?.message?.content
    if (reply) {
      return { success: true, latency }
    }
    return { success: false, latency, error: '模型未返回内容' }
  } catch (error: any) {
    return { success: false, latency: Date.now() - start, error: error.message || '连接失败' }
  }
}

export function saveModelsToProvider(providerId: string, models: Model[]): void {
  const db = getDatabase()
  db.prepare('DELETE FROM models WHERE provider_id = ?').run(providerId)

  if (models.length === 0) return

  const insertModel = db.prepare(
    `INSERT INTO models (id, name, provider_id, context_length, max_output, support_tools, support_vision)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  for (const m of models) {
    insertModel.run(
      m.id || randomUUID(),
      m.name || m.id,
      providerId,
      m.contextLength || 4096,
      m.maxOutput || 4096,
      m.supportTools ? 1 : 0,
      m.supportVision ? 1 : 0
    )
  }
}

export function listProviders(): Provider[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM providers ORDER BY created_at DESC').all() as any[]

  return rows.map((row) => {
    const models = db.prepare('SELECT * FROM models WHERE provider_id = ?').all(row.id) as any[]
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      baseUrl: row.base_url,
      apiKey: row.api_key,
      config: JSON.parse(row.config || '{}'),
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
        providerId: m.provider_id,
        contextLength: m.context_length,
        maxOutput: m.max_output,
        supportTools: !!m.support_tools,
        supportVision: !!m.support_vision,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

export function getProvider(id: string): Provider | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as any
  if (!row) return null

  const models = db.prepare('SELECT * FROM models WHERE provider_id = ?').all(id) as any[]
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    config: JSON.parse(row.config || '{}'),
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      providerId: m.provider_id,
      contextLength: m.context_length,
      maxOutput: m.max_output,
      supportTools: !!m.support_tools,
      supportVision: !!m.support_vision,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createProvider(input: CreateProviderInput): Provider {
  const db = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()

  const config = {
    timeout: 30000,
    maxRetries: 3,
    rateLimit: { requests: 60, windowMs: 60000 },
    ...input.config,
  }

  db.prepare(
    `INSERT INTO providers (id, name, type, base_url, api_key, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.name, input.type, input.baseUrl, input.apiKey, JSON.stringify(config), now, now)

  if (input.models && input.models.length > 0) {
    const insertModel = db.prepare(
      `INSERT INTO models (id, name, provider_id, context_length, max_output, support_tools, support_vision)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    for (const m of input.models) {
      insertModel.run(
        randomUUID(),
        m.name || 'unknown',
        id,
        m.contextLength || 4096,
        m.maxOutput || 4096,
        m.supportTools ? 1 : 0,
        m.supportVision ? 1 : 0
      )
    }
  }

  return getProvider(id)!
}

export function updateProvider(id: string, input: UpdateProviderInput): Provider | null {
  const db = getDatabase()
  const existing = getProvider(id)
  if (!existing) return null

  const now = new Date().toISOString()
  const fields: string[] = []
  const values: any[] = []

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name) }
  if (input.type !== undefined) { fields.push('type = ?'); values.push(input.type) }
  if (input.baseUrl !== undefined) { fields.push('base_url = ?'); values.push(input.baseUrl) }
  if (input.apiKey !== undefined) { fields.push('api_key = ?'); values.push(input.apiKey) }
  if (input.config !== undefined) {
    fields.push('config = ?')
    values.push(JSON.stringify({ ...existing.config, ...input.config }))
  }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)

  db.prepare(`UPDATE providers SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  return getProvider(id)
}

export function deleteProvider(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM providers WHERE id = ?').run(id)
  return result.changes > 0
}

export function getProviderModels(providerId: string): Model[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM models WHERE provider_id = ?').all(providerId) as any[]
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    providerId: m.provider_id,
    contextLength: m.context_length,
    maxOutput: m.max_output,
    supportTools: !!m.support_tools,
    supportVision: !!m.support_vision,
  }))
}
