import { EventEmitter } from 'node:events'
import tls from 'node:tls'

const MQTTOT_HOST = 'edge-mqtt.facebook.com'
const MQTTOT_PORT = 443
const PROTOCOL_NAME = 'MQTToT'
const PROTOCOL_LEVEL = 3

// CONNECT flags 0xC2 = username present + clean session; the "password" travels
// inside the Thrift payload rather than the standard MQTT password field.
const CONNECT_FLAGS = 0xc2
const KEEPALIVE_SECONDS = 60
const CONNACK_TIMEOUT_MS = 15_000

const PacketType = {
  Connect: 1,
  ConnAck: 2,
  Publish: 3,
  PubAck: 4,
  Subscribe: 8,
  PingReq: 12,
  PingResp: 13,
  Disconnect: 14,
} as const

export interface MqttPublish {
  topic: string
  payload: Buffer
}

export interface MqttTransportEventMap {
  connect: []
  publish: [MqttPublish]
  error: [Error]
  close: []
}

type EventKey = keyof MqttTransportEventMap

export class MqttTransport {
  private socket: tls.TLSSocket | null = null
  private emitter = new EventEmitter()
  private buffer = Buffer.alloc(0)
  private nextPacketId = 1
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private connackTimer: ReturnType<typeof setTimeout> | null = null
  private connackTimeoutMs: number

  constructor(options: { connackTimeoutMs?: number } = {}) {
    this.connackTimeoutMs = options.connackTimeoutMs ?? CONNACK_TIMEOUT_MS
  }

  connect(connectPayload: Buffer): void {
    const socket = tls.connect({ host: MQTTOT_HOST, port: MQTTOT_PORT, servername: MQTTOT_HOST }, () => {
      socket.write(this.buildConnectPacket(connectPayload))
    })
    this.socket = socket

    // Guard against a peer that accepts TLS but never sends CONNACK, which would
    // otherwise leave a hybrid caller waiting forever instead of failing over.
    this.connackTimer = setTimeout(() => {
      this.connackTimer = null
      this.emitter.emit('error', new Error('MQTToT CONNACK timed out'))
      socket.destroy()
    }, this.connackTimeoutMs)

    socket.on('data', (chunk: Buffer) => this.onData(chunk))
    socket.on('error', (err: Error) => this.emitter.emit('error', err))
    socket.on('close', () => {
      this.clearConnackTimer()
      this.stopPing()
      this.emitter.emit('close')
    })
  }

  publish(topic: string, payload: Buffer, qos: 0 | 1 = 1): void {
    if (!this.socket) throw new Error('MQTT transport not connected')
    this.socket.write(this.buildPublishPacket(topic, payload, qos))
  }

  subscribe(topics: string[]): void {
    if (!this.socket) throw new Error('MQTT transport not connected')
    this.socket.write(this.buildSubscribePacket(topics))
  }

  disconnect(): void {
    this.clearConnackTimer()
    this.stopPing()
    if (this.socket) {
      try {
        this.socket.write(Buffer.from([PacketType.Disconnect << 4, 0]))
      } catch {
        // socket may already be torn down; closing below is sufficient
      }
      this.socket.destroy()
      this.socket = null
    }
  }

  on<K extends EventKey>(event: K, listener: (...args: MqttTransportEventMap[K]) => void): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void)
    return this
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    this.drainPackets()
  }

  private drainPackets(): void {
    while (this.buffer.length >= 2) {
      const decoded = decodeRemainingLength(this.buffer, 1)
      if (!decoded) return

      const { length: remainingLength, bytesUsed } = decoded
      const totalLength = 1 + bytesUsed + remainingLength
      if (this.buffer.length < totalLength) return

      const packet = this.buffer.subarray(0, totalLength)
      this.buffer = this.buffer.subarray(totalLength)
      this.handlePacket(packet, 1 + bytesUsed)
    }
  }

  private handlePacket(packet: Buffer, bodyStart: number): void {
    const type = (packet[0]! >> 4) & 0x0f

    switch (type) {
      case PacketType.ConnAck: {
        this.clearConnackTimer()
        const returnCode = packet[bodyStart + 1]
        if (returnCode === 0) {
          this.startPing()
          this.emitter.emit('connect')
        } else {
          this.emitter.emit('error', new Error(`MQTToT CONNACK refused with return code ${returnCode}`))
        }
        break
      }
      case PacketType.Publish:
        this.handlePublish(packet, bodyStart)
        break
      case PacketType.PingResp:
      case PacketType.PubAck:
      case PacketType.Subscribe + 1:
        break
    }
  }

  private handlePublish(packet: Buffer, bodyStart: number): void {
    const qos = (packet[0]! >> 1) & 0x03

    // A truncated/malformed frame must not throw out of the data handler, or it
    // would crash the process instead of letting the listener fail over.
    if (bodyStart + 2 > packet.length) return
    const topicLength = packet.readUInt16BE(bodyStart)
    let offset = bodyStart + 2
    if (offset + topicLength > packet.length) return
    const topic = packet.toString('utf8', offset, offset + topicLength)
    offset += topicLength

    let packetId: number | null = null
    if (qos > 0) {
      if (offset + 2 > packet.length) return
      packetId = packet.readUInt16BE(offset)
      offset += 2
    }

    const payload = packet.subarray(offset)
    this.emitter.emit('publish', { topic, payload })

    if (qos === 1 && packetId !== null) {
      this.sendPubAck(packetId)
    }
  }

  private sendPubAck(packetId: number): void {
    const packet = Buffer.from([PacketType.PubAck << 4, 2, (packetId >> 8) & 0xff, packetId & 0xff])
    this.socket?.write(packet)
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      this.socket?.write(Buffer.from([PacketType.PingReq << 4, 0]))
    }, KEEPALIVE_SECONDS * 1000)
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private clearConnackTimer(): void {
    if (this.connackTimer) {
      clearTimeout(this.connackTimer)
      this.connackTimer = null
    }
  }

  private buildConnectPacket(payload: Buffer): Buffer {
    const variableHeader: number[] = []
    appendString(variableHeader, PROTOCOL_NAME)
    variableHeader.push(PROTOCOL_LEVEL, CONNECT_FLAGS)
    variableHeader.push((KEEPALIVE_SECONDS >> 8) & 0xff, KEEPALIVE_SECONDS & 0xff)

    const body = Buffer.concat([Buffer.from(variableHeader), payload])
    return Buffer.concat([Buffer.from([PacketType.Connect << 4, ...encodeRemainingLength(body.length)]), body])
  }

  private buildPublishPacket(topic: string, payload: Buffer, qos: 0 | 1): Buffer {
    const variableHeader: number[] = []
    appendString(variableHeader, topic)
    if (qos > 0) {
      const packetId = this.allocatePacketId()
      variableHeader.push((packetId >> 8) & 0xff, packetId & 0xff)
    }

    const body = Buffer.concat([Buffer.from(variableHeader), payload])
    const flags = qos << 1
    return Buffer.concat([
      Buffer.from([(PacketType.Publish << 4) | flags, ...encodeRemainingLength(body.length)]),
      body,
    ])
  }

  private buildSubscribePacket(topics: string[]): Buffer {
    const packetId = this.allocatePacketId()
    const body: number[] = [(packetId >> 8) & 0xff, packetId & 0xff]
    for (const topic of topics) {
      appendString(body, topic)
      body.push(0)
    }
    // SUBSCRIBE has reserved flags 0010 in the fixed-header low nibble.
    return Buffer.concat([
      Buffer.from([(PacketType.Subscribe << 4) | 0x02, ...encodeRemainingLength(body.length)]),
      Buffer.from(body),
    ])
  }

  private allocatePacketId(): number {
    const id = this.nextPacketId
    this.nextPacketId = (this.nextPacketId % 0xffff) + 1
    return id
  }
}

function appendString(target: number[], value: string): void {
  const buf = Buffer.from(value, 'utf8')
  target.push((buf.length >> 8) & 0xff, buf.length & 0xff)
  for (const b of buf) target.push(b)
}

function encodeRemainingLength(length: number): number[] {
  const bytes: number[] = []
  let value = length
  do {
    let digit = value & 0x7f
    value >>= 7
    if (value > 0) digit |= 0x80
    bytes.push(digit)
  } while (value > 0)
  return bytes
}

function decodeRemainingLength(buffer: Buffer, offset: number): { length: number; bytesUsed: number } | null {
  let length = 0
  let multiplier = 1
  let bytesUsed = 0

  while (offset + bytesUsed < buffer.length) {
    const byte = buffer[offset + bytesUsed]!
    length += (byte & 0x7f) * multiplier
    bytesUsed++
    if ((byte & 0x80) === 0) {
      return { length, bytesUsed }
    }
    multiplier *= 128
    if (bytesUsed > 4) return null
  }

  return null
}
