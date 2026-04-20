import { describe, it, expect, beforeAll } from 'vitest'
import { anonymize, hashSessionId } from '../lib/logger.ts'

beforeAll(() => {
  process.env.SESSION_SALT = 'test-salt-12345'
})

describe('anonymize', () => {
  it('masks email addresses', () => {
    expect(anonymize('test@example.com に連絡'))
      .toBe('[EMAIL] に連絡')
    expect(anonymize('foo.bar+tag@sub.example.co.jp'))
      .toBe('[EMAIL]')
    // 短い TLD もマスク
    expect(anonymize('a@b.cd')).toBe('[EMAIL]')
  })

  it('masks Japanese phone numbers', () => {
    expect(anonymize('私の電話は 090-1234-5678 です'))
      .toBe('私の電話は [PHONE] です')
    expect(anonymize('03-1234-5678'))
      .toBe('[PHONE]')
    expect(anonymize('+81-90-1234-5678'))
      .toBe('[PHONE]')
  })

  it('masks credit card numbers with spaces or dashes', () => {
    expect(anonymize('1234-5678-9012-3456')).toBe('[CARD]')
    expect(anonymize('1234 5678 9012 3456')).toBe('[CARD]')
    expect(anonymize('1234567890123456')).toBe('[CARD]')
  })

  it('masks postal codes', () => {
    expect(anonymize('〒100-0001 東京都'))
      .toContain('[POSTAL]')
  })

  it('preserves non-PII text', () => {
    expect(anonymize('御社の事業内容を教えて'))
      .toBe('御社の事業内容を教えて')
  })

  it('handles empty string', () => {
    expect(anonymize('')).toBe('')
  })

  it('masks multiple PII patterns in one message', () => {
    const result = anonymize('name@example.com / 090-1111-2222')
    expect(result).toContain('[EMAIL]')
    expect(result).toContain('[PHONE]')
  })
})

describe('hashSessionId', () => {
  it('produces 64-char hex SHA-256 hash', async () => {
    const h = await hashSessionId('test-session-id', 'test-salt-12345')
    expect(h).toHaveLength(64)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for same input+salt', async () => {
    const h1 = await hashSessionId('abc', 'test-salt-12345')
    const h2 = await hashSessionId('abc', 'test-salt-12345')
    expect(h1).toBe(h2)
  })

  it('produces different hashes for different salts', async () => {
    const h1 = await hashSessionId('abc', 'salt-one-xxx')
    const h2 = await hashSessionId('abc', 'salt-two-yyy')
    expect(h1).not.toBe(h2)
  })

  it('rejects missing salt', async () => {
    const orig = process.env.SESSION_SALT
    delete process.env.SESSION_SALT
    await expect(hashSessionId('abc')).rejects.toThrow('SESSION_SALT')
    process.env.SESSION_SALT = orig
  })

  it('rejects too-short salt', async () => {
    await expect(hashSessionId('abc', 'short')).rejects.toThrow('too short')
  })

  it('raw session id cannot be recovered from hash', async () => {
    const h = await hashSessionId('original-session', 'test-salt-12345')
    expect(h).not.toContain('original')
    expect(h).not.toContain('session')
  })
})
