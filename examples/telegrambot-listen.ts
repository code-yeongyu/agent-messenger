#!/usr/bin/env bun
import { TelegramBotClient } from '../src/platforms/telegrambot/client'
import { TelegramBotListener } from '../src/platforms/telegrambot/listener'

async function main() {
  const client = await new TelegramBotClient().login()

  const listener = new TelegramBotListener(client, {
    allowedUpdates: ['message', 'edited_message', 'callback_query', 'my_chat_member'],
  })

  listener.on('connected', ({ user }) => {
    console.log(`Connected as @${user.username ?? user.first_name} (id: ${user.id})`)
    console.log('Listening for events. Press Ctrl+C to stop.\n')
  })

  listener.on('disconnected', () => {
    console.log('[disconnected] retrying...')
  })

  listener.on('message', (message) => {
    if (message.from?.is_bot) return
    const time = new Date(message.date * 1000).toLocaleTimeString()
    const sender = message.from?.username ?? message.from?.first_name ?? 'unknown'
    console.log(`[${time}] message in ${message.chat.id} <${sender}>: ${message.text ?? '(non-text)'}`)
  })

  listener.on('edited_message', (message) => {
    console.log(`[edit] message ${message.message_id} in ${message.chat.id}`)
  })

  listener.on('callback_query', (query) => {
    console.log(`[callback] data=${query.data ?? '(none)'} from ${query.from.username ?? query.from.id}`)
  })

  listener.on('my_chat_member', (event) => {
    console.log(`[my_chat_member] ${event.chat.id}: ${event.old_chat_member.status} -> ${event.new_chat_member.status}`)
  })

  listener.on('error', (err) => {
    console.error(`[error] ${err.message}`)
  })

  process.on('SIGINT', () => {
    console.log('\nStopping...')
    listener.stop()
    process.exit(130)
  })

  await listener.start()
}

main()
