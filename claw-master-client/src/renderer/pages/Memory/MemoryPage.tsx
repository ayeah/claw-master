import { useEffect, useState } from 'react'
import { useMemoryStore } from '../../stores/memoryStore'
import { Plus, Trash2, Search, RefreshCw, Save, X, Tag } from 'lucide-react'

export function MemoryPage(): JSX.Element {
  const { memories, loading, error, fetch, add, update, remove, cleanup, search } = useMemoryStore()
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<typeof memories>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ content: '', type: 'short_term' as 'short_term' | 'long_term', tags: '' })

  useEffect(() => {
    fetch()
  }, [])

  const resetForm = () => {
    setForm({ content: '', type: 'short_term', tags: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.content.trim()) return
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean)
    if (editingId) {
      await update(editingId, { content: form.content, type: form.type, tags })
    } else {
      await add(form.content, form.type, tags)
    }
    resetForm()
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const result = await search({ query: searchQuery, type: 'all', limit: 20 })
    setSearchResults(result.memories)
  }

  const handleEdit = (id: string) => {
    const memory = memories.find((m) => m.id === id)
    if (!memory) return
    setEditingId(id)
    setForm({ content: memory.content, type: memory.type, tags: memory.tags.join(', ') })
    setShowForm(true)
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h2 className="text-base font-semibold">记忆管理</h2>
          <p className="text-sm text-muted-foreground">管理短期和长期记忆条目</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetch()} className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
          <button onClick={cleanup} className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            清理过期
          </button>
          <button onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />添加记忆
          </button>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索记忆内容..." className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button onClick={handleSearch} className="rounded-md bg-secondary px-3 py-2 text-sm hover:bg-secondary/80">搜索</button>
        </div>
        {searchQuery && searchResults.length > 0 && (
          <div className="mt-3 rounded-lg bg-muted/30 p-3 text-xs">
            <span className="text-muted-foreground">搜索结果：</span> 找到 {searchResults.length} 条
          </div>
        )}
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 space-y-4">
          {showForm && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">{editingId ? '编辑记忆' : '添加记忆'}</h3>
                <button onClick={resetForm} className="rounded p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="记忆内容..." rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">类型</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'short_term' | 'long_term' })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="short_term">短期（24 小时过期）</option>
                    <option value="long_term">长期（永久）</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">标签（逗号分隔）</label>
                  <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="如：用户偏好, 项目配置"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button onClick={resetForm} className="rounded-lg px-4 py-2 text-sm hover:bg-muted">取消</button>
                <button onClick={handleSave} disabled={!form.content.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  <Save className="h-4 w-4" />保存
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {loading && <div className="text-center text-sm text-muted-foreground py-8">加载中…</div>}

          {!loading && memories.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
              暂无记忆条目，点击上方按钮添加
            </div>
          )}

          <div className="space-y-3">
            {(searchQuery ? searchResults : memories).map((memory) => (
              <div key={memory.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex-1 text-sm whitespace-pre-wrap">{memory.content}</p>
                  <div className="flex flex-shrink-0 gap-1">
                    <button onClick={() => handleEdit(memory.id)} className="rounded p-1 hover:bg-muted text-xs">编辑</button>
                    <button onClick={() => { if (confirm('删除该记忆？')) remove(memory.id) }} className="rounded p-1 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={`px-2 py-0.5 rounded-full ${
                    memory.type === 'short_term' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                  }`}>
                    {memory.type === 'short_term' ? '短期' : '长期'}
                  </span>
                  {memory.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
                      <Tag className="h-3 w-3" />{tag}
                    </span>
                  ))}
                  <span className="ml-auto">{new Date(memory.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}