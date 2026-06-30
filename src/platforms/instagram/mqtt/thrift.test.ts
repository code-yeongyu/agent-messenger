import { describe, expect, it } from 'bun:test'

import { ThriftCompactWriter } from '@/platforms/instagram/mqtt/thrift'

describe('ThriftCompactWriter', () => {
  it('encodes a true bool as a packed field header with a trailing stop byte', () => {
    // field id 1 (delta 1) << 4 | TYPE_TRUE(0x01) = 0x11, then struct stop 0x00
    const out = new ThriftCompactWriter().bool(1, true).finish()
    expect([...out]).toEqual([0x11, 0x00])
  })

  it('encodes a false bool with the false type code', () => {
    // field id 1 (delta 1) << 4 | TYPE_FALSE(0x02) = 0x12
    const out = new ThriftCompactWriter().bool(1, false).finish()
    expect([...out]).toEqual([0x12, 0x00])
  })

  it('encodes i32 using zigzag varint', () => {
    // field 1 i32(0x05) = 0x15, zigzag(1) = 2
    const out = new ThriftCompactWriter().i32(1, 1).finish()
    expect([...out]).toEqual([0x15, 0x02, 0x00])
  })

  it('encodes negative i32 via zigzag', () => {
    // zigzag(-1) = 1
    const out = new ThriftCompactWriter().i32(1, -1).finish()
    expect([...out]).toEqual([0x15, 0x01, 0x00])
  })

  it('encodes a large positive i32 as an unsigned <=5-byte varint', () => {
    // 0x40000000: zigzag(1073741824) = 2147483648 = 0x80000000 -> varint 80 80 80 80 08
    const out = new ThriftCompactWriter().i32(1, 0x40000000).finish()
    expect([...out]).toEqual([0x15, 0x80, 0x80, 0x80, 0x80, 0x08, 0x00])
  })

  it('encodes INT32_MIN without overflowing into a 64-bit varint', () => {
    // zigzag(-2147483648) = 4294967295 = 0xFFFFFFFF -> varint ff ff ff ff 0f (5 bytes, not 9)
    const out = new ThriftCompactWriter().i32(1, -2147483648).finish()
    expect([...out]).toEqual([0x15, 0xff, 0xff, 0xff, 0xff, 0x0f, 0x00])
  })

  it('encodes binary as length-prefixed utf8', () => {
    // field 1 binary(0x08) = 0x18, length 2, "hi"
    const out = new ThriftCompactWriter().binary(1, 'hi').finish()
    expect([...out]).toEqual([0x18, 0x02, 0x68, 0x69, 0x00])
  })

  it('packs small field-id deltas across multiple fields', () => {
    // field 1 binary = 0x18, then field 3 binary uses delta 2 = 0x28
    const out = new ThriftCompactWriter().binary(1, 'a').binary(3, 'b').finish()
    expect([...out]).toEqual([0x18, 0x01, 0x61, 0x28, 0x01, 0x62, 0x00])
  })

  it('falls back to explicit zigzag id when delta exceeds 15', () => {
    // field 20 binary: delta 20 > 15, so type byte 0x08 then zigzag(20)=40=0x28
    const out = new ThriftCompactWriter().binary(20, 'x').finish()
    expect([...out]).toEqual([0x08, 0x28, 0x01, 0x78, 0x00])
  })

  it('encodes a short i32 list with size packed into the header nibble', () => {
    // field 1 list = 0x19, list header size 2 << 4 | i32(0x05) = 0x25, zigzag(88)=176=0xb0 0x01, zigzag(146)=292=0xa4 0x02
    const out = new ThriftCompactWriter().listOfI32(1, [88, 146]).finish()
    expect([...out]).toEqual([0x19, 0x25, 0xb0, 0x01, 0xa4, 0x02, 0x00])
  })

  it('encodes an empty map as a single zero byte', () => {
    // field 1 map = 0x1b, empty map size 0x00
    const out = new ThriftCompactWriter().mapBinaryBinary(1, {}).finish()
    expect([...out]).toEqual([0x1b, 0x00, 0x00])
  })

  it('encodes a binary->binary map with the key/value type byte', () => {
    // field 1 map = 0x1b, size 1, types (binary<<4|binary)=0x88, key "k", value "v"
    const out = new ThriftCompactWriter().mapBinaryBinary(1, { k: 'v' }).finish()
    expect([...out]).toEqual([0x1b, 0x01, 0x88, 0x01, 0x6b, 0x01, 0x76, 0x00])
  })

  it('resets field-id delta tracking inside nested structs', () => {
    // field 4 struct = 0x4c, inner field 1 binary = 0x18 "a", inner stop 0x00, outer stop 0x00
    const out = new ThriftCompactWriter().structStart(4).binary(1, 'a').structEnd().finish()
    expect([...out]).toEqual([0x4c, 0x18, 0x01, 0x61, 0x00, 0x00])
  })

  it('encodes i64 values larger than 32 bits', () => {
    // field 16 i64: delta 16 > 15 -> type 0x06, zigzag id(16)=32=0x20, then zigzag64(567067343352427)
    const out = new ThriftCompactWriter().i64(16, 567067343352427n).finish()
    expect(out[0]).toBe(0x06)
    expect(out[1]).toBe(0x20)
    expect(out[out.length - 1]).toBe(0x00)
  })
})
