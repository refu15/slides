import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components'
import { Header } from '../components/header'
import { Footer } from '../components/footer'

export interface ApplyNotifyAdminProps {
  name: string
  email: string
  phone?: string
  preferredDate?: string
  notes?: string
}

export default function ApplyNotifyAdmin({
  name, email, phone, preferredDate, notes,
}: ApplyNotifyAdminProps) {
  return (
    <Html>
      <Head />
      <Preview>【新規応募】{name} 様</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Header title="新規応募がありました" />
          <Section style={styles.content}>
            <Text style={styles.paragraph}>
              採用ボット経由で新しい応募が届きました。管理画面でご確認ください。
            </Text>
            <Section style={styles.card}>
              <Row label="氏名" value={name} />
              <Row label="メール" value={email} />
              <Row label="電話" value={phone ?? '-'} />
              <Row label="希望日時" value={preferredDate ?? '-'} />
              {notes && <Row label="相談内容" value={notes} multiline />}
            </Section>
            <Text style={styles.footnote}>
              ※ 個人情報は AES-256 暗号化で保管されています。閲覧は管理画面からのみ行ってください。
            </Text>
          </Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  )
}

ApplyNotifyAdmin.PreviewProps = {
  name: '山田 太郎',
  email: 'yamada@example.com',
  phone: '090-1234-5678',
  preferredDate: '2026-05-10 14:00',
  notes: 'ホームページを見て興味を持ちました。現場の雰囲気を知りたいです。',
} satisfies ApplyNotifyAdminProps

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <Section style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={multiline ? styles.valueMultiline : styles.value}>{value}</Text>
    </Section>
  )
}

const styles = {
  body: { background: '#f8f9fa', fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", margin: 0 },
  container: { maxWidth: '560px', margin: '24px auto', background: '#ffffff', borderRadius: '8px', overflow: 'hidden' },
  content: { padding: '24px 32px' },
  paragraph: { fontSize: '14px', lineHeight: 1.8, color: '#2d3748', margin: '0 0 16px 0' },
  card: { background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', margin: '8px 0 16px 0' },
  row: { marginBottom: '8px' },
  label: { fontSize: '11px', color: '#718096', margin: '0 0 2px 0', fontWeight: 700 },
  value: { fontSize: '14px', color: '#1a1a2e', margin: 0 },
  valueMultiline: { fontSize: '13px', color: '#1a1a2e', margin: 0, whiteSpace: 'pre-wrap' as const, lineHeight: 1.6 },
  footnote: { fontSize: '11px', color: '#718096', margin: '16px 0 0 0', lineHeight: 1.5 },
}
