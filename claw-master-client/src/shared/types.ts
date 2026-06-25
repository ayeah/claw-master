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

export interface Session {
  id: string
  title: string
  modelId: string | null
  providerId: string | null
  agentId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string
  toolCalls: ToolCall[] | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: string
}

export interface ChatStreamChunk {
  type: 'text' | 'tool_call' | 'error' | 'done'
  content?: string
  toolCall?: ToolCall
  error?: string
}
