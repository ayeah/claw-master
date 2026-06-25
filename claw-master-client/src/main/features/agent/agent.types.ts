export interface AgentProvider {
  id: string;
  name: string;
  type: 'openclaw' | 'hermes' | 'qwenpaw' | 'opencode' | 'custom';
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  description?: string;
  capabilities: AgentCapability[];
  config: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type AgentCapability = 
  | 'chat'
  | 'code'
  | 'search'
  | 'deploy'
  | 'analyze'
  | 'custom';

export interface Agent {
  id: string;
  providerId: string;
  name: string;
  model: string;
  description?: string;
  systemPrompt?: string;
  capabilities: AgentCapability[];
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AgentInvokeRequest {
  agentId: string;
  input: string;
  context?: AgentContext;
  options?: AgentInvokeOptions;
}

export interface AgentContext {
  sessionId?: string;
  history?: AgentMessage[];
  metadata?: Record<string, unknown>;
}

export interface AgentInvokeOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  timeout?: number;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentInvokeResponse {
  output: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
  duration: number;
}

export interface AgentStatus {
  agentId: string;
  online: boolean;
  lastSeen?: number;
  version?: string;
}