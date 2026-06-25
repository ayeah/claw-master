import { useState, useEffect } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import { AgentProvider } from '../../types/agent'
import { Plus, Trash2, Save, X, RefreshCw } from 'lucide-react'

export function AgentProviderManager() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'openclaw' as 'openclaw' | 'hermes' | 'qwenpaw' | 'opencode' | 'custom',
    baseUrl: '',
    apiKey: '',
    description: '',
  })

  const { providers, fetchProviders, createProvider, updateProvider, deleteProvider } = useAgentStore()

  useEffect(() => { fetchProviders() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...formData, apiKey: formData.apiKey || undefined, enabled: true, capabilities: ['chat'] as any[], config: {} }
    if (editingId) { await updateProvider(editingId, data) } else { await createProvider(data) }
    setShowForm(false); setEditingId(null); resetForm()
  }

  const handleEdit = (provider: AgentProvider) => {
    setFormData({ name: provider.name, type: provider.type, baseUrl: provider.baseUrl, apiKey: '', description: provider.description || '' })
    setEditingId(provider.id); setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this provider? All associated agents will also be deleted.')) { await deleteProvider(id) }
  }

  const resetForm = () => {
    setFormData({ name: '', type: 'openclaw', baseUrl: '', apiKey: '', description: '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Agent Providers</h2>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true) }}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />Add Provider
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">{editingId ? '编辑' : '添加'} Provider</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="openclaw">OpenClaw</option>
                <option value="hermes">Hermes</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Base URL</label>
              <input type="url" value={formData.baseUrl} onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })} placeholder="http://localhost:8080" required
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">API Key (optional)</label>
              <input type="password" value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
              <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
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
        {providers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground text-sm">No providers configured</div>
        ) : (
          providers.map((provider) => (
            <div key={provider.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{provider.name}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{provider.type}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${provider.enabled ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-destructive/15 text-destructive'}`}>
                    {provider.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{provider.baseUrl}</div>
                {provider.description && <div className="text-xs text-muted-foreground mt-0.5">{provider.description}</div>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(provider)} className="rounded-md px-2 py-1 text-xs hover:bg-muted">Edit</button>
                <button onClick={() => handleDelete(provider.id)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
