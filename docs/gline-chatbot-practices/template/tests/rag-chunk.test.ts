import { describe, it, expect } from 'vitest'
import { chunk } from '../lib/rag.ts'

describe('rag.chunk', () => {
  it('returns empty array for empty string', () => {
    expect(chunk('')).toEqual([])
  })

  it('returns single chunk for short text', () => {
    const text = 'short text'
    expect(chunk(text, 100, 10)).toEqual(['short text'])
  })

  it('splits long text with overlap', () => {
    const text = 'a'.repeat(200)
    const out = chunk(text, 80, 10)
    expect(out.length).toBeGreaterThan(1)
    // Each chunk should be at most 80 chars
    for (const c of out) expect(c.length).toBeLessThanOrEqual(80)
  })

  it('preserves total content (union covers original)', () => {
    const text = Array.from({ length: 500 }, (_, i) => String.fromCharCode(65 + (i % 26))).join('')
    const out = chunk(text, 100, 20)
    // First chunk should start with the beginning
    expect(text.startsWith(out[0])).toBe(true)
    // Last chunk should end with the text end
    expect(text.endsWith(out[out.length - 1])).toBe(true)
  })

  it('throws on invalid maxChars', () => {
    expect(() => chunk('abc', 0)).toThrow()
    expect(() => chunk('abc', -1)).toThrow()
  })

  it('throws on invalid overlap', () => {
    expect(() => chunk('abc', 10, -1)).toThrow()
    expect(() => chunk('abc', 10, 10)).toThrow()
    expect(() => chunk('abc', 10, 100)).toThrow()
  })

  it('does not produce infinite loop with large overlap', () => {
    // maxChars=20, overlapChars=19 → step=1, must terminate
    const text = 'a'.repeat(100)
    const out = chunk(text, 20, 19)
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThan(200) // sanity
  })

  it('last chunk may be shorter than maxChars', () => {
    const text = 'a'.repeat(150)
    const out = chunk(text, 100, 10)
    expect(out.length).toBe(2)
    // first = 100, step = 90, second starts at 90, length 60
    expect(out[1].length).toBe(60)
  })
})
