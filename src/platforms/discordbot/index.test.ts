import { expect, it } from 'bun:test'

import {
  DiscordBotClient,
  DiscordBotConfigSchema,
  DiscordBotCredentialManager,
  DiscordBotCredentialsSchema,
  DiscordBotEntrySchema,
  DiscordBotError,
  DiscordBotListener,
  DiscordChannelSchema,
  DiscordFileSchema,
  DiscordGatewayOpcode,
  DiscordGuildSchema,
  DiscordIntent,
  DiscordMessageSchema,
  DiscordReactionSchema,
  DiscordUserSchema,
} from '@/platforms/discordbot/index'
import type {
  DiscordBotListenerOptions,
  DiscordGatewayEmbed,
  DiscordGatewayMessageCreateEvent,
  DiscordGatewayStickerItem,
} from '@/platforms/discordbot/index'

it('DiscordBotClient is exported from barrel', () => {
  expect(typeof DiscordBotClient).toBe('function')
})

it('DiscordBotError is exported from barrel', () => {
  expect(typeof DiscordBotError).toBe('function')
})

it('DiscordBotCredentialManager is exported from barrel', () => {
  expect(typeof DiscordBotCredentialManager).toBe('function')
})

it('DiscordBotListener is exported from barrel', () => {
  expect(typeof DiscordBotListener).toBe('function')
})

it('DiscordBotListenerOptions type is exported from barrel', () => {
  const options: DiscordBotListenerOptions = { intents: 0 }
  expect(options.intents).toBe(0)
})

it('DiscordGatewayOpcode is exported from barrel', () => {
  expect(DiscordGatewayOpcode.Identify).toBe(2)
  expect(DiscordGatewayOpcode.Hello).toBe(10)
})

it('DiscordIntent is exported from barrel', () => {
  expect(DiscordIntent.Guilds).toBe(1)
  expect(DiscordIntent.GuildMessages).toBe(1 << 9)
  expect(DiscordIntent.MessageContent).toBe(1 << 15)
})

it('DiscordBotEntrySchema is exported from barrel', () => {
  expect(typeof DiscordBotEntrySchema.parse).toBe('function')
})

it('DiscordBotConfigSchema is exported from barrel', () => {
  expect(typeof DiscordBotConfigSchema.parse).toBe('function')
})

it('DiscordBotCredentialsSchema is exported from barrel', () => {
  expect(typeof DiscordBotCredentialsSchema.parse).toBe('function')
})

it('DiscordGuildSchema is exported from barrel', () => {
  expect(typeof DiscordGuildSchema.parse).toBe('function')
})

it('DiscordChannelSchema is exported from barrel', () => {
  expect(typeof DiscordChannelSchema.parse).toBe('function')
})

it('DiscordMessageSchema is exported from barrel', () => {
  expect(typeof DiscordMessageSchema.parse).toBe('function')
})

it('DiscordUserSchema is exported from barrel', () => {
  expect(typeof DiscordUserSchema.parse).toBe('function')
})

it('DiscordReactionSchema is exported from barrel', () => {
  expect(typeof DiscordReactionSchema.parse).toBe('function')
})

it('DiscordFileSchema is exported from barrel', () => {
  expect(typeof DiscordFileSchema.parse).toBe('function')
})

it('DiscordGatewayEmbed type is exported from barrel', () => {
  const embed: DiscordGatewayEmbed = {
    type: 'rich',
    title: 'Release notes',
    description: 'v2.13.1 is out',
    url: 'https://example.com/release',
  }
  expect(embed.title).toBe('Release notes')
})

it('DiscordGatewayStickerItem type is exported from barrel', () => {
  const sticker: DiscordGatewayStickerItem = { id: '1', name: 'wave', format_type: 1 }
  expect(sticker.format_type).toBe(1)
})

it('DiscordGatewayMessageCreateEvent accepts the new optional fields', () => {
  const event: DiscordGatewayMessageCreateEvent = {
    type: 'MESSAGE_CREATE',
    id: 'm1',
    channel_id: 'C1',
    author: { id: 'U1', username: 'alice', global_name: 'Alice', bot: false },
    content: 'hello',
    timestamp: '2026-05-11T00:00:00Z',
    mention_everyone: false,
    mention_roles: ['R1', 'R2'],
    message_reference: { message_id: 'm0', channel_id: 'C1', guild_id: 'G1' },
    embeds: [{ type: 'rich', title: 't', description: 'd', url: 'https://example.com' }],
    sticker_items: [{ id: 's1', name: 'wave', format_type: 1 }],
  }
  expect(event.mention_everyone).toBe(false)
  expect(event.mention_roles).toEqual(['R1', 'R2'])
  expect(event.message_reference?.message_id).toBe('m0')
  expect(event.embeds?.[0]?.title).toBe('t')
  expect(event.sticker_items?.[0]?.name).toBe('wave')
  expect(event.author.global_name).toBe('Alice')
})

it('DiscordGatewayMessageCreateEvent treats new fields as optional', () => {
  const event: DiscordGatewayMessageCreateEvent = {
    type: 'MESSAGE_CREATE',
    id: 'm1',
    channel_id: 'C1',
    author: { id: 'U1', username: 'alice' },
    content: 'hello',
    timestamp: '2026-05-11T00:00:00Z',
  }
  expect(event.mention_everyone).toBeUndefined()
  expect(event.embeds).toBeUndefined()
  expect(event.sticker_items).toBeUndefined()
  expect(event.message_reference).toBeUndefined()
  expect(event.author.global_name).toBeUndefined()
})

it('DiscordGatewayMessageCreateEvent author.global_name accepts null', () => {
  const event: DiscordGatewayMessageCreateEvent = {
    type: 'MESSAGE_CREATE',
    id: 'm1',
    channel_id: 'C1',
    author: { id: 'U1', username: 'alice', global_name: null },
    content: 'hello',
    timestamp: '2026-05-11T00:00:00Z',
  }
  expect(event.author.global_name).toBeNull()
})
