import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components'
import { Header } from '../components/header'
import { Footer } from '../components/footer'

export interface ApplyReceivedProps {
  name: string
  preferredDate?: string
}

export default function ApplyReceived({ name, preferredDate }: ApplyReceivedProps) {
  return (
    <Html>
      <Head />
      <Preview>ご応募ありがとうございます - G-LINE 採用</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Header title="ご応募ありがとうございます" />
          <Section style={styles.content}>
            <Text style={styles.greeting}>{name} 様</Text>
            <Text style={styles.paragraph}>
              この度は G-LINE の採用にご応募いただき、本当にありがとうございます。
            </Text>
            <Text style={styles.paragraph}>
              内容を確認のうえ、担当者より改めてご連絡いたします。
              {preferredDate && (
                <>
                  <br />
                  ご希望日時：<strong>{preferredDate}</strong>
                </>
              )}
            </Text>
            <Text style={styles.paragraph}>
              ご不明な点がございましたら、お気軽にご連絡ください。
              本気で向き合ってくださる方と、一緒に仕事ができるのを楽しみにしています。
            </Text>
          </Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  )
}

ApplyReceived.PreviewProps = {
  name: '山田 太郎',
  preferredDate: '2026-05-10 14:00',
} satisfies ApplyReceivedProps

const styles = {
  body: { background: '#f8f9fa', fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif", margin: 0 },
  container: { maxWidth: '560px', margin: '24px auto', background: '#ffffff', borderRadius: '8px', overflow: 'hidden' },
  content: { padding: '24px 32px' },
  greeting: { fontSize: '15px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px 0' },
  paragraph: { fontSize: '14px', lineHeight: 1.8, color: '#2d3748', margin: '0 0 16px 0' },
}
