import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { useProviderStore } from '../../stores/providerStore'
import { Send, Square, ChevronDown, AlertCircle, X, MessageSquare } from 'lucide-react'

interface ModelOption {
  id: string
  name: string
  providerId: string
  providerName: string
}

export function ChatMain(): JSX.Element {
  const {
    currentSessionId,
    messages,
    streaming,
    error,
    sendMessage,
    cancelStream,
    createSession,
    updateSession,
    sessions,
  } = useChatStore()
  const { providers, fetchProviders } = useProviderStore()
  const [input, setInput] = useState('')
  const [showModelSelect, setShowModelSelect] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const currentSession = sessions.find((s) => s.id === currentSessionId)

  useEffect(() => {
    if (providers.length === 0) {
      fetchProviders()
    }
  }, [providers.length, fetchProviders])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [currentSessionId])

  const availableModels: ModelOption[] = providers.flatMap(p => 
    p.models.map(m => ({
      id: m.id,
      name: m.name,
      providerId: p.id,
      providerName: p.name
    }))
  )

  const currentModel = currentSession?.modelId 
    ? availableModels.find(m => m.id === currentSession.modelId)
    : null

  const handleSend = async () => {
    if (!input.trim() || streaming) return
    
    if (!currentSession?.providerId || !currentSession?.modelId) {
      alert('请先选择一个模型')
      return
    }
    
    const content = input.trim()
    setInput('')
    await sendMessage(content)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleModelSelect = async (model: ModelOption) => {
    if (currentSessionId) {
      await updateSession(currentSessionId, {
        providerId: model.providerId,
        modelId: model.id
      })
    }
    setShowModelSelect(false)
  }

  const handleNewChatWithModel = async (model?: ModelOption) => {
    const session = await createSession({
      title: '新会话',
      providerId: model?.providerId,
      modelId: model?.id
    })
    if (!model) {
      setShowModelSelect(true)
    }
  }

  if (!currentSessionId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="mb-2 text-xl font-bold">欢迎使用 Claw Master</h2>
          <p className="mb-6 text-sm text-muted-foreground">AI 军团控制台 - 开始与 AI 对话</p>
          
          {providers.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="rounded-lg bg-yellow-500/10 p-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">需要配置模型商</h3>
                  <p className="text-xs text-muted-foreground">请先添加模型提供商才能开始对话</p>
                </div>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('claw:navigate', { detail: { page: 'settings' } }))}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                前往设置 - 添加模型商
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-3">选择模型开始对话</p>
                <div className="grid grid-cols-2 gap-2">
                  {providers.slice(0, 4).map(p => 
                    p.models.slice(0, 3).map(m => (
                      <button
                        key={`${p.id}-${m.id}`}
                        onClick={() => handleNewChatWithModel({
                          id: m.id,
                          name: m.name,
                          providerId: p.id,
                          providerName: p.name
                        })}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      >
                        <div className="font-medium truncate">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{p.name}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleNewChatWithModel()}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                开始新对话
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">{currentSession?.title || '新会话'}</h2>
        
        <div className="relative">
          <button
            onClick={() => setShowModelSelect(!showModelSelect)}
            disabled={providers.length === 0}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            <span className="max-w-[200px] truncate">
              {currentModel ? currentModel.name : '选择模型'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>
          
          {showModelSelect && availableModels.length > 0 && (
            <div className="absolute right-0 top-full z-10 mt-1 max-h-64 w-64 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
              {providers.map(p => (
                <div key={p.id}>
                  <div className="px-2 py-1 text-xs text-muted-foreground bg-muted/30">
                    {p.name}
                  </div>
                  {p.models.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleModelSelect({
                        id: m.id,
                        name: m.name,
                        providerId: p.id,
                        providerName: p.name
                      })}
                      className="w-full truncate px-3 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            发送消息开始对话
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border px-4 py-3">
        {error && (
          <div className="mb-2 flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-sm text-destructive flex-1">{error}</span>
            <button onClick={() => useChatStore.setState({ error: null })} className="text-destructive hover:text-destructive/80 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentSession?.modelId ? "输入消息... (Enter 发送, Shift+Enter 换行)" : "请先选择模型"}
            rows={1}
            disabled={!currentSession?.modelId}
            className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          {streaming ? (
            <button
              onClick={cancelStream}
              className="rounded-md bg-destructive p-2 text-destructive-foreground hover:bg-destructive/90"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !currentSession?.modelId}
              className="rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}