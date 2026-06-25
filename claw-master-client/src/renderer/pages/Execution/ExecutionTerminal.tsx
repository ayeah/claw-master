import { useState, useEffect, useRef } from 'react'
import { useExecutionStore } from '../../stores/executionStore'

interface ExecutionTerminalProps {
  mode: 'wsl' | 'ssh'
  onClose?: () => void
}

export function ExecutionTerminal({ mode, onClose }: ExecutionTerminalProps) {
  const [command, setCommand] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const [selectedDistro, setSelectedDistro] = useState<string>('')
  const [selectedSSH, setSelectedSSH] = useState<string>('')
  const terminalRef = useRef<HTMLDivElement>(null)

  const { wslAvailable, wslDistros, sshConnections, isExecuting, checkWSL, listWSLDistros, executeWSL, listSSHConnections, executeSSH } = useExecutionStore()

  useEffect(() => {
    if (mode === 'wsl') { checkWSL(); listWSLDistros() } else { listSSHConnections() }
  }, [mode])

  useEffect(() => {
    if (terminalRef.current) { terminalRef.current.scrollTop = terminalRef.current.scrollHeight }
  }, [output])

  const handleExecute = async () => {
    if (!command.trim()) return
    setOutput(prev => [...prev, `$ ${command}`])
    let result
    if (mode === 'wsl') {
      result = await executeWSL(command, selectedDistro || undefined)
    } else {
      if (!selectedSSH) { setOutput(prev => [...prev, 'Error: No SSH connection selected']); return }
      result = await executeSSH(selectedSSH, command)
    }
    if (result.stdout) setOutput(prev => [...prev, result.stdout])
    if (result.stderr) setOutput(prev => [...prev, `Error: ${result.stderr}`])
    setCommand('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleExecute() }
  }

  return (
    <div className="flex flex-col h-full rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{mode === 'wsl' ? 'WSL Terminal' : 'SSH Terminal'}</span>
          {mode === 'wsl' && wslAvailable && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/15 text-green-600 dark:text-green-400">Available</span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-muted">×</button>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        {mode === 'wsl' ? (
          <select value={selectedDistro} onChange={(e) => setSelectedDistro(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Default Distro</option>
            {wslDistros.map((d) => (<option key={d.name} value={d.name}>{d.name} {d.state === 'Running' ? '●' : '○'}</option>))}
          </select>
        ) : (
          <select value={selectedSSH} onChange={(e) => setSelectedSSH(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select SSH Connection</option>
            {sshConnections.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.host})</option>))}
          </select>
        )}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-green-600 dark:text-green-400 font-mono text-sm">$</span>
          <input type="text" value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Enter command..." disabled={isExecuting}
            className="flex-1 bg-transparent text-sm font-mono focus:outline-none placeholder:text-muted-foreground" />
          <button onClick={handleExecute} disabled={isExecuting || !command.trim()}
            className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {isExecuting ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-muted/20">
        {output.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap ${
            line.startsWith('$') ? 'text-green-600 dark:text-green-400'
            : line.startsWith('Error:') ? 'text-destructive'
            : 'text-foreground'
          }`}>{line}</div>
        ))}
        {isExecuting && <div className="text-yellow-600 dark:text-yellow-400 animate-pulse">Executing...</div>}
      </div>
    </div>
  )
}
