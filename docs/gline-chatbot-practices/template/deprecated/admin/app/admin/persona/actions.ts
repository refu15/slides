'use server'

import { Octokit } from '@octokit/rest'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getOctokit() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is not set')
  return new Octokit({ auth: token })
}

function parseRepo(): { owner: string; repo: string } {
  const full = process.env.GITHUB_REPO ?? ''
  const [owner, repo] = full.split('/')
  if (!owner || !repo) {
    throw new Error('GITHUB_REPO must be "owner/repo" format')
  }
  return { owner, repo }
}

function getPersonaPath(): string {
  return process.env.PERSONA_PATH ?? 'prompts/sanbo-persona.md'
}

// ------------------------------------------------------------
// Approve: PR を merge（Squash）
// ------------------------------------------------------------
const approveSchema = z.object({
  prNumber: z.number().int().positive(),
})

export async function approvePersona(
  prNumber: number,
): Promise<{ ok: true; sha: string } | { ok: false; error: string }> {
  try {
    const parsed = approveSchema.parse({ prNumber })
    const octokit = getOctokit()
    const { owner, repo } = parseRepo()
    const res = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: parsed.prNumber,
      merge_method: 'squash',
      commit_title: `chore(persona): approve PR #${parsed.prNumber}`,
    })
    revalidatePath('/admin/persona')
    return { ok: true, sha: res.data.sha ?? '' }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ------------------------------------------------------------
// Reject: PR にコメントして close
// ------------------------------------------------------------
const rejectSchema = z.object({
  prNumber: z.number().int().positive(),
  reason: z.string().min(1).max(1000),
})

export async function rejectPersona(
  prNumber: number,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const parsed = rejectSchema.parse({ prNumber, reason })
    const octokit = getOctokit()
    const { owner, repo } = parseRepo()
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: parsed.prNumber,
      body: `❌ **却下**\n\n理由:\n${parsed.reason}\n\n_このフィードバックは次回の persona 分析プロンプトに注入されます。_`,
    })
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: parsed.prNumber,
      state: 'closed',
    })
    revalidatePath('/admin/persona')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ------------------------------------------------------------
// Edit & Commit: 微修正して PR ブランチへ commit
// ------------------------------------------------------------
const editSchema = z.object({
  prNumber: z.number().int().positive(),
  editedContent: z.string().min(1).max(200_000),
})

export async function editAndCommitPersona(
  prNumber: number,
  editedContent: string,
): Promise<{ ok: true; sha: string } | { ok: false; error: string }> {
  try {
    const parsed = editSchema.parse({ prNumber, editedContent })
    const octokit = getOctokit()
    const { owner, repo } = parseRepo()
    const path = getPersonaPath()

    const pr = await octokit.pulls.get({ owner, repo, pull_number: parsed.prNumber })
    const branch = pr.data.head.ref

    // 現在の persona.md の SHA を取得
    const current = await octokit.repos.getContent({ owner, repo, path, ref: branch })
    if (!('sha' in current.data) || Array.isArray(current.data)) {
      throw new Error('persona path did not resolve to a single file')
    }

    // 内容を更新
    const encoded = Buffer.from(parsed.editedContent, 'utf-8').toString('base64')
    const updated = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `chore(persona): manual edit on PR #${parsed.prNumber}`,
      content: encoded,
      sha: current.data.sha,
      branch,
    })
    revalidatePath('/admin/persona')
    return { ok: true, sha: updated.data.commit.sha ?? '' }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ------------------------------------------------------------
// Few-shot 追加: 指定した会話から Q&A を抽出して新規 PR 作成
// ------------------------------------------------------------
const addFewShotSchema = z.object({
  conversationId: z.number().int().positive(),
})

export async function addFewShotFromConversation(
  conversationId: number,
): Promise<{ ok: true; prUrl: string } | { ok: false; error: string }> {
  try {
    const parsed = addFewShotSchema.parse({ conversationId })
    const octokit = getOctokit()
    const { owner, repo } = parseRepo()
    const path = getPersonaPath()

    // 会話データを DB から取得（sql は別途インポート）
    const { sql } = await import('@/lib/db')
    const q = sql()
    const rows = await q<{ content: string; role: string; session_id: string; turn_index: number }[]>`
      SELECT content, role, session_id, turn_index
      FROM conversations
      WHERE session_id = (
        SELECT session_id FROM conversations WHERE id = ${parsed.conversationId}
      )
      ORDER BY turn_index
    `
    if (rows.length === 0) {
      return { ok: false, error: 'conversation not found' }
    }
    // user + assistant ペアを抽出
    const pairs: { q: string; a: string }[] = []
    for (let i = 0; i < rows.length - 1; i++) {
      if (rows[i].role === 'user' && rows[i + 1].role === 'assistant') {
        pairs.push({ q: rows[i].content, a: rows[i + 1].content })
      }
    }
    if (pairs.length === 0) {
      return { ok: false, error: 'no user/assistant pair found' }
    }

    // 新規ブランチ作成
    const mainRef = await octokit.git.getRef({ owner, repo, ref: 'heads/main' })
    const newBranch = `auto/few-shot-${Date.now()}`
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha: mainRef.data.object.sha,
    })

    // 現在のファイル取得 → Few-shot セクションに追記
    const current = await octokit.repos.getContent({ owner, repo, path, ref: newBranch })
    if (!('content' in current.data) || Array.isArray(current.data)) {
      throw new Error('persona path did not resolve to a single file')
    }
    const decoded = Buffer.from(current.data.content, 'base64').toString('utf-8')

    const addition = pairs.map(p => `\nQ: ${p.q}\nA: ${p.a}`).join('\n')
    const updated = decoded + `\n\n<!-- few-shot added from conversation #${parsed.conversationId} -->\n${addition}\n`

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `chore(persona): add few-shot from conversation #${parsed.conversationId}`,
      content: Buffer.from(updated, 'utf-8').toString('base64'),
      sha: current.data.sha,
      branch: newBranch,
    })

    // PR 作成
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: `🤖 few-shot 追加（会話 #${parsed.conversationId}）`,
      head: newBranch,
      base: 'main',
      body: `管理画面から追加された Few-shot 例です。\n\n元会話 ID: #${parsed.conversationId}\n追加組数: ${pairs.length}`,
    })
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: pr.data.number,
      labels: ['persona', 'few-shot', 'auto-generated'],
    })
    revalidatePath('/admin/persona')
    return { ok: true, prUrl: pr.data.html_url }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
