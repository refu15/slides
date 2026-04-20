'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  AlertTriangle,
  HelpCircle,
  Trash2,
  FlaskConical,
  BookOpen,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard, exact: true },
  { href: '/admin/faq', label: 'FAQ管理', icon: HelpCircle },
  { href: '/admin/conversations', label: '会話ログ', icon: MessageSquare },
  { href: '/admin/applicants', label: '応募者一覧', icon: Users },
  { href: '/admin/appointments', label: '面接予約', icon: Calendar },
  { href: '/admin/escalations', label: 'エスカレーション', icon: AlertTriangle },
  { href: '/admin/gdpr', label: 'GDPR削除', icon: Trash2 },
  { href: '/admin/models', label: 'モデル管理', icon: FlaskConical },
  { href: '/admin/persona', label: 'ペルソナ管理', icon: BookOpen },
  { href: '/admin/audit', label: '監査ログ', icon: ShieldCheck },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-[#0f3460] text-white flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold">G-LINE 管理画面</h1>
        <p className="text-xs text-white/60 mt-1">採用チャットボット</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
