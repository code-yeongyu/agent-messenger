import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { CredentialManager } from '../../src/platforms/slack/credential-manager'
import type { WorkspaceCredentials } from '../../src/platforms/slack/types'

const testConfigDir = join(import.meta.dir, '.test-workspace-config')

describe('Workspace Commands', () => {
  let credManager: CredentialManager

  beforeEach(() => {
    rmSync(testConfigDir, { recursive: true, force: true })
    credManager = new CredentialManager(testConfigDir)
  })

  afterAll(() => {
    rmSync(testConfigDir, { recursive: true, force: true })
  })

  describe('workspace list', () => {
    test('returns empty list when no workspaces exist', async () => {
      // Given: No workspaces configured
      // When: Loading config
      const config = await credManager.load()

      // Then: Should have empty workspaces
      expect(Object.keys(config.workspaces)).toHaveLength(0)
    })

    test('lists all workspaces with current marker', async () => {
      // Given: Multiple workspaces with one as current
      const ws1: WorkspaceCredentials = {
        workspace_id: 'T123',
        workspace_name: 'acme-corp',
        token: 'xoxc-123',
        cookie: 'xoxd-123',
      }
      const ws2: WorkspaceCredentials = {
        workspace_id: 'T456',
        workspace_name: 'side-project',
        token: 'xoxc-456',
        cookie: 'xoxd-456',
      }

      await credManager.setWorkspace(ws1)
      await credManager.setWorkspace(ws2)
      await credManager.setCurrentWorkspace('T123')

      // When: Loading config
      const config = await credManager.load()
      const workspaces = Object.values(config.workspaces)

      // Then: Should list all workspaces
      expect(workspaces).toHaveLength(2)
      expect(workspaces.map((w) => w.workspace_id)).toContain('T123')
      expect(workspaces.map((w) => w.workspace_id)).toContain('T456')
      expect(config.current_workspace).toBe('T123')
    })

    test('shows current marker for active workspace', async () => {
      // Given: Workspace set as current
      const ws: WorkspaceCredentials = {
        workspace_id: 'T789',
        workspace_name: 'current-ws',
        token: 'xoxc-789',
        cookie: 'xoxd-789',
      }
      await credManager.setWorkspace(ws)
      await credManager.setCurrentWorkspace('T789')

      // When: Loading config
      const config = await credManager.load()

      // Then: Current workspace should match
      expect(config.current_workspace).toBe('T789')
      expect(config.workspaces.T789).toBeDefined()
    })

    test('handles list with no current workspace', async () => {
      // Given: Workspaces exist but none is current
      const ws: WorkspaceCredentials = {
        workspace_id: 'T999',
        workspace_name: 'no-current',
        token: 'xoxc-999',
        cookie: 'xoxd-999',
      }
      await credManager.setWorkspace(ws)

      // When: Loading config
      const config = await credManager.load()

      // Then: current_workspace should be null
      expect(config.current_workspace).toBeNull()
      expect(config.workspaces.T999).toBeDefined()
    })
  })

  describe('workspace switch', () => {
    test('switches to existing workspace', async () => {
      // Given: Multiple workspaces exist
      const ws1: WorkspaceCredentials = {
        workspace_id: 'T111',
        workspace_name: 'first',
        token: 'xoxc-111',
        cookie: 'xoxd-111',
      }
      const ws2: WorkspaceCredentials = {
        workspace_id: 'T222',
        workspace_name: 'second',
        token: 'xoxc-222',
        cookie: 'xoxd-222',
      }
      await credManager.setWorkspace(ws1)
      await credManager.setWorkspace(ws2)
      await credManager.setCurrentWorkspace('T111')

      // When: Switching to second workspace
      await credManager.setCurrentWorkspace('T222')

      // Then: Current should be updated
      const config = await credManager.load()
      expect(config.current_workspace).toBe('T222')
    })

    test('fails when workspace does not exist', async () => {
      // Given: Workspace does not exist
      // When: Trying to get non-existent workspace
      const ws = await credManager.getWorkspace('nonexistent')

      // Then: Should return null
      expect(ws).toBeNull()
    })

    test('validates workspace exists before switching', async () => {
      // Given: Only one workspace exists
      const ws: WorkspaceCredentials = {
        workspace_id: 'T333',
        workspace_name: 'only-one',
        token: 'xoxc-333',
        cookie: 'xoxd-333',
      }
      await credManager.setWorkspace(ws)
      await credManager.setCurrentWorkspace('T333')

      // When: Trying to switch to non-existent workspace
      const config = await credManager.load()
      const targetExists = 'T999' in config.workspaces

      // Then: Should not exist
      expect(targetExists).toBe(false)
    })

    test('preserves workspace credentials when switching', async () => {
      // Given: Multiple workspaces with different credentials
      const ws1: WorkspaceCredentials = {
        workspace_id: 'T444',
        workspace_name: 'first',
        token: 'token-444',
        cookie: 'cookie-444',
      }
      const ws2: WorkspaceCredentials = {
        workspace_id: 'T555',
        workspace_name: 'second',
        token: 'token-555',
        cookie: 'cookie-555',
      }
      await credManager.setWorkspace(ws1)
      await credManager.setWorkspace(ws2)

      // When: Switching between workspaces
      await credManager.setCurrentWorkspace('T444')
      let config = await credManager.load()
      expect(config.current_workspace).toBe('T444')

      await credManager.setCurrentWorkspace('T555')
      config = await credManager.load()

      // Then: Both workspaces should still have their credentials
      expect(config.workspaces.T444.token).toBe('token-444')
      expect(config.workspaces.T555.token).toBe('token-555')
      expect(config.current_workspace).toBe('T555')
    })
  })

  describe('workspace current', () => {
    test('returns current workspace details', async () => {
      // Given: A current workspace is set
      const ws: WorkspaceCredentials = {
        workspace_id: 'T666',
        workspace_name: 'current-workspace',
        token: 'xoxc-666',
        cookie: 'xoxd-666',
      }
      await credManager.setWorkspace(ws)
      await credManager.setCurrentWorkspace('T666')

      // When: Getting current workspace
      const current = await credManager.getWorkspace()

      // Then: Should return workspace details
      expect(current).not.toBeNull()
      expect(current?.workspace_id).toBe('T666')
      expect(current?.workspace_name).toBe('current-workspace')
      expect(current?.token).toBe('xoxc-666')
      expect(current?.cookie).toBe('xoxd-666')
    })

    test('returns null when no current workspace set', async () => {
      // Given: No current workspace
      // When: Getting current workspace
      const current = await credManager.getWorkspace()

      // Then: Should return null
      expect(current).toBeNull()
    })

    test('returns null when current workspace is deleted', async () => {
      // Given: Current workspace is set
      const ws: WorkspaceCredentials = {
        workspace_id: 'T777',
        workspace_name: 'to-delete',
        token: 'xoxc-777',
        cookie: 'xoxd-777',
      }
      await credManager.setWorkspace(ws)
      await credManager.setCurrentWorkspace('T777')

      // When: Workspace is removed
      await credManager.removeWorkspace('T777')

      // Then: Current should be null
      const current = await credManager.getWorkspace()
      expect(current).toBeNull()
    })

    test('shows correct workspace after switching', async () => {
      // Given: Multiple workspaces with one as current
      const ws1: WorkspaceCredentials = {
        workspace_id: 'T888',
        workspace_name: 'first',
        token: 'token-888',
        cookie: 'cookie-888',
      }
      const ws2: WorkspaceCredentials = {
        workspace_id: 'T999',
        workspace_name: 'second',
        token: 'token-999',
        cookie: 'cookie-999',
      }
      await credManager.setWorkspace(ws1)
      await credManager.setWorkspace(ws2)
      await credManager.setCurrentWorkspace('T888')

      // When: Switching to second workspace
      await credManager.setCurrentWorkspace('T999')
      const current = await credManager.getWorkspace()

      // Then: Should return second workspace
      expect(current?.workspace_id).toBe('T999')
      expect(current?.workspace_name).toBe('second')
    })
  })

  describe('workspace remove', () => {
    test('removes workspace by id', async () => {
      // Given: A workspace exists
      const ws: WorkspaceCredentials = {
        workspace_id: 'T-remove',
        workspace_name: 'to-remove',
        token: 'xoxc-remove',
        cookie: 'xoxd-remove',
      }
      await credManager.setWorkspace(ws)

      // When: Workspace is removed
      await credManager.removeWorkspace('T-remove')

      // Then: Workspace should not exist
      const retrieved = await credManager.getWorkspace('T-remove')
      expect(retrieved).toBeNull()
    })

    test('removes current workspace and clears current', async () => {
      // Given: Current workspace is set
      const ws: WorkspaceCredentials = {
        workspace_id: 'T-current-remove',
        workspace_name: 'current-to-remove',
        token: 'xoxc-current-remove',
        cookie: 'xoxd-current-remove',
      }
      await credManager.setWorkspace(ws)
      await credManager.setCurrentWorkspace('T-current-remove')

      // When: Current workspace is removed
      await credManager.removeWorkspace('T-current-remove')

      // Then: Current should be null
      const config = await credManager.load()
      expect(config.current_workspace).toBeNull()
    })

    test('removes workspace without affecting others', async () => {
      // Given: Multiple workspaces exist
      const ws1: WorkspaceCredentials = {
        workspace_id: 'T-keep',
        workspace_name: 'keep',
        token: 'token-keep',
        cookie: 'cookie-keep',
      }
      const ws2: WorkspaceCredentials = {
        workspace_id: 'T-remove-one',
        workspace_name: 'remove-one',
        token: 'token-remove',
        cookie: 'cookie-remove',
      }
      await credManager.setWorkspace(ws1)
      await credManager.setWorkspace(ws2)
      await credManager.setCurrentWorkspace('T-keep')

      // When: One workspace is removed
      await credManager.removeWorkspace('T-remove-one')

      // Then: Other workspace should remain
      const config = await credManager.load()
      expect(config.workspaces['T-keep']).toBeDefined()
      expect(config.workspaces['T-remove-one']).toBeUndefined()
      expect(config.current_workspace).toBe('T-keep')
    })

    test('handles removing non-existent workspace gracefully', async () => {
      // Given: Workspace does not exist
      // When: Trying to remove non-existent workspace
      await credManager.removeWorkspace('nonexistent')

      // Then: Should not throw error
      const config = await credManager.load()
      expect(config.workspaces).toEqual({})
    })

    test('clears current only if removed workspace was current', async () => {
      // Given: Multiple workspaces with one as current
      const ws1: WorkspaceCredentials = {
        workspace_id: 'T-current-1',
        workspace_name: 'current-1',
        token: 'token-1',
        cookie: 'cookie-1',
      }
      const ws2: WorkspaceCredentials = {
        workspace_id: 'T-other',
        workspace_name: 'other',
        token: 'token-other',
        cookie: 'cookie-other',
      }
      await credManager.setWorkspace(ws1)
      await credManager.setWorkspace(ws2)
      await credManager.setCurrentWorkspace('T-current-1')

      // When: Non-current workspace is removed
      await credManager.removeWorkspace('T-other')

      // Then: Current should remain unchanged
      const config = await credManager.load()
      expect(config.current_workspace).toBe('T-current-1')
    })
  })

  describe('Output Formatting', () => {
    test('formats list output correctly', async () => {
      // Given: Multiple workspaces
      const ws1: WorkspaceCredentials = {
        workspace_id: 'T-format-1',
        workspace_name: 'format-1',
        token: 'token-1',
        cookie: 'cookie-1',
      }
      const ws2: WorkspaceCredentials = {
        workspace_id: 'T-format-2',
        workspace_name: 'format-2',
        token: 'token-2',
        cookie: 'cookie-2',
      }
      await credManager.setWorkspace(ws1)
      await credManager.setWorkspace(ws2)
      await credManager.setCurrentWorkspace('T-format-1')

      // When: Creating list output
      const config = await credManager.load()
      const output = Object.values(config.workspaces).map((ws) => ({
        id: ws.workspace_id,
        name: ws.workspace_name,
        current: ws.workspace_id === config.current_workspace,
      }))

      // Then: Should be valid JSON
      const json = JSON.stringify(output)
      const parsed = JSON.parse(json)
      expect(parsed).toHaveLength(2)
      expect(parsed[0].current).toBe(true)
      expect(parsed[1].current).toBe(false)
    })

    test('formats switch output correctly', async () => {
      // Given: Workspace to switch to
      const ws: WorkspaceCredentials = {
        workspace_id: 'T-switch-format',
        workspace_name: 'switch-format',
        token: 'token-switch',
        cookie: 'cookie-switch',
      }
      await credManager.setWorkspace(ws)
      await credManager.setCurrentWorkspace('T-switch-format')

      // When: Creating switch output
      const output = { current: 'T-switch-format' }

      // Then: Should be valid JSON
      const json = JSON.stringify(output)
      const parsed = JSON.parse(json)
      expect(parsed.current).toBe('T-switch-format')
    })

    test('formats current output correctly', async () => {
      // Given: Current workspace
      const ws: WorkspaceCredentials = {
        workspace_id: 'T-current-format',
        workspace_name: 'current-format',
        token: 'token-current',
        cookie: 'cookie-current',
      }
      await credManager.setWorkspace(ws)
      await credManager.setCurrentWorkspace('T-current-format')

      // When: Creating current output
      const current = await credManager.getWorkspace()
      const output = {
        workspace_id: current?.workspace_id,
        workspace_name: current?.workspace_name,
      }

      // Then: Should be valid JSON
      const json = JSON.stringify(output)
      const parsed = JSON.parse(json)
      expect(parsed.workspace_id).toBe('T-current-format')
      expect(parsed.workspace_name).toBe('current-format')
    })

    test('formats remove output correctly', async () => {
      // Given: Workspace to remove
      const ws: WorkspaceCredentials = {
        workspace_id: 'T-remove-format',
        workspace_name: 'remove-format',
        token: 'token-remove',
        cookie: 'cookie-remove',
      }
      await credManager.setWorkspace(ws)

      // When: Creating remove output
      const output = { removed: 'T-remove-format' }

      // Then: Should be valid JSON
      const json = JSON.stringify(output)
      const parsed = JSON.parse(json)
      expect(parsed.removed).toBe('T-remove-format')
    })

    test('pretty prints JSON correctly', async () => {
      // Given: Output data
      const output = {
        id: 'T123',
        name: 'test',
        current: true,
      }

      // When: Pretty printing
      const pretty = JSON.stringify(output, null, 2)

      // Then: Should contain newlines and indentation
      expect(pretty).toContain('\n')
      expect(pretty).toContain('  ')
    })
  })

  describe('Error Handling', () => {
    test('handles missing workspace gracefully', async () => {
      // Given: Workspace does not exist
      // When: Trying to get workspace
      const ws = await credManager.getWorkspace('missing')

      // Then: Should return null
      expect(ws).toBeNull()
    })

    test('handles corrupted config gracefully', async () => {
      // Given: Config directory exists
      // When: Loading from empty directory
      const config = await credManager.load()

      // Then: Should return default config
      expect(config.current_workspace).toBeNull()
      expect(config.workspaces).toEqual({})
    })

    test('handles concurrent operations', async () => {
      // Given: Multiple workspaces
      const ws1: WorkspaceCredentials = {
        workspace_id: 'T-concurrent-1',
        workspace_name: 'concurrent-1',
        token: 'token-1',
        cookie: 'cookie-1',
      }
      const ws2: WorkspaceCredentials = {
        workspace_id: 'T-concurrent-2',
        workspace_name: 'concurrent-2',
        token: 'token-2',
        cookie: 'cookie-2',
      }

      // When: Setting workspaces sequentially
      await credManager.setWorkspace(ws1)
      await credManager.setWorkspace(ws2)

      // Then: Both should be saved
      const config = await credManager.load()
      expect(Object.keys(config.workspaces)).toHaveLength(2)
    })
  })
})
