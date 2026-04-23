import { Section, Text } from '@react-email/components'

export function Header({ title }: { title: string }) {
  return (
    <Section style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.brand}>G-LINE 採用</Text>
    </Section>
  )
}

const styles = {
  header: {
    background: '#0f3460',
    padding: '24px 32px',
    textAlign: 'left' as const,
  },
  title: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 0 4px 0',
    lineHeight: 1.4,
  },
  brand: {
    color: '#e94560',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    margin: 0,
  },
}
