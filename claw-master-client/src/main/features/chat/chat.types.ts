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

export interface CreateSessionInput {
  title?: string
  modelId?: string
  providerId?: string
}

export interface UpdateSessionInput {
  title?: string
  modelId?: string
  providerId?: string
}

export interface SendMessageInput {
  content: string
  role?: 'user' | 'system'
}

export interface ChatStreamChunk {
  type: 'text' | 'tool_call' | 'error' | 'done'
  content?: string
  toolCall?: ToolCall
  error?: string
}
