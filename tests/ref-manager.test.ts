import { test, expect, describe, beforeEach } from 'bun:test'
import { RefManager } from '../src/lib/ref-manager'
import type {
  SlackChannel,
  SlackMessage,
  SlackUser,
  SlackFile,
  ChannelRef,
  MessageRef,
  UserRef,
  FileRef,
} from '../src/types'

describe('RefManager', () => {
  let refManager: RefManager

  beforeEach(() => {
    refManager = new RefManager()
  })

  describe('assignChannelRef', () => {
    test('should assign sequential channel refs', () => {
      const channel1: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      const channel2: SlackChannel = {
        id: 'C456',
        name: 'random',
        is_private: false,
        is_archived: false,
        created: 1234567891,
        creator: 'U123',
      }

      const ref1 = refManager.assignChannelRef(channel1)
      const ref2 = refManager.assignChannelRef(channel2)

      expect(ref1).toBe('@c1')
      expect(ref2).toBe('@c2')
    })

    test('should store channel with correct ref', () => {
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      const ref = refManager.assignChannelRef(channel)
      const retrieved = refManager.getChannelByRef(ref as ChannelRef)

      expect(retrieved).toEqual(channel)
    })
  })

  describe('assignMessageRef', () => {
    test('should assign sequential message refs', () => {
      const message1: SlackMessage = {
        ts: '1234567890.000100',
        text: 'Hello',
        user: 'U123',
        type: 'message',
      }

      const message2: SlackMessage = {
        ts: '1234567891.000100',
        text: 'World',
        user: 'U123',
        type: 'message',
      }

      const ref1 = refManager.assignMessageRef(message1)
      const ref2 = refManager.assignMessageRef(message2)

      expect(ref1).toBe('@m1')
      expect(ref2).toBe('@m2')
    })

    test('should store message with correct ref', () => {
      const message: SlackMessage = {
        ts: '1234567890.000100',
        text: 'Hello',
        user: 'U123',
        type: 'message',
      }

      const ref = refManager.assignMessageRef(message)
      const retrieved = refManager.getMessageByRef(ref as MessageRef)

      expect(retrieved).toEqual(message)
    })
  })

  describe('assignUserRef', () => {
    test('should assign sequential user refs', () => {
      const user1: SlackUser = {
        id: 'U123',
        name: 'alice',
        real_name: 'Alice',
        is_admin: false,
        is_owner: false,
        is_bot: false,
        is_app_user: false,
      }

      const user2: SlackUser = {
        id: 'U456',
        name: 'bob',
        real_name: 'Bob',
        is_admin: false,
        is_owner: false,
        is_bot: false,
        is_app_user: false,
      }

      const ref1 = refManager.assignUserRef(user1)
      const ref2 = refManager.assignUserRef(user2)

      expect(ref1).toBe('@u1')
      expect(ref2).toBe('@u2')
    })

    test('should store user with correct ref', () => {
      const user: SlackUser = {
        id: 'U123',
        name: 'alice',
        real_name: 'Alice',
        is_admin: false,
        is_owner: false,
        is_bot: false,
        is_app_user: false,
      }

      const ref = refManager.assignUserRef(user)
      const retrieved = refManager.getUserByRef(ref as UserRef)

      expect(retrieved).toEqual(user)
    })
  })

  describe('assignFileRef', () => {
    test('should assign sequential file refs', () => {
      const file1: SlackFile = {
        id: 'F123',
        name: 'document.pdf',
        title: 'Document',
        mimetype: 'application/pdf',
        size: 1024,
        url_private: 'https://example.com/file1',
        created: 1234567890,
        user: 'U123',
      }

      const file2: SlackFile = {
        id: 'F456',
        name: 'image.png',
        title: 'Image',
        mimetype: 'image/png',
        size: 2048,
        url_private: 'https://example.com/file2',
        created: 1234567891,
        user: 'U123',
      }

      const ref1 = refManager.assignFileRef(file1)
      const ref2 = refManager.assignFileRef(file2)

      expect(ref1).toBe('@f1')
      expect(ref2).toBe('@f2')
    })

    test('should store file with correct ref', () => {
      const file: SlackFile = {
        id: 'F123',
        name: 'document.pdf',
        title: 'Document',
        mimetype: 'application/pdf',
        size: 1024,
        url_private: 'https://example.com/file',
        created: 1234567890,
        user: 'U123',
      }

      const ref = refManager.assignFileRef(file)
      const retrieved = refManager.getFileByRef(ref as FileRef)

      expect(retrieved).toEqual(file)
    })
  })

  describe('resolveRef', () => {
    test('should resolve channel ref correctly', () => {
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      const ref = refManager.assignChannelRef(channel)
      const resolved = refManager.resolveRef(ref)

      expect(resolved).toEqual({ type: 'channel', id: 'C123' })
    })

    test('should resolve message ref correctly', () => {
      const message: SlackMessage = {
        ts: '1234567890.000100',
        text: 'Hello',
        user: 'U123',
        type: 'message',
      }

      const ref = refManager.assignMessageRef(message)
      const resolved = refManager.resolveRef(ref)

      expect(resolved).toEqual({ type: 'message', id: '1234567890.000100' })
    })

    test('should resolve user ref correctly', () => {
      const user: SlackUser = {
        id: 'U123',
        name: 'alice',
        real_name: 'Alice',
        is_admin: false,
        is_owner: false,
        is_bot: false,
        is_app_user: false,
      }

      const ref = refManager.assignUserRef(user)
      const resolved = refManager.resolveRef(ref)

      expect(resolved).toEqual({ type: 'user', id: 'U123' })
    })

    test('should resolve file ref correctly', () => {
      const file: SlackFile = {
        id: 'F123',
        name: 'document.pdf',
        title: 'Document',
        mimetype: 'application/pdf',
        size: 1024,
        url_private: 'https://example.com/file',
        created: 1234567890,
        user: 'U123',
      }

      const ref = refManager.assignFileRef(file)
      const resolved = refManager.resolveRef(ref)

      expect(resolved).toEqual({ type: 'file', id: 'F123' })
    })

    test('should return null for invalid ref', () => {
      const resolved = refManager.resolveRef('@invalid')
      expect(resolved).toBeNull()
    })

    test('should return null for non-existent ref', () => {
      const resolved = refManager.resolveRef('@c999')
      expect(resolved).toBeNull()
    })
  })

  describe('getChannelByRef', () => {
    test('should return channel for valid ref', () => {
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      const ref = refManager.assignChannelRef(channel) as ChannelRef
      const retrieved = refManager.getChannelByRef(ref)

      expect(retrieved).toEqual(channel)
    })

    test('should return null for non-existent ref', () => {
      const retrieved = refManager.getChannelByRef('@c999' as ChannelRef)
      expect(retrieved).toBeNull()
    })
  })

  describe('getMessageByRef', () => {
    test('should return message for valid ref', () => {
      const message: SlackMessage = {
        ts: '1234567890.000100',
        text: 'Hello',
        user: 'U123',
        type: 'message',
      }

      const ref = refManager.assignMessageRef(message) as MessageRef
      const retrieved = refManager.getMessageByRef(ref)

      expect(retrieved).toEqual(message)
    })

    test('should return null for non-existent ref', () => {
      const retrieved = refManager.getMessageByRef('@m999' as MessageRef)
      expect(retrieved).toBeNull()
    })
  })

  describe('getUserByRef', () => {
    test('should return user for valid ref', () => {
      const user: SlackUser = {
        id: 'U123',
        name: 'alice',
        real_name: 'Alice',
        is_admin: false,
        is_owner: false,
        is_bot: false,
        is_app_user: false,
      }

      const ref = refManager.assignUserRef(user) as UserRef
      const retrieved = refManager.getUserByRef(ref)

      expect(retrieved).toEqual(user)
    })

    test('should return null for non-existent ref', () => {
      const retrieved = refManager.getUserByRef('@u999' as UserRef)
      expect(retrieved).toBeNull()
    })
  })

  describe('getFileByRef', () => {
    test('should return file for valid ref', () => {
      const file: SlackFile = {
        id: 'F123',
        name: 'document.pdf',
        title: 'Document',
        mimetype: 'application/pdf',
        size: 1024,
        url_private: 'https://example.com/file',
        created: 1234567890,
        user: 'U123',
      }

      const ref = refManager.assignFileRef(file) as FileRef
      const retrieved = refManager.getFileByRef(ref)

      expect(retrieved).toEqual(file)
    })

    test('should return null for non-existent ref', () => {
      const retrieved = refManager.getFileByRef('@f999' as FileRef)
      expect(retrieved).toBeNull()
    })
  })

  describe('clear', () => {
    test('should clear all refs and reset counters', () => {
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      const message: SlackMessage = {
        ts: '1234567890.000100',
        text: 'Hello',
        user: 'U123',
        type: 'message',
      }

      const user: SlackUser = {
        id: 'U123',
        name: 'alice',
        real_name: 'Alice',
        is_admin: false,
        is_owner: false,
        is_bot: false,
        is_app_user: false,
      }

      const file: SlackFile = {
        id: 'F123',
        name: 'document.pdf',
        title: 'Document',
        mimetype: 'application/pdf',
        size: 1024,
        url_private: 'https://example.com/file',
        created: 1234567890,
        user: 'U123',
      }

      refManager.assignChannelRef(channel)
      refManager.assignMessageRef(message)
      refManager.assignUserRef(user)
      refManager.assignFileRef(file)

      refManager.clear()

      // After clear, next refs should start from 1
      const newChannelRef = refManager.assignChannelRef(channel)
      const newMessageRef = refManager.assignMessageRef(message)
      const newUserRef = refManager.assignUserRef(user)
      const newFileRef = refManager.assignFileRef(file)

      expect(newChannelRef).toBe('@c1')
      expect(newMessageRef).toBe('@m1')
      expect(newUserRef).toBe('@u1')
      expect(newFileRef).toBe('@f1')
    })

    test('should make old refs return null after clear', () => {
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      const ref = refManager.assignChannelRef(channel) as ChannelRef
      refManager.clear()

      const retrieved = refManager.getChannelByRef(ref)
      expect(retrieved).toBeNull()
    })
  })

  describe('serialize', () => {
    test('should serialize empty refs as empty object', () => {
      const serialized = refManager.serialize()
      expect(serialized).toBe('{}')
    })

    test('should serialize channel refs correctly', () => {
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      refManager.assignChannelRef(channel)
      const serialized = refManager.serialize()
      const parsed = JSON.parse(serialized)

      expect(parsed['@c1']).toBe('C123')
    })

    test('should serialize message refs correctly', () => {
      const message: SlackMessage = {
        ts: '1234567890.000100',
        text: 'Hello',
        user: 'U123',
        type: 'message',
      }

      refManager.assignMessageRef(message)
      const serialized = refManager.serialize()
      const parsed = JSON.parse(serialized)

      expect(parsed['@m1']).toBe('1234567890.000100')
    })

    test('should serialize user refs correctly', () => {
      const user: SlackUser = {
        id: 'U123',
        name: 'alice',
        real_name: 'Alice',
        is_admin: false,
        is_owner: false,
        is_bot: false,
        is_app_user: false,
      }

      refManager.assignUserRef(user)
      const serialized = refManager.serialize()
      const parsed = JSON.parse(serialized)

      expect(parsed['@u1']).toBe('U123')
    })

    test('should serialize file refs correctly', () => {
      const file: SlackFile = {
        id: 'F123',
        name: 'document.pdf',
        title: 'Document',
        mimetype: 'application/pdf',
        size: 1024,
        url_private: 'https://example.com/file',
        created: 1234567890,
        user: 'U123',
      }

      refManager.assignFileRef(file)
      const serialized = refManager.serialize()
      const parsed = JSON.parse(serialized)

      expect(parsed['@f1']).toBe('F123')
    })

    test('should serialize all entity types together', () => {
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      const message: SlackMessage = {
        ts: '1234567890.000100',
        text: 'Hello',
        user: 'U123',
        type: 'message',
      }

      const user: SlackUser = {
        id: 'U123',
        name: 'alice',
        real_name: 'Alice',
        is_admin: false,
        is_owner: false,
        is_bot: false,
        is_app_user: false,
      }

      const file: SlackFile = {
        id: 'F123',
        name: 'document.pdf',
        title: 'Document',
        mimetype: 'application/pdf',
        size: 1024,
        url_private: 'https://example.com/file',
        created: 1234567890,
        user: 'U123',
      }

      refManager.assignChannelRef(channel)
      refManager.assignMessageRef(message)
      refManager.assignUserRef(user)
      refManager.assignFileRef(file)

      const serialized = refManager.serialize()
      const parsed = JSON.parse(serialized)

      expect(parsed['@c1']).toBe('C123')
      expect(parsed['@m1']).toBe('1234567890.000100')
      expect(parsed['@u1']).toBe('U123')
      expect(parsed['@f1']).toBe('F123')
    })

    test('should produce valid JSON', () => {
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      refManager.assignChannelRef(channel)
      const serialized = refManager.serialize()

      // Should not throw
      expect(() => JSON.parse(serialized)).not.toThrow()
    })
  })

  describe('integration', () => {
    test('should handle mixed entity types', () => {
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      const message: SlackMessage = {
        ts: '1234567890.000100',
        text: 'Hello',
        user: 'U123',
        type: 'message',
      }

      const user: SlackUser = {
        id: 'U123',
        name: 'alice',
        real_name: 'Alice',
        is_admin: false,
        is_owner: false,
        is_bot: false,
        is_app_user: false,
      }

      const cRef = refManager.assignChannelRef(channel)
      const mRef = refManager.assignMessageRef(message)
      const uRef = refManager.assignUserRef(user)

      expect(refManager.getChannelByRef(cRef as ChannelRef)).toEqual(channel)
      expect(refManager.getMessageByRef(mRef as MessageRef)).toEqual(message)
      expect(refManager.getUserByRef(uRef as UserRef)).toEqual(user)
    })

    test('should maintain separate counters for each entity type', () => {
      const channel: SlackChannel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_archived: false,
        created: 1234567890,
        creator: 'U123',
      }

      const message: SlackMessage = {
        ts: '1234567890.000100',
        text: 'Hello',
        user: 'U123',
        type: 'message',
      }

      // Assign multiple of each type
      const c1 = refManager.assignChannelRef(channel)
      const m1 = refManager.assignMessageRef(message)
      const c2 = refManager.assignChannelRef(channel)
      const m2 = refManager.assignMessageRef(message)

      expect(c1).toBe('@c1')
      expect(m1).toBe('@m1')
      expect(c2).toBe('@c2')
      expect(m2).toBe('@m2')
    })
  })
})
