import { create } from 'zustand';
import { DockerStatus, ContainerInfo } from '../features/docker/docker.service';

interface DockerComposeConfig {
  version: string;
  services: Record<string, any>;
  volumes?: Record<string, any>;
}

interface ServiceStatus {
  name: string;
  state: string;
  status: string;
}

interface DockerState {
  status: DockerStatus | null;
  containers: ContainerInfo[];
  services: ServiceStatus[];
  composeConfig: DockerComposeConfig | null;
  isLoading: boolean;
  output: string;

  checkDocker: () => Promise<void>;
  fetchContainers: () => Promise<void>;
  generateConfig: (options: any) => Promise<void>;
  startServices: () => Promise<void>;
  stopServices: () => Promise<void>;
  fetchServicesStatus: () => Promise<void>;
  pullImages: () => Promise<void>;
  getLogs: (service: string) => Promise<string>;
}

export const useDockerStore = create<DockerState>((set, get) => ({
  status: null,
  containers: [],
  services: [],
  composeConfig: null,
  isLoading: false,
  output: '',

  checkDocker: async () => {
    set({ isLoading: true });
    try {
      const status = await window.electron.api.checkDocker();
      set({ status, isLoading: false });
    } catch {
      set({ status: { installed: false, running: false }, isLoading: false });
    }
  },

  fetchContainers: async () => {
    set({ isLoading: true });
    try {
      const containers = await window.electron.api.listDockerContainers();
      set({ containers, isLoading: false });
    } catch {
      set({ containers: [], isLoading: false });
    }
  },

  generateConfig: async (options) => {
    set({ isLoading: true });
    try {
      const config = await window.electron.api.generateDockerConfig(options);
      set({ composeConfig: config, isLoading: false });
      await window.electron.api.saveDockerConfig(config);
    } catch {
      set({ isLoading: false });
    }
  },

  startServices: async () => {
    set({ isLoading: true, output: '' });
    try {
      const result = await window.electron.api.startDocker();
      set({ output: result.output, isLoading: false });
      if (result.success) {
        await get().fetchServicesStatus();
      }
    } catch (error) {
      set({ output: `Error: ${error}`, isLoading: false });
    }
  },

  stopServices: async () => {
    set({ isLoading: true, output: '' });
    try {
      const result = await window.electron.api.stopDocker();
      set({ output: result.output, isLoading: false });
      if (result.success) {
        await get().fetchServicesStatus();
      }
    } catch (error) {
      set({ output: `Error: ${error}`, isLoading: false });
    }
  },

  fetchServicesStatus: async () => {
    try {
      const services = await window.electron.api.getDockerStatus();
      set({ services });
    } catch {
      set({ services: [] });
    }
  },

  pullImages: async () => {
    set({ isLoading: true, output: '' });
    try {
      const result = await window.electron.api.pullDockerImages();
      set({ output: result.output, isLoading: false });
    } catch (error) {
      set({ output: `Error: ${error}`, isLoading: false });
    }
  },

  getLogs: async (service) => {
    try {
      return await window.electron.api.getDockerLogs(service, 100);
    } catch {
      return 'Failed to fetch logs';
    }
  },
}));