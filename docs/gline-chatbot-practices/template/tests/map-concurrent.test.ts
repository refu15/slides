import { describe, it, expect } from 'vitest'
import { mapConcurrent } from '../lib/rag.ts'

describe('mapConcurrent', () => {
  it('processes all items with concurrency 1 (serial)', async () => {
    const input = [1, 2, 3, 4, 5]
    const results = await mapConcurrent(input, 1, async (n) => n * 2)
    expect(results).toHaveLength(5)
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true)
    expect(results.map((r) => (r.status === 'fulfilled' ? r.value : null)))
      .toEqual([2, 4, 6, 8, 10])
  })

  it('preserves order with concurrency > 1', async () => {
    const input = [50, 10, 30, 20, 40]
    const results = await mapConcurrent(input, 3, async (n) => {
      await new Promise((r) => setTimeout(r, n))
      return n
    })
    expect(results.map((r) => (r.status === 'fulfilled' ? r.value : null)))
      .toEqual([50, 10, 30, 20, 40])
  })

  it('isolates failures (one throws, others succeed)', async () => {
    const input = [1, 2, 3, 4]
    const results = await mapConcurrent(input, 2, async (n) => {
      if (n === 2) throw new Error('boom')
      return n * 10
    })
    expect(results).toHaveLength(4)
    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('rejected')
    expect(results[2].status).toBe('fulfilled')
    expect(results[3].status).toBe('fulfilled')
    if (results[1].status === 'rejected') {
      expect((results[1].reason as Error).message).toBe('boom')
    }
  })

  it('returns empty array for empty input', async () => {
    const results = await mapConcurrent<number, number>([], 5, async (n) => n)
    expect(results).toEqual([])
  })

  it('throttles to declared concurrency', async () => {
    let active = 0
    let peak = 0
    const input = Array.from({ length: 20 }, (_, i) => i)
    await mapConcurrent(input, 4, async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise((r) => setTimeout(r, 10))
      active--
    })
    expect(peak).toBeLessThanOrEqual(4)
    expect(peak).toBeGreaterThanOrEqual(2)
  })

  it('rejects invalid concurrency', async () => {
    await expect(mapConcurrent([1], 0, async (n) => n)).rejects.toThrow('concurrency')
    await expect(mapConcurrent([1], -1, async (n) => n)).rejects.toThrow('concurrency')
  })

  it('parallel is faster than serial for async delays', async () => {
    const input = Array.from({ length: 10 }, () => 0)
    const delay = 30

    const serialStart = Date.now()
    await mapConcurrent(input, 1, async () => {
      await new Promise((r) => setTimeout(r, delay))
    })
    const serialElapsed = Date.now() - serialStart

    const parallelStart = Date.now()
    await mapConcurrent(input, 5, async () => {
      await new Promise((r) => setTimeout(r, delay))
    })
    const parallelElapsed = Date.now() - parallelStart

    // 並列は約5倍速いはず（安全マージンで2倍以上）
    expect(parallelElapsed).toBeLessThan(serialElapsed / 2)
  })
})
