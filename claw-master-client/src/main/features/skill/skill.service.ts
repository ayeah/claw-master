import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { app } from 'electron';
import { Skill, SkillExecutionRequest, SkillExecutionResult } from './skill.types';

const SKILLS_FILE = 'skills.json';
const SKILLS_DIR = 'skills';

export class SkillService {
  private dataDir: string;
  private skills: Skill[] = [];

  constructor() {
    this.dataDir = join(app.getPath('userData'), 'skills');
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    this.loadData();
  }

  private loadData(): void {
    const filePath = join(this.dataDir, SKILLS_FILE);
    if (existsSync(filePath)) {
      this.skills = JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  }

  private saveData(): void {
    writeFileSync(join(this.dataDir, SKILLS_FILE), JSON.stringify(this.skills, null, 2));
  }

  async createSkill(data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Skill> {
    const skill: Skill = {
      ...data,
      id: randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.skills.push(skill);
    this.saveData();
    return skill;
  }

  async listSkills(): Promise<Skill[]> {
    return this.skills;
  }

  async getSkill(id: string): Promise<Skill | null> {
    return this.skills.find((s) => s.id === id) || null;
  }

  async updateSkill(id: string, data: Partial<Skill>): Promise<Skill | null> {
    const index = this.skills.findIndex((s) => s.id === id);
    if (index === -1) return null;

    this.skills[index] = {
      ...this.skills[index],
      ...data,
      id,
      updatedAt: Date.now(),
    };
    this.saveData();
    return this.skills[index];
  }

  async deleteSkill(id: string): Promise<boolean> {
    const index = this.skills.findIndex((s) => s.id === id);
    if (index === -1) return false;

    this.skills.splice(index, 1);
    this.saveData();
    return true;
  }

  async executeSkill(request: SkillExecutionRequest): Promise<SkillExecutionResult> {
    const skill = this.skills.find((s) => s.id === request.skillId);
    if (!skill) {
      return { output: null, error: 'Skill not found', duration: 0 };
    }

    if (!skill.enabled) {
      return { output: null, error: 'Skill is disabled', duration: 0 };
    }

    const startTime = Date.now();

    try {
      let result: unknown;

      switch (skill.type) {
        case 'function':
          result = await this.executeFunction(skill, request);
          break;
        case 'http':
          result = await this.executeHttp(skill, request);
          break;
        case 'shell':
          result = await this.executeShell(skill, request);
          break;
        case 'agent':
          result = await this.executeAgent(skill, request);
          break;
        default:
          return { output: null, error: `Unknown skill type: ${skill.type}`, duration: Date.now() - startTime };
      }

      return {
        output: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  private async executeFunction(skill: Skill, request: SkillExecutionRequest): Promise<unknown> {
    const scriptPath = skill.config.scriptPath as string;
    if (!scriptPath || !existsSync(scriptPath)) {
      throw new Error('Script path not found');
    }

    const script = readFileSync(scriptPath, 'utf-8');
    const fn = new Function('input', 'context', script);
    return fn(request.input, request.context);
  }

  private async executeHttp(skill: Skill, request: SkillExecutionRequest): Promise<unknown> {
    const url = skill.config.url as string;
    const method = (skill.config.method as string) || 'POST';
    const headers = (skill.config.headers as Record<string, string>) || {};

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        ...request.input,
        context: request.context,
      }),
      signal: AbortSignal.timeout(request.options?.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return response.json();
  }

  private async executeShell(skill: Skill, request: SkillExecutionRequest): Promise<unknown> {
    const command = skill.config.command as string;
    if (!command) {
      throw new Error('Command not specified');
    }

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const env = {
      ...process.env,
      ...request.context?.environment,
      SKILL_INPUT: JSON.stringify(request.input),
    };

    const { stdout, stderr } = await execAsync(command, {
      env,
      timeout: request.options?.timeout || 30000,
      cwd: request.context?.workingDirectory,
    });

    return { stdout, stderr };
  }

  private async executeAgent(skill: Skill, request: SkillExecutionRequest): Promise<unknown> {
    const agentEndpoint = skill.config.agentEndpoint as string;
    if (!agentEndpoint) {
      throw new Error('Agent endpoint not specified');
    }

    const response = await fetch(`${agentEndpoint}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: skill.name,
        input: request.input,
        context: request.context,
      }),
      signal: AbortSignal.timeout(request.options?.timeout || 60000),
    });

    if (!response.ok) {
      throw new Error(`Agent error: ${response.status}`);
    }

    return response.json();
  }

  async discoverSkills(directory: string): Promise<Skill[]> {
    const skills: Skill[] = [];
    const skillsDir = join(this.dataDir, SKILLS_DIR);

    if (!existsSync(skillsDir)) {
      return skills;
    }

    const items = readdirSync(skillsDir);
    for (const item of items) {
      const itemPath = join(skillsDir, item);
      const stat = statSync(itemPath);

      if (stat.isFile() && extname(item) === '.json') {
        try {
          const data = JSON.parse(readFileSync(itemPath, 'utf-8'));
          if (data.name && data.type) {
            skills.push({
              ...data,
              id: data.id || randomUUID(),
              createdAt: data.createdAt || Date.now(),
              updatedAt: data.updatedAt || Date.now(),
            });
          }
        } catch {
          // Skip invalid files
        }
      }
    }

    return skills;
  }
}

export const skillService = new SkillService();