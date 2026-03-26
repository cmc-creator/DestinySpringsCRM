import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

type ActionIntent =
  | "create_referral"
  | "update_referral"
  | "delete_referral"
  | "create_referral_source"
  | "update_referral_source"
  | "delete_referral_source"
  | "create_lead"
  | "update_lead"
  | "delete_lead"
  | "create_opportunity"
  | "update_opportunity"
  | "delete_opportunity"
  | "create_activity";

type ExecutePayload = {
  intent: ActionIntent;
  targetId?: string;
  data?: Record<string, unknown>;
  confirmedDelete?: boolean;
};

function only<T extends Record<string, unknown>>(input: Record<string, unknown> | undefined, keys: (keyof T)[]): T {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (input && input[key as string] !== undefined) out[key as string] = input[key as string];
  }
  return out as T;
}

async function logAudit(args: {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  resource: string;
  resourceId?: string;
  diff?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: args.userId,
        userEmail: args.userEmail ?? null,
        userName: args.userName ?? null,
        action: args.action,
        resource: args.resource,
        resourceId: args.resourceId,
        diff: (args.diff ?? null) as never,
      },
    });
  } catch {
    // Do not block user action on audit insert failure
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as ExecutePayload | null;
  if (!body?.intent) return NextResponse.json({ error: "intent is required" }, { status: 400 });

  const isAdmin = session.user.role === "ADMIN";
  const requireAdmin = body.intent.includes("lead") || body.intent.includes("opportunity") || body.intent.includes("referral_source");
  if (requireAdmin && !isAdmin) return NextResponse.json({ error: "Admin role required" }, { status: 403 });

  const isDelete = body.intent.startsWith("delete_");
  if (isDelete && !body.confirmedDelete) {
    return NextResponse.json({ error: "Delete requires explicit confirmation", requiresDeleteConfirmation: true }, { status: 400 });
  }

  try {
    switch (body.intent) {
      case "create_referral": {
        type ReferralCreate = {
          referralSourceId: string;
          patientInitials?: string | null;
          admissionDate?: string | null;
          dischargeDate?: string | null;
          serviceLine?: string | null;
          externalId?: string | null;
          status?: string;
          notes?: string | null;
        };
        const data = only<ReferralCreate>(body.data, ["referralSourceId", "patientInitials", "admissionDate", "dischargeDate", "serviceLine", "externalId", "status", "notes"]);
        if (!data.referralSourceId) return NextResponse.json({ error: "referralSourceId is required" }, { status: 400 });
        const created = await prisma.referral.create({
          data: {
            referralSourceId: data.referralSourceId,
            patientInitials: data.patientInitials ?? null,
            admissionDate: data.admissionDate ? new Date(data.admissionDate) : null,
            dischargeDate: data.dischargeDate ? new Date(data.dischargeDate) : null,
            serviceLine: data.serviceLine ?? null,
            externalId: data.externalId ?? null,
            status: ((data.status ?? "RECEIVED").toUpperCase()) as never,
            notes: data.notes ?? null,
          },
        });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "CREATE", resource: "Referral", resourceId: created.id, diff: { after: created } });
        return NextResponse.json({ ok: true, result: created, summary: `Created referral ${created.id}` });
      }

      case "update_referral": {
        if (!body.targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 });
        type ReferralUpdate = {
          patientInitials?: string | null;
          admissionDate?: string | null;
          dischargeDate?: string | null;
          serviceLine?: string | null;
          status?: string;
          notes?: string | null;
        };
        const data = only<ReferralUpdate>(body.data, ["patientInitials", "admissionDate", "dischargeDate", "serviceLine", "status", "notes"]);
        const before = await prisma.referral.findUnique({ where: { id: body.targetId } });
        const updated = await prisma.referral.update({
          where: { id: body.targetId },
          data: {
            ...(data.patientInitials !== undefined ? { patientInitials: data.patientInitials } : {}),
            ...(data.admissionDate !== undefined ? { admissionDate: data.admissionDate ? new Date(data.admissionDate) : null } : {}),
            ...(data.dischargeDate !== undefined ? { dischargeDate: data.dischargeDate ? new Date(data.dischargeDate) : null } : {}),
            ...(data.serviceLine !== undefined ? { serviceLine: data.serviceLine } : {}),
            ...(data.status !== undefined ? { status: data.status.toUpperCase() as never } : {}),
            ...(data.notes !== undefined ? { notes: data.notes } : {}),
          },
        });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "UPDATE", resource: "Referral", resourceId: updated.id, diff: { before, after: updated } });
        return NextResponse.json({ ok: true, result: updated, summary: `Updated referral ${updated.id}` });
      }

      case "delete_referral": {
        if (!body.targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 });
        const before = await prisma.referral.findUnique({ where: { id: body.targetId } });
        await prisma.referral.delete({ where: { id: body.targetId } });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "DELETE", resource: "Referral", resourceId: body.targetId, diff: { before } });
        return NextResponse.json({ ok: true, summary: `Deleted referral ${body.targetId}` });
      }

      case "create_referral_source": {
        const data = only<Record<string, unknown>>(body.data, ["name", "type", "specialty", "practiceName", "npi", "contactName", "email", "phone", "address", "city", "state", "zip", "assignedRepId", "monthlyGoal", "notes"]);
        if (!data.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
        const created = await prisma.referralSource.create({
          data: {
            name: String(data.name),
            type: (String(data.type ?? "OTHER").toUpperCase()) as never,
            specialty: (data.specialty as string | undefined) ?? null,
            practiceName: (data.practiceName as string | undefined) ?? null,
            npi: (data.npi as string | undefined) ?? null,
            contactName: (data.contactName as string | undefined) ?? null,
            email: (data.email as string | undefined) ?? null,
            phone: (data.phone as string | undefined) ?? null,
            address: (data.address as string | undefined) ?? null,
            city: (data.city as string | undefined) ?? null,
            state: (data.state as string | undefined) ?? null,
            zip: (data.zip as string | undefined) ?? null,
            assignedRepId: (data.assignedRepId as string | undefined) ?? null,
            monthlyGoal: data.monthlyGoal ? Number(data.monthlyGoal) : null,
            notes: (data.notes as string | undefined) ?? null,
          },
        });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "CREATE", resource: "ReferralSource", resourceId: created.id, diff: { after: created } });
        return NextResponse.json({ ok: true, result: created, summary: `Created referral source ${created.name}` });
      }

      case "update_referral_source": {
        if (!body.targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 });
        const data = only<Record<string, unknown>>(body.data, ["name", "type", "specialty", "practiceName", "npi", "contactName", "email", "phone", "address", "city", "state", "zip", "assignedRepId", "monthlyGoal", "notes", "active"]);
        const before = await prisma.referralSource.findUnique({ where: { id: body.targetId } });
        const updated = await prisma.referralSource.update({
          where: { id: body.targetId },
          data: {
            ...(data.name !== undefined ? { name: String(data.name) } : {}),
            ...(data.type !== undefined ? { type: String(data.type).toUpperCase() as never } : {}),
            ...(data.specialty !== undefined ? { specialty: data.specialty as string | null } : {}),
            ...(data.practiceName !== undefined ? { practiceName: data.practiceName as string | null } : {}),
            ...(data.npi !== undefined ? { npi: data.npi as string | null } : {}),
            ...(data.contactName !== undefined ? { contactName: data.contactName as string | null } : {}),
            ...(data.email !== undefined ? { email: data.email as string | null } : {}),
            ...(data.phone !== undefined ? { phone: data.phone as string | null } : {}),
            ...(data.address !== undefined ? { address: data.address as string | null } : {}),
            ...(data.city !== undefined ? { city: data.city as string | null } : {}),
            ...(data.state !== undefined ? { state: data.state as string | null } : {}),
            ...(data.zip !== undefined ? { zip: data.zip as string | null } : {}),
            ...(data.assignedRepId !== undefined ? { assignedRepId: data.assignedRepId as string | null } : {}),
            ...(data.monthlyGoal !== undefined ? { monthlyGoal: data.monthlyGoal ? Number(data.monthlyGoal) : null } : {}),
            ...(data.notes !== undefined ? { notes: data.notes as string | null } : {}),
            ...(data.active !== undefined ? { active: Boolean(data.active) } : {}),
          } as never,
        });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "UPDATE", resource: "ReferralSource", resourceId: updated.id, diff: { before, after: updated } });
        return NextResponse.json({ ok: true, result: updated, summary: `Updated referral source ${updated.name}` });
      }

      case "delete_referral_source": {
        if (!body.targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 });
        const before = await prisma.referralSource.findUnique({ where: { id: body.targetId } });
        await prisma.referralSource.delete({ where: { id: body.targetId } });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "DELETE", resource: "ReferralSource", resourceId: body.targetId, diff: { before } });
        return NextResponse.json({ ok: true, summary: `Deleted referral source ${body.targetId}` });
      }

      case "create_lead": {
        const data = only<Record<string, unknown>>(body.data, ["hospitalName", "systemName", "hospitalType", "bedCount", "state", "city", "contactName", "contactEmail", "contactPhone", "contactTitle", "serviceInterest", "estimatedValue", "notes", "status", "source", "priority", "nextFollowUp", "assignedRepId"]);
        if (!data.hospitalName) return NextResponse.json({ error: "hospitalName is required" }, { status: 400 });
        const created = await prisma.lead.create({
          data: {
            hospitalName: String(data.hospitalName),
            systemName: (data.systemName as string | undefined) ?? null,
            hospitalType: (data.hospitalType as string | undefined) ? (data.hospitalType as string) as never : null,
            bedCount: data.bedCount ? Number(data.bedCount) : null,
            state: (data.state as string | undefined) ?? null,
            city: (data.city as string | undefined) ?? null,
            contactName: (data.contactName as string | undefined) ?? null,
            contactEmail: (data.contactEmail as string | undefined) ?? null,
            contactPhone: (data.contactPhone as string | undefined) ?? null,
            contactTitle: (data.contactTitle as string | undefined) ?? null,
            serviceInterest: (data.serviceInterest as string | undefined) ?? null,
            estimatedValue: data.estimatedValue ? Number(data.estimatedValue) : null,
            notes: (data.notes as string | undefined) ?? null,
            status: String(data.status ?? "NEW").toUpperCase() as never,
            source: String(data.source ?? "OTHER").toUpperCase() as never,
            priority: String(data.priority ?? "MEDIUM").toUpperCase() as never,
            nextFollowUp: data.nextFollowUp ? new Date(String(data.nextFollowUp)) : null,
            assignedRepId: (data.assignedRepId as string | undefined) ?? null,
          },
        });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "CREATE", resource: "Lead", resourceId: created.id, diff: { after: created } });
        return NextResponse.json({ ok: true, result: created, summary: `Created lead ${created.hospitalName}` });
      }

      case "update_lead": {
        if (!body.targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 });
        const data = only<Record<string, unknown>>(body.data, ["hospitalName", "systemName", "hospitalType", "bedCount", "state", "city", "contactName", "contactEmail", "contactPhone", "contactTitle", "serviceInterest", "estimatedValue", "notes", "status", "source", "priority", "nextFollowUp", "assignedRepId"]);
        const before = await prisma.lead.findUnique({ where: { id: body.targetId } });
        const updated = await prisma.lead.update({
          where: { id: body.targetId },
          data: {
            ...(data.hospitalName !== undefined ? { hospitalName: String(data.hospitalName) } : {}),
            ...(data.systemName !== undefined ? { systemName: data.systemName as string | null } : {}),
            ...(data.hospitalType !== undefined ? { hospitalType: data.hospitalType as string | null } : {}),
            ...(data.bedCount !== undefined ? { bedCount: data.bedCount ? Number(data.bedCount) : null } : {}),
            ...(data.state !== undefined ? { state: data.state as string | null } : {}),
            ...(data.city !== undefined ? { city: data.city as string | null } : {}),
            ...(data.contactName !== undefined ? { contactName: data.contactName as string | null } : {}),
            ...(data.contactEmail !== undefined ? { contactEmail: data.contactEmail as string | null } : {}),
            ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone as string | null } : {}),
            ...(data.contactTitle !== undefined ? { contactTitle: data.contactTitle as string | null } : {}),
            ...(data.serviceInterest !== undefined ? { serviceInterest: data.serviceInterest as string | null } : {}),
            ...(data.estimatedValue !== undefined ? { estimatedValue: data.estimatedValue ? Number(data.estimatedValue) : null } : {}),
            ...(data.notes !== undefined ? { notes: data.notes as string | null } : {}),
            ...(data.status !== undefined ? { status: String(data.status).toUpperCase() as never } : {}),
            ...(data.source !== undefined ? { source: String(data.source).toUpperCase() as never } : {}),
            ...(data.priority !== undefined ? { priority: String(data.priority).toUpperCase() as never } : {}),
            ...(data.nextFollowUp !== undefined ? { nextFollowUp: data.nextFollowUp ? new Date(String(data.nextFollowUp)) : null } : {}),
            ...(data.assignedRepId !== undefined ? { assignedRepId: data.assignedRepId as string | null } : {}),
          } as never,
        });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "UPDATE", resource: "Lead", resourceId: updated.id, diff: { before, after: updated } });
        return NextResponse.json({ ok: true, result: updated, summary: `Updated lead ${updated.id}` });
      }

      case "delete_lead": {
        if (!body.targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 });
        const before = await prisma.lead.findUnique({ where: { id: body.targetId } });
        await prisma.lead.delete({ where: { id: body.targetId } });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "DELETE", resource: "Lead", resourceId: body.targetId, diff: { before } });
        return NextResponse.json({ ok: true, summary: `Deleted lead ${body.targetId}` });
      }

      case "create_opportunity": {
        const data = only<Record<string, unknown>>(body.data, ["title", "hospitalId", "assignedRepId", "stage", "serviceLine", "value", "closeDate", "priority", "description", "notes"]);
        if (!data.title || !data.hospitalId) return NextResponse.json({ error: "title and hospitalId are required" }, { status: 400 });
        const created = await prisma.opportunity.create({
          data: {
            title: String(data.title),
            hospitalId: String(data.hospitalId),
            assignedRepId: (data.assignedRepId as string | undefined) ?? null,
            stage: String(data.stage ?? "INQUIRY").toUpperCase() as never,
            serviceLine: String(data.serviceLine ?? "OTHER").toUpperCase() as never,
            value: data.value ? Number(data.value) : null,
            closeDate: data.closeDate ? new Date(String(data.closeDate)) : null,
            priority: String(data.priority ?? "MEDIUM").toUpperCase() as never,
            description: (data.description as string | undefined) ?? null,
            notes: (data.notes as string | undefined) ?? null,
          },
        });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "CREATE", resource: "Opportunity", resourceId: created.id, diff: { after: created } });
        return NextResponse.json({ ok: true, result: created, summary: `Created opportunity ${created.title}` });
      }

      case "update_opportunity": {
        if (!body.targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 });
        const data = only<Record<string, unknown>>(body.data, ["title", "hospitalId", "assignedRepId", "stage", "serviceLine", "value", "closeDate", "priority", "description", "notes"]);
        const before = await prisma.opportunity.findUnique({ where: { id: body.targetId } });
        const updated = await prisma.opportunity.update({
          where: { id: body.targetId },
          data: {
            ...(data.title !== undefined ? { title: String(data.title) } : {}),
            ...(data.hospitalId !== undefined ? { hospitalId: String(data.hospitalId) } : {}),
            ...(data.assignedRepId !== undefined ? { assignedRepId: data.assignedRepId as string | null } : {}),
            ...(data.stage !== undefined ? { stage: String(data.stage).toUpperCase() as never } : {}),
            ...(data.serviceLine !== undefined ? { serviceLine: String(data.serviceLine).toUpperCase() as never } : {}),
            ...(data.value !== undefined ? { value: data.value ? Number(data.value) : null } : {}),
            ...(data.closeDate !== undefined ? { closeDate: data.closeDate ? new Date(String(data.closeDate)) : null } : {}),
            ...(data.priority !== undefined ? { priority: String(data.priority).toUpperCase() as never } : {}),
            ...(data.description !== undefined ? { description: data.description as string | null } : {}),
            ...(data.notes !== undefined ? { notes: data.notes as string | null } : {}),
          } as never,
        });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "UPDATE", resource: "Opportunity", resourceId: updated.id, diff: { before, after: updated } });
        return NextResponse.json({ ok: true, result: updated, summary: `Updated opportunity ${updated.id}` });
      }

      case "delete_opportunity": {
        if (!body.targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 });
        const before = await prisma.opportunity.findUnique({ where: { id: body.targetId } });
        await prisma.opportunity.delete({ where: { id: body.targetId } });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "DELETE", resource: "Opportunity", resourceId: body.targetId, diff: { before } });
        return NextResponse.json({ ok: true, summary: `Deleted opportunity ${body.targetId}` });
      }

      case "create_activity": {
        const data = only<Record<string, unknown>>(body.data, ["type", "subject", "notes", "leadId", "hospitalId", "referralSourceId", "opportunityId", "contactName", "contactEmail", "duration", "outcome", "nextFollowUp"]);
        if (!data.type) return NextResponse.json({ error: "type is required" }, { status: 400 });
        const created = await prisma.activity.create({
          data: {
            type: String(data.type).toUpperCase() as never,
            subject: (data.subject as string | undefined) ?? null,
            notes: (data.notes as string | undefined) ?? null,
            leadId: (data.leadId as string | undefined) ?? null,
            hospitalId: (data.hospitalId as string | undefined) ?? null,
            referralSourceId: (data.referralSourceId as string | undefined) ?? null,
            opportunityId: (data.opportunityId as string | undefined) ?? null,
            contactName: (data.contactName as string | undefined) ?? null,
            contactEmail: (data.contactEmail as string | undefined) ?? null,
            duration: data.duration ? Number(data.duration) : null,
            outcome: (data.outcome as string | undefined) ?? null,
            nextFollowUp: data.nextFollowUp ? new Date(String(data.nextFollowUp)) : null,
            createdByUserId: session.user.id,
          },
        });
        await logAudit({ userId: session.user.id, userEmail: session.user.email, userName: session.user.name, action: "CREATE", resource: "Activity", resourceId: created.id, diff: { after: created } });
        return NextResponse.json({ ok: true, result: created, summary: `Logged activity: ${created.type}${created.subject ? ` — ${created.subject}` : ""}` });
      }

      default:
        return NextResponse.json({ error: "Unsupported intent" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Action failed" }, { status: 500 });
  }
}
