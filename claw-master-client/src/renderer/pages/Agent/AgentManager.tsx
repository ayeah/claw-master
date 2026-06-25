import { useState, useEffect } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import { Agent, AgentCapability } from '../../types/agent'
import { Plus, Trash2, Save, X } from 'lucide-react'

const CAPABILITIES: AgentCapability[] = ['chat', 'code', 'search', 'deploy', 'analyze', 'custom']

export function AgentManager() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    description: '',
    systemPrompt: '',
    capabilities: [] as AgentCapability[],
  })

  const { providers, agents, fetchProviders, fetchAgents, createAgent, updateAgent, deleteAgent } = useAgentStore()

  useEffect(() => { fetchProviders(); fetchAgents() }, [])
  useEffect(() => { fetchAgents(selectedProvider || undefined) }, [selectedProvider])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProvider) { alert('Please select a provider'); return }
    const data = { ...formData, providerId: selectedProvider, enabled: true, config: {} }
    if (editingId) { await updateAgent(editingId, data) } else { await createAgent(data) }
    setShowForm(false); setEditingId(null); resetForm()
  }

  const handleEdit = (agent: Agent) => {
    setSelectedProvider(agent.providerId)
    setFormData({ name: agent.name, model: agent.model, description: agent.description || '', systemPrompt: agent.systemPrompt || '', capabilities: agent.capabilities })
    setEditingId(agent.id); setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this agent?')) { await deleteAgent(id) }
  }

  const toggleCapability = (cap: AgentCapability) => {
    setFormData((prev) => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap) ? prev.capabilities.filter((c) => c !== cap) : [...prev.capabilities, cap],
    }))
  }

  const resetForm = () => {
    setFormData({ name: '', model: '', description: '', systemPrompt: '', capabilities: [] })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Agents</h2>
        <div className="flex gap-2">
          <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">All Providers</option>
            {providers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true) }}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />Add Agent
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">{editingId ? '编辑' : '添加'} Agent</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Model</label>
              <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="gpt-4, claude-3, etc." required
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
              <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">System Prompt</label>
              <textarea value={formData.systemPrompt} onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })} placeholder="You are a helpful assistant..."
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-20" />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Capabilities</label>
              <div className="flex flex-wrap gap-1.5">
                {CAPABILITIES.map((cap) => (
                  <button key={cap} type="button" onClick={() => toggleCapability(cap)}
                    className={`rounded-md px-2.5 py-1 text-xs border transition-colors ${
                      formData.capabilities.includes(cap)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted'
                    }`}>{cap}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
              <Save className="h-4 w-4" />{editingId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {agents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground text-sm">No agents configured</div>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{agent.name}</span>
                  <span className="text-xs text-muted-foreground">({agent.model})</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${agent.enabled ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-destructive/15 text-destructive'}`}>
                    {agent.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {agent.description && <div className="text-xs text-muted-foreground mt-1">{agent.description}</div>}
                <div className="flex gap-1 mt-1.5">
                  {agent.capabilities.map((cap) => (
                    <span key={cap} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{cap}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(agent)} className="rounded-md px-2 py-1 text-xs hover:bg-muted">Edit</button>
                <button onClick={() => handleDelete(agent.id)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
