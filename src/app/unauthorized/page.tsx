export default function UnauthorizedPage() {
  return (
    <div style={{ background: "var(--nyx-bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#d8e8f4" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔒</div>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "var(--nyx-accent)", marginBottom: "0.5rem" }}>Access Denied</h1>
        <p style={{ color: "rgba(216,232,244,0.6)", marginBottom: "2rem" }}>You don&apos;t have permission to view this page.</p>
        <a href="/login" style={{ background: "var(--nyx-accent)", color: "var(--nyx-bg)", padding: "10px 24px", borderRadius: "8px", fontWeight: 700, textDecoration: "none" }}>
          Back to Login
        </a>
      </div>
    </div>
  );
}
