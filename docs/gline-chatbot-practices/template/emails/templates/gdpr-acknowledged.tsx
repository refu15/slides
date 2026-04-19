import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components'
import { Header } from '../components/header'
import { Footer } from '../components/footer'

export interface GdprAcknowledgedProps {
  requestId: string
  deletedAt: string
}

export default function GdprAcknowledged({ requestId, deletedAt }: GdprAcknowledgedProps) {
  return (
    <Html>
      <Head />
      <Preview>個人情報削除のご依頼を承りました - G-LINE</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Header title="個人情報削除のご依頼を承りました" />
          <Section style={styles.content}>
            <Text style={styles.paragraph}>
              個人情報削除のご依頼をお受けしました。下記の内容で処理いたします。
            </Text>
            <Section style={styles.card}>
              <Text style={styles.label}>受付番号</Text>
              <Text style={styles.mono}>{requestId}</Text>
              <Text style={styles.label}>処理完了予定</Text>
              <Text style={styles.value}>{deletedAt}（30日以内）</Text>
            </Section>
            <Text style={styles.paragraph}>
              受付後すぐにアカウントを凍結し、30日の保護期間を経て完全削除いたします。
              バックアップを含むすべてのシステムから削除されます。
            </Text>
            <Text style={styles.paragraph}>
              お問い合わせは info@g-line.co.jp までお願いいたします。
            </Text>
          </Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  )
}

GdprAcknowledged.PreviewProps = {
  requestId: 'GDPR-20260419-0001',
  deletedAt: '2026-05-19',
} satisfies GdprAcknowledgedProps

const styles = {
  body: { background: '#f8f9fa', fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", margin: 0 },
  container: { maxWidth: '560px', margin: '24px auto', background: '#ffffff', borderRadius: '8px', overflow: 'hidden' },
  content: { padding: '24px 32px' },
  paragraph: { fontSize: '14px', lineHeight: 1.8, color: '#2d3748', margin: '0 0 16px 0' },
  card: { background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', margin: '16px 0' },
  label: { fontSize: '11px', color: '#718096', fontWeight: 700, margin: '0 0 4px 0' },
  value: { fontSize: '14px', color: '#1a1a2e', margin: '0 0 12px 0' },
  mono: { fontFamily: 'Consolas, Menlo, monospace', fontSize: '13px', color: '#0f3460', margin: '0 0 12px 0' },
}
