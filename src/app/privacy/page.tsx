import Link from "next/link";

const BG = "var(--nyx-bg)";
const CYAN = "var(--nyx-accent)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export default function PrivacyPage() {
  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh" }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: "0 2rem", display: "flex", alignItems: "center", height: 60 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--nyx-bg)"/>
            <path d="M16 6 L26 12 L26 20 L16 26 L6 20 L6 12 Z" stroke={CYAN} strokeWidth="1.5" fill="none" strokeOpacity="0.7"/>
            <circle cx="16" cy="16" r="4" fill={CYAN} fillOpacity="0.8"/>
          </svg>
          <span style={{ fontWeight: 900, color: TEXT }}>NyxAegis</span>
        </Link>
      </nav>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 2rem 80px" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: TEXT, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: TEXT_MUTED, marginBottom: 40, fontSize: "0.9rem" }}>Last updated: January 1, 2026</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 32, lineHeight: 1.8, color: TEXT_MUTED, fontSize: "0.9rem" }}>
          {[
            { title: "1. Information We Collect", body: "We collect information you provide directly, including account registration details (name, email, organization), profile information, hospital account data, opportunity and pipeline data, compliance documents you upload, and billing information processed through Stripe. We also collect usage data, log files, and device information automatically." },
            { title: "2. How We Use Your Information", body: "We use your information to provide and improve the NyxAegis platform, process payments, send transactional emails and notifications, provide customer support, generate analytics and reports within your organization, ensure platform security, and comply with legal obligations. We do not sell your personal information to third parties." },
            { title: "3. HIPAA and Protected Health Information", body: "NyxAegis is a CRM platform for business development activities. It is NOT intended for storing Protected Health Information (PHI) as defined under HIPAA. Our platform manages business relationships, not patient records. If you believe your use case requires PHI storage, please contact us at ops@nyxaegis.com to discuss a Business Associate Agreement (BAA) and appropriate safeguards." },
            { title: "4. Data Sharing", body: "We share data with: (a) Stripe for payment processing; (b) Resend for transactional email delivery; (c) your cloud infrastructure provider (for hosting); (d) legal authorities when required by law. We do not share your hospital relationship data, pipeline data, or business intelligence with any third parties." },
            { title: "5. Data Security", body: "We implement industry-standard security measures including TLS/SSL encryption in transit, AES-256 encryption at rest, role-based access controls, session management, and regular security audits. However, no method of electronic transmission is 100% secure, and we cannot guarantee absolute security." },
            { title: "6. Data Retention", body: "We retain your data as long as your account is active. Upon account termination, you have 30 days to request a data export. After that period, we will delete your data from our systems within 60 days, except where retention is required by law." },
            { title: "7. Your Rights", body: "You have the right to access your personal data, correct inaccurate data, request deletion of your data, export your data in a portable format, and opt out of marketing communications. To exercise these rights, contact ops@nyxaegis.com." },
            { title: "8. Cookies", body: "NyxAegis uses essential cookies for authentication and session management. We use minimal analytics cookies to understand platform usage. We do not use third-party advertising cookies. You can control cookies through your browser settings." },
            { title: "9. Children's Privacy", body: "NyxAegis is designed for healthcare business professionals and is not directed at children under 18. We do not knowingly collect personal information from minors." },
            { title: "10. Changes to This Policy", body: "We may update this Privacy Policy periodically. We will notify users of material changes via email. Continued use of the Service after changes constitutes acceptance of the updated policy." },
            { title: "11. Contact Us", body: "For privacy questions, data requests, or to report a privacy concern, contact our team at ops@nyxaegis.com. For HIPAA-related inquiries, please mark your message with 'HIPAA Inquiry' in the subject line." },
          ].map((s) => (
            <div key={s.title}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: TEXT, marginBottom: 8 }}>{s.title}</h2>
              <p style={{ margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${BORDER}`, fontSize: "0.8rem", color: "rgba(216,232,244,0.25)", textAlign: "center" }}>
          <Link href="/" style={{ color: "inherit" }}>← Back to NyxAegis</Link>
          {" · "}
          <Link href="/terms" style={{ color: "inherit" }}>Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
