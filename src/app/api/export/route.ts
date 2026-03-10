import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// Simple CSV serializer — no external library needed
function toCSV(rows: Record<string, unknown>[], cols: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v).replace(/"/g, '""');
    return `"${s}"`;
  };
  const header = cols.map(escape).join(",");
  const body = rows.map(r => cols.map(c => escape(r[c])).join(",")).join("\n");
  return header + "\n" + body;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = new URL(req.url).searchParams.get("type");

  if (type === "leads") {
    const rows = await prisma.lead.findMany({
      include: { assignedRep: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    const data = rows.map(r => ({
      id: r.id,
      hospitalName: r.hospitalName,
      status: r.status,
      source: r.source,
      priority: r.priority,
      contactName: r.contactName ?? "",
      contactEmail: r.contactEmail ?? "",
      contactPhone: r.contactPhone ?? "",
      city: r.city ?? "",
      state: r.state ?? "",
      serviceInterest: r.serviceInterest ?? "",
      estimatedValue: r.estimatedValue ? String(r.estimatedValue) : "",
      assignedRep: r.assignedRep?.user.name ?? "",
      nextFollowUp: r.nextFollowUp ? new Date(r.nextFollowUp).toLocaleDateString() : "",
      createdAt: new Date(r.createdAt).toLocaleDateString(),
    }));
    const cols = ["id","hospitalName","status","source","priority","contactName","contactEmail","contactPhone","city","state","serviceInterest","estimatedValue","assignedRep","nextFollowUp","createdAt"];
    const csv = toCSV(data as unknown as Record<string, unknown>[], cols);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=leads.csv" } });
  }

  if (type === "opportunities") {
    const rows = await prisma.opportunity.findMany({
      include: {
        hospital: { select: { hospitalName: true } },
        assignedRep: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    const data = rows.map(r => ({
      id: r.id,
      title: r.title,
      stage: r.stage,
      serviceLine: r.serviceLine,
      value: r.value ? String(r.value) : "",
      priority: r.priority,
      hospital: r.hospital.hospitalName,
      assignedRep: r.assignedRep?.user.name ?? "",
      closeDate: r.closeDate ? new Date(r.closeDate).toLocaleDateString() : "",
      nextFollowUp: r.nextFollowUp ? new Date(r.nextFollowUp).toLocaleDateString() : "",
      createdAt: new Date(r.createdAt).toLocaleDateString(),
    }));
    const cols = ["id","title","stage","serviceLine","value","priority","hospital","assignedRep","closeDate","nextFollowUp","createdAt"];
    const csv = toCSV(data as unknown as Record<string, unknown>[], cols);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=opportunities.csv" } });
  }

  if (type === "hospitals") {
    const rows = await prisma.hospital.findMany({ orderBy: { createdAt: "desc" } });
    const data = rows.map(r => ({
      id: r.id,
      hospitalName: r.hospitalName,
      systemName: r.systemName ?? "",
      hospitalType: r.hospitalType,
      status: r.status,
      city: r.city ?? "",
      state: r.state ?? "",
      bedCount: r.bedCount ?? "",
      primaryContactName: r.primaryContactName ?? "",
      primaryContactEmail: r.primaryContactEmail ?? "",
      contractValue: r.contractValue ? String(r.contractValue) : "",
      createdAt: new Date(r.createdAt).toLocaleDateString(),
    }));
    const cols = ["id","hospitalName","systemName","hospitalType","status","city","state","bedCount","primaryContactName","primaryContactEmail","contractValue","createdAt"];
    const csv = toCSV(data as unknown as Record<string, unknown>[], cols);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=hospitals.csv" } });
  }

  if (type === "invoices") {
    const rows = await prisma.invoice.findMany({
      include: { hospital: { select: { hospitalName: true } } },
      orderBy: { createdAt: "desc" },
    });
    const data = rows.map(r => ({
      invoiceNumber: r.invoiceNumber,
      hospital: r.hospital.hospitalName,
      status: r.status,
      totalAmount: String(r.totalAmount),
      dueDate: r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "",
      paidAt: r.paidAt ? new Date(r.paidAt).toLocaleDateString() : "",
      createdAt: new Date(r.createdAt).toLocaleDateString(),
    }));
    const cols = ["invoiceNumber","hospital","status","totalAmount","dueDate","paidAt","createdAt"];
    const csv = toCSV(data as unknown as Record<string, unknown>[], cols);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=invoices.csv" } });
  }

  return NextResponse.json({ error: "Invalid type. Use: leads, opportunities, hospitals, invoices" }, { status: 400 });
}
