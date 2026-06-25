import { useEffect, useState } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { Folder, File as FileIcon, RefreshCw, Trash2, FolderPlus, Save, X, ChevronRight, ChevronDown } from 'lucide-react'

export function FilePage(): JSX.Element {
  const { files, currentPath, loading, error, openFile, openContent, fetch, readFile, writeFile, deleteFile, mkdir, clearOpen } = useFileStore()
  const [editingContent, setEditingContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [showMkdir, setShowMkdir] = useState(false)
  const [newDirName, setNewDirName] = useState('')

  useEffect(() => {
    fetch('/')
  }, [])

  useEffect(() => {
    if (openFile) {
      setEditingContent(openFile.content || '')
      setDirty(false)
    }
  }, [openFile])

  const handleSave = async () => {
    if (!openFile) return
    await writeFile(openFile.path, editingContent)
    setDirty(false)
  }

  const handleMkdir = async () => {
    if (!newDirName.trim()) return
    const path = `${currentPath === '/' ? '' : currentPath}/${newDirName}`.replace(/^\//, '/')
    await mkdir(path)
    setNewDirName('')
    setShowMkdir(false)
  }

  const goUp = () => {
    if (currentPath === '/') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    const newPath = parts.length ? '/' + parts.join('/') : '/'
    fetch(newPath)
  }

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <aside className="w-80 flex-shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">本地文件</h2>
          <div className="flex gap-1">
            <button onClick={() => setShowMkdir(true)} className="rounded p-1 hover:bg-muted" title="新建文件夹">
              <FolderPlus className="h-4 w-4" />
            </button>
            <button onClick={() => fetch(currentPath)} className="rounded p-1 hover:bg-muted" title="刷新">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-3 py-2 border-b border-border flex items-center gap-1 text-xs text-muted-foreground font-mono">
          <button onClick={goUp} disabled={currentPath === '/'}
            className="rounded p-0.5 hover:bg-muted disabled:opacity-30">↑</button>
          <span className="truncate">{currentPath}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="text-center text-xs text-muted-foreground py-6">加载中…</div>}
          {!loading && files.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-6">空目录</div>
          )}
          <div className="p-1">
            {files.map((node) => (
              <button key={node.id}
                onClick={() => node.type === 'directory' ? fetch(node.path) : readFile(node.path)}
                className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors">
                {node.type === 'directory' ? (
                  <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{node.name}</span>
                {node.type === 'file' && (
                  <span className="text-[10px] text-muted-foreground">{formatSize(node.size)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {!openFile ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            {error ? <div className="text-destructive">{error}</div> : '选择一个文件查看'}
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">{openFile.path}</span>
                {dirty && <span className="text-xs text-yellow-600">●未保存</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { if (confirm(`删除 ${openFile.path}？`)) { deleteFile(openFile.path); clearOpen() } }}
                  className="rounded p-1.5 text-destructive hover:bg-destructive/10" title="删除">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={clearOpen} className="rounded p-1.5 hover:bg-muted" title="关闭">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={handleSave} disabled={!dirty}
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" />保存
                </button>
              </div>
            </div>
            <textarea value={editingContent} onChange={(e) => { setEditingContent(e.target.value); setDirty(true) }}
              spellCheck={false}
              className="flex-1 w-full bg-background px-4 py-3 font-mono text-xs leading-relaxed focus:outline-none resize-none" />
          </>
        )}
      </main>

      {showMkdir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 space-y-3 shadow-xl">
            <h3 className="font-medium text-sm">新建文件夹</h3>
            <input type="text" value={newDirName} onChange={(e) => setNewDirName(e.target.value)}
              placeholder="文件夹名称" autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleMkdir()}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => { setShowMkdir(false); setNewDirName('') }} className="rounded-lg px-3 py-1.5 text-sm hover:bg-muted">取消</button>
              <button onClick={handleMkdir} disabled={!newDirName.trim()} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}