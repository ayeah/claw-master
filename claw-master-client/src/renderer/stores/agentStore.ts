import { create } from 'zustand';
import type { AgentProvider, Agent, AgentInvokeResponse } from '../types/agent';

interface AgentState {
  providers: AgentProvider[];
  agents: Agent[];
  currentAgent: Agent | null;
  isLoading: boolean;
  lastInvokeResult: AgentInvokeResponse | null;

  // Provider actions
  fetchProviders: () => Promise<void>;
  createProvider: (data: Omit<AgentProvider, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProvider: (id: string, data: Partial<AgentProvider>) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;

  // Agent actions
  fetchAgents: (providerId?: string) => Promise<void>;
  createAgent: (data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAgent: (id: string, data: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  selectAgent: (agent: Agent | null) => void;

  // Invoke
  invokeAgent: (agentId: string, input: string, context?: any) => Promise<AgentInvokeResponse>;

  // Discovery
  discoverOpenClaw: (baseUrl: string) => Promise<Agent[]>;
  discoverHermes: (baseUrl: string, apiKey?: string) => Promise<Agent[]>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  providers: [],
  agents: [],
  currentAgent: null,
  isLoading: false,
  lastInvokeResult: null,

  fetchProviders: async () => {
    set({ isLoading: true });
    try {
      const providers = await window.electron.api.listAgentProviders();
      set({ providers, isLoading: false });
    } catch {
      set({ providers: [], isLoading: false });
    }
  },

  createProvider: async (data) => {
    await window.electron.api.createAgentProvider(data);
    await get().fetchProviders();
  },

  updateProvider: async (id, data) => {
    await window.electron.api.updateAgentProvider(id, data);
    await get().fetchProviders();
  },

  deleteProvider: async (id) => {
    await window.electron.api.deleteAgentProvider(id);
    await get().fetchProviders();
  },

  fetchAgents: async (providerId) => {
    set({ isLoading: true });
    try {
      const agents = await window.electron.api.listAgents(providerId);
      set({ agents, isLoading: false });
    } catch {
      set({ agents: [], isLoading: false });
    }
  },

  createAgent: async (data) => {
    await window.electron.api.createAgent(data);
    await get().fetchAgents();
  },

  updateAgent: async (id, data) => {
    await window.electron.api.updateAgent(id, data);
    await get().fetchAgents();
  },

  deleteAgent: async (id) => {
    await window.electron.api.deleteAgent(id);
    await get().fetchAgents();
  },

  selectAgent: (agent) => {
    set({ currentAgent: agent });
  },

  invokeAgent: async (agentId, input, context) => {
    set({ isLoading: true, lastInvokeResult: null });
    try {
      const result = await window.electron.api.invokeAgent({
        agentId,
        input,
        context,
      });
      set({ lastInvokeResult: result, isLoading: false });
      return result;
    } catch (error) {
      const errorResult: AgentInvokeResponse = {
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
      };
      set({ lastInvokeResult: errorResult, isLoading: false });
      return errorResult;
    }
  },

  discoverOpenClaw: async (baseUrl) => {
    set({ isLoading: true });
    try {
      const agents = await window.electron.api.discoverOpenClawAgents(baseUrl);
      set({ isLoading: false });
      return agents;
    } catch {
      set({ isLoading: false });
      return [];
    }
  },

  discoverHermes: async (baseUrl, apiKey) => {
    set({ isLoading: true });
    try {
      const agents = await window.electron.api.discoverHermesAgents(baseUrl, apiKey);
      set({ isLoading: false });
      return agents;
    } catch {
      set({ isLoading: false });
      return [];
    }
  },
}));