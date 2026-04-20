// ============================================================
// ガードレール：ユーザー入力から禁止トピックを検知し、
// 即座に人間エスカレーションへ切り替える判定ロジック。
// ============================================================

export type EscalationReason =
  | 'salary_negotiation'
  | 'confidential_request'
  | 'personal_attack'
  | 'gdpr_deletion'
  | 'system_prompt_probe'
  | 'unknown_required'
  | null

interface Rule {
  reason: Exclude<EscalationReason, null>
  patterns: RegExp[]
  description: string
}

const RULES: Rule[] = [
  {
    reason: 'salary_negotiation',
    description: '給与・ボーナス・契約条件の具体交渉',
    patterns: [
      /給(?:料|与)\s*(?:は)?\s*いくら/,
      /年収.*(?:教え|いくら|具体)/,
      /ボーナス.*(?:いくら|出ま)/,
      /内定.*条件.*(?:出し|可能)/,
      /他社.*万円/,
      /月収.*いくら/,
    ],
  },
  {
    reason: 'confidential_request',
    description: '機密情報・未公開情報の要求',
    patterns: [
      /未公開/, /社外秘/, /機密/, /内部情報/,
      /役員.*(?:名簿|名前)/, /社員.*(?:一覧|名簿)/,
      /売上.*(?:詳細|内訳)/,
    ],
  },
  {
    reason: 'gdpr_deletion',
    description: '個人情報削除要求',
    patterns: [
      /(?:情報|データ|個人情報).*(?:削除|消して)/,
      /忘れられる権利/,
      /(?:退会|脱退).*(?:したい|希望)/,
    ],
  },
  {
    reason: 'system_prompt_probe',
    description: 'プロンプトインジェクション・システム情報探索',
    patterns: [
      /システム\s*プロンプト.*(?:見せ|教え|出力|表示)/,
      /(?:ignore|disregard|forget|無視|破棄).*(?:instruction|prompt|指示|前提)/i,
      /あなたは.*(?:誰|何).*(?:本当|実際)/,
      /あなたは.*(?:本当|実際).*(?:誰|何)/,
      /(?:jailbreak|脱獄|DAN\b|developer mode)/i,
      // ゼロ幅文字による難読化
      /[\u200B-\u200F\u202A-\u202E\u2060-\u2063]{2,}/,
    ],
  },
]

// 評価前の正規化：ゼロ幅文字除去
function normalize(text: string): string {
  return text.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2063]/g, '')
}

export interface GuardrailResult {
  allowed: boolean
  reason: EscalationReason
  matchedRule?: string
}

export function evaluate(userText: string): GuardrailResult {
  const text = normalize(userText)
  for (const rule of RULES) {
    for (const re of rule.patterns) {
      if (re.test(text)) {
        return { allowed: false, reason: rule.reason, matchedRule: rule.description }
      }
    }
  }
  return { allowed: true, reason: null }
}

/** エスカレーション時のユーザー向け返答テンプレート */
export function escalationMessage(reason: EscalationReason): string {
  switch (reason) {
    case 'salary_negotiation':
      return '具体的な条件については面接の場でしっかりお話ししたいと思っています。お気軽に info メールまたはお電話でご連絡ください。'
    case 'confidential_request':
      return 'その内容はこちらからお話しできるものではないので、直接ご相談いただくのが一番かと思います。info までご連絡ください。'
    case 'gdpr_deletion':
      return '情報削除のご希望、承知いたしました。本人確認のため info 宛にお問い合わせいただければ速やかに対応いたします。'
    case 'system_prompt_probe':
      return 'お答えできない内容です。採用や会社のことについてなら、何でもお気軽にお尋ねください。'
    case 'unknown_required':
      return '申し訳ありません、その内容は私からお答えしきれないので、info メールまたはお電話でお問い合わせいただけますでしょうか。'
    default:
      return 'info メールまでお気軽にご連絡ください。'
  }
}
