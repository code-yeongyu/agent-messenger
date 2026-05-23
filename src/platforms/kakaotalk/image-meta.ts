export interface ImageDimensions {
  width: number
  height: number
  mimeType: string
}

// Extracts width/height/mime by reading the file's magic bytes and headers
// directly. Avoids pulling in `image-size` or `sharp` so the SDK stays
// dependency-light. Supports JPEG, PNG, GIF, WebP — the formats KakaoTalk
// actually renders inline. Throws for anything else (including truncated
// headers whose magic matches but whose length is short of the dimension
// fields, to avoid an unhandled DataView RangeError); the caller should fall
// back to `sendFile` (type=18) for unknown types.
export function detectImageDimensions(buffer: Uint8Array): ImageDimensions {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  if (isPng(buffer)) {
    if (buffer.length < 24) {
      throw new Error('Truncated PNG: header is shorter than 24 bytes')
    }
    return {
      width: view.getUint32(16, false),
      height: view.getUint32(20, false),
      mimeType: 'image/png',
    }
  }

  if (isJpeg(buffer)) {
    const dim = readJpegDimensions(buffer)
    return { ...dim, mimeType: 'image/jpeg' }
  }

  if (isGif(buffer)) {
    if (buffer.length < 10) {
      throw new Error('Truncated GIF: header is shorter than 10 bytes')
    }
    return {
      width: view.getUint16(6, true),
      height: view.getUint16(8, true),
      mimeType: 'image/gif',
    }
  }

  if (isWebp(buffer)) {
    if (buffer.length < 16) {
      throw new Error('Truncated WebP: header is shorter than 16 bytes')
    }
    return { ...readWebpDimensions(buffer), mimeType: 'image/webp' }
  }

  throw new Error('Unsupported image format (expected JPEG, PNG, GIF, or WebP)')
}

// Full PNG signature: 89 50 4E 47 0D 0A 1A 0A — checking only the first 4 bytes
// would let a file that happens to start with "\x89PNG" but isn't really a PNG
// reach the dimension reader and either crash or return garbage. The trailing
// CRLF/EOF/LF bytes pin it to a real PNG header.
function isPng(b: Uint8Array): boolean {
  return (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  )
}

function isJpeg(b: Uint8Array): boolean {
  return b[0] === 0xff && b[1] === 0xd8
}

// GIF signature is "GIF87a" or "GIF89a". Checking only "GIF" would match any
// payload that starts with those three bytes (other Compuserve formats, etc.).
function isGif(b: Uint8Array): boolean {
  return (
    b[0] === 0x47 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x38 &&
    (b[4] === 0x37 || b[4] === 0x39) &&
    b[5] === 0x61
  )
}

function isWebp(b: Uint8Array): boolean {
  return (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
}

// JPEG dimensions live in an SOF (Start Of Frame) marker (0xFFC0..0xFFCF except
// 0xFFC4, 0xFFC8, 0xFFCC which are not SOF). We scan markers until we hit one.
//
// The scan has to handle two JPEG quirks (ITU-T T.81 §B.1):
//   1. Fill bytes — any number of 0xFF bytes may precede a marker, so on a
//      0xFF byte we look at the next byte for the actual marker code and skip
//      forward by 1 if it's another 0xFF (without trying to read a length).
//   2. Standalone markers — SOI/EOI/RST0-7/TEM (0xFFD0..0xFFD9, 0xFF01) have
//      no length field, so we step past them with a fixed +2 instead of
//      reading garbage as a segment length.
// Treating either case as a length-prefixed segment desynchronizes the scan
// and either skips past the SOF or runs off the end of the buffer.
function readJpegDimensions(buffer: Uint8Array): { width: number; height: number } {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  let i = 2
  while (i < buffer.length - 9) {
    if (buffer[i] !== 0xff) {
      i++
      continue
    }
    const marker = buffer[i + 1] ?? 0
    if (marker === 0xff) {
      i++
      continue
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = view.getUint16(i + 5, false)
      const width = view.getUint16(i + 7, false)
      return { width, height }
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2
      continue
    }
    const segmentLength = view.getUint16(i + 2, false)
    i += 2 + segmentLength
  }
  throw new Error('JPEG SOF marker not found')
}

// WebP supports several variants: VP8 (lossy), VP8L (lossless), VP8X (extended).
// Dimensions live at different offsets per variant; we cover all three.
function readWebpDimensions(buffer: Uint8Array): { width: number; height: number } {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const fourCC = String.fromCharCode(buffer[12]!, buffer[13]!, buffer[14]!, buffer[15]!)

  if (fourCC === 'VP8 ') {
    if (buffer.length < 30) {
      throw new Error('Truncated WebP VP8: header is shorter than 30 bytes')
    }
    const width = view.getUint16(26, true) & 0x3fff
    const height = view.getUint16(28, true) & 0x3fff
    return { width, height }
  }
  if (fourCC === 'VP8L') {
    if (buffer.length < 25) {
      throw new Error('Truncated WebP VP8L: header is shorter than 25 bytes')
    }
    const b0 = buffer[21]!
    const b1 = buffer[22]!
    const b2 = buffer[23]!
    const b3 = buffer[24]!
    const width = 1 + (((b1 & 0x3f) << 8) | b0)
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
    return { width, height }
  }
  if (fourCC === 'VP8X') {
    if (buffer.length < 31) {
      throw new Error('Truncated WebP VP8X: header is shorter than 31 bytes')
    }
    const width = 1 + (view.getUint32(24, true) & 0xffffff)
    const height = 1 + (view.getUint32(27, true) & 0xffffff)
    return { width, height }
  }
  throw new Error(`Unsupported WebP variant: ${fourCC}`)
}
