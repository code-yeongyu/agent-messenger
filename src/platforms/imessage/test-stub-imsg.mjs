#!/usr/bin/env node
// Test stub for the imsg binary. Behavior controlled by IMSG_STUB_MODE.
// Modes: ok (default), fda_denied, send_fail
const mode = process.env.IMSG_STUB_MODE || 'ok'
const arg = process.argv[2]

if (arg === '--version') {
  if (mode === 'novers') {
    process.exit(1)
  }
  process.stdout.write('0.11.1\n')
  process.exit(0)
}

if (arg === 'react') {
  if (mode === 'react_automation_denied') {
    process.stderr.write('AppleScript error: Messages got an error: Not authorized to send Apple events\n')
    process.exit(1)
  }
  if (mode === 'react_fail') {
    process.stdout.write('error: could not react\n')
    process.exit(1)
  }
  process.stdout.write(JSON.stringify({ success: true, chat_id: 42, reaction_type: 'love' }) + '\n')
  process.exit(0)
}

if (arg === 'rpc') {
  let buf = ''
  process.stdin.on('data', (d) => {
    buf += d
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim()
      buf = buf.slice(i + 1)
      if (!line) continue
      const req = JSON.parse(line)
      const reply = (result) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\n')
      const fail = (code, message, data) =>
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code, message, data } }) + '\n')

      if (req.method === 'chats.list') {
        if (mode === 'fda_denied') {
          fail(-32603, 'Internal error', 'Permission Error: Cannot access Messages database')
        } else if (mode === 'connect_rpc_fail') {
          fail(-32603, 'Internal error', 'some unexpected internal failure')
        } else {
          reply({
            chats: [
              {
                id: 42,
                name: 'Jane',
                identifier: 'iMessage;-;+15551234567',
                guid: 'iMessage;-;+15551234567',
                service: 'iMessage',
                is_group: false,
                participants: ['+15551234567'],
                last_message: {
                  id: 1,
                  chat_id: 42,
                  guid: 'm1',
                  sender: '+15551234567',
                  is_from_me: false,
                  text: 'hi',
                  created_at: '2026-06-24T00:00:00.000Z',
                },
              },
              {
                id: 43,
                name: 'Crew',
                identifier: 'iMessage;+;chat99',
                guid: 'iMessage;+;chat99',
                service: 'iMessage',
                is_group: true,
                participants: ['+15551111111', '+15552222222'],
              },
            ],
          })
        }
      } else if (req.method === 'messages.history') {
        reply({
          messages: [
            {
              id: 2,
              chat_id: 42,
              guid: 'm2',
              sender: '',
              is_from_me: true,
              text: 'yo',
              created_at: '2026-06-24T00:01:00.000Z',
            },
            {
              id: 1,
              chat_id: 42,
              guid: 'm1',
              sender: '+15551234567',
              is_from_me: false,
              text: 'hi',
              created_at: '2026-06-24T00:00:00.000Z',
            },
          ],
        })
      } else if (req.method === 'send') {
        if (mode === 'send_fail') {
          fail(-32603, 'Internal error', 'Messages accepted the chat send but wrote an unjoined empty outgoing row')
        } else if (mode === 'automation_denied') {
          fail(
            -32603,
            'Internal error',
            'AppleScript error: Messages got an error: Not authorized to send Apple events',
          )
        } else {
          reply({ ok: true, id: 99, guid: 'sent-guid', service: 'iMessage' })
        }
      } else if (req.method === 'watch.subscribe') {
        reply({ subscription: 1 })
        setTimeout(
          () =>
            process.stdout.write(
              JSON.stringify({
                jsonrpc: '2.0',
                method: 'message',
                params: {
                  subscription: 1,
                  message: {
                    id: 3,
                    chat_id: 42,
                    guid: 'm3',
                    sender: '+15551234567',
                    is_from_me: false,
                    text: 'new!',
                    created_at: '2026-06-24T00:02:00.000Z',
                  },
                },
              }) + '\n',
            ),
          30,
        )
      } else if (req.method === 'watch.unsubscribe') {
        reply({ ok: true })
      } else {
        fail(-32601, 'Method not found')
      }
    }
  })
  process.stdin.on('end', () => process.exit(0))
}
