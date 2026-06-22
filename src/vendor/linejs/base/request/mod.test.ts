import { describe, expect, it } from 'bun:test'

import { InternalError } from '../core/mod.js'
import { RequestClient } from './mod.js'

// Regression: a thrift error response can set hasError (empty res.data[0]) while
// omitting the exception struct (res.data[1] absent), leaving res.data.e undefined.
function createClient(readThriftResult: { data: Record<string, unknown> }) {
  const deviceDetails = {
    device: 'TEST',
    appVersion: '0.0.0',
    systemName: 'TEST',
    systemVersion: '0.0.0',
  }
  const stubClient = {
    deviceDetails,
    endpoint: 'legy.line-apps.test',
    authToken: 'expired-token',
    config: { timeout: 1000 },
    storage: { get: async () => undefined },
    log: () => {},
    emit: () => {},
    fetch: async () => ({
      headers: { get: () => null },
      arrayBuffer: async () => new ArrayBuffer(0),
    }),
    thrift: {
      writeThrift: () => new Uint8Array(),
      readThrift: () => readThriftResult,
      rename_data: () => {},
    },
  }

  return new RequestClient(stubClient as never)
}

describe('RequestClient.requestCore error handling', () => {
  it('throws a clean RequestError when hasError is set but no exception struct is present', async () => {
    // given: an error response with an empty success slot and no exception struct
    const client = createClient({ data: { 0: undefined, someField: 1 } })

    // when / then: the error branch must throw InternalError, not a TypeError
    let thrown: unknown
    try {
      await client.requestCore('/S3', [], 'testMethod', 3)
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(InternalError)
    expect((thrown as InternalError).type).toBe('RequestError')
    expect(thrown).not.toBeInstanceOf(TypeError)
  })
})
