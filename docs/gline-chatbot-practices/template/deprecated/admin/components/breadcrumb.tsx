import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6">
      <Link href="/admin" className="hover:text-gray-700 flex items-center">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {item.href ? (
            <Link href={item.href} className="hover:text-gray-700">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 dark:text-gray-100 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
