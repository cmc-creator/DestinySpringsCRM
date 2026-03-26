import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MessagesInbox from "@/components/communications/MessagesInbox";

export const metadata = { title: "Messages | Destiny Springs CRM" };

export default async function AdminMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--nyx-text-muted)", marginBottom: 4 }}>
          COMMAND / MESSAGES
        </div>
        <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--nyx-text)", margin: 0 }}>Internal Messages</h1>
      </div>
      <MessagesInbox currentUserId={session.user.id} />
    </div>
  );
}
