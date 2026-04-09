import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

function toCSV(rows: Record<string, unknown>[], cols: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v).replace(/"/g, '""');
    return `"${s}"`;
  };
  const header = cols.map(escape).join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
  return header + "\n" + body;
}

const ACT_LABELS: Record<string, string> = {
  CALL: "Call", EMAIL: "Email", NOTE: "Note", MEETING: "Meeting", LUNCH: "Lunch",
  TASK: "Task", PROPOSAL_SENT: "Proposal Sent", CONTRACT_SENT: "Contract Sent",
  DEMO_COMPLETED: "Demo Completed", SITE_VISIT: "Site Visit", CONFERENCE: "Conference",
  FOLLOW_UP: "Follow-Up", IN_SERVICE: "In-Service Training", FACILITY_TOUR: "Facility Tour",
  CE_PRESENTATION: "CE Presentation", CRISIS_CONSULT: "Crisis Consult",
  LUNCH_AND_LEARN: "Lunch & Learn", COMMUNITY_EVENT: "Community Event",
  REFERRAL_RECEIVED: "Referral Received", DISCHARGE_PLANNING: "Discharge Planning",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "REP" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam   = searchParams.get("to");

  // Resolve the rep whose data to export
  let repId: string | undefined;
  if (session.user.role === "REP") {
    const rep = await prisma.rep.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!rep) return NextResponse.json({ error: "Rep not found" }, { status: 404 });
    repId = rep.id;
  } else {
    // Admin: allow exporting any rep's log via ?repId=
    const qRepId = searchParams.get("repId");
    repId = qRepId ?? undefined;
  }

  const fromDate = fromParam ? new Date(fromParam) : (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d; })();
  const toDate   = toParam   ? new Date(toParam)   : new Date();
  // Set toDate to end of day
  toDate.setHours(23, 59, 59, 999);

  const activities = await prisma.activity.findMany({
    where: {
      ...(repId ? { repId } : {}),
      completedAt: { gte: fromDate, lte: toDate },
    },
    orderBy: { completedAt: "asc" },
    select: {
      id: true,
      type: true,
      title: true,
      notes: true,
      completedAt: true,
      arrivedAt: true,
      departedAt: true,
      durationMinutes: true,
      latitude: true,
      longitude: true,
      referralSource: {
        select: {
          name: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          practiceName: true,
        },
      },
      hospital: {
        select: { hospitalName: true },
      },
      rep: {
        select: { user: { select: { name: true } } },
      },
    },
  });

  const rows = activities.map((a) => {
    const date = a.completedAt
      ? new Date(a.completedAt).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
      : "";
    const arrivedAt = a.arrivedAt
      ? new Date(a.arrivedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : "";
    const departedAt = a.departedAt
      ? new Date(a.departedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : "";

    // Destination = referral source name or hospital name
    const destinationName =
      a.referralSource?.name ?? a.hospital?.hospitalName ?? "";
    const destinationAddress = a.referralSource
      ? [
          a.referralSource.address,
          a.referralSource.city,
          a.referralSource.state,
          a.referralSource.zip,
        ]
          .filter(Boolean)
          .join(", ")
      : "";

    return {
      Date:               date,
      Rep:                a.rep?.user.name ?? "",
      "Activity Type":    ACT_LABELS[a.type] ?? a.type,
      Purpose:            a.title,
      Notes:              a.notes ?? "",
      "Destination Name": destinationName,
      "Destination Address": destinationAddress,
      "Arrived At":       arrivedAt,
      "Departed At":      departedAt,
      "Duration (min)":   a.durationMinutes ?? "",
      Latitude:           a.latitude ?? "",
      Longitude:          a.longitude ?? "",
    };
  });

  const cols = [
    "Date", "Rep", "Activity Type", "Purpose", "Notes",
    "Destination Name", "Destination Address",
    "Arrived At", "Departed At", "Duration (min)",
    "Latitude", "Longitude",
  ];

  const csv = toCSV(rows as unknown as Record<string, unknown>[], cols);
  const filename = `visit-log-${fromDate.toISOString().slice(0, 10)}-to-${toDate.toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
