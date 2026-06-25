import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

const execAsync = promisify(exec);

export interface DockerStatus {
  installed: boolean;
  running: boolean;
  version?: string;
}

export interface DockerComposeConfig {
  version: string;
  services: Record<string, DockerServiceConfig>;
  volumes?: Record<string, any>;
  networks?: Record<string, any>;
}

export interface DockerServiceConfig {
  image: string;
  ports?: string[];
  volumes?: string[];
  environment?: Record<string, string>;
  depends_on?: string[];
  restart?: string;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'stopped' | 'exited' | 'created';
  ports: string;
  created: string;
}

export class DockerService {
  private configDir: string;
  private composeFile: string;

  constructor() {
    this.configDir = join(app.getPath('userData'), 'docker');
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
    this.composeFile = join(this.configDir, 'docker-compose.yml');
  }

  async checkDocker(): Promise<DockerStatus> {
    try {
      const { stdout } = await execAsync('docker --version', { timeout: 5000 });
      const version = stdout.trim().replace('Docker version ', '').split(',')[0];

      try {
        await execAsync('docker info', { timeout: 5000 });
        return { installed: true, running: true, version };
      } catch {
        return { installed: true, running: false, version };
      }
    } catch {
      return { installed: false, running: false };
    }
  }

  async getContainers(): Promise<ContainerInfo[]> {
    try {
      const { stdout } = await execAsync(
        'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}|{{.CreatedAt}}"',
        { timeout: 10000 }
      );

      if (!stdout.trim()) return [];

      return stdout
        .trim()
        .split('\n')
        .map((line) => {
          const [id, name, image, status, state, ports, created] = line.split('|');
          return {
            id,
            name,
            image,
            status,
            state: state as ContainerInfo['state'],
            ports,
            created,
          };
        });
    } catch {
      return [];
    }
  }

  generateComposeConfig(
    projectName: string = 'claw-master',
    options: {
      enableServer?: boolean;
      enablePostgres?: boolean;
      enableRedis?: boolean;
      enableQdrant?: boolean;
      enableMinio?: boolean;
    } = {}
  ): DockerComposeConfig {
    const {
      enableServer = true,
      enablePostgres = true,
      enableRedis = false,
      enableQdrant = false,
      enableMinio = false,
    } = options;

    const services: Record<string, DockerServiceConfig> = {};

    if (enablePostgres) {
      services.postgres = {
        image: 'postgres:16-alpine',
        ports: ['5432:5432'],
        volumes: ['postgres_data:/var/lib/postgresql/data'],
        environment: {
          POSTGRES_DB: 'clawmaster',
          POSTGRES_USER: 'clawmaster',
          POSTGRES_PASSWORD: '${POSTGRES_PASSWORD:-clawmaster123}',
        },
        restart: 'unless-stopped',
      };
    }

    if (enableRedis) {
      services.redis = {
        image: 'redis:7-alpine',
        ports: ['6379:6379'],
        volumes: ['redis_data:/data'],
        restart: 'unless-stopped',
      };
    }

    if (enableQdrant) {
      services.qdrant = {
        image: 'qdrant/qdrant:latest',
        ports: ['6333:6333', '6334:6334'],
        volumes: ['qdrant_data:/qdrant/storage'],
        restart: 'unless-stopped',
      };
    }

    if (enableMinio) {
      services.minio = {
        image: 'minio/minio:latest',
        ports: ['9000:9000', '9001:9001'],
        volumes: ['minio_data:/data'],
        environment: {
          MINIO_ROOT_USER: '${MINIO_ROOT_USER:-minioadmin}',
          MINIO_ROOT_PASSWORD: '${MINIO_ROOT_PASSWORD:-minioadmin}',
        },
        restart: 'unless-stopped',
      };
    }

    if (enableServer) {
      const dependsOn = [];
      if (enablePostgres) dependsOn.push('postgres');
      if (enableRedis) dependsOn.push('redis');
      if (enableQdrant) dependsOn.push('qdrant');
      if (enableMinio) dependsOn.push('minio');

      services.server = {
        image: 'claw-master-server:latest',
        ports: ['8000:8000'],
        environment: {
          DATABASE_URL: enablePostgres
            ? 'postgresql+asyncpg://clawmaster:${POSTGRES_PASSWORD:-clawmaster123}@postgres:5432/clawmaster'
            : '',
          REDIS_URL: enableRedis ? 'redis://redis:6379' : '',
          QDRANT_URL: enableQdrant ? 'http://qdrant:6333' : '',
          MINIO_ENDPOINT: enableMinio ? 'minio:9000' : '',
        },
        depends_on: dependsOn,
        restart: 'unless-stopped',
      };
    }

    return {
      version: '3.8',
      services,
      volumes: {
        postgres_data: null,
        redis_data: null,
        qdrant_data: null,
        minio_data: null,
      },
    };
  }

  async saveComposeConfig(config: DockerComposeConfig): Promise<void> {
    const yaml = this.convertToYaml(config);
    writeFileSync(this.composeFile, yaml);
  }

  private convertToYaml(config: DockerComposeConfig): string {
    let yaml = `version: '${config.version}'\n\nservices:\n`;

    for (const [name, service] of Object.entries(config.services)) {
      yaml += `  ${name}:\n`;
      yaml += `    image: ${service.image}\n`;

      if (service.ports?.length) {
        yaml += `    ports:\n`;
        for (const port of service.ports) {
          yaml += `      - "${port}"\n`;
        }
      }

      if (service.volumes?.length) {
        yaml += `    volumes:\n`;
        for (const vol of service.volumes) {
          yaml += `      - ${vol}\n`;
        }
      }

      if (service.environment && Object.keys(service.environment).length > 0) {
        yaml += `    environment:\n`;
        for (const [key, value] of Object.entries(service.environment)) {
          yaml += `      ${key}: "${value}"\n`;
        }
      }

      if (service.depends_on?.length) {
        yaml += `    depends_on:\n`;
        for (const dep of service.depends_on) {
          yaml += `      - ${dep}\n`;
        }
      }

      if (service.restart) {
        yaml += `    restart: ${service.restart}\n`;
      }

      yaml += '\n';
    }

    if (config.volumes && Object.keys(config.volumes).length > 0) {
      yaml += '\nvolumes:\n';
      for (const [name] of Object.entries(config.volumes)) {
        yaml += `  ${name}:\n`;
      }
    }

    return yaml;
  }

  async startServices(): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker compose -f "${this.composeFile}" up -d`,
        { timeout: 120000 }
      );
      return { success: true, output: stdout + stderr };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }

  async stopServices(): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker compose -f "${this.composeFile}" down`,
        { timeout: 60000 }
      );
      return { success: true, output: stdout + stderr };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }

  async getServicesStatus(): Promise<{ name: string; state: string; status: string }[]> {
    try {
      const { stdout } = await execAsync(
        `docker compose -f "${this.composeFile}" ps --format "{{.Name}}|{{.State}}|{{.Status}}"`,
        { timeout: 10000 }
      );

      if (!stdout.trim()) return [];

      return stdout
        .trim()
        .split('\n')
        .map((line) => {
          const [name, state, status] = line.split('|');
          return { name, state, status };
        });
    } catch {
      return [];
    }
  }

  async pullImages(): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker compose -f "${this.composeFile}" pull`,
        { timeout: 300000 }
      );
      return { success: true, output: stdout + stderr };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }

  async getLogs(service: string, lines: number = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `docker compose -f "${this.composeFile}" logs --tail ${lines} ${service}`,
        { timeout: 10000 }
      );
      return stdout;
    } catch (error: any) {
      return error.message;
    }
  }

  async removeVolumes(): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync(
        `docker compose -f "${this.composeFile}" down -v`,
        { timeout: 60000 }
      );
      return { success: true, output: stdout + stderr };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }
}

export const dockerService = new DockerService();