# Privacy Policy

Effective Date: 2026-06-01
Last Updated: 2026-06-01

G-LINE Co., Ltd. handles personal information collected through the G-LINE Recruitment Chatbot (Service) in accordance with Japan APPI (2022 amendment) and where applicable the EU GDPR.

---

## Article 1 (Scope)

This Policy applies to personal information and related data that we collect, use, store, delete, or otherwise process through the Service, provided for recruitment guidance, application intake support, interview scheduling, and inquiry handling.

---

## Article 2 (Disclosure of AI-Based Responses)

1. All or part of the responses through the Service are generated or assisted by AI.
2. Users acknowledge their chat inputs may be processed by AI for recruitment guidance, application confirmation, interview scheduling, and inquiry handling.
3. AI-generated responses are for reference only and not guaranteed to be accurate, complete, or current.

---

## Article 3 (Personal Information We Collect)

We collect only the minimum data necessary.

### 3-1. Applicant information
Name (name_enc), email (email_enc), phone (phone_enc), preferred date (preferred_date), notes (notes)

### 3-2. Communication and session data
Conversation contents, timestamps, session IDs (hashed), source IP address, browser type, and similar technical data

<!-- LEGAL REVIEW: Confirm whether IP and browser data are actually collected in production and align with implementation. -->

### 3-3. Rights-request related data
Identity verification and request history for disclosure, correction, deletion requests

---

## Article 4 (Data Fields and System Mapping)

1. Applicant data is stored in encrypted or identifier-based form.
2. Field mapping: Name->name_enc (pgcrypto), Email->email_enc/email_hash, Phone->phone_enc, Date->preferred_date, Notes->notes
3. Deletion request status: requested_deletion; deletion timestamp: deleted_at
4. Timestamps: created_at, updated_at

---

## Article 5 (Collection Methods)

1. Information entered into the chat interface, application form, or inquiry form
2. Information transmitted through interview date selection and rescheduling
3. Automatic collection via cookies, session IDs, and similar means

---

## Article 6 (Purposes of Use)

1. Conducting recruitment screening and confirming application details
2. Scheduling and notifying of interviews and related appointments
3. Handling inquiries, identity verification, and support
4. Preventing unauthorized use, incident response, security, and audits
5. Retaining records as required by law
6. Creating anonymized statistics for operational improvement

---

## Article 7 (No Use for AI Training)

We do not use conversation data, applicant data, or other personal information to train, retrain, or improve AI models.

<!-- LEGAL REVIEW: Verify vendor DPAs contractually exclude data from model training, especially Google Gemini API. -->

---

## Article 8 (Storage Location and Security Measures)

1. Personal information is primarily stored in the AWS Tokyo Region in Japan.
2. Sensitive data (name, email, phone) are protected with AES-256 equivalent encryption using pgp_sym_encrypt from pgcrypto.
3. Cookies and session IDs are stored as hashed values where practicable.
4. Security measures include access controls, TLS, audit logging, vulnerability management, and vendor oversight.

<!-- LEGAL REVIEW: Confirm AES-256 wording against actual implementation settings, key management, and Cloudflare configuration. -->

---

## Article 9 (Retention Periods)

1. **Conversation logs**: Automatically deleted or anonymized 90 days after creation.
2. **Applicant data**: Retained one year after recruitment process completion, then deleted or anonymized.
3. Data may be retained longer where required by law or for dispute resolution.

---

## Article 10 (Third-Party Provision and Processors)

1. We do not provide personal information to third parties without consent, except where required by law.
2. Service providers:

   | Provider | Role |
   |----------|------|
   | AWS Japan | Database and infrastructure (Tokyo Region) |
   | Cloudflare Japan | CDN, security, Cloudflare Workers API runtime |
   | Resend | Email delivery |
   | Google Gemini API | AI chat response generation |

3. We require processors to comply with confidentiality and appropriate security measures.

<!-- LEGAL REVIEW: Confirm contracting entity, storage location, and onward transfer structure for Resend and Google Gemini API. -->

---

## Article 11 (Cross-Border Transfers)

1. Primary storage is within Japan (AWS Tokyo Region).
2. Cloudflare network optimization may cause some communication data to pass through overseas edge nodes temporarily.
3. Where cross-border transfers occur, we implement necessary safeguards per APPI Article 24.

<!-- LEGAL REVIEW: Confirm countries involved and APPI/GDPR compliance approach with legal counsel. -->

---

## Article 12 (Data Subject Rights)

1. Data subjects may request disclosure, correction, deletion, suspension of use, and other rights recognized by applicable law.
2. Submit requests by email: info@g-line.co.jp
3. Where GDPR applies, data subjects may have rights including access, rectification, erasure, restriction, portability, and objection.

---

## Article 13 (Breach Response)

If a personal data incident occurs or is suspected, we will investigate promptly and notify the Personal Information Protection Commission and affected individuals where legally required. For serious incidents, we aim to report within **72 hours** of becoming aware.

<!-- LEGAL REVIEW: The 72-hour standard reflects GDPR requirements. Confirm scope for Japan-based processing with legal counsel. -->

---

## Article 14 (Cookies and Session IDs)

1. We use cookies, session IDs, and similar technologies for service continuity, security, and usage analysis.
2. These identifiers are stored as hashed values where appropriate and not used for persistent tracking.
3. Restricting cookies via browser settings may affect Service availability.

---

## Article 15 (Company Information)

| Item | Details |
|------|--------|
| Company Name | G-LINE Co., Ltd. |
| Representative | Representative Director Aramaki |
| Address | [Enter address] |
| Phone | [Enter phone number] |
| Contact | info@g-line.co.jp |

<!-- LEGAL REVIEW: Replace placeholders with formal corporate expression consistent with registration records. -->

---

## Article 16 (Amendments to this Policy)

We may revise this Policy in response to legal amendments, regulatory guidance, or service changes. Material changes will be communicated through the Service or another appropriate method.

---

For questions about this Policy, please contact us at info@g-line.co.jp.
