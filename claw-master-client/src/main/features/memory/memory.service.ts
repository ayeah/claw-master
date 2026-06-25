import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { Memory, MemorySearchRequest, MemorySearchResult } from './skill.types';

const MEMORY_FILE = 'memory.json';

export class MemoryService {
  private dataDir: string;
  private memories: Memory[] = [];

  constructor() {
    this.dataDir = join(app.getPath('userData'), 'memory');
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    this.loadData();
  }

  private loadData(): void {
    const filePath = join(this.dataDir, MEMORY_FILE);
    if (existsSync(filePath)) {
      this.memories = JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  }

  private saveData(): void {
    writeFileSync(join(this.dataDir, MEMORY_FILE), JSON.stringify(this.memories, null, 2));
  }

  async addMemory(content: string, type: 'short_term' | 'long_term' = 'short_term', tags: string[] = [], metadata?: Record<string, unknown>): Promise<Memory> {
    const memory: Memory = {
      id: randomUUID(),
      content,
      type,
      tags,
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: type === 'short_term' ? Date.now() + 24 * 60 * 60 * 1000 : undefined,
    };
    this.memories.push(memory);
    this.saveData();
    return memory;
  }

  async getMemory(id: string): Promise<Memory | null> {
    return this.memories.find((m) => m.id === id) || null;
  }

  async updateMemory(id: string, data: Partial<Memory>): Promise<Memory | null> {
    const index = this.memories.findIndex((m) => m.id === id);
    if (index === -1) return null;

    this.memories[index] = {
      ...this.memories[index],
      ...data,
      id,
      updatedAt: Date.now(),
    };
    this.saveData();
    return this.memories[index];
  }

  async deleteMemory(id: string): Promise<boolean> {
    const index = this.memories.findIndex((m) => m.id === id);
    if (index === -1) return false;

    this.memories.splice(index, 1);
    this.saveData();
    return true;
  }

  async searchMemories(request: MemorySearchRequest): Promise<MemorySearchResult> {
    const { query, type = 'all', limit = 10, threshold = 0.5, tags } = request;

    let filtered = this.memories;

    // Filter by type
    if (type !== 'all') {
      filtered = filtered.filter((m) => m.type === type);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      filtered = filtered.filter((m) => tags.some((t) => m.tags.includes(t)));
    }

    // Filter out expired memories
    filtered = filtered.filter((m) => !m.expiresAt || m.expiresAt > Date.now());

    // Simple text matching (in production, use vector similarity)
    const queryLower = query.toLowerCase();
    const scored = filtered.map((memory) => {
      const contentLower = memory.content.toLowerCase();
      let score = 0;

      // Exact match
      if (contentLower.includes(queryLower)) {
        score = 1;
      } else {
        // Word matching
        const queryWords = queryLower.split(/\s+/);
        const contentWords = contentLower.split(/\s+/);
        const matchCount = queryWords.filter((w) => contentWords.some((cw) => cw.includes(w))).length;
        score = matchCount / queryWords.length;
      }

      return { memory, score };
    });

    // Filter by threshold and sort by score
    const results = scored
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      memories: results.map((r) => r.memory),
      scores: results.map((r) => r.score),
    };
  }

  async listMemories(type?: 'short_term' | 'long_term'): Promise<Memory[]> {
    let memories = this.memories.filter((m) => !m.expiresAt || m.expiresAt > Date.now());
    if (type) {
      memories = memories.filter((m) => m.type === type);
    }
    return memories;
  }

  async cleanupExpired(): Promise<number> {
    const now = Date.now();
    const before = this.memories.length;
    this.memories = this.memories.filter((m) => !m.expiresAt || m.expiresAt > now);
    this.saveData();
    return before - this.memories.length;
  }
}

export const memoryService = new MemoryService();