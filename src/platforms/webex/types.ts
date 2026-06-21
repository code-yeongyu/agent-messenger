import { z } from 'zod'

export interface WebexSpace {
  id: string
  title: string
  type: 'group' | 'direct'
  isLocked: boolean
  teamId?: string
  lastActivity: string
  created: string
  creatorId: string
}

export interface WebexMessage {
  id: string
  ref: string
  roomId: string
  roomRef: string
  roomType: 'group' | 'direct'
  text?: string
  markdown?: string
  html?: string
  files?: string[]
  personId: string
  personRef: string
  personEmail: string
  created: string
  parentId?: string
  parentRef?: string
  mentionedPeople?: string[]
  mentionedPeopleRefs?: string[]
}

export interface WebexPerson {
  id: string
  ref: string
  emails: string[]
  displayName: string
  nickName?: string
  firstName?: string
  lastName?: string
  avatar?: string
  orgId: string
  orgRef: string
  type: 'person' | 'bot'
  created: string
}

export interface WebexMembership {
  id: string
  ref: string
  roomId: string
  roomRef: string
  personId: string
  personRef: string
  personEmail: string
  personDisplayName: string
  isModerator: boolean
  created: string
}

export interface WebexConfig {
  accessToken: string
  refreshToken: string
  expiresAt: number
  clientId?: string
  clientSecret?: string
  tokenType?: 'oauth' | 'manual' | 'extracted' | 'password'
  deviceUrl?: string
  userId?: string
  encryptionKeys?: Record<string, string>
}

export class WebexError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'WebexError'
    this.code = code
  }
}

export const WebexSpaceSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['group', 'direct']),
  isLocked: z.boolean(),
  teamId: z.string().optional(),
  lastActivity: z.string(),
  created: z.string(),
  creatorId: z.string(),
})

export const WebexMessageSchema = z.object({
  id: z.string(),
  ref: z.string(),
  roomId: z.string(),
  roomRef: z.string(),
  roomType: z.enum(['group', 'direct']),
  text: z.string().optional(),
  markdown: z.string().optional(),
  html: z.string().optional(),
  files: z.array(z.string()).optional(),
  personId: z.string(),
  personRef: z.string(),
  personEmail: z.string(),
  created: z.string(),
  parentId: z.string().optional(),
  parentRef: z.string().optional(),
  mentionedPeople: z.array(z.string()).optional(),
  mentionedPeopleRefs: z.array(z.string()).optional(),
})

export const WebexPersonSchema = z.object({
  id: z.string(),
  ref: z.string(),
  emails: z.array(z.string()),
  displayName: z.string(),
  nickName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().optional(),
  orgId: z.string(),
  orgRef: z.string(),
  type: z.enum(['person', 'bot']),
  created: z.string(),
})

export const WebexMembershipSchema = z.object({
  id: z.string(),
  ref: z.string(),
  roomId: z.string(),
  roomRef: z.string(),
  personId: z.string(),
  personRef: z.string(),
  personEmail: z.string(),
  personDisplayName: z.string(),
  isModerator: z.boolean(),
  created: z.string(),
})

export const WebexConfigSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  tokenType: z.enum(['oauth', 'manual', 'extracted', 'password']).optional(),
  deviceUrl: z.string().optional(),
  userId: z.string().optional(),
  encryptionKeys: z.record(z.string(), z.string()).optional(),
})
