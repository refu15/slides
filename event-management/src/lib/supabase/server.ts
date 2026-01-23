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
                            // Remove domain to fix Vercel/subdomain issues
                            const { domain, ...rest } = options;
                            cookieStore.set(name, value, rest);
                        })
                    } catch (error) {
                        console.error('Cookie Set Error:', error)
                    }
                },
            },
        }
    )
}
