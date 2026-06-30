const TYPE_TRUE = 0x01
const TYPE_FALSE = 0x02
const TYPE_BYTE = 0x03
const TYPE_I16 = 0x04
const TYPE_I32 = 0x05
const TYPE_I64 = 0x06
const TYPE_BINARY = 0x08
const TYPE_LIST = 0x09
const TYPE_MAP = 0x0b
const TYPE_STRUCT = 0x0c

const VARINT_CONTINUE = 0x80
const VARINT_MASK = 0x7f
const U64_MASK = 0xffffffffffffffffn

export class ThriftCompactWriter {
  private bytes: number[] = []
  private parentFieldStack: number[] = []
  private lastFieldId = 0

  bool(id: number, value: boolean): this {
    this.writeFieldHeader(value ? TYPE_TRUE : TYPE_FALSE, id)
    return this
  }

  byte(id: number, value: number): this {
    this.writeFieldHeader(TYPE_BYTE, id)
    this.bytes.push(value & 0xff)
    return this
  }

  i16(id: number, value: number): this {
    this.writeFieldHeader(TYPE_I16, id)
    this.writeVarint(zigzag32(value))
    return this
  }

  i32(id: number, value: number): this {
    this.writeFieldHeader(TYPE_I32, id)
    this.writeVarint(zigzag32(value))
    return this
  }

  i64(id: number, value: number | bigint): this {
    this.writeFieldHeader(TYPE_I64, id)
    this.writeVarint(zigzag64(BigInt(value)))
    return this
  }

  binary(id: number, value: string | Buffer): this {
    this.writeFieldHeader(TYPE_BINARY, id)
    this.writeBinaryValue(value)
    return this
  }

  listOfI32(id: number, values: number[]): this {
    this.writeFieldHeader(TYPE_LIST, id)
    this.writeListHeader(TYPE_I32, values.length)
    for (const value of values) this.writeVarint(zigzag32(value))
    return this
  }

  listOfBinary(id: number, values: string[]): this {
    this.writeFieldHeader(TYPE_LIST, id)
    this.writeListHeader(TYPE_BINARY, values.length)
    for (const value of values) this.writeBinaryValue(value)
    return this
  }

  mapBinaryBinary(id: number, entries: Record<string, string>): this {
    this.writeFieldHeader(TYPE_MAP, id)
    const keys = Object.keys(entries)

    // Compact protocol encodes an empty map as a single zero byte (size only).
    if (keys.length === 0) {
      this.bytes.push(0)
      return this
    }

    this.writeVarint(keys.length)
    this.bytes.push((TYPE_BINARY << 4) | TYPE_BINARY)
    for (const key of keys) {
      this.writeBinaryValue(key)
      this.writeBinaryValue(entries[key]!)
    }
    return this
  }

  structStart(id: number): this {
    this.writeFieldHeader(TYPE_STRUCT, id)
    this.parentFieldStack.push(this.lastFieldId)
    this.lastFieldId = 0
    return this
  }

  structEnd(): this {
    this.bytes.push(0)
    this.lastFieldId = this.parentFieldStack.pop() ?? 0
    return this
  }

  finish(): Buffer {
    this.bytes.push(0)
    return Buffer.from(this.bytes)
  }

  // Compact protocol packs a small field-id delta and the type into one byte
  // (delta << 4 | type); deltas outside 1..15 fall back to a zigzag varint id.
  private writeFieldHeader(type: number, id: number): void {
    const delta = id - this.lastFieldId
    if (delta > 0 && delta <= 15) {
      this.bytes.push((delta << 4) | type)
    } else {
      this.bytes.push(type)
      this.writeVarint(zigzag32(id))
    }
    this.lastFieldId = id
  }

  // Lists with fewer than 15 elements pack size into the header nibble;
  // larger lists set the nibble to 0xf and append the size as a varint.
  private writeListHeader(elementType: number, size: number): void {
    if (size < 15) {
      this.bytes.push((size << 4) | elementType)
    } else {
      this.bytes.push(0xf0 | elementType)
      this.writeVarint(size)
    }
  }

  private writeBinaryValue(value: string | Buffer): void {
    const buf = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8')
    this.writeVarint(buf.length)
    for (const b of buf) this.bytes.push(b)
  }

  private writeVarint(value: number | bigint): void {
    let remaining = BigInt(value) & U64_MASK
    while (true) {
      const chunk = Number(remaining & BigInt(VARINT_MASK))
      remaining >>= 7n
      if (remaining === 0n) {
        this.bytes.push(chunk)
        return
      }
      this.bytes.push(chunk | VARINT_CONTINUE)
    }
  }
}

function zigzag32(value: number): number {
  // `>>> 0` coerces the signed int32 bitwise result to an unsigned 32-bit value,
  // so large positives and INT32_MIN encode as a <=5-byte varint, not a 64-bit one.
  return ((value << 1) ^ (value >> 31)) >>> 0
}

function zigzag64(value: bigint): bigint {
  return BigInt.asUintN(64, value << 1n) ^ (value >> 63n)
}
