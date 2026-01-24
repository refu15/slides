'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signInWithGoogle } from '@/lib/auth/google-auth'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

type Status = 'loading' | 'authenticating' | 'success' | 'error'

export default function InvitePage() {
    const params = useParams()
    const token = params?.token as string
    const [status, setStatus] = useState<Status>('loading')
    const [message, setMessage] = useState('')
    const router = useRouter()

    useEffect(() => {
        if (!token) {
            setStatus('error')
            setMessage('無効な招待URLです')
            return
        }

        async function acceptInvite() {
            const supabase = createClient()

            // ログイン確認
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                // 未ログイン → Google認証へ
                setStatus('authenticating')
                setMessage('Googleアカウントで認証してください...')

                // 認証後にこのページに戻るようにする
                const currentUrl = window.location.href
                localStorage.setItem('invite_redirect', currentUrl)

                await signInWithGoogle()
                return
            }

            // トークン検証
            const { data: invite, error: inviteError } = await supabase
                .from('invite_tokens')
                .select('*')
                .eq('token', token)
                .single()

            if (inviteError || !invite) {
                setStatus('error')
                setMessage('招待URLが見つかりません')
                return
            }

            // 有効期限チェック
            if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
                setStatus('error')
                setMessage('この招待URLは有効期限切れです')
                return
            }

            // 使用回数チェック
            if (invite.used_count >= invite.max_uses) {
                setStatus('error')
                setMessage('この招待URLは使用回数の上限に達しています')
                return
            }

            // ロール付与
            const { error: roleError } = await supabase
                .from('event_roles')
                .upsert({
                    event_id: invite.event_id,
                    user_id: user.id,
                    role: invite.role
                }, {
                    onConflict: 'event_id,user_id'
                })

            if (roleError) {
                console.error('Role assignment error:', roleError)
                setStatus('error')
                setMessage('ロールの付与に失敗しました')
                return
            }

            // 使用回数更新
            await supabase
                .from('invite_tokens')
                .update({ used_count: invite.used_count + 1 })
                .eq('id', invite.id)

            setStatus('success')
            setMessage(`${invite.role === 'admin' ? '管理者' : 'スタッフ'}ロールが付与されました`)

            // リダイレクト
            setTimeout(() => {
                if (invite.role === 'staff') {
                    router.push(`/event/${invite.event_id}/portal`)
                } else {
                    router.push(`/${invite.event_id}/admin/dashboard`)
                }
            }, 2000)
        }

        acceptInvite()
    }, [token, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                <div className="text-center space-y-4">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600" />
                            <h2 className="text-xl font-bold">招待を処理中...</h2>
                        </>
                    )}

                    {status === 'authenticating' && (
                        <>
                            <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600" />
                            <h2 className="text-xl font-bold">認証中...</h2>
                            <p className="text-gray-600">{message}</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
                            <h2 className="text-xl font-bold text-green-600">成功!</h2>
                            <p className="text-gray-600">{message}</p>
                            <p className="text-sm text-gray-500">ダッシュボードにリダイレクトしています...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle className="w-12 h-12 mx-auto text-red-600" />
                            <h2 className="text-xl font-bold text-red-600">エラー</h2>
                            <p className="text-gray-600">{message}</p>
                            <button
                                onClick={() => router.push('/')}
                                className="mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
                            >
                                ホームに戻る
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
