import { randomUUID } from 'crypto'
import { getDatabase } from '../../data/db'
import type { Session, Message, CreateSessionInput, UpdateSessionInput } from './chat.types'

export function listSessions(): Session[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all() as any[]
  return rows.map(rowToSession)
}

export function getSession(id: string): Session | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any
  return row ? rowToSession(row) : null
}

export function createSession(input: CreateSessionInput = {}): Session {
  const db = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO sessions (id, title, model_id, provider_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.title || '新会话', input.modelId || null, input.providerId || null, now, now)

  return getSession(id)!
}

export function updateSession(id: string, input: UpdateSessionInput): Session | null {
  const db = getDatabase()
  const existing = getSession(id)
  if (!existing) return null

  const now = new Date().toISOString()
  const fields: string[] = []
  const values: any[] = []

  if (input.title !== undefined) { fields.push('title = ?'); values.push(input.title) }
  if (input.modelId !== undefined) { fields.push('model_id = ?'); values.push(input.modelId) }
  if (input.providerId !== undefined) { fields.push('provider_id = ?'); values.push(input.providerId) }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)

  db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  return getSession(id)
}

export function deleteSession(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
  return result.changes > 0
}

export function cloneSession(id: string): Session | null {
  const db = getDatabase()
  const original = getSession(id)
  if (!original) return null

  const newSession = createSession({
    title: `${original.title} (副本)`,
    modelId: original.modelId || undefined,
    providerId: original.providerId || undefined,
  })

  const messages = listMessages(id)
  const insertMsg = db.prepare(
    `INSERT INTO messages (id, session_id, role, content, tool_calls, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  for (const msg of messages) {
    insertMsg.run(
      randomUUID(),
      newSession.id,
      msg.role,
      msg.content,
      msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
      JSON.stringify(msg.metadata),
      msg.createdAt
    )
  }

  return getSession(newSession.id)
}

export function listMessages(sessionId: string): Message[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
    .all(sessionId) as any[]
  return rows.map(rowToMessage)
}

export function addMessage(
  sessionId: string,
  role: Message['role'],
  content: string,
  toolCalls?: Message['toolCalls']
): Message {
  const db = getDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO messages (id, session_id, role, content, tool_calls, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, sessionId, role, content, toolCalls ? JSON.stringify(toolCalls) : null, '{}', now)

  db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId)

  return { id, sessionId, role, content, toolCalls: toolCalls || null, metadata: {}, createdAt: now }
}

function rowToSession(row: any): Session {
  return {
    id: row.id,
    title: row.title,
    modelId: row.model_id,
    providerId: row.provider_id,
    agentId: row.agent_id,
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToMessage(row: any): Message {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : null,
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: row.created_at,
  }
}
