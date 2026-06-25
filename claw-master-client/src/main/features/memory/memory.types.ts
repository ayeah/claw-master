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
