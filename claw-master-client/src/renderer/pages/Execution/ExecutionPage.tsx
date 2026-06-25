import { useState, useEffect, useCallback, useRef } from 'react'
import { useExecutionStore } from '../../stores/executionStore'
import { Terminal as TerminalIcon } from 'lucide-react'
import { Terminal } from '../../components/Terminal'

export function ExecutionPage() {
  const [selectedTarget, setSelectedTarget] = useState<string>('')
  const previousTargetRef = useRef<string>('')
  const { wslDistros, sshConnections, checkWSL, listWSLDistros, listSSHConnections, closeSSHSession } = useExecutionStore()

  useEffect(() => {
    const init = async () => {
      await checkWSL()
      await listWSLDistros()
      await listSSHConnections()
    }
    init()
  }, [])

  const handleTargetChange = useCallback(async (newTarget: string) => {
    const prevTarget = previousTargetRef.current
    
    // Disconnect previous SSH session if switching from SSH
    if (prevTarget && prevTarget.startsWith('ssh:') && prevTarget !== newTarget) {
      try {
        await closeSSHSession(prevTarget.slice(4))
      } catch (err) {
        console.warn('Failed to close previous SSH session:', err)
      }
    }
    
    previousTargetRef.current = newTarget
    setSelectedTarget(newTarget)
  }, [closeSSHSession])

  useEffect(() => {
    if (!selectedTarget) {
      if (wslDistros.length > 0) {
        const running = wslDistros.find(d => d.state === 'Running')
        setSelectedTarget(running ? `wsl:${running.name}` : `wsl:${wslDistros[0].name}`)
      } else if (sshConnections.length > 0) {
        setSelectedTarget(`ssh:${sshConnections[0].id}`)
      }
    }
  }, [wslDistros, sshConnections, selectedTarget])

  const getTargetLabel = () => {
    if (!selectedTarget) return 'Select terminal...'
    if (selectedTarget.startsWith('wsl:')) {
      const name = selectedTarget.slice(4)
      const distro = wslDistros.find(d => d.name === name)
      return distro ? `Local - WSL - ${name}` : `Local - WSL - ${name}`
    }
    if (selectedTarget.startsWith('ssh:')) {
      const connId = selectedTarget.slice(4)
      const conn = sshConnections.find(c => c.id === connId)
      return conn ? `SSH - ${conn.name} (${conn.host})` : connId
    }
    return selectedTarget
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <TerminalIcon className="h-4 w-4 text-muted-foreground" />
        <select
          value={selectedTarget}
          onChange={(e) => handleTargetChange(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
        >
          <option value="" disabled>Select terminal...</option>
          {wslDistros.length > 0 && (
            <optgroup label="Local">
              {wslDistros.map((d) => (
                <option key={d.name} value={`wsl:${d.name}`}>
                  WSL - {d.name} {d.state === 'Running' ? '(Running)' : '(Stopped)'}
                </option>
              ))}
            </optgroup>
          )}
          {sshConnections.length > 0 && (
            <optgroup label="SSH">
              {sshConnections.map((c) => (
                <option key={c.id} value={`ssh:${c.id}`}>
                  {c.name} ({c.host})
                </option>
              ))}
            </optgroup>
          )}
          {wslDistros.length === 0 && sshConnections.length === 0 && (
            <option value="" disabled>No terminals available</option>
          )}
        </select>
        <span className="text-xs text-muted-foreground ml-2">{getTargetLabel()}</span>
      </div>

      <div className="flex-1 min-h-0 bg-[#0a0a0a]">
        {selectedTarget && <Terminal target={selectedTarget} />}
      </div>
    </div>
  )
}
