import { describe, expect, it } from 'bun:test'

import { detectImageDimensions } from './image-meta'

function buildPng(width: number, height: number, opts?: { skipTrailingMagic?: boolean }): Uint8Array {
  const buf = new Uint8Array(24)
  const sig = opts?.skipTrailingMagic
    ? [0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00]
    : [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  buf.set(sig, 0)
  const view = new DataView(buf.buffer)
  view.setUint32(16, width, false)
  view.setUint32(20, height, false)
  return buf
}

function buildGif(version: '87a' | '89a' | 'XXa', width: number, height: number): Uint8Array {
  const buf = new Uint8Array(10)
  buf.set([0x47, 0x49, 0x46], 0)
  if (version === '87a') buf.set([0x38, 0x37, 0x61], 3)
  else if (version === '89a') buf.set([0x38, 0x39, 0x61], 3)
  else buf.set([0x00, 0x00, 0x00], 3)
  const view = new DataView(buf.buffer)
  view.setUint16(6, width, true)
  view.setUint16(8, height, true)
  return buf
}

function buildJpeg(opts: {
  width: number
  height: number
  prefixFillBytes?: number
  includeStandaloneMarkers?: boolean
}): Uint8Array {
  const parts: number[] = [0xff, 0xd8]
  if (opts.includeStandaloneMarkers) {
    parts.push(0xff, 0xd0, 0xff, 0xd9)
  }
  for (let i = 0; i < (opts.prefixFillBytes ?? 0); i++) parts.push(0xff)
  parts.push(0xff, 0xc0)
  parts.push(0x00, 0x11)
  parts.push(0x08)
  parts.push((opts.height >> 8) & 0xff, opts.height & 0xff)
  parts.push((opts.width >> 8) & 0xff, opts.width & 0xff)
  for (let i = 0; i < 10; i++) parts.push(0x00)
  return new Uint8Array(parts)
}

describe('detectImageDimensions', () => {
  it('reads PNG dimensions when the full 8-byte signature is present', () => {
    const dim = detectImageDimensions(buildPng(320, 240))
    expect(dim).toEqual({ width: 320, height: 240, mimeType: 'image/png' })
  })

  it('rejects PNG-look-alikes that share only the first 4 bytes', () => {
    expect(() => detectImageDimensions(buildPng(1, 1, { skipTrailingMagic: true }))).toThrow(/Unsupported/)
  })

  it('reads GIF87a and GIF89a dimensions', () => {
    expect(detectImageDimensions(buildGif('87a', 100, 200))).toEqual({
      width: 100,
      height: 200,
      mimeType: 'image/gif',
    })
    expect(detectImageDimensions(buildGif('89a', 64, 32))).toEqual({
      width: 64,
      height: 32,
      mimeType: 'image/gif',
    })
  })

  it('rejects GIF-look-alikes with the wrong version bytes', () => {
    expect(() => detectImageDimensions(buildGif('XXa', 100, 200))).toThrow(/Unsupported/)
  })

  it('reads JPEG dimensions from a plain SOF0 marker', () => {
    const dim = detectImageDimensions(buildJpeg({ width: 800, height: 600 }))
    expect(dim).toEqual({ width: 800, height: 600, mimeType: 'image/jpeg' })
  })

  it('reads JPEG dimensions when 0xFF fill bytes precede the SOF marker', () => {
    const dim = detectImageDimensions(buildJpeg({ width: 1280, height: 720, prefixFillBytes: 5 }))
    expect(dim).toEqual({ width: 1280, height: 720, mimeType: 'image/jpeg' })
  })

  it('reads JPEG dimensions past standalone markers (RST/SOI/EOI) without desyncing', () => {
    const dim = detectImageDimensions(buildJpeg({ width: 42, height: 99, includeStandaloneMarkers: true }))
    expect(dim).toEqual({ width: 42, height: 99, mimeType: 'image/jpeg' })
  })
})
