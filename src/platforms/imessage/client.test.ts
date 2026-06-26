import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

import { ImsgClient } from './client'
import { IMessageError } from './types'

const STUB = join(import.meta.dir, 'test-stub-imsg.mjs')

function clientWith(mode = 'ok'): ImsgClient {
  process.env.IMSG_STUB_MODE = mode
  return new ImsgClient()
}

describe('ImsgClient (against stub imsg binary)', () => {
  it('getVersion returns the imsg version', async () => {
    const c = await clientWith().login({ binaryPath: STUB })
    expect(await c.getVersion()).toBe('0.11.1')
    await c.close()
  })

  it('connect succeeds and listChats maps group/individual + fields', async () => {
    const c = await clientWith().login({ binaryPath: STUB })
    await c.connect()
    const chats = await c.listChats(10)
    expect(chats[0]).toMatchObject({ id: 42, name: 'Jane', is_group: false, service: 'iMessage' })
    expect(chats[1]).toMatchObject({ id: 43, name: 'Crew', is_group: true })
    expect(chats[1]?.participants).toHaveLength(2)
    await c.close()
  })

  it('connect throws full_disk_access when the DB is not readable', async () => {
    const c = await clientWith('fda_denied').login({ binaryPath: STUB })
    try {
      await c.connect()
      throw new Error('should have thrown')
    } catch (error) {
      expect((error as IMessageError).code).toBe('full_disk_access')
      expect((error as IMessageError).suggestion).toContain('Full Disk Access')
    } finally {
      await c.close()
    }
  })

  it('getMessages maps fields oldest-first with is_outgoing', async () => {
    const c = await clientWith().login({ binaryPath: STUB })
    await c.connect()
    const msgs = await c.getMessages(42, 10)
    expect(msgs.map((m) => m.guid)).toEqual(['m1', 'm2'])
    expect(msgs[0]?.is_outgoing).toBe(false)
    expect(msgs[1]?.is_outgoing).toBe(true)
    await c.close()
  })

  it('sendMessage returns guid/id; send failure maps to send_failed', async () => {
    const ok = await clientWith('ok').login({ binaryPath: STUB })
    await ok.connect()
    expect(await ok.sendMessage({ chatId: 42 }, 'hi')).toMatchObject({ guid: 'sent-guid', id: 99, is_outgoing: true })
    await ok.close()

    const fail = await clientWith('send_fail').login({ binaryPath: STUB })
    await fail.connect()
    try {
      await fail.sendMessage({ chatId: 42 }, 'hi')
      throw new Error('should have thrown')
    } catch (error) {
      expect((error as IMessageError).code).toBe('send_failed')
    } finally {
      await fail.close()
    }
  })

  it('watch delivers live notifications', async () => {
    const c = await clientWith().login({ binaryPath: STUB })
    await c.connect()
    const received: string[] = []
    const stop = await c.watch((m) => received.push(m.guid), { chatId: 42 })
    await new Promise((r) => setTimeout(r, 120))
    await stop()
    await c.close()
    expect(received).toContain('m3')
  })

  it('sendReaction: standard via CLI; custom + message-target rejected', async () => {
    const c = await clientWith().login({ binaryPath: STUB })
    await c.connect()
    await expect(c.sendReaction(42, 'love')).resolves.toBeUndefined()
    await expect(c.sendReaction(42, 'sparkles')).rejects.toMatchObject({ code: 'private_api_required' })
    await expect(c.sendReaction(42, 'love', 'some-guid')).rejects.toMatchObject({ code: 'private_api_required' })
    await c.close()
  })

  it('maps an Automation-denied "imsg react" failure to automation_denied (not send_failed)', async () => {
    const c = await clientWith('react_automation_denied').login({ binaryPath: STUB })
    await c.connect()
    try {
      await c.sendReaction(42, 'love')
      throw new Error('should have thrown')
    } catch (error) {
      expect((error as IMessageError).code).toBe('automation_denied')
    } finally {
      await c.close()
    }
  })

  it('maps AppleScript "not authorized" send error to automation_denied (not send_failed)', async () => {
    const c = await clientWith('automation_denied').login({ binaryPath: STUB })
    await c.connect()
    try {
      await c.sendMessage({ chatId: 42 }, 'hi')
      throw new Error('should have thrown')
    } catch (error) {
      expect((error as IMessageError).code).toBe('automation_denied')
    } finally {
      await c.close()
    }
  })

  it('close() rejects in-flight requests instead of hanging', async () => {
    const c = await clientWith().login({ binaryPath: STUB })
    await c.connect()
    const pending = c.listChats(1)
    await c.close()
    await expect(pending).rejects.toMatchObject({ code: 'rpc_error' })
  })

  it('imsg_not_found when the binary does not exist', async () => {
    const c = await new ImsgClient().login({ binaryPath: '/nonexistent/imsg-xyz' })
    try {
      await c.connect()
      throw new Error('should have thrown')
    } catch (error) {
      expect((error as IMessageError).code).toBe('imsg_not_found')
    } finally {
      await c.close()
    }
  })
})
