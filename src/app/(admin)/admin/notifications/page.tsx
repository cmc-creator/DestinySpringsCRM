import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const CYAN = "var(--nyx-accent)";
const CARD = "var(--nyx-card)";
const BORDER = "var(--nyx-accent-dim)";
const TEXT = "var(--nyx-text)";
const TEXT_MUTED = "var(--nyx-text-muted)";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--nyx-accent-label)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>COMMAND</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: TEXT }}>Notifications</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 680 }}>
        {notifications.length === 0 && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, textAlign: "center", color: TEXT_MUTED }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔔</div>
            <p>No notifications yet. Activity will appear here as you use the platform.</p>
          </div>
        )}
        {notifications.map((n) => (
          <div key={n.id} style={{ background: n.read ? CARD : "var(--nyx-accent-dim)", border: `1px solid ${n.read ? BORDER : "var(--nyx-accent-mid)"}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: n.read ? "rgba(216,232,244,0.15)" : CYAN, marginTop: 6, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: n.read ? 400 : 600, fontSize: "0.875rem", color: TEXT, marginBottom: 3 }}>{n.title}</div>
              {n.body && <div style={{ fontSize: "0.8rem", color: TEXT_MUTED, marginBottom: 4 }}>{n.body}</div>}
              <div style={{ fontSize: "0.72rem", color: "rgba(216,232,244,0.3)" }}>{formatRelativeTime(n.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
