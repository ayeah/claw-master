import { useState, useEffect } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import { useProviderStore } from '../../stores/providerStore'
import type { AgentProvider, Agent } from '../../types/agent'
import { Bot, Plus, Trash2, Save, X, ChevronDown, ChevronRight, Settings, MessageSquare, Send, Plug, Loader2, ExternalLink, Download, Container, RefreshCw } from 'lucide-react'

const PROVIDER_TYPES = [
  { value: 'openclaw', label: 'OpenClaw', description: 'OpenClaw Agent 框架' },
  { value: 'hermes', label: 'Hermes', description: 'Hermes AI 框架' },
  { value: 'qwenpaw', label: 'QwenPaw', description: '通义千问 Agent' },
  { value: 'opencode', label: 'OpenCode', description: 'OpenCode 代码助手' },
  { value: 'custom', label: '自定义', description: '自定义 OpenAI 兼容 API' },
] as const

export function AgentPage() {
  const { providers, agents, fetchProviders, fetchAgents, createProvider, updateProvider, deleteProvider, createAgent, updateAgent, deleteAgent, selectAgent, currentAgent } = useAgentStore()
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({})
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null)
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const [providerForm, setProviderForm] = useState({ name: '', type: 'openclaw' as 'openclaw' | 'hermes' | 'qwenpaw' | 'opencode' | 'custom', baseUrl: '', apiKey: '', description: '' })
  const [agentForm, setAgentForm] = useState({ name: '', model: '', description: '', systemPrompt: '', capabilities: [] as any[] })
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latency: number; error?: string }>>({})
  const [discoveringModels, setDiscoveringModels] = useState<string | null>(null)

  useEffect(() => { fetchProviders(); fetchAgents() }, [])

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgentId(agent.id)
    selectAgent(agent)
    setChatMessages([])
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !currentAgent) return
    const userMsg = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    try {
      const result = await useAgentStore.getState().invokeAgent(currentAgent.id, chatInput)
      setChatMessages(prev => [...prev, { role: 'assistant', content: result.output }])
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }])
    }
  }

  const handleTestProvider = async (providerId: string) => {
    setTestingProvider(providerId)
    try {
      const result = await useProviderStore.getState().testConnection(providerId)
      setTestResults(prev => ({ ...prev, [providerId]: result }))
    } catch (error) {
      setTestResults(prev => ({ ...prev, [providerId]: { success: false, latency: 0, error: error instanceof Error ? error.message : '测试失败' } }))
    }
    setTestingProvider(null)
  }

  const handleDiscoverModels = async (providerId: string) => {
    setDiscoveringModels(providerId)
    try {
      await useProviderStore.getState().fetchModels(providerId)
    } catch (error) {
      console.error('Failed to discover models:', error)
    }
    setDiscoveringModels(null)
  }

  const handleCreateProvider = async () => {
    if (!providerForm.name || !providerForm.baseUrl) return
    if (editingProviderId) {
      await updateProvider(editingProviderId, { ...providerForm, enabled: true, capabilities: ['chat'], config: {} })
    } else {
      await createProvider({ ...providerForm, enabled: true, capabilities: ['chat'], config: {} })
      setTestResults({})
    }
    setShowProviderForm(false)
    setEditingProviderId(null)
    setProviderForm({ name: '', type: 'openclaw', baseUrl: '', apiKey: '', description: '' })
  }

  const handleCreateAgent = async (providerId: string) => {
    if (!agentForm.name || !agentForm.model) return
    if (editingAgentId) {
      await updateAgent(editingAgentId, { ...agentForm, providerId, enabled: true, config: {} })
    } else {
      await createAgent({ ...agentForm, providerId, enabled: true, config: {} })
    }
    setShowAgentForm(false)
    setEditingAgentId(null)
    setAgentForm({ name: '', model: '', description: '', systemPrompt: '', capabilities: [] })
  }

  const toggleProvider = (id: string) => {
    setExpandedProviders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getProviderDefaults = (type: string) => {
    switch (type) {
      case 'openclaw': return { baseUrl: 'http://localhost:8080/v1', description: 'OpenClaw Agent 框架' }
      case 'hermes': return { baseUrl: 'http://localhost:11434/v1', description: 'Hermes AI 框架' }
      case 'qwenpaw': return { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', description: '通义千问 Agent' }
      case 'opencode': return { baseUrl: 'http://localhost:8000/v1', description: 'OpenCode 代码助手' }
      default: return { baseUrl: '', description: '' }
    }
  }

  return (
    <div className="flex h-full">
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Agent</h2>
          <div className="flex gap-1">
            <button onClick={() => { setEditingProviderId(null); setProviderForm({ name: '', type: 'openclaw', baseUrl: '', apiKey: '', description: '' }); setShowProviderForm(true) }}
              className="rounded p-1 hover:bg-muted transition-colors" title="添加 Provider">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showProviderForm && (
          <div className="p-3 border-b border-border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{editingProviderId ? '编辑 Provider' : '添加 Provider'}</span>
              <button onClick={() => { setShowProviderForm(false); setEditingProviderId(null) }} className="rounded p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
            </div>
            <select value={providerForm.type} onChange={(e) => {
              const type = e.target.value as typeof providerForm.type
              const defaults = getProviderDefaults(type)
              setProviderForm({ ...providerForm, type, baseUrl: defaults.baseUrl, description: defaults.description })
            }}
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs">
              {PROVIDER_TYPES.map(pt => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
            <input type="text" value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} placeholder="名称"
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs" />
            <input type="text" value={providerForm.baseUrl} onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })} placeholder="Base URL"
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs" />
            <input type="password" value={providerForm.apiKey} onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })} placeholder="API Key (可选)"
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs" />
            <input type="text" value={providerForm.description} onChange={(e) => setProviderForm({ ...providerForm, description: e.target.value })} placeholder="描述（可选）"
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs" />
            <button onClick={handleCreateProvider} className="w-full rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90">
              {editingProviderId ? '更新' : '创建'}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {providers.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">
              暂无 Provider<br />
              <button onClick={() => setShowProviderForm(true)} className="text-primary hover:underline mt-1">点击添加</button>
            </div>
          ) : (
            providers.map((provider) => (
              <div key={provider.id} className="mb-1">
                <div className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-muted cursor-pointer group" onClick={() => toggleProvider(provider.id)}>
                  {expandedProviders[provider.id] ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1 truncate">{provider.name}</span>
                  <span className="text-[10px] text-muted-foreground">{provider.type}</span>
                  <button onClick={(e) => { e.stopPropagation(); setEditingProviderId(provider.id); setProviderForm({ name: provider.name, type: provider.type as any, baseUrl: provider.baseUrl, apiKey: '', description: provider.description || '' }); setShowProviderForm(true) }}
                    className="rounded p-0.5 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity">
                    <Settings className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('删除该 Provider？')) deleteProvider(provider.id) }}
                    className="rounded p-0.5 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {expandedProviders[provider.id] && (
                  <div className="ml-4 space-y-1">
                    <div className="flex items-center gap-1 px-2 py-1">
                      <button onClick={() => handleTestProvider(provider.id)} disabled={testingProvider === provider.id}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] hover:bg-muted disabled:opacity-50 transition-colors">
                        {testingProvider === provider.id ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <Plug className="h-2.5 w-2.5" />
                        )}
                        {testingProvider === provider.id ? '测试中...' : '测试连接'}
                      </button>
                      <button onClick={() => handleDiscoverModels(provider.id)} disabled={discoveringModels === provider.id}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] hover:bg-muted disabled:opacity-50 transition-colors">
                        {discoveringModels === provider.id ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-2.5 w-2.5" />
                        )}
                        {discoveringModels === provider.id ? '获取中...' : '获取模型'}
                      </button>
                    </div>
                    {testResults[provider.id] && (
                      <div className={`text-[10px] px-2 py-1 rounded ${
                        testResults[provider.id].success ? 'text-green-600 bg-green-500/10' : 'text-destructive bg-destructive/10'
                      }`}>
                        {testResults[provider.id].success ? `✓ ${testResults[provider.id].latency}ms` : `✗ ${testResults[provider.id].error}`}
                      </div>
                    )}
                    {agents.filter(a => a.providerId === provider.id).map((agent) => (
                      <div key={agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
                          selectedAgentId === agent.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        }`}>
                        <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate">{agent.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); if (confirm('删除该 Agent？')) deleteAgent(agent.id) }}
                          className="rounded p-0.5 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => { setEditingAgentId(null); setAgentForm({ name: '', model: '', description: '', systemPrompt: '', capabilities: [] }); setShowAgentForm(true) }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground w-full">
                      <Plus className="h-3 w-3" />添加 Agent
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {currentAgent ? (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{currentAgent.name}</span>
              <span className="text-xs text-muted-foreground">({currentAgent.model})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-12">
                  开始与 {currentAgent.name} 对话
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`与 ${currentAgent.name} 对话...`}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={handleSendMessage} disabled={!chatInput.trim()}
                className="rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>选择一个 Agent 开始对话</p>
              <div className="mt-4 space-y-2">
                <a href="https://github.com/ayeah/claw-master" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Container className="h-3 w-3" />
                  一键部署 Docker
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAgentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{editingAgentId ? '编辑 Agent' : '添加 Agent'}</h3>
              <button onClick={() => { setShowAgentForm(false); setEditingAgentId(null) }} className="rounded-md p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">名称</label>
                <input type="text" value={agentForm.name} onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })} placeholder="My Agent"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">模型</label>
                <input type="text" value={agentForm.model} onChange={(e) => setAgentForm({ ...agentForm, model: e.target.value })} placeholder="gpt-4, claude-3, etc."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">描述</label>
                <input type="text" value={agentForm.description} onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">System Prompt</label>
                <textarea value={agentForm.systemPrompt} onChange={(e) => setAgentForm({ ...agentForm, systemPrompt: e.target.value })} placeholder="You are a helpful assistant..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => { setShowAgentForm(false); setEditingAgentId(null) }} className="rounded-lg px-4 py-2 text-sm hover:bg-muted">取消</button>
              <button onClick={() => {
                const providerId = providers[0]?.id
                if (providerId) handleCreateAgent(providerId)
              }} disabled={!agentForm.name || !agentForm.model}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                <Save className="h-4 w-4" />{editingAgentId ? '更新' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
