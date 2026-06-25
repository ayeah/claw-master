import { useState, useEffect } from 'react'
import { ChatSidebar } from './pages/Chat/ChatSidebar'
import { ChatMain } from './pages/Chat/ChatMain'
import { SettingsPage } from './pages/Settings/SettingsPage'
import { ExecutionPage } from './pages/Execution/ExecutionPage'
import { AgentPage } from './pages/Agent/AgentPage'
import { DockerPage } from './pages/Docker/DockerPage'
import { MemoryPage } from './pages/Memory/MemoryPage'
import { SkillPage } from './pages/Skill/SkillPage'
import { FilePage } from './pages/File/FilePage'
import { useChatStore } from './stores/chatStore'
import { useProviderStore } from './stores/providerStore'
import { useAgentStore } from './stores/agentStore'
import { useExecutionStore } from './stores/executionStore'
import { MessageSquare, Settings, Terminal, Bot, HardDrive, HelpCircle, X, ExternalLink, Github, Container, Brain, Wand2, FolderOpen } from 'lucide-react'

type Page = 'chat' | 'settings' | 'execution' | 'agent' | 'docker' | 'memory' | 'skill' | 'file'

interface NavItem {
  id: Page
  icon: React.ReactNode
  label: string
}

const navItems: NavItem[] = [
  { id: 'chat', icon: <MessageSquare className="h-5 w-5" />, label: '对话' },
  { id: 'agent', icon: <Bot className="h-5 w-5" />, label: 'Agent' },
  { id: 'skill', icon: <Wand2 className="h-5 w-5" />, label: '技能' },
  { id: 'memory', icon: <Brain className="h-5 w-5" />, label: '记忆' },
  { id: 'file', icon: <FolderOpen className="h-5 w-5" />, label: '文件' },
  { id: 'execution', icon: <Terminal className="h-5 w-5" />, label: '终端' },
  { id: 'docker', icon: <Container className="h-5 w-5" />, label: 'Docker' },
  { id: 'settings', icon: <Settings className="h-5 w-5" />, label: '设置' },
]

function App(): JSX.Element {
  const [page, setPage] = useState<Page>('chat')
  const [showHelpMenu, setShowHelpMenu] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const fetchSessions = useChatStore((s) => s.fetchSessions)
  const fetchProviders = useProviderStore((s) => s.fetchProviders)
  const { fetchAgents } = useAgentStore()
  const { listSSHConnections } = useExecutionStore()

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ page: Page }>).detail
      if (detail?.page) setPage(detail.page)
    }
    window.addEventListener('claw:navigate', onNavigate)
    return () => window.removeEventListener('claw:navigate', onNavigate)
  }, [])

  useEffect(() => {
    fetchSessions()
    fetchProviders()
    fetchAgents()
    listSSHConnections()

    try {
      const saved = localStorage.getItem('claw-preferences')
      if (saved) {
        const prefs = JSON.parse(saved)
        const root = document.documentElement
        if (prefs.theme === 'dark') {
          root.classList.add('dark')
        } else if (prefs.theme === 'light') {
          root.classList.remove('dark')
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.toggle('dark', prefersDark)
        }
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.toggle('dark', prefersDark)
      }
    } catch {}
  }, [])

  return (
    <div className="flex h-screen bg-background text-foreground">
      <nav className="flex flex-col w-14 border-r border-border bg-muted/20 py-3">
        <div className="mb-5 flex items-center justify-center">
          <HardDrive className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex flex-col items-center justify-center w-11 h-11 rounded-lg transition-colors ${
                page === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              title={item.label}
            >
              {item.icon}
              <span className="text-[9px] mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowHelpMenu(!showHelpMenu)}
            className="flex flex-col items-center justify-center w-11 h-11 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="帮助"
          >
            <HelpCircle className="h-5 w-5" />
            <span className="text-[9px] mt-0.5">帮助</span>
          </button>

          {showHelpMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHelpMenu(false)} />
              <div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border border-border bg-card shadow-lg z-50">
                <div className="p-1">
                  <button
                    onClick={() => { window.open('https://github.com/ayeah/claw-master', '_blank'); setShowHelpMenu(false) }}
                    className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => { window.open('https://github.com/ayeah/claw-master/issues', '_blank'); setShowHelpMenu(false) }}
                    className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    反馈问题
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    onClick={() => { setShowAbout(true); setShowHelpMenu(false) }}
                    className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    关于
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {page === 'chat' && (<><ChatSidebar /><ChatMain /></>)}
        {page === 'settings' && <SettingsPage />}
        {page === 'execution' && <ExecutionPage />}
        {page === 'agent' && <AgentPage />}
        {page === 'docker' && <DockerPage />}
        {page === 'memory' && <MemoryPage />}
        {page === 'skill' && <SkillPage />}
        {page === 'file' && <FilePage />}
      </div>

      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">关于 Claw Master</h2>
              <button onClick={() => setShowAbout(false)} className="rounded-md p-1.5 hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <HardDrive className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Claw Master</h3>
                  <p className="text-sm text-muted-foreground">打造你的 AI 军团，协同工作</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <h4 className="text-sm font-medium">功能简介</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Claw Master 是一个 AI 军团控制台，帮助你连接和管理所有 AI Agent。支持 OpenClaw、Hermes 等主流 Agent 框架，
                  提供统一的对话界面，让多个 Agent 协同工作，提升效率。
                </p>
                <h4 className="text-sm font-medium pt-2">快速开始</h4>
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <p>1. 连接你的 OpenClaw、Hermes 等 Agent，或使用本软件一键部署配置</p>
                  <p>2. 在 Agent 页面添加 Provider 和 Agent</p>
                  <p>3. 在对话页面选择 Agent 开始对话</p>
                  <p>4. 一个终端管理你所有的 Agent</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">版本</span>
                  <span className="font-medium">v2.3.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">构建日期</span>
                  <span className="font-medium">2026-06-23</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Electron</span>
                  <span className="font-medium">33.4.11</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Node.js</span>
                  <span className="font-medium">20.18.3</span>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href="https://github.com/ayeah/claw-master"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted transition-colors"
                >
                  <Github className="h-5 w-5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">GitHub</div>
                    <div className="text-xs text-muted-foreground">github.com/ayeah/claw-master</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                MIT License · Built with Electron + React + TypeScript
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App