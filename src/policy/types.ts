import { z } from 'zod'

export const ChannelTypeSchema = z.enum(['dm', 'mpim', 'private', 'public', 'channel'])

export const PolicyRulesSchema = z
  .object({
    deny: z
      .object({
        channelTypes: z.array(ChannelTypeSchema).optional(),
        channelIds: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
      })
      .partial()
      .optional(),
  })
  .default({})

export const PlatformPolicySchema = z.object({
  read: PolicyRulesSchema.optional(),
  write: PolicyRulesSchema.optional(),
})

export const PolicyConfigSchema = z
  .object({
    slack: PlatformPolicySchema.optional(),
    discord: PlatformPolicySchema.optional(),
    teams: PlatformPolicySchema.optional(),
  })
  .default({})

export type ChannelType = z.infer<typeof ChannelTypeSchema>
export type PolicyRules = z.infer<typeof PolicyRulesSchema>
export type PlatformPolicy = z.infer<typeof PlatformPolicySchema>
export type PolicyConfig = z.infer<typeof PolicyConfigSchema>
export type Platform = 'slack' | 'discord' | 'teams'
export type Direction = 'read' | 'write'

export interface PolicyTarget {
  kind: 'channel' | 'message' | 'user'
  id: string
  channelType?: ChannelType
  userId?: string
  parentChannelId?: string
}
