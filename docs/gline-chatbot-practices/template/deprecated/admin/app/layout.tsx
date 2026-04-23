import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

export const metadata: Metadata = {
  title: 'G-LINE 管理画面',
  description: 'G-LINE 採用チャットボット 管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
