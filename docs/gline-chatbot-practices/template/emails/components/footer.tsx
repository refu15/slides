import { Hr, Section, Text, Link } from '@react-email/components'

export function Footer() {
  return (
    <Section style={styles.footer}>
      <Hr style={styles.hr} />
      <Text style={styles.brand}>株式会社 G-LINE</Text>
      <Text style={styles.contact}>
        お問い合わせ：
        <Link href="mailto:info@g-line.co.jp" style={styles.link}>
          info@g-line.co.jp
        </Link>
      </Text>
      <Text style={styles.disclaimer}>
        このメールは AI 採用ボット経由でお送りしています。心当たりがない場合はお手数ですが破棄してください。
      </Text>
    </Section>
  )
}

const styles = {
  footer: { padding: '16px 32px 24px' },
  hr: { border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' },
  brand: { color: '#1a1a2e', fontSize: '13px', fontWeight: 700, margin: '0 0 4px 0' },
  contact: { color: '#4a5568', fontSize: '12px', margin: '0 0 8px 0' },
  link: { color: '#0f3460', textDecoration: 'underline' },
  disclaimer: { color: '#a0aec0', fontSize: '11px', lineHeight: 1.5, margin: 0 },
}
