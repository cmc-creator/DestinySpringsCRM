import Link from "next/link";

const BG = "var(--nyx-bg)";
const CYAN = "var(--nyx-accent)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export default function TermsPage() {
  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh" }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
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
        <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: TEXT, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: TEXT_MUTED, marginBottom: 40, fontSize: "0.9rem" }}>Last updated: January 1, 2026</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 32, lineHeight: 1.8, color: TEXT_MUTED, fontSize: "0.9rem" }}>
          {[
            { title: "1. Acceptance of Terms", body: "By accessing or using NyxAegis (the \"Service\"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using the Service. These terms apply to all users, including administrators, BD representatives, and hospital/account users." },
            { title: "2. Description of Service", body: "NyxAegis is a hospital-focused Customer Relationship Management (CRM) platform designed for healthcare business development teams. The Service provides tools for managing hospital accounts, tracking opportunity pipelines, managing BD representative compliance documents, and facilitating healthcare contracting workflows." },
            { title: "3. User Accounts and Security", body: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify NyxAegis of any unauthorized use of your account. NyxAegis is not liable for any loss resulting from unauthorized use of your account. You must not share account credentials with unauthorized parties." },
            { title: "4. Healthcare Data and HIPAA", body: "NyxAegis is designed to support HIPAA compliance requirements. However, NyxAegis does not store Protected Health Information (PHI) as defined by HIPAA. Users are responsible for ensuring they do not upload or store PHI in the platform unless a Business Associate Agreement (BAA) has been executed with Destiny Springs Healthcare. Contact us at ops@destinyspringshealthcare.com to execute a BAA." },
            { title: "5. Acceptable Use", body: "You agree not to use the Service for any unlawful purpose, to transmit spam or malware, to attempt to gain unauthorized access to any portion of the Service, to use the Service to store or transmit any Protected Health Information without a BAA, to reverse engineer or attempt to extract the source code of the Service, or to interfere with or disrupt the integrity or performance of the Service." },
            { title: "6. Payment and Billing", body: "Paid subscriptions are billed monthly or annually as selected. All fees are non-refundable except as required by law. NyxAegis reserves the right to modify pricing with 30 days notice. Failure to pay may result in suspension or termination of your account." },
            { title: "7. Data Ownership and Privacy", body: "You retain ownership of all data you input into the Service. NyxAegis will not sell your data to third parties. Upon termination, you may request an export of your data within 30 days. After 30 days, NyxAegis may delete your data. See our Privacy Policy for complete details on data handling." },
            { title: "8. Intellectual Property", body: "The Service and its original content, features, and functionality are and will remain the exclusive property of Destiny Springs Healthcare. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent." },
            { title: "9. Limitation of Liability", body: "Destiny Springs Healthcare shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use the Service. Our total liability shall not exceed the amount you paid for the Service in the 12 months prior to the event giving rise to liability." },
            { title: "10. Governing Law", body: "These Terms shall be governed by the laws of the State of Tennessee, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Davidson County, Tennessee." },
            { title: "11. Changes to Terms", body: "NyxAegis reserves the right to modify these terms at any time. We will notify users of significant changes via email. Continued use of the Service after changes constitutes acceptance of the new terms." },
            { title: "12. Contact", body: "For questions about these Terms, contact us at ops@destinyspringshealthcare.com or Destiny Springs Healthcare, Nashville, TN." },
          ].map((s) => (
            <div key={s.title}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: TEXT, marginBottom: 8 }}>{s.title}</h2>
              <p style={{ margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${BORDER}`, fontSize: "0.8rem", color: "rgba(216,232,244,0.25)", textAlign: "center" }}>
          <Link href="/" style={{ color: "inherit" }}>? Back to NyxAegis</Link>
          {" · "}
          <Link href="/privacy" style={{ color: "inherit" }}>Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
