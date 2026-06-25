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
