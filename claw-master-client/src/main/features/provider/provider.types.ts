export interface Provider {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'google' | 'azure' | 'custom'
  baseUrl: string
  apiKey: string
  models: Model[]
  config: ProviderConfig
  createdAt: string
  updatedAt: string
}

export interface Model {
  id: string
  name: string
  providerId: string
  contextLength: number
  maxOutput: number
  supportTools: boolean
  supportVision: boolean
}

export interface ProviderConfig {
  timeout: number
  maxRetries: number
  rateLimit: {
    requests: number
    windowMs: number
  }
}

export interface CreateProviderInput {
  name: string
  type: Provider['type']
  baseUrl: string
  apiKey: string
  models?: Partial<Model>[]
  config?: Partial<ProviderConfig>
}

export interface UpdateProviderInput {
  name?: string
  type?: Provider['type']
  baseUrl?: string
  apiKey?: string
  config?: Partial<ProviderConfig>
}
