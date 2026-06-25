import { randomUUID } from 'crypto';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  copyFileSync,
  renameSync,
} from 'fs';
import { join, dirname, extname } from 'path';
import { app } from 'electron';
import { FileNode, FileOperation } from './file.types';

export class FileService {
  private dataDir: string;

  constructor() {
    this.dataDir = join(app.getPath('userData'), 'files');
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async listFiles(path: string = '/'): Promise<FileNode[]> {
    const fullPath = this.getFullPath(path);
    if (!existsSync(fullPath)) {
      return [];
    }

    const items = readdirSync(fullPath);
    const nodes: FileNode[] = [];

    for (const item of items) {
      const itemPath = join(fullPath, item);
      try {
        const stat = statSync(itemPath);
        nodes.push({
          id: randomUUID(),
          name: item,
          path: this.getRelativePath(itemPath),
          type: stat.isDirectory() ? 'directory' : 'file',
          size: stat.size,
          mimeType: this.getMimeType(item),
          createdAt: stat.birthtime.getTime(),
          updatedAt: stat.mtime.getTime(),
        });
      } catch {
        // Skip inaccessible files
      }
    }

    return nodes;
  }

  async readFile(path: string): Promise<FileNode | null> {
    const fullPath = this.getFullPath(path);
    if (!existsSync(fullPath)) {
      return null;
    }

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      return null;
    }

    const content = readFileSync(fullPath, 'utf-8');
    return {
      id: randomUUID(),
      name: fullPath.split('/').pop() || '',
      path,
      type: 'file',
      size: stat.size,
      mimeType: this.getMimeType(fullPath),
      content,
      createdAt: stat.birthtime.getTime(),
      updatedAt: stat.mtime.getTime(),
    };
  }

  async writeFile(path: string, content: string): Promise<FileNode> {
    const fullPath = this.getFullPath(path);
    const dir = dirname(fullPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, content, 'utf-8');
    const stat = statSync(fullPath);

    return {
      id: randomUUID(),
      name: fullPath.split('/').pop() || '',
      path,
      type: 'file',
      size: stat.size,
      mimeType: this.getMimeType(fullPath),
      content,
      createdAt: stat.birthtime.getTime(),
      updatedAt: stat.mtime.getTime(),
    };
  }

  async deleteFile(path: string): Promise<boolean> {
    const fullPath = this.getFullPath(path);
    if (!existsSync(fullPath)) {
      return false;
    }

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      // Recursive delete for directories
      this.deleteDirectory(fullPath);
    } else {
      unlinkSync(fullPath);
    }

    return true;
  }

  private deleteDirectory(dirPath: string): void {
    const items = readdirSync(dirPath);
    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stat = statSync(itemPath);
      if (stat.isDirectory()) {
        this.deleteDirectory(itemPath);
      } else {
        unlinkSync(itemPath);
      }
    }
    require('fs').rmdirSync(dirPath);
  }

  async moveFile(sourcePath: string, destPath: string): Promise<boolean> {
    const fullSource = this.getFullPath(sourcePath);
    const fullDest = this.getFullPath(destPath);

    if (!existsSync(fullSource)) {
      return false;
    }

    const destDir = dirname(fullDest);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    renameSync(fullSource, fullDest);
    return true;
  }

  async copyFile(sourcePath: string, destPath: string): Promise<boolean> {
    const fullSource = this.getFullPath(sourcePath);
    const fullDest = this.getFullPath(destPath);

    if (!existsSync(fullSource)) {
      return false;
    }

    const destDir = dirname(fullDest);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    copyFileSync(fullSource, fullDest);
    return true;
  }

  async createDirectory(path: string): Promise<FileNode> {
    const fullPath = this.getFullPath(path);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }

    const stat = statSync(fullPath);
    return {
      id: randomUUID(),
      name: fullPath.split('/').pop() || '',
      path,
      type: 'directory',
      size: 0,
      createdAt: stat.birthtime.getTime(),
      updatedAt: stat.mtime.getTime(),
    };
  }

  async getFileTree(path: string = '/', maxDepth: number = 3): Promise<FileNode[]> {
    const fullPath = this.getFullPath(path);
    if (!existsSync(fullPath)) {
      return [];
    }

    return this.buildTree(fullPath, 0, maxDepth);
  }

  private buildTree(dirPath: string, currentDepth: number, maxDepth: number): FileNode[] {
    if (currentDepth >= maxDepth) {
      return [];
    }

    const items = readdirSync(dirPath);
    const nodes: FileNode[] = [];

    for (const item of items) {
      const itemPath = join(dirPath, item);
      try {
        const stat = statSync(itemPath);
        const node: FileNode = {
          id: randomUUID(),
          name: item,
          path: this.getRelativePath(itemPath),
          type: stat.isDirectory() ? 'directory' : 'file',
          size: stat.size,
          mimeType: this.getMimeType(item),
          createdAt: stat.birthtime.getTime(),
          updatedAt: stat.mtime.getTime(),
        };

        if (stat.isDirectory()) {
          node.children = this.buildTree(itemPath, currentDepth + 1, maxDepth);
        }

        nodes.push(node);
      } catch {
        // Skip inaccessible files
      }
    }

    return nodes;
  }

  private getFullPath(relativePath: string): string {
    return join(this.dataDir, relativePath);
  }

  private getRelativePath(fullPath: string): string {
    return fullPath.replace(this.dataDir, '').replace(/\\/g, '/');
  }

  private getMimeType(filename: string): string {
    const ext = extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.jsx': 'application/javascript',
      '.tsx': 'application/typescript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.py': 'text/x-python',
      '.java': 'text/x-java',
      '.cpp': 'text/x-c++',
      '.c': 'text/x-c',
      '.h': 'text/x-c',
      '.xml': 'application/xml',
      '.yaml': 'application/x-yaml',
      '.yml': 'application/x-yaml',
      '.toml': 'application/toml',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export const fileService = new FileService();