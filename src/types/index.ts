/**
 * Core type definitions for agent-slack
 */

export interface SlackChannel {
  id: string
  name: string
  is_private: boolean
  is_archived: boolean
  created: number
  creator: string
  topic?: {
    value: string
    creator: string
    last_set: number
  }
  purpose?: {
    value: string
    creator: string
    last_set: number
  }
}

export interface SlackMessage {
  ts: string
  text: string
  user?: string
  username?: string
  type: string
  thread_ts?: string
  reply_count?: number
  replies?: Array<{ user: string; ts: string }>
  edited?: {
    user: string
    ts: string
  }
}

export interface SlackUser {
  id: string
  name: string
  real_name: string
  is_admin: boolean
  is_owner: boolean
  is_bot: boolean
  is_app_user: boolean
  profile?: {
    email?: string
    phone?: string
    title?: string
    status_text?: string
  }
}

export interface SlackReaction {
  name: string
  count: number
  users: string[]
}

export interface SlackFile {
  id: string
  name: string
  title: string
  mimetype: string
  size: number
  url_private: string
  created: number
  user: string
  channels?: string[]
}

export interface WorkspaceCredentials {
  workspace_id: string
  workspace_name: string
  token: string
  cookie: string
}

export interface Config {
  current_workspace: string | null
  workspaces: Record<string, WorkspaceCredentials>
}

export type ChannelRef = `@c${number}`
export type MessageRef = `@m${number}`
export type UserRef = `@u${number}`
export type FileRef = `@f${number}`

export type EntityRef = ChannelRef | MessageRef | UserRef | FileRef
