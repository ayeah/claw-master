import { useState, useEffect } from 'react'
import { useExecutionStore } from '../../stores/executionStore'
import { SSHConnection } from '../../types/execution'
import { Plus, Trash2, Save, X } from 'lucide-react'

export function SSHConnectionManager() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: '',
    authType: 'password' as 'password' | 'key',
    password: '',
    keyPath: '',
    description: '',
  })
  const [testResult, setTestResult] = useState<{ id: string; success: boolean } | null>(null)

  const { sshConnections, listSSHConnections, createSSHConnection, updateSSHConnection, deleteSSHConnection, testSSHConnection } = useExecutionStore()

  useEffect(() => { listSSHConnections() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) { await updateSSHConnection(editingId, formData) } else { await createSSHConnection(formData) }
    setShowForm(false); setEditingId(null); resetForm(); await listSSHConnections()
  }

  const handleEdit = (conn: SSHConnection) => {
    setFormData({ name: conn.name, host: conn.host, port: conn.port, username: conn.username, authType: conn.authType, password: '', keyPath: conn.keyPath || '', description: conn.description || '' })
    setEditingId(conn.id); setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this connection?')) { await deleteSSHConnection(id) }
  }

  const handleTest = async (id: string) => {
    setTestResult(null)
    const result = await testSSHConnection(id)
    setTestResult({ id, success: result.exitCode === 0 })
    setTimeout(() => setTestResult(null), 3000)
  }

  const resetForm = () => {
    setFormData({ name: '', host: '', port: 22, username: '', authType: 'password', password: '', keyPath: '', description: '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">SSH Connections</h2>
        <button onClick={() => { resetForm(); setEditingId(null); setShowForm(true) }}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />Add Connection
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">{editingId ? '编辑' : '添加'} Connection</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Host</label>
              <input type="text" value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })} required
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Port</label>
              <input type="number" value={formData.port} onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })} required
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Username</label>
              <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Auth Type</label>
              <select value={formData.authType} onChange={(e) => setFormData({ ...formData, authType: e.target.value as 'password' | 'key' })}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="password">Password</option>
                <option value="key">Private Key</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{formData.authType === 'password' ? 'Password' : 'Key Path'}</label>
              <input type={formData.authType === 'password' ? 'password' : 'text'}
                value={formData.authType === 'password' ? formData.password : formData.keyPath}
                onChange={(e) => setFormData({ ...formData, ...(formData.authType === 'password' ? { password: e.target.value } : { keyPath: e.target.value }) })}
                placeholder={formData.authType === 'key' ? '/path/to/private/key' : ''}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description (optional)</label>
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
        {sshConnections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground text-sm">No SSH connections configured</div>
        ) : (
          sshConnections.map((conn) => (
            <div key={conn.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{conn.name}</span>
                  <span className="text-xs text-muted-foreground">{conn.username}@{conn.host}:{conn.port}</span>
                  {testResult?.id === conn.id && (
                    <span className={`rounded px-1.5 py-0.5 text-xs ${testResult.success ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-destructive/15 text-destructive'}`}>
                      {testResult.success ? 'Connected' : 'Failed'}
                    </span>
                  )}
                </div>
                {conn.description && <div className="text-xs text-muted-foreground mt-1">{conn.description}</div>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleTest(conn.id)}
                  className="rounded-md px-2 py-1 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80">Test</button>
                <button onClick={() => handleEdit(conn)} className="rounded-md px-2 py-1 text-xs hover:bg-muted">Edit</button>
                <button onClick={() => handleDelete(conn.id)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
