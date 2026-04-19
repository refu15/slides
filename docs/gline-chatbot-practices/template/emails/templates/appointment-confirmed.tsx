import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components'
import { Header } from '../components/header'
import { Footer } from '../components/footer'

export interface AppointmentConfirmedProps {
  name: string
  scheduledAt: string
  location: string
}

export default function AppointmentConfirmed({
  name, scheduledAt, location,
}: AppointmentConfirmedProps) {
  return (
    <Html>
      <Head />
      <Preview>面接日時確定のご連絡 - G-LINE 採用</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Header title="面接日時が確定しました" />
          <Section style={styles.content}>
            <Text style={styles.greeting}>{name} 様</Text>
            <Text style={styles.paragraph}>
              面接日時のご連絡ありがとうございます。下記の通り確定いたしました。
            </Text>
            <Section style={styles.card}>
              <Text style={styles.label}>日時</Text>
              <Text style={styles.highlight}>{scheduledAt}</Text>
              <Text style={styles.label}>場所</Text>
              <Text style={styles.value}>{location}</Text>
            </Section>
            <Text style={styles.paragraph}>
              当日は直接お越しいただければ大丈夫です。服装は自由で構いません。
              お会いできることを、心から楽しみにしています。
            </Text>
            <Text style={styles.paragraph}>
              ご都合が変わった場合はお気軽にご連絡ください。
            </Text>
          </Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  )
}

AppointmentConfirmed.PreviewProps = {
  name: '山田 太郎',
  scheduledAt: '2026-05-10（金）14:00',
  location: '本社（住所）',
} satisfies AppointmentConfirmedProps

const styles = {
  body: { background: '#f8f9fa', fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", margin: 0 },
  container: { maxWidth: '560px', margin: '24px auto', background: '#ffffff', borderRadius: '8px', overflow: 'hidden' },
  content: { padding: '24px 32px' },
  greeting: { fontSize: '15px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px 0' },
  paragraph: { fontSize: '14px', lineHeight: 1.8, color: '#2d3748', margin: '0 0 16px 0' },
  card: { background: '#fffbeb', borderLeft: '4px solid #e94560', borderRadius: '6px', padding: '16px', margin: '16px 0' },
  label: { fontSize: '11px', color: '#718096', fontWeight: 700, margin: '0 0 4px 0' },
  highlight: { fontSize: '18px', fontWeight: 700, color: '#0f3460', margin: '0 0 12px 0' },
  value: { fontSize: '14px', color: '#1a1a2e', margin: 0 },
}
