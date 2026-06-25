import { useEffect, useState } from 'react'
import { useSkillStore, type Skill } from '../../stores/skillStore'
import { Plus, Trash2, Save, X, Play, RefreshCw, Code2, Globe, Terminal, Bot } from 'lucide-react'

const SKILL_TYPES = [
  { value: 'function', label: 'Function', icon: Code2, description: '执行本地 JS 脚本' },
  { value: 'http', label: 'HTTP', icon: Globe, description: '调用外部 HTTP 接口' },
  { value: 'shell', label: 'Shell', icon: Terminal, description: '执行本地命令' },
  { value: 'agent', label: 'Agent', icon: Bot, description: '调用远程 Agent 端点' },
] as const

export function SkillPage(): JSX.Element {
  const { skills, loading, error, fetch, create, update, remove, execute } = useSkillStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Skill> & { scriptPath?: string; url?: string; command?: string; agentEndpoint?: string }>({
    name: '',
    description: '',
    version: '1.0.0',
    author: '',
    enabled: true,
    type: 'function',
    schema: { input: [], output: [] },
    config: {},
  })

  useEffect(() => {
    fetch()
  }, [])

  const resetForm = () => {
    setForm({ name: '', description: '', version: '1.0.0', author: '', enabled: true, type: 'function', schema: { input: [], output: [] }, config: {} })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.name || !form.type) return
    if (editingId) {
      await update(editingId, form)
    } else {
      await create(form as Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>)
    }
    resetForm()
  }

  const handleRun = async (skill: Skill) => {
    setRunning(skill.id)
    try {
      const result = await execute(skill.id, {})
      alert(`执行结果：\n${JSON.stringify(result, null, 2)}`)
    } finally {
      setRunning(null)
    }
  }

  const handleEdit = (skill: Skill) => {
    setEditingId(skill.id)
    setForm({ ...skill })
    setShowForm(true)
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h2 className="text-base font-semibold">技能管理</h2>
          <p className="text-sm text-muted-foreground">管理和执行可复用技能</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetch()} className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
          <button onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />添加技能
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 space-y-4">
          {showForm && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">{editingId ? '编辑技能' : '添加技能'}</h3>
                <button onClick={resetForm} className="rounded p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">名称 *</label>
                  <input type="text" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">版本</label>
                  <input type="text" value={form.version || ''} onChange={(e) => setForm({ ...form, version: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">描述</label>
                  <input type="text" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">作者</label>
                  <input type="text" value={form.author || ''} onChange={(e) => setForm({ ...form, author: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">类型</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Skill['type'] })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    {SKILL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {form.type === 'function' && (
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">脚本路径</label>
                    <input type="text" value={form.scriptPath || ''} onChange={(e) => setForm({ ...form, scriptPath: e.target.value, config: { ...form.config, scriptPath: e.target.value } })}
                      placeholder="/path/to/script.js"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
                  </div>
                )}
                {form.type === 'http' && (
                  <>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">URL</label>
                      <input type="text" value={form.url || ''} onChange={(e) => setForm({ ...form, url: e.target.value, config: { ...form.config, url: e.target.value } })}
                        placeholder="https://api.example.com/endpoint"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">HTTP 方法</label>
                      <input type="text" value={(form.config?.method as string) || 'POST'} onChange={(e) => setForm({ ...form, config: { ...form.config, method: e.target.value } })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                  </>
                )}
                {form.type === 'shell' && (
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">命令</label>
                    <input type="text" value={form.command || ''} onChange={(e) => setForm({ ...form, command: e.target.value, config: { ...form.config, command: e.target.value } })}
                      placeholder="echo hello"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
                  </div>
                )}
                {form.type === 'agent' && (
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Agent 端点</label>
                    <input type="text" value={form.agentEndpoint || ''} onChange={(e) => setForm({ ...form, agentEndpoint: e.target.value, config: { ...form.config, agentEndpoint: e.target.value } })}
                      placeholder="http://localhost:8080"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button onClick={resetForm} className="rounded-lg px-4 py-2 text-sm hover:bg-muted">取消</button>
                <button onClick={handleSave} disabled={!form.name || !form.type}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  <Save className="h-4 w-4" />保存
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
          )}

          {loading && <div className="text-center text-sm text-muted-foreground py-8">加载中…</div>}

          {!loading && skills.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
              暂无技能，点击上方按钮添加
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {skills.map((skill) => {
              const TypeIcon = SKILL_TYPES.find((t) => t.value === skill.type)?.icon || Code2
              return (
                <div key={skill.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="rounded-lg bg-primary/10 p-2"><TypeIcon className="h-4 w-4 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{skill.name}</div>
                        <div className="text-[11px] text-muted-foreground">v{skill.version} · {skill.type}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleRun(skill)} disabled={running === skill.id || !skill.enabled}
                        className="rounded p-1.5 hover:bg-muted disabled:opacity-50" title="运行">
                        {running === skill.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => handleEdit(skill)} className="rounded px-1.5 py-0.5 text-xs hover:bg-muted">编辑</button>
                      <button onClick={() => { if (confirm('删除该技能？')) remove(skill.id) }} className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {skill.description && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className={`px-1.5 py-0.5 rounded ${skill.enabled ? 'bg-green-500/15 text-green-600' : 'bg-muted'}`}>
                      {skill.enabled ? '已启用' : '已禁用'}
                    </span>
                    <span>{skill.author || '未知作者'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}