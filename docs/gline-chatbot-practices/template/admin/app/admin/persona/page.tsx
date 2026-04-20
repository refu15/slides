import { Octokit } from '@octokit/rest'
import { Breadcrumb } from '@/components/breadcrumb'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DiffViewer } from './diff-viewer'
import { PersonaActionsUI } from './persona-actions-ui'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PullRequestInfo {
  number: number
  title: string
  html_url: string
  created_at: string
  labels: string[]
  current: string
  proposed: string
}

async function loadPRs(): Promise<{ current: string; prs: PullRequestInfo[]; error?: string }> {
  const token = process.env.GITHUB_TOKEN
  const repoEnv = process.env.GITHUB_REPO
  const path = process.env.PERSONA_PATH ?? 'prompts/sanbo-persona.md'

  if (!token || !repoEnv) {
    return {
      current: '',
      prs: [],
      error: 'GITHUB_TOKEN / GITHUB_REPO が設定されていません（.env.local を確認）',
    }
  }

  try {
    const [owner, repo] = repoEnv.split('/')
    const octokit = new Octokit({ auth: token })

    // 現在の persona.md（main ブランチ）
    const mainContent = await octokit.repos.getContent({ owner, repo, path, ref: 'main' })
    let current = ''
    if (!Array.isArray(mainContent.data) && 'content' in mainContent.data) {
      current = Buffer.from(mainContent.data.content, 'base64').toString('utf-8')
    }

    // persona ラベルの open PR 一覧
    const pulls = await octokit.pulls.list({
      owner,
      repo,
      state: 'open',
      sort: 'created',
      direction: 'desc',
      per_page: 20,
    })
    const personaPRs = pulls.data.filter(p =>
      p.labels.some(l => l.name === 'persona'),
    )

    const prs: PullRequestInfo[] = []
    for (const pr of personaPRs) {
      let proposed = ''
      try {
        const branchContent = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: pr.head.ref,
        })
        if (!Array.isArray(branchContent.data) && 'content' in branchContent.data) {
          proposed = Buffer.from(branchContent.data.content, 'base64').toString('utf-8')
        }
      } catch {
        proposed = '(取得失敗)'
      }
      prs.push({
        number: pr.number,
        title: pr.title,
        html_url: pr.html_url,
        created_at: pr.created_at,
        labels: pr.labels.map(l => l.name ?? ''),
        current,
        proposed,
      })
    }

    return { current, prs }
  } catch (e) {
    return {
      current: '',
      prs: [],
      error: `GitHub API エラー: ${(e as Error).message}`,
    }
  }
}

export default async function PersonaPage() {
  const { current, prs, error } = await loadPRs()

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'ダッシュボード', href: '/admin' }, { label: 'ペルソナ管理' }]} />

      <div>
        <h1 className="text-2xl font-bold">ペルソナ管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          代表の分身としての応答スタイルを管理します。自動分析が提案する改訂を確認・承認できます。
        </p>
      </div>

      {error && (
        <Card className="border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          ⚠️ {error}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* 左: 現在のペルソナ */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">現在のペルソナ</h2>
            <Badge variant="outline" className="text-xs">main</Badge>
          </div>
          <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-xs leading-relaxed">
            {current || '(読み込めませんでした)'}
          </pre>
        </Card>

        {/* 右: 改訂案 PR */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              改訂案 PR（{prs.length} 件）
            </h2>
          </div>

          {prs.length === 0 && !error && (
            <Card className="p-6 text-sm text-muted-foreground">
              現在、レビュー待ちの改訂案はありません。
              <br />
              <code className="mt-2 block rounded bg-muted/50 p-2 text-xs">
                rag_sources/ にテキストを追加して push すると、自動で PR が作成されます
              </code>
            </Card>
          )}

          {prs.map((pr) => (
            <Card key={pr.number} className="p-6">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">#{pr.number} {pr.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {pr.labels.map(l => (
                      <Badge key={l} variant="outline" className="text-xs">
                        {l}
                      </Badge>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(pr.created_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <DiffViewer oldText={pr.current} newText={pr.proposed} />
              </div>

              <PersonaActionsUI
                prNumber={pr.number}
                currentContent={pr.current}
                proposedContent={pr.proposed}
                prHtmlUrl={pr.html_url}
              />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
