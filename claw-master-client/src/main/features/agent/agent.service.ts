import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import {
  AgentProvider,
  Agent,
  AgentInvokeRequest,
  AgentInvokeResponse,
  AgentStatus,
} from './agent.types';

const PROVIDERS_FILE = 'agent-providers.json';
const AGENTS_FILE = 'agents.json';

export class AgentService {
  private dataDir: string;
  private providers: AgentProvider[] = [];
  private agents: Agent[] = [];

  constructor() {
    this.dataDir = join(app.getPath('userData'), 'agents');
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    this.loadData();
  }

  private loadData(): void {
    const providersPath = join(this.dataDir, PROVIDERS_FILE);
    if (existsSync(providersPath)) {
      this.providers = JSON.parse(readFileSync(providersPath, 'utf-8'));
    }

    const agentsPath = join(this.dataDir, AGENTS_FILE);
    if (existsSync(agentsPath)) {
      this.agents = JSON.parse(readFileSync(agentsPath, 'utf-8'));
    }
  }

  private saveData(): void {
    writeFileSync(join(this.dataDir, PROVIDERS_FILE), JSON.stringify(this.providers, null, 2));
    writeFileSync(join(this.dataDir, AGENTS_FILE), JSON.stringify(this.agents, null, 2));
  }

  // Provider CRUD
  async createProvider(data: Omit<AgentProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentProvider> {
    const provider: AgentProvider = {
      ...data,
      id: randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.providers.push(provider);
    this.saveData();
    return provider;
  }

  async listProviders(): Promise<AgentProvider[]> {
    return this.providers;
  }

  async getProvider(id: string): Promise<AgentProvider | null> {
    return this.providers.find((p) => p.id === id) || null;
  }

  async updateProvider(id: string, data: Partial<AgentProvider>): Promise<AgentProvider | null> {
    const index = this.providers.findIndex((p) => p.id === id);
    if (index === -1) return null;

    this.providers[index] = {
      ...this.providers[index],
      ...data,
      id,
      updatedAt: Date.now(),
    };
    this.saveData();
    return this.providers[index];
  }

  async deleteProvider(id: string): Promise<boolean> {
    const index = this.providers.findIndex((p) => p.id === id);
    if (index === -1) return false;

    this.providers.splice(index, 1);
    this.agents = this.agents.filter((a) => a.providerId !== id);
    this.saveData();
    return true;
  }

  // Agent CRUD
  async createAgent(data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
    const agent: Agent = {
      ...data,
      id: randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.agents.push(agent);
    this.saveData();
    return agent;
  }

  async listAgents(providerId?: string): Promise<Agent[]> {
    if (providerId) {
      return this.agents.filter((a) => a.providerId === providerId);
    }
    return this.agents;
  }

  async getAgent(id: string): Promise<Agent | null> {
    return this.agents.find((a) => a.id === id) || null;
  }

  async updateAgent(id: string, data: Partial<Agent>): Promise<Agent | null> {
    const index = this.agents.findIndex((a) => a.id === id);
    if (index === -1) return null;

    this.agents[index] = {
      ...this.agents[index],
      ...data,
      id,
      updatedAt: Date.now(),
    };
    this.saveData();
    return this.agents[index];
  }

  async deleteAgent(id: string): Promise<boolean> {
    const index = this.agents.findIndex((a) => a.id === id);
    if (index === -1) return false;

    this.agents.splice(index, 1);
    this.saveData();
    return true;
  }

  // Agent Invocation
  async invokeAgent(request: AgentInvokeRequest): Promise<AgentInvokeResponse> {
    const agent = this.agents.find((a) => a.id === request.agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${request.agentId}`);
    }

    const provider = this.providers.find((p) => p.id === agent.providerId);
    if (!provider) {
      throw new Error(`Provider not found for agent: ${agent.providerId}`);
    }

    const startTime = Date.now();

    try {
      const response = await this.callAgentAPI(provider, agent, request);
      return {
        ...response,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        output: `Error invoking agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private async callAgentAPI(
    provider: AgentProvider,
    agent: Agent,
    request: AgentInvokeRequest
  ): Promise<Omit<AgentInvokeResponse, 'duration'>> {
    const baseUrl = provider.baseUrl.replace(/\/$/, '');
    const apiKey = provider.apiKey || (provider.config.apiKey as string);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const messages = [
      ...(agent.systemPrompt ? [{ role: 'system', content: agent.systemPrompt }] : []),
      ...(request.context?.history || []),
      { role: 'user', content: request.input },
    ];

    const body = {
      model: agent.model,
      messages,
      temperature: request.options?.temperature ?? 0.7,
      max_tokens: request.options?.maxTokens ?? 2048,
      stream: request.options?.stream ?? false,
    };

    const timeout = request.options?.timeout ?? 30000;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      output: data.choices?.[0]?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : undefined,
      metadata: {
        model: data.model,
        id: data.id,
      },
    };
  }

  // Agent Status
  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) {
      return { agentId, online: false };
    }

    const provider = this.providers.find((p) => p.id === agent.providerId);
    if (!provider || !provider.enabled) {
      return { agentId, online: false };
    }

    return {
      agentId,
      online: true,
      lastSeen: Date.now(),
      version: agent.config.version as string,
    };
  }

  // OpenClaw specific
  async discoverOpenClawAgents(baseUrl: string): Promise<Agent[]> {
    try {
      const response = await fetch(`${baseUrl}/v1/agents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data.agents || []).map((a: any) => ({
        id: a.id || randomUUID(),
        providerId: '',
        name: a.name || 'Unknown Agent',
        model: a.model || 'default',
        description: a.description,
        capabilities: a.capabilities || ['chat'],
        config: a.config || {},
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
    } catch {
      return [];
    }
  }

  // Hermes specific
  async discoverHermesAgents(baseUrl: string, apiKey?: string): Promise<Agent[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl}/api/agents`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data || []).map((a: any) => ({
        id: a.id || randomUUID(),
        providerId: '',
        name: a.name || 'Unknown Agent',
        model: a.model || 'default',
        description: a.description,
        capabilities: a.capabilities || ['chat'],
        config: a.config || {},
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
    } catch {
      return [];
    }
  }
}

export const agentService = new AgentService();