'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, getCurrentUser } from '@/lib/auth/google-auth'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [loading, setLoading] = useState(true)
    const [signingIn, setSigningIn] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // 既にログイン済みかチェック
        async function checkAuth() {
            const user = await getCurrentUser()
            if (user) {
                // 招待URLからのリダイレクトがあるか確認
                const inviteRedirect = localStorage.getItem('invite_redirect')
                if (inviteRedirect) {
                    localStorage.removeItem('invite_redirect')
                    window.location.href = inviteRedirect
                    return
                }
                router.push('/dashboard')
            }
            setLoading(false)
        }
        checkAuth()
    }, [router])

    const handleGoogleSignIn = async () => {
        setSigningIn(true)
        try {
            await signInWithGoogle()
        } catch (error) {
            console.error('Sign in error:', error)
            setSigningIn(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-md w-full bg-white shadow-2xl rounded-2xl p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black uppercase tracking-tight">
                        Event Management
                    </h1>
                    <p className="text-gray-500">イベント管理システム</p>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={handleGoogleSignIn}
                        disabled={signingIn}
                        className="w-full h-12 bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-300 rounded-lg font-semibold flex items-center justify-center gap-3"
                    >
                        {signingIn ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Googleでログイン
                            </>
                        )}
                    </Button>

                    <p className="text-xs text-center text-gray-500">
                        ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
                    </p>
                </div>
            </div>
        </div>
    )
}
