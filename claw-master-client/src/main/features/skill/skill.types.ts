export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  type: 'function' | 'http' | 'shell' | 'agent';
  schema: SkillSchema;
  config: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SkillSchema {
  input: SkillParameter[];
  output: SkillParameter[];
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
}

export interface SkillExecutionRequest {
  skillId: string;
  input: Record<string, unknown>;
  context?: SkillContext;
  options?: SkillExecutionOptions;
}

export interface SkillContext {
  sessionId?: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface SkillExecutionOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  captureOutput?: boolean;
}

export interface SkillExecutionResult {
  output: unknown;
  error?: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface Memory {
  id: string;
  content: string;
  type: 'short_term' | 'long_term';
  tags: string[];
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

export interface MemorySearchRequest {
  query: string;
  type?: 'short_term' | 'long_term' | 'all';
  limit?: number;
  threshold?: number;
  tags?: string[];
}

export interface MemorySearchResult {
  memories: Memory[];
  scores: number[];
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  mimeType?: string;
  content?: string;
  children?: FileNode[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface FileOperation {
  type: 'create' | 'read' | 'update' | 'delete' | 'move' | 'copy';
  path: string;
  newPath?: string;
  content?: string;
  options?: Record<string, unknown>;
}