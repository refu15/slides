'use client'

import { useMemo, useState } from 'react'
import { diffLines } from 'diff'
import { cn } from '@/lib/utils'

interface Props {
  oldText: string
  newText: string
}

/** Markdown/プレーンテキストの行単位 diff ビューア */
export function DiffViewer({ oldText, newText }: Props) {
  const parts = useMemo(() => diffLines(oldText, newText, { ignoreWhitespace: false }), [oldText, newText])
  const [showUnchanged, setShowUnchanged] = useState(false)

  const totalAdded = parts.filter(p => p.added).reduce((s, p) => s + (p.count ?? 0), 0)
  const totalRemoved = parts.filter(p => p.removed).reduce((s, p) => s + (p.count ?? 0), 0)

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2 text-xs">
        <div className="flex gap-4">
          <span className="text-green-600 dark:text-green-400">+{totalAdded}</span>
          <span className="text-red-600 dark:text-red-400">-{totalRemoved}</span>
        </div>
        <button
          onClick={() => setShowUnchanged((v) => !v)}
          className="text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          {showUnchanged ? '変更行のみ表示' : '全行表示'}
        </button>
      </div>

      <pre className="overflow-x-auto text-xs font-mono leading-relaxed">
        {parts.flatMap((part, i) => {
          if (!part.added && !part.removed && !showUnchanged) {
            const count = part.count ?? 0
            if (count === 0) return []
            return [
              <div
                key={i}
                className="bg-muted/30 px-4 py-1 text-center text-muted-foreground"
              >
                …省略 ({count} 行)…
              </div>,
            ]
          }
          const lines = part.value.split('\n')
          // 最後の空行は表示しない（split 由来）
          if (lines[lines.length - 1] === '') lines.pop()
          return lines.map((line, j) => (
            <div
              key={`${i}-${j}`}
              className={cn(
                'px-4 py-0.5 border-l-2',
                part.added && 'bg-green-50 dark:bg-green-950/40 border-green-500',
                part.removed && 'bg-red-50 dark:bg-red-950/40 border-red-500',
                !part.added && !part.removed && 'border-transparent',
              )}
            >
              <span
                className={cn(
                  'select-none mr-2 text-muted-foreground',
                  part.added && 'text-green-600 dark:text-green-400',
                  part.removed && 'text-red-600 dark:text-red-400',
                )}
              >
                {part.added ? '+' : part.removed ? '-' : ' '}
              </span>
              {line || '\u00a0'}
            </div>
          ))
        })}
      </pre>
    </div>
  )
}
