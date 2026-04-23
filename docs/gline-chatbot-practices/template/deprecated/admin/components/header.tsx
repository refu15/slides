import { headers } from 'next/headers'

export async function Header() {
  const headersList = await headers()
  const userEmail = headersList.get('cf-access-authenticated-user-email') ?? 'admin@example.com'

  return (
    <header className="h-14 border-b bg-white dark:bg-gray-900 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">G-LINE 採用チャットボット</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">{userEmail}</span>
        <div className="h-8 w-8 rounded-full bg-[#0f3460] flex items-center justify-center text-white text-xs font-bold">
          {userEmail[0]?.toUpperCase() ?? 'A'}
        </div>
      </div>
    </header>
  )
}
