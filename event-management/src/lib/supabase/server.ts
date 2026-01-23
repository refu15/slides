import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            // Force strict settings for cross-site usage
                            const cookieOptions = {
                                ...options,
                                sameSite: 'none' as const,
                                secure: true,
                            };
                            // Remove domain just in case
                            delete cookieOptions.domain;

                            cookieStore.set(name, value, cookieOptions);
                        })
                    } catch (error) {
                        console.error('Cookie Set Error:', error)
                    }
                },
            },
        }
    )
}
