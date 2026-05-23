import { describe, expect, it } from 'bun:test'

import { planAttachments, resolveAttachment } from './attachment-router'

const bytes = new Uint8Array([0])

describe('resolveAttachment', () => {
  it('classifies image MIME as photo', () => {
    expect(resolveAttachment({ data: bytes, filename: 'x.jpg' }).kind).toBe('photo')
    expect(resolveAttachment({ data: bytes, filename: 'x.png', mime: 'image/png' }).kind).toBe('photo')
  })

  it('classifies video MIME as video', () => {
    expect(resolveAttachment({ data: bytes, filename: 'x.mp4' }).kind).toBe('video')
  })

  it('classifies audio MIME as audio', () => {
    expect(resolveAttachment({ data: bytes, filename: 'x.m4a' }).kind).toBe('audio')
  })

  it('classifies everything else as file', () => {
    expect(resolveAttachment({ data: bytes, filename: 'x.pdf' }).kind).toBe('file')
    expect(resolveAttachment({ data: bytes, filename: 'x.zip' }).kind).toBe('file')
    expect(resolveAttachment({ data: bytes, filename: 'x.unknown-ext' }).kind).toBe('file')
  })

  it('uses explicit mime override over filename inference', () => {
    const r = resolveAttachment({ data: bytes, filename: 'x.pdf', mime: 'image/png' })
    expect(r.kind).toBe('photo')
    expect(r.mime).toBe('image/png')
  })

  it('routes upper-case and mixed-case MIME overrides the same as lower-case', () => {
    expect(resolveAttachment({ data: bytes, filename: 'x.bin', mime: 'IMAGE/JPEG' }).kind).toBe('photo')
    expect(resolveAttachment({ data: bytes, filename: 'x.bin', mime: 'Video/MP4' }).kind).toBe('video')
    expect(resolveAttachment({ data: bytes, filename: 'x.bin', mime: 'Audio/MPEG' }).kind).toBe('audio')
    expect(resolveAttachment({ data: bytes, filename: 'x.bin', mime: 'IMAGE/PNG' }).mime).toBe('image/png')
  })

  it('preserves data and filename verbatim', () => {
    const r = resolveAttachment({ data: bytes, filename: 'cat picture.jpg' })
    expect(r.data).toBe(bytes)
    expect(r.filename).toBe('cat picture.jpg')
  })
})

describe('planAttachments', () => {
  it('throws on empty array', () => {
    expect(() => planAttachments([])).toThrow(/empty/i)
  })

  it('returns single for a one-element array', () => {
    const plan = planAttachments([{ data: bytes, filename: 'x.jpg' }])
    expect(plan.kind).toBe('single')
    if (plan.kind !== 'single') return
    expect(plan.resolved.kind).toBe('photo')
  })

  it('returns single (not multiphoto) for a one-photo array', () => {
    const plan = planAttachments([{ data: bytes, filename: 'a.png' }])
    expect(plan.kind).toBe('single')
  })

  it('returns multiphoto when every item resolves to photo', () => {
    const plan = planAttachments([
      { data: bytes, filename: 'a.jpg' },
      { data: bytes, filename: 'b.png' },
      { data: bytes, filename: 'c.webp' },
    ])
    expect(plan.kind).toBe('multiphoto')
    if (plan.kind !== 'multiphoto') return
    expect(plan.items.length).toBe(3)
  })

  it('returns sequential for mixed kinds (image + file)', () => {
    const plan = planAttachments([
      { data: bytes, filename: 'photo.jpg' },
      { data: bytes, filename: 'spec.pdf' },
    ])
    expect(plan.kind).toBe('sequential')
    if (plan.kind !== 'sequential') return
    expect(plan.resolved.map((r) => r.kind)).toEqual(['photo', 'file'])
  })

  it('returns sequential for all-video (multiphoto is image-only)', () => {
    const plan = planAttachments([
      { data: bytes, filename: 'a.mp4' },
      { data: bytes, filename: 'b.mp4' },
    ])
    expect(plan.kind).toBe('sequential')
    if (plan.kind !== 'sequential') return
    expect(plan.resolved.every((r) => r.kind === 'video')).toBe(true)
  })

  it('honors explicit mime overrides when classifying for the photo gate', () => {
    const plan = planAttachments([
      { data: bytes, filename: 'a.pdf', mime: 'image/jpeg' },
      { data: bytes, filename: 'b.bin', mime: 'image/png' },
    ])
    expect(plan.kind).toBe('multiphoto')
  })
})
