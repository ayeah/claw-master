import { useState, useEffect } from 'react'
import { useDockerStore } from '../../stores/dockerStore'
import { useExecutionStore } from '../../stores/executionStore'
import { SectionHeader } from '../Settings/SettingsPage'
import { Plus, Trash2, X, RefreshCw, Container, Loader2 } from 'lucide-react'

const DOCKER_IMAGES = [
  { value: 'openclaw', label: 'OpenClaw', image: 'openclaw/openclaw:latest' },
  { value: 'hermes', label: 'Hermes', image: 'hermes/hermes:latest' },
  { value: 'qwenpaw', label: 'QwenPaw', image: 'qwenpaw/qwenpaw:latest' },
  { value: 'claw-master', label: 'Claw Master Server', image: 'claw-master/server:latest' },
  { value: 'custom', label: 'Custom Image', image: '' },
]

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'qwen-max', label: 'Qwen Max' },
  { value: 'qwen-plus', label: 'Qwen Plus' },
  { value: 'local', label: 'Local Model (Ollama/vLLM)' },
]

export function DockerPage(): JSX.Element {
  const [showDeployModal, setShowDeployModal] = useState(false)

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <SectionHeader
          title="Docker"
          description="Container deployment management"
        />
        <button
          onClick={() => setShowDeployModal(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Deploy
        </button>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-5">
          <ContainerList />
        </div>
      </main>

      {showDeployModal && <DeployModal onClose={() => setShowDeployModal(false)} />}
    </div>
  )
}

function ContainerList(): JSX.Element {
  const { containers, isLoading, fetchContainers, startServices, stopServices, pullImages, getLogs } = useDockerStore()
  const [showLogs, setShowLogs] = useState<string | null>(null)
  const [logs, setLogs] = useState('')

  useEffect(() => {
    fetchContainers()
  }, [])

  const handleViewLogs = async (name: string) => {
    setShowLogs(name)
    setLogs(await getLogs(name))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={fetchContainers} disabled={isLoading}
          className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors">
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button onClick={pullImages} disabled={isLoading}
          className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors">Pull Images</button>
        <button onClick={startServices} disabled={isLoading}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:opacity-50 transition-colors">Start All</button>
        <button onClick={stopServices} disabled={isLoading}
          className="rounded-lg bg-destructive px-3 py-1.5 text-xs text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors">Stop All</button>
      </div>

      {containers.length > 0 ? (
        <div className="space-y-2">
          {containers.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <Container className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="truncate">{c.image}</span>
                  {c.ports && <span className="flex-shrink-0">{c.ports}</span>}
                </div>
              </div>
              <button onClick={() => handleViewLogs(c.name)}
                className="rounded-md px-2.5 py-1 text-xs hover:bg-muted transition-colors flex-shrink-0">Logs</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading containers...
            </div>
          ) : (
            'No containers deployed'
          )}
        </div>
      )}

      {showLogs && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Logs: {showLogs}</h3>
            <button onClick={() => setShowLogs(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto bg-muted/30 rounded-lg p-3">{logs}</pre>
        </div>
      )}
    </div>
  )
}

function DeployModal({ onClose }: { onClose: () => void }): JSX.Element {
  const { sshConnections } = useExecutionStore()
  const { startServices } = useDockerStore()
  const [deployTarget, setDeployTarget] = useState<'local' | 'ssh'>('local')
  const [selectedSSH, setSelectedSSH] = useState('')
  const [selectedImage, setSelectedImage] = useState('openclaw')
  const [customImage, setCustomImage] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [deploying, setDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<string | null>(null)

  const handleDeploy = async () => {
    setDeploying(true)
    setDeployResult(null)
    try {
      if (deployTarget === 'local') {
        await startServices()
        setDeployResult('Deployed successfully!')
      } else {
        setDeployResult('SSH deployment coming soon')
      }
    } catch (error) {
      setDeployResult(`Deploy failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setDeploying(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Deploy Docker Service</h3>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Target</label>
            <div className="flex gap-2">
              {(['local', 'ssh'] as const).map((t) => (
                <button key={t} onClick={() => setDeployTarget(t)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm border transition-colors ${
                    deployTarget === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
                  }`}>
                  {t === 'local' ? 'Local' : 'SSH Server'}
                </button>
              ))}
            </div>
          </div>

          {deployTarget === 'ssh' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">SSH Connection</label>
              <select value={selectedSSH} onChange={(e) => setSelectedSSH(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select...</option>
                {sshConnections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.host})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Image</label>
            <select value={selectedImage} onChange={(e) => setSelectedImage(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {DOCKER_IMAGES.map((img) => (
                <option key={img.value} value={img.value}>{img.label}</option>
              ))}
            </select>
            {selectedImage === 'custom' && (
              <input type="text" value={customImage} onChange={(e) => setCustomImage(e.target.value)}
                placeholder="e.g. myrepo/myapp:latest"
                className="w-full mt-2 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Model</label>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {MODEL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {deployResult && (
          <div className={`rounded-lg p-3 text-xs ${
            deployResult.includes('success') ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-destructive/10 text-destructive'
          }`}>
            {deployResult}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleDeploy} disabled={deploying || (deployTarget === 'ssh' && !selectedSSH)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Container className="h-4 w-4" />}
            {deploying ? 'Deploying...' : 'Deploy'}
          </button>
        </div>
      </div>
    </div>
  )
}
