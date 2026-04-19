import { Body, Container, Head, Html, Link, Preview, Section, Text } from '@react-email/components'
import { Header } from '../components/header'
import { Footer } from '../components/footer'

export interface ReminderD1Props {
  name: string
  scheduledAt: string
  location: string
  mapUrl?: string
}

export default function ReminderD1({
  name, scheduledAt, location, mapUrl,
}: ReminderD1Props) {
  return (
    <Html>
      <Head />
      <Preview>明日お会いできるのを楽しみにしています - G-LINE</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Header title="明日の面接についてのご連絡" />
          <Section style={styles.content}>
            <Text style={styles.greeting}>{name} 様</Text>
            <Text style={styles.paragraph}>
              明日の面接についてのリマインダーです。お会いできるのを楽しみにしています。
            </Text>
            <Section style={styles.card}>
              <Text style={styles.label}>日時</Text>
              <Text style={styles.highlight}>{scheduledAt}</Text>
              <Text style={styles.label}>場所</Text>
              <Text style={styles.value}>
                {location}
                {mapUrl && (
                  <>
                    <br />
                    <Link href={mapUrl} style={styles.link}>📍 地図を開く</Link>
                  </>
                )}
              </Text>
            </Section>
            <Text style={styles.paragraph}>
              持ち物は特にありません。身一つでお越しください。
              何かご不明な点があれば、お気軽にご連絡ください。
            </Text>
            <Text style={styles.paragraph}>
              本社でお待ちしています。
            </Text>
          </Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  )
}

ReminderD1.PreviewProps = {
  name: '山田 太郎',
  scheduledAt: '明日 2026-05-10（金）14:00',
  location: '本社（住所を記入）',
  mapUrl: 'https://maps.google.com/?q=',
} satisfies ReminderD1Props

const styles = {
  body: { background: '#f8f9fa', fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", margin: 0 },
  container: { maxWidth: '560px', margin: '24px auto', background: '#ffffff', borderRadius: '8px', overflow: 'hidden' },
  content: { padding: '24px 32px' },
  greeting: { fontSize: '15px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px 0' },
  paragraph: { fontSize: '14px', lineHeight: 1.8, color: '#2d3748', margin: '0 0 16px 0' },
  card: { background: '#fffbeb', borderLeft: '4px solid #e94560', borderRadius: '6px', padding: '16px', margin: '16px 0' },
  label: { fontSize: '11px', color: '#718096', fontWeight: 700, margin: '0 0 4px 0' },
  highlight: { fontSize: '18px', fontWeight: 700, color: '#0f3460', margin: '0 0 12px 0' },
  value: { fontSize: '14px', color: '#1a1a2e', margin: 0, lineHeight: 1.8 },
  link: { color: '#0f3460', textDecoration: 'underline' },
}
