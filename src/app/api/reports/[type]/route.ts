import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "No data";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

function fmt(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

async function getRows(type: string) {
  switch (type) {
    case "pipeline": {
      const opps = await prisma.opportunity.findMany({
        include: {
          hospital: { select: { hospitalName: true, city: true, state: true } },
          assignedRep: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });
      return opps.map(o => ({
        Title: o.title,
        Stage: o.stage,
        "Service Line": o.serviceLine ?? "",
        "Value ($)": Number(o.value ?? 0),
        Hospital: o.hospital?.hospitalName ?? "",
        City: o.hospital?.city ?? "",
        State: o.hospital?.state ?? "",
        Rep: o.assignedRep?.user?.name ?? "",
        Priority: o.priority ?? "",
        "Close Date": fmt(o.closeDate),
        "Created": fmt(o.createdAt),
      }));
    }

    case "closed-won": {
      const opps = await prisma.opportunity.findMany({
        where: { stage: "CLOSED_WON" },
        include: {
          hospital: { select: { hospitalName: true, city: true, state: true } },
          assignedRep: { include: { user: { select: { name: true } } } },
        },
        orderBy: { closeDate: "desc" },
      });
      return opps.map(o => ({
        Title: o.title,
        "Value ($)": Number(o.value ?? 0),
        "Service Line": o.serviceLine ?? "",
        Hospital: o.hospital?.hospitalName ?? "",
        State: o.hospital?.state ?? "",
        Rep: o.assignedRep?.user?.name ?? "",
        "Close Date": fmt(o.closeDate),
      }));
    }

    case "reps": {
      const reps = await prisma.rep.findMany({
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { opportunities: true, leads: true } },
          opportunities: { select: { value: true, stage: true } },
          payments: { where: { status: "PAID" }, select: { amount: true } },
        },
      });
      return reps.map(r => {
        const wonOpps   = r.opportunities.filter(o => o.stage === "CLOSED_WON");
        const lostOpps  = r.opportunities.filter(o => o.stage === "CLOSED_LOST");
        const winRate   = wonOpps.length + lostOpps.length > 0
          ? Math.round((wonOpps.length / (wonOpps.length + lostOpps.length)) * 100)
          : 0;
        const pipeline  = r.opportunities
          .filter(o => !["CLOSED_WON","CLOSED_LOST"].includes(o.stage))
          .reduce((s, o) => s + Number(o.value ?? 0), 0);
        const totalPaid = r.payments.reduce((s, p) => s + Number(p.amount), 0);
        return {
          Name: r.user.name ?? "",
          Email: r.user.email,
          Status: r.status,
          Territory: r.territory ?? "",
          State: r.state ?? "",
          Title: r.title ?? "",
          Rating: r.rating ?? "",
          "# Opportunities": r._count.opportunities,
          "# Leads": r._count.leads,
          "Win Rate %": winRate,
          "Pipeline Value ($)": pipeline,
          "Closed Won ($)": wonOpps.reduce((s, o) => s + Number(o.value ?? 0), 0),
          "Total Paid ($)": totalPaid,
          "HIPAA Date": fmt(r.hipaaTrainedAt),
          "W9 On File": r.w9OnFile ? "Yes" : "No",
        };
      });
    }

    case "leads": {
      const leads = await prisma.lead.findMany({
        include: { assignedRep: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
      });
      return leads.map(l => ({
        "Hospital Name": l.hospitalName,
        City: l.city ?? "",
        State: l.state ?? "",
        "Hospital Type": l.hospitalType ?? "",
        "Bed Count": l.bedCount ?? "",
        "Contact Name": l.contactName ?? "",
        "Contact Title": l.contactTitle ?? "",
        "Contact Email": l.contactEmail ?? "",
        Status: l.status,
        Source: l.source ?? "",
        Priority: l.priority ?? "",
        "Est. Value ($)": Number(l.estimatedValue ?? 0),
        Rep: l.assignedRep?.user?.name ?? "",
        "Created": fmt(l.createdAt),
        "Last Updated": fmt(l.updatedAt),
      }));
    }

    case "hospitals": {
      const hospitals = await prisma.hospital.findMany({
        include: {
          _count: { select: { opportunities: true, contracts: true, invoices: true } },
          contracts: { where: { status: "ACTIVE" }, select: { value: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return hospitals.map(h => ({
        "Hospital Name": h.hospitalName,
        System: h.systemName ?? "",
        Type: h.hospitalType ?? "",
        NPI: h.npi ?? "",
        "Bed Count": h.bedCount ?? "",
        City: h.city ?? "",
        State: h.state ?? "",
        Status: h.status,
        Source: h.source ?? "",
        "Primary Contact": h.primaryContactName ?? "",
        "Contact Email": h.primaryContactEmail ?? "",
        "Contact Phone": h.primaryContactPhone ?? "",
        "Annual Revenue ($)": Number(h.annualRevenue ?? 0),
        "Contract Value ($)": Number(h.contractValue ?? 0),
        "Active Contract Value ($)": h.contracts.reduce((s, c) => s + Number(c.value ?? 0), 0),
        "# Opportunities": h._count.opportunities,
        "# Contracts": h._count.contracts,
        "# Invoices": h._count.invoices,
        "Assigned Rep ID": h.assignedRepId ?? "",
        "Service Lines": (h.serviceLines ?? []).join("; "),
        "Created": fmt(h.createdAt),
      }));
    }

    case "contracts": {
      const contracts = await prisma.contract.findMany({
        include: {
          hospital: { select: { hospitalName: true, state: true } },
          assignedRep: { include: { user: { select: { name: true } } } },
        },
        orderBy: { endDate: "asc" },
      });
      return contracts.map(c => ({
        Title: c.title,
        Status: c.status,
        Hospital: c.hospital?.hospitalName ?? "",
        State: c.hospital?.state ?? "",
        Rep: c.assignedRep?.user?.name ?? "",
        "Value ($)": Number(c.value ?? 0),
        "Start Date": fmt(c.startDate),
        "End Date": fmt(c.endDate),
        "Days Until Expiry": c.endDate
          ? Math.round((new Date(c.endDate).getTime() - Date.now()) / 86400000)
          : "",
        Terms: c.terms ?? "",
      }));
    }

    case "compliance": {
      const docs = await prisma.complianceDoc.findMany({
        include: { rep: { include: { user: { select: { name: true, email: true } } } } },
        orderBy: { expiresAt: "asc" },
      });
      return docs.map(d => ({
        "Rep Name": d.rep.user.name ?? "",
        "Rep Email": d.rep.user.email,
        Type: d.type,
        Title: d.title,
        Verified: d.verified ? "Yes" : "No",
        "Expires": fmt(d.expiresAt),
        "Days Until Expiry": d.expiresAt
          ? Math.round((new Date(d.expiresAt).getTime() - Date.now()) / 86400000)
          : "",
        Notes: d.notes ?? "",
        "Created": fmt(d.createdAt),
      }));
    }

    case "invoices": {
      const invoices = await prisma.invoice.findMany({
        include: {
          hospital: { select: { hospitalName: true, state: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return invoices.map(i => ({
        "Invoice #": i.invoiceNumber,
        Status: i.status,
        Hospital: i.hospital?.hospitalName ?? "",
        State: i.hospital?.state ?? "",
        "Total Amount ($)": Number(i.totalAmount),
        "Due Date": fmt(i.dueDate),
        "Paid At": fmt(i.paidAt),
        "Days Overdue": i.status === "OVERDUE" && i.dueDate
          ? Math.round((Date.now() - new Date(i.dueDate).getTime()) / 86400000)
          : "",
        Notes: i.notes ?? "",
        "Created": fmt(i.createdAt),
      }));
    }

    default:
      return [];
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "csv";

  const rows = await getRows(type);

  if (format === "json") {
    return NextResponse.json(rows, {
      headers: {
        "Content-Disposition": `attachment; filename="nyxaegis-${type}-report.json"`,
      },
    });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="nyxaegis-${type}-report.csv"`,
    },
  });
}
