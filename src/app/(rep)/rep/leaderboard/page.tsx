import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RepLeaderboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Find current user's rep record
  const myRep = await prisma.rep.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  // Get all active reps
  const reps = await prisma.rep.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, user: { select: { name: true } } },
  });

  // Activity counts this month per rep
  const actCounts = await prisma.activity.groupBy({
    by: ["repId"],
    _count: { id: true },
    where: {
      repId: { not: null },
      createdAt: { gte: monthStart },
    },
  });
  const actMap: Record<string, number> = {};
  for (const row of actCounts) {
    if (row.repId) actMap[row.repId] = row._count.id;
  }

  // Total active referral source contacts per rep
  const contactCounts = await prisma.referralSource.groupBy({
    by: ["assignedRepId"],
    _count: { id: true },
    where: { assignedRepId: { not: null }, active: true },
  });
  const contactMap: Record<string, number> = {};
  for (const row of contactCounts) {
    if (row.assignedRepId) contactMap[row.assignedRepId] = row._count.id;
  }

  const ranked = reps
    .map((rep) => {
      const actCount = actMap[rep.id] ?? 0;
      const contacts = contactMap[rep.id] ?? 0;
      return {
        id: rep.id,
        name: rep.user.name ?? "Unknown Rep",
        activitiesThisMonth: actCount,
        totalContacts: contacts,
        score: actCount * 2 + contacts,
      };
    })
    .sort((a, b) => b.score - a.score || b.activitiesThisMonth - a.activitiesThisMonth);

  const myRepId = myRep?.id ?? null;

  // Assign anonymized letters to peers (skip current user)
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let letterIdx = 0;
  const displayRanked = ranked.map((rep) => {
    if (rep.id === myRepId) return { ...rep, displayName: rep.name, isMe: true };
    const letter = LETTERS[letterIdx % LETTERS.length];
    letterIdx++;
    return { ...rep, displayName: `Rep ${letter}`, isMe: false };
  });

  const myRank = displayRanked.findIndex((r) => r.isMe) + 1;
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--nyx-accent)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
          Leaderboard
        </div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--nyx-text)", margin: 0 }}>
          Activity Rankings
        </h1>
        <p style={{ color: "var(--nyx-text-muted)", fontSize: "0.875rem", marginTop: 6 }}>
          {monthLabel} — your name is visible, peers are anonymized.
        </p>
        {myRank > 0 && (
          <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 10, background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 10, padding: "10px 18px" }}>
            <span style={{ fontSize: "1.4rem" }}>{myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🏆"}</span>
            <div>
              <div style={{ fontWeight: 800, color: "var(--nyx-accent)", fontSize: "1rem" }}>#{myRank} this month</div>
              <div style={{ fontSize: "0.72rem", color: "var(--nyx-text-muted)" }}>Keep it up!</div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "var(--nyx-card)", border: "1px solid var(--nyx-border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--nyx-border)" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.63rem", fontWeight: 700, color: "var(--nyx-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", width: 60 }}>Rank</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.63rem", fontWeight: 700, color: "var(--nyx-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Rep</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.63rem", fontWeight: 700, color: "var(--nyx-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Activities (Mo)</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.63rem", fontWeight: 700, color: "var(--nyx-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Contacts</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.63rem", fontWeight: 700, color: "var(--nyx-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {displayRanked.map((rep, i) => (
              <tr
                key={rep.id}
                style={{
                  borderBottom: i < displayRanked.length - 1 ? "1px solid var(--nyx-border)" : "none",
                  background: rep.isMe ? "rgba(0, 212, 255, 0.06)" : "transparent",
                }}
              >
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: i < 3 ? "1.1rem" : "0.88rem",
                    fontWeight: 700,
                    color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#fb923c" : "var(--nyx-text-muted)",
                  }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontWeight: rep.isMe ? 800 : 500, color: rep.isMe ? "var(--nyx-accent)" : "var(--nyx-text)" }}>
                    {rep.displayName}
                  </span>
                  {rep.isMe && (
                    <span style={{ marginLeft: 8, fontSize: "0.65rem", fontWeight: 700, color: "var(--nyx-accent)", background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 999, padding: "1px 7px" }}>
                      You
                    </span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.95rem", color: rep.activitiesThisMonth > 0 ? "var(--nyx-text)" : "var(--nyx-text-muted)" }}>
                  {rep.activitiesThisMonth}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.88rem", color: "var(--nyx-text-muted)" }}>
                  {rep.totalContacts}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: rep.isMe ? "var(--nyx-accent)" : "var(--nyx-text)" }}>
                    {rep.score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayRanked.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--nyx-text-muted)" }}>
            No active reps found.
          </div>
        )}
      </div>

      <p style={{ fontSize: "0.7rem", color: "var(--nyx-text-muted)", marginTop: 12 }}>
        Score = (activities this month &times; 2) + total active contacts. Resets on the 1st.
      </p>
    </div>
  );
}
