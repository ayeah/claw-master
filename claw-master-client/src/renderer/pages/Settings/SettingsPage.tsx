import { useState, useEffect } from 'react'
import { useProviderStore } from '../../stores/providerStore'
import { useExecutionStore } from '../../stores/executionStore'
import { useAgentStore } from '../../stores/agentStore'
import { Plus, Trash2, Save, X, RefreshCw, Monitor, Cog, Plug, CheckCircle2, AlertCircle, ChevronRight, Server, Loader2, Bot, Eye, EyeOff, ChevronDown, Download } from 'lucide-react'
import type { Provider } from '../../../shared/types'
import type { SSHTestResult } from '../../types/execution'

type SettingsTab = 'models' | 'runtime' | 'preferences'

const tabs = [
  { id: 'models' as const, label: '模型配置', description: '管理 AI 模型提供商和模型列表', icon: <Monitor className="h-4 w-4" /> },
  { id: 'runtime' as const, label: '运行环境', description: 'WSL/SSH 和 Docker 服务管理', icon: <Cog className="h-4 w-4" /> },
  { id: 'preferences' as const, label: '偏好设置', description: '应用外观和行为设置', icon: <Cog className="h-4 w-4" /> },
]

export function SettingsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('models')

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <aside className="w-56 flex-shrink-0 border-r border-border bg-muted/10">
        <div className="px-4 py-5 border-b border-border">
          <h1 className="text-sm font-semibold">设置</h1>
          <p className="text-xs text-muted-foreground mt-0.5">应用配置管理</p>
        </div>
        <nav className="p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{tab.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{tab.description}</div>
              </div>
              {activeTab === tab.id && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-5">
          {activeTab === 'models' && <ModelsTab />}
          {activeTab === 'runtime' && <RuntimeTab />}
          {activeTab === 'preferences' && <PreferencesTab />}
        </div>
      </main>
    </div>
  )
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function ModelsTab(): JSX.Element {
  const { providers, createProvider, updateProvider, deleteProvider, fetchModels, addModel, deleteModel, testConnection } = useProviderStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showAddModel, setShowAddModel] = useState<string | null>(null)
  const [fetchingProviderId, setFetchingProviderId] = useState<string | null>(null)
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null)
  const [testingModelId, setTestingModelId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latency: number; error?: string }>>({})
  const [modelTestResults, setModelTestResults] = useState<Record<string, { success: boolean; latency: number; error?: string }>>({})
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({})
  const [newModelId, setNewModelId] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showBaseUrl, setShowBaseUrl] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'openai' as Provider['type'],
    baseUrl: '',
    apiKey: '',
  })

  const handleSave = async () => {
    if (!form.name || !form.baseUrl || !form.apiKey) return
    if (editingId) {
      await updateProvider(editingId, form)
    } else {
      await createProvider(form)
    }
    resetForm()
  }

  const handleEdit = (provider: Provider) => {
    setEditingId(provider.id)
    setForm({ name: provider.name, type: provider.type, baseUrl: provider.baseUrl, apiKey: provider.apiKey })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定删除该模型商配置？')) {
      await deleteProvider(id)
    }
  }

  const handleFetchModels = async (providerId: string) => {
    setFetchingProviderId(providerId)
    await fetchModels(providerId)
    setFetchingProviderId(null)
  }

  const handleTestConnection = async (providerId: string) => {
    setTestingProviderId(providerId)
    const result = await testConnection(providerId)
    setTestResults((prev) => ({ ...prev, [providerId]: result }))
    setTestingProviderId(null)
  }

  const handleAddModel = async (providerId: string) => {
    if (!newModelId.trim()) return
    await addModel(providerId, { id: newModelId.trim(), name: newModelId.trim() })
    setNewModelId('')
    setShowAddModel(null)
  }

  const handleDeleteModel = async (providerId: string, modelId: string) => {
    if (confirm('确定删除该模型？')) {
      await deleteModel(providerId, modelId)
    }
  }

  const handleTestModel = async (providerId: string, modelId: string) => {
    const key = `${providerId}:${modelId}`
    setTestingModelId(key)
    try {
      const result = await testConnection(providerId)
      setModelTestResults((prev) => ({ ...prev, [key]: { success: result.success, latency: result.latency, error: result.error } }))
    } catch (error) {
      setModelTestResults((prev) => ({ ...prev, [key]: { success: false, latency: 0, error: error instanceof Error ? error.message : 'Test failed' } }))
    }
    setTestingModelId(null)
  }

  const resetForm = () => {
    setEditingId(null)
    setShowForm(false)
    setForm({ name: '', type: 'openai', baseUrl: '', apiKey: '' })
    setShowApiKey(false)
    setShowBaseUrl(false)
  }

  const formatApiKey = (key: string) => {
    if (!key || key.length < 10) return '****'
    return `${key.slice(0, 4)}****${key.slice(-4)}`
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="模型商配置"
        description="管理 AI 模型提供商和模型列表"
        action={
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            添加模型商
          </button>
        }
      />

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">{editingId ? '编辑模型商' : '添加模型商'}</h3>
            <button onClick={resetForm} className="rounded-md p-1.5 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">名称</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My OpenAI"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">类型</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Provider['type'] })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="azure">Azure</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Base URL</label>
              <div className="relative">
                <input type={showBaseUrl ? 'text' : 'password'} value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder={editingId ? 'https://api.openai.com/v1' : 'https://api.openai.com/v1'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
                <button type="button" onClick={() => setShowBaseUrl(!showBaseUrl)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-muted transition-colors">
                  {showBaseUrl ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">API Key</label>
              <div className="relative">
                <input type={showApiKey ? 'text' : 'password'} value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editingId ? (form.apiKey ? 'sk-****' : '留空则不修改') : 'sk-xxxx****xxxx'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-muted transition-colors">
                  {showApiKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button onClick={resetForm} className="rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors">取消</button>
            <button onClick={handleSave} disabled={!form.name || !form.baseUrl || (!editingId && !form.apiKey)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Save className="h-4 w-4" />保存
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {providers.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
            暂无模型商配置，点击上方按钮添加
          </div>
        )}
        {providers.map((provider) => (
          <div key={provider.id} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-sm">{provider.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{provider.type.toUpperCase()}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleTestConnection(provider.id)} disabled={testingProviderId === provider.id}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs hover:bg-muted disabled:opacity-50 transition-colors" title="测试连通性">
                  <Plug className={`h-3.5 w-3.5 ${testingProviderId === provider.id ? 'animate-pulse text-primary' : ''}`} />
                  {testingProviderId === provider.id ? '测试中...' : '测试连接'}
                </button>
                <button onClick={() => handleFetchModels(provider.id)} disabled={fetchingProviderId === provider.id}
                  className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-50 transition-colors" title="从API获取模型列表">
                  <RefreshCw className={`h-4 w-4 ${fetchingProviderId === provider.id ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => handleEdit(provider)} className="rounded-lg px-2.5 py-1.5 text-xs hover:bg-muted transition-colors">编辑</button>
                <button onClick={() => handleDelete(provider.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {testResults[provider.id] && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                testResults[provider.id].success
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {testResults[provider.id].success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                {testResults[provider.id].success
                  ? `连接成功 (${testResults[provider.id].latency}ms)`
                  : `连接失败: ${testResults[provider.id].error}`
                }
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">模型列表 ({provider.models.length})</span>
                <button onClick={() => setShowAddModel(showAddModel === provider.id ? null : provider.id)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors">
                  <Plus className="h-3 w-3" />手动添加
                </button>
              </div>
              {showAddModel === provider.id && (
                <div className="mb-3 flex gap-2">
                  <input type="text" value={newModelId} onChange={(e) => setNewModelId(e.target.value)} placeholder="输入模型ID，如 gpt-4o"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddModel(provider.id)} />
                  <button onClick={() => handleAddModel(provider.id)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">添加</button>
                </div>
              )}
              {provider.models.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-2">
                    {provider.models.slice(0, expandedModels[provider.id] ? undefined : 6).map((model) => {
                      const key = `${provider.id}:${model.id}`
                      const result = modelTestResults[key]
                      return (
                        <div key={model.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{model.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{model.id}</div>
                            {result && (
                              <div className={`text-[11px] mt-0.5 ${result.success ? 'text-green-600' : 'text-destructive'}`}>
                                {result.success ? `✓ ${result.latency}ms` : `✗ ${result.error}`}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => handleTestModel(provider.id, model.id)}
                              disabled={testingModelId === key}
                              className="rounded p-1 hover:bg-muted disabled:opacity-50 transition-colors"
                              title="测试模型"
                            >
                              {testingModelId === key ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              ) : (
                                <Plug className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteModel(provider.id, model.id)}
                              className="rounded p-1 text-destructive hover:bg-destructive/10 transition-colors"
                              title="删除模型"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {provider.models.length > 6 && (
                    <button
                      onClick={() => setExpandedModels((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                      className="flex items-center justify-center gap-1 w-full mt-2 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      {expandedModels[provider.id] ? '收起' : `展开全部 ${provider.models.length} 个模型`}
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedModels[provider.id] ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </>
              ) : (
                <div className="text-xs text-muted-foreground py-4 text-center rounded-lg border border-dashed border-border">
                  暂无模型，点击刷新按钮获取或手动添加
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RuntimeTab(): JSX.Element {
  return (
    <div className="space-y-8">
      <WSLSSection />
    </div>
  )
}

function WSLSSection(): JSX.Element {
  const { wslAvailable, wslDistros, sshConnections, checkWSL, listWSLDistros, listSSHConnections, createSSHConnection, deleteSSHConnection, testSSHConnectionFull, detectSSHAgents, isExecuting } = useExecutionStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, SSHTestResult>>({})
  const [expandedError, setExpandedError] = useState<Record<string, boolean>>({})
  const [detectedAgents, setDetectedAgents] = useState<Record<string, Array<{name: string; type: string; port?: number; status: string; path?: string}>>>({})
  const [detectingAgents, setDetectingAgents] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showSudoPassword, setShowSudoPassword] = useState(false)
  const [form, setForm] = useState({
    name: '',
    host: '',
    port: '22',
    username: '',
    password: '',
    sudoPassword: '',
    description: '',
  })

  useEffect(() => {
    checkWSL()
    listWSLDistros()
    listSSHConnections()
  }, [])

  const resetForm = () => {
    setForm({ name: '', host: '', port: '22', username: '', password: '', sudoPassword: '', description: '' })
    setShowForm(false)
    setEditingId(null)
    setShowPassword(false)
    setShowSudoPassword(false)
  }

  const handleSave = async () => {
    if (!form.name || !form.host || !form.username) return
    if (!editingId && !form.password) return
    if (editingId) {
      const { updateSSHConnection } = useExecutionStore.getState()
      const updateData: any = {
        name: form.name,
        host: form.host,
        port: parseInt(form.port) || 22,
        username: form.username,
        authType: 'password',
        sudoPassword: form.sudoPassword || undefined,
        description: form.description || undefined,
      }
      if (form.password) {
        updateData.password = form.password
      }
      await updateSSHConnection(editingId, updateData)
    } else {
      await createSSHConnection({
        name: form.name,
        host: form.host,
        port: parseInt(form.port) || 22,
        username: form.username,
        authType: 'password',
        password: form.password,
        sudoPassword: form.sudoPassword || undefined,
        description: form.description || undefined,
      })
    }
    resetForm()
    await listSSHConnections()
  }

  const handleEdit = (conn: any) => {
    setEditingId(conn.id)
    setForm({
      name: conn.name,
      host: conn.host,
      port: String(conn.port),
      username: conn.username,
      password: '',
      sudoPassword: '',
      description: conn.description || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定删除该 SSH 连接？')) {
      await deleteSSHConnection(id)
      const newResults = { ...testResults }
      delete newResults[id]
      setTestResults(newResults)
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    setTestResults((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timeout (30s)')), 30000)
      )
      
      const result = await Promise.race([
        testSSHConnectionFull(id),
        timeoutPromise
      ])
      
      setTestResults((prev) => ({ ...prev, [id]: result }))
      setTestingId(null)

      if (result.login.success) {
        setDetectingAgents(id)
        try {
          const agents = await detectSSHAgents(id)
          setDetectedAgents((prev) => ({ ...prev, [id]: agents }))
        } catch (agentErr) {
          console.error('Agent detection failed:', agentErr)
          setDetectedAgents((prev) => ({ ...prev, [id]: [] }))
        }
        setDetectingAgents(null)
      }
    } catch (err) {
      console.error('SSH test connection failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setTestResults((prev) => ({ 
        ...prev, 
        [id]: { 
          login: { success: false, error: errorMessage }, 
          docker: { available: false, error: errorMessage }, 
          sudo: { available: false, error: errorMessage } 
        } 
      }))
      setTestingId(null)
      setDetectingAgents(null)
    }
  }

  const toggleError = (connId: string, type: string) => {
    const key = `${connId}:${type}`
    setExpandedError((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleImportAgents = async (connId: string) => {
    const agents = detectedAgents[connId]
    if (!agents || agents.length === 0) return
    
    const { createAgent } = useAgentStore.getState()
    let imported = 0
    
    for (const agent of agents) {
      try {
        await createAgent({
          name: `${agent.name} (${sshConnections.find(c => c.id === connId)?.name || 'SSH'})`,
          model: 'default',
          description: `通过 SSH 从服务器自动检测导入 (${agent.type})`,
          systemPrompt: '',
          capabilities: ['chat'],
          providerId: '',
          enabled: true,
          config: {
            source: 'ssh-detection',
            connectionId: connId,
            type: agent.type,
            port: agent.port,
            path: agent.path,
          },
        })
        imported++
      } catch (error) {
        console.error('Failed to import agent:', error)
      }
    }
    
    if (imported > 0) {
      alert(`成功导入 ${imported} 个 Agent 到 Agent 页面`)
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="WSL / SSH"
        description="管理本地 WSL 和远程 SSH 连接"
        action={
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            添加 SSH 连接
          </button>
        }
      />

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">WSL</span>
            <span className={`flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full ${wslAvailable ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${wslAvailable ? 'bg-green-500' : 'bg-muted-foreground'}`} />
              {wslAvailable ? '可用' : '不可用'}
            </span>
          </div>
          <button onClick={checkWSL} className="text-xs text-primary hover:underline transition-colors">刷新状态</button>
        </div>
        {wslDistros.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">已检测到的发行版</span>
            <div className="flex flex-wrap gap-1.5">
              {wslDistros.map((d) => (
                <span key={d.name} className="rounded-md bg-muted px-2.5 py-1 text-xs">
                  {d.name} {d.state === 'Running' ? '●' : '○'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{editingId ? '编辑 SSH 连接' : '添加 SSH 连接'}</h3>
              <button onClick={resetForm} className="rounded-md p-1.5 hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">连接名称 *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="生产服务器"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">用户名 *</label>
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="root"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">服务器 IP *</label>
                <input type="text" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.100"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">端口</label>
                <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="22"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{editingId ? '新密码（留空保持不变）' : '登录密码 *'}</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingId ? '留空则不修改' : '输入密码'}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-muted transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sudo 密码（可选）</label>
                <div className="relative">
                  <input type={showSudoPassword ? 'text' : 'password'} value={form.sudoPassword} onChange={(e) => setForm({ ...form, sudoPassword: e.target.value })} placeholder="如需 sudo 权限请填写"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
                  <button type="button" onClick={() => setShowSudoPassword(!showSudoPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-muted transition-colors">
                    {showSudoPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">描述（可选）</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="例如：生产环境服务器"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={resetForm} className="rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors">取消</button>
              <button onClick={handleSave} disabled={!form.name || !form.host || !form.username || (!editingId && !form.password)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                <Save className="h-4 w-4" />{editingId ? '更新' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">SSH 连接 ({sshConnections.length})</span>
        </div>
        {sshConnections.length > 0 ? (
          <div className="space-y-3">
            {sshConnections.map((conn) => (
              <div key={conn.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{conn.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{conn.username}@{conn.host}:{conn.port}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleTest(conn.id)} disabled={testingId === conn.id}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs hover:bg-muted disabled:opacity-50 transition-colors">
                      {testingId === conn.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Plug className="h-3.5 w-3.5" />
                      )}
                      {testingId === conn.id ? '测试中...' : '测试连接'}
                    </button>
                    <button onClick={() => handleEdit(conn)} className="rounded-lg px-2.5 py-1.5 text-xs hover:bg-muted transition-colors">编辑</button>
                    <button onClick={() => handleDelete(conn.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {testResults[conn.id] && (
                  <TestResultDisplay result={testResults[conn.id]} connId={conn.id} expandedError={expandedError} toggleError={toggleError} onClose={() => {
                    setTestResults((prev) => {
                      const next = { ...prev }
                      delete next[conn.id]
                      return next
                    })
                  }} />
                )}
                
                {detectingAgents === conn.id && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>正在检测服务器上的 Agent...</span>
                  </div>
                )}
                
                {detectedAgents[conn.id] && detectedAgents[conn.id].length > 0 && (
                  <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">检测到的 Agent ({detectedAgents[conn.id].length})</span>
                      <button onClick={() => handleImportAgents(conn.id)} className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors">
                        <Download className="h-3 w-3" />
                        导入到 Agent 页面
                      </button>
                    </div>
                    <div className="space-y-1">
                      {detectedAgents[conn.id].map((agent, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{agent.name}</span>
                          <span className="text-muted-foreground">({agent.type})</span>
                          {agent.port && <span className="text-muted-foreground">:{agent.port}</span>}
                          <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${
                            agent.status === 'running' ? 'bg-green-500/15 text-green-600' : 'bg-yellow-500/15 text-yellow-600'
                          }`}>
                            {agent.status === 'running' ? '运行中' : '监听中'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !showForm && <p className="text-xs text-muted-foreground py-4 text-center">暂无 SSH 连接，点击上方按钮添加</p>
        )}
      </div>
    </div>
  )
}

function TestResultDisplay({ result, connId, expandedError, toggleError, onClose }: { result: SSHTestResult; connId: string; expandedError: Record<string, boolean>; toggleError: (connId: string, type: string) => void; onClose: () => void }): JSX.Element {
  const isExpanded = (type: string) => expandedError[`${connId}:${type}`]
  
  return (
    <div className="space-y-2 text-xs">
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
        result.login.success ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-destructive/10 text-destructive'
      }`}>
        {result.login.success ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
        <span className="font-medium">登录测试</span>
        {result.login.hostname && (
          <span className="text-muted-foreground">({result.login.hostname})</span>
        )}
        <span className="ml-auto">
          {result.login.success ? `成功 (${result.login.latency}ms)` : '失败'}
        </span>
        <button onClick={onClose} className="ml-2 rounded p-0.5 hover:bg-background/50 transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {!result.login.success && result.login.details && (
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
          <button onClick={() => toggleError(connId, 'login')} className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline w-full text-left">
            <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded('login') ? 'rotate-90' : ''}`} />
            查看详细错误信息
          </button>
          {isExpanded('login') && (
            <div className="mt-2 space-y-2">
              <pre className="text-xs whitespace-pre-wrap text-foreground bg-background rounded p-2">{result.login.details}</pre>
              {result.login.rawOutput && (
                <div>
                  <span className="text-muted-foreground">原始输出:</span>
                  <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-background rounded p-2 mt-1">{result.login.rawOutput}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
        result.docker.available ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
      }`}>
        {result.docker.available ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
        <span className="font-medium">Docker</span>
        <span className="ml-auto">
          {result.docker.available ? `已安装 (v${result.docker.version})` : '未安装'}
        </span>
      </div>
      {result.docker.error && result.docker.details && (
        <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 px-3 py-2">
          <button onClick={() => toggleError(connId, 'docker')} className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400 hover:underline w-full text-left">
            <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded('docker') ? 'rotate-90' : ''}`} />
            查看安装指南
          </button>
          {isExpanded('docker') && (
            <pre className="mt-2 text-xs whitespace-pre-wrap text-foreground bg-background rounded p-2">{result.docker.details}</pre>
          )}
        </div>
      )}

      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
        result.sudo.available ? 'bg-green-500/10 text-green-600 dark:text-green-400'
        : result.sudo.error === '未提供 sudo 密码' ? 'bg-muted text-muted-foreground'
        : 'bg-destructive/10 text-destructive'
      }`}>
        {result.sudo.available ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
        <span className="font-medium">Sudo 权限</span>
        <span className="ml-auto">
          {result.sudo.available ? '已验证' : result.sudo.error || '未测试'}
        </span>
      </div>
      {result.sudo.error && result.sudo.error !== '未提供 sudo 密码' && result.sudo.details && (
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
          <button onClick={() => toggleError(connId, 'sudo')} className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline w-full text-left">
            <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded('sudo') ? 'rotate-90' : ''}`} />
            查看详细错误信息
          </button>
          {isExpanded('sudo') && (
            <div className="mt-2 space-y-2">
              <pre className="text-xs whitespace-pre-wrap text-foreground bg-background rounded p-2">{result.sudo.details}</pre>
              {result.sudo.rawOutput && (
                <div>
                  <span className="text-muted-foreground">原始输出:</span>
                  <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-background rounded p-2 mt-1">{result.sudo.rawOutput}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PreferencesTab(): JSX.Element {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [language, setLanguage] = useState<'zh' | 'en'>('zh')
  const [startupPage, setStartupPage] = useState<'chat' | 'last'>('chat')
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [sendKey, setSendKey] = useState<'enter' | 'ctrl+enter'>('enter')

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else if (newTheme === 'light') {
      root.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    }
    try { localStorage.setItem('claw-preferences', JSON.stringify({ theme: newTheme, language, startupPage, fontSize, sendKey })) } catch {}
  }

  const savePref = (key: string, value: any) => {
    const prefs = { theme, language, startupPage, fontSize, sendKey, [key]: value }
    try { localStorage.setItem('claw-preferences', JSON.stringify(prefs)) } catch {}
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="偏好设置" description="自定义应用外观和行为" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <label className="text-sm font-medium block mb-3">外观</label>
          <div className="flex gap-2">
            {([
              { value: 'light' as const, label: '浅色' },
              { value: 'dark' as const, label: '深色' },
              { value: 'system' as const, label: '跟随系统' },
            ]).map((opt) => (
              <button key={opt.value} onClick={() => applyTheme(opt.value)}
                className={`rounded-lg px-4 py-2 text-sm border transition-colors ${
                  theme === opt.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted'
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <label className="text-sm font-medium block mb-3">语言</label>
          <div className="flex gap-2">
            {([
              { value: 'zh' as const, label: '中文' },
              { value: 'en' as const, label: 'English' },
            ]).map((opt) => (
              <button key={opt.value} onClick={() => { setLanguage(opt.value); savePref('language', opt.value) }}
                className={`rounded-lg px-4 py-2 text-sm border transition-colors ${
                  language === opt.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted'
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <label className="text-sm font-medium block mb-3">启动页面</label>
          <div className="flex gap-2">
            {([
              { value: 'chat' as const, label: '对话' },
              { value: 'last' as const, label: '上次页面' },
            ]).map((opt) => (
              <button key={opt.value} onClick={() => { setStartupPage(opt.value); savePref('startupPage', opt.value) }}
                className={`rounded-lg px-4 py-2 text-sm border transition-colors ${
                  startupPage === opt.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted'
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <label className="text-sm font-medium block mb-3">字体大小</label>
          <div className="flex gap-2">
            {([
              { value: 'sm' as const, label: '小' },
              { value: 'md' as const, label: '中' },
              { value: 'lg' as const, label: '大' },
            ]).map((opt) => (
              <button key={opt.value} onClick={() => { setFontSize(opt.value); savePref('fontSize', opt.value) }}
                className={`rounded-lg px-4 py-2 text-sm border transition-colors ${
                  fontSize === opt.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted'
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <label className="text-sm font-medium block mb-3">发送快捷键</label>
          <div className="flex gap-2">
            {([
              { value: 'enter' as const, label: 'Enter 发送' },
              { value: 'ctrl+enter' as const, label: 'Ctrl+Enter 发送' },
            ]).map((opt) => (
              <button key={opt.value} onClick={() => { setSendKey(opt.value); savePref('sendKey', opt.value) }}
                className={`rounded-lg px-4 py-2 text-sm border transition-colors ${
                  sendKey === opt.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted'
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
