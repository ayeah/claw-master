import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

interface TerminalProps {
  target: string
}

export function Terminal({ target }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const disconnect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    if (termRef.current) {
      termRef.current.dispose()
      termRef.current = null
    }
    fitAddonRef.current = null
  }, [])

  const connect = useCallback(async (tgt: string) => {
    disconnect()

    if (!containerRef.current) return

    const term = new XTerminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
      },
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()
    termRef.current = term
    fitAddonRef.current = fitAddon

    // Input -> main process
    term.onData((data) => {
      window.electron.api.writeSSHSession(tgt, data)
    })

    // Resize -> main process
    term.onResize(({ cols, rows }) => {
      window.electron.api.resizeSSHSession(tgt, cols, rows)
    })

    // Receive data from main process
    const unsubData = window.electron.api.onSSHSessionData((connId, data) => {
      if (connId === tgt) {
        term.write(data)
      }
    })

    // Session closed
    const unsubClose = window.electron.api.onSSHSessionClose((connId) => {
      if (connId === tgt) {
        term.write('\r\n\x1b[33m[Session closed]\x1b[0m\r\n')
      }
    })

    cleanupRef.current = () => {
      unsubData()
      unsubClose()
      window.electron.api.closeSSHSession(tgt)
      term.dispose()
    }

    try {
      await window.electron.api.openSSHSession(tgt)
      term.focus()
    } catch (err: any) {
      term.write(`\r\n\x1b[31mConnection failed: ${err.message || err}\x1b[0m\r\n`)
    }
  }, [disconnect])

  useEffect(() => {
    if (target) {
      connect(target)
    }
    return disconnect
  }, [target, connect, disconnect])

  // Handle window resize
  useEffect(() => {
    const onResize = () => fitAddonRef.current?.fit()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
