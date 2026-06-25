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
