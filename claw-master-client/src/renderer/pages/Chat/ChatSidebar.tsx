import { useChatStore } from '../../stores/chatStore'
import { Plus, MessageSquare, Trash2, Copy } from 'lucide-react'

export function ChatSidebar(): JSX.Element {
  const { sessions, currentSessionId, selectSession, createSession, deleteSession, cloneSession } =
    useChatStore()

  const handleNewChat = async () => {
    await createSession()
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-muted/30">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-lg font-bold">Claw Master</h1>
      </div>

      <button
        onClick={handleNewChat}
        className="mx-3 mb-2 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        新建会话
      </button>

      <div className="flex-1 overflow-y-auto px-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => selectSession(session.id)}
            className={`group mb-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              currentSessionId === session.id
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{session.title}</span>
            <div className="hidden gap-1 group-hover:flex">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  cloneSession(session.id)
                }}
                className="rounded p-0.5 hover:bg-background"
                title="克隆"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSession(session.id)
                }}
                className="rounded p-0.5 hover:bg-background hover:text-destructive"
                title="删除"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}