import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";

export const maxDuration = 60;
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

type ParsedSheet = {
  rows: Record<string, unknown>[];
  columns: string[];
};

type DuplicateMode = "skip" | "update";

type PreviewSample = { action: "create" | "update" | "skip"; reason?: string; fields: Record<string, string> };
const MAX_PREVIEW = 10;

// ─── column alias maps ─────────────────────────────────────────────────────────

function normalizeKey(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  const s = String(v).trim();
  return s !== "" && s !== "undefined" && s !== "null";
}

function col(row: Record<string, unknown>, ...keys: string[]): string {
  const normalized = Object.entries(row).map(([k, v]) => ({ k, nk: normalizeKey(k), v }));
  for (const k of keys) {
    const direct = row[k];
    if (hasValue(direct)) return String(direct).trim();

    const nk = normalizeKey(k);
    const found = normalized.find((entry) => entry.nk === nk && hasValue(entry.v));
    if (found) {
      return String(found.v).trim();
    }
  }
  return "";
}

function colByHeaderToken(row: Record<string, unknown>, ...tokens: string[]): string {
  const normalizedTokens = tokens.map((t) => normalizeKey(t));
  for (const [header, value] of Object.entries(row)) {
    if (!hasValue(value)) continue;
    const key = normalizeKey(header);
    if (normalizedTokens.some((t) => key.includes(t))) {
      return String(value).trim();
    }
  }
  return "";
}

function firstMeaningfulValue(row: Record<string, unknown>): string {
  const firstEntry = Object.entries(row).find(([, v]) => hasValue(v) && String(v).trim().length > 1);
  return firstEntry ? String(firstEntry[1]).trim() : "";
}

function normalizeMondayCellText(value: string): string {
  let out = String(value ?? "").trim();
  if (!out) return "";

  // Monday linked/board columns sometimes export as JSON-like strings.
  if ((out.startsWith("{") && out.endsWith("}")) || (out.startsWith("[") && out.endsWith("]"))) {
    try {
      const parsed = JSON.parse(out) as unknown;
      if (typeof parsed === "string") return parsed.trim();
      if (Array.isArray(parsed)) {
        const firstText = parsed.find((v) => typeof v === "string" && v.trim()) as string | undefined;
        if (firstText) return firstText.trim();
      }
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        const fromText = [obj.text, obj.label, obj.name].find((v) => typeof v === "string" && String(v).trim()) as string | undefined;
        if (fromText) return fromText.trim();
      }
    } catch {
      // leave original value
    }
  }

  // Trim leading emoji/symbol noise and common separators that appear in exports.
  out = out.replace(/^[^A-Za-z0-9]+/, "").replace(/^[-:|]+\s*/, "").trim();
  return out;
}

function parseSpreadsheetDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    }
  }

  const raw = String(value ?? "").trim();
  if (!raw) return undefined;

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 20000) {
    const parsed = XLSX.SSF.parse_date_code(asNumber);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    }
  }

  const parsedDate = new Date(raw);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}

function extractBudgetSectionLabel(value: string): string {
  const normalized = normalizeMondayCellText(value);
  if (!/^marketing budget\b/i.test(normalized)) return "";
  return normalized.replace(/^marketing budget\b/i, "").trim();
}

function formatBudgetPeriod(startDate?: Date, explicitLabel?: string): string {
  const normalizedLabel = normalizeMondayCellText(explicitLabel || "");
  if (normalizedLabel) return normalizedLabel;
  if (!startDate) return "";
  return startDate.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function parseCityStateZip(location: string): { city?: string; state?: string; zip?: string } {
  const raw = String(location || "").trim();
  if (!raw) return {};

  // Common shapes: "Phoenix, AZ", "Phoenix, Arizona 85016", "Phoenix AZ 85016"
  const withComma = raw.match(/^(.+?),\s*([A-Za-z]{2}|[A-Za-z ]+?)(?:\s+(\d{5}(?:-\d{4})?))?$/);
  if (withComma) {
    return {
      city: withComma[1]?.trim() || undefined,
      state: withComma[2]?.trim() || undefined,
      zip: withComma[3]?.trim() || undefined,
    };
  }

  const plain = raw.match(/^(.+?)\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (plain) {
    return {
      city: plain[1]?.trim() || undefined,
      state: plain[2]?.trim() || undefined,
      zip: plain[3]?.trim() || undefined,
    };
  }

  return { city: raw };
}

function isPlaceholderHeader(v: unknown): boolean {
  const s = String(v ?? "").trim();
  if (!s) return true;
  const upper = s.toUpperCase();
  return upper.startsWith("__EMPTY") || /^COLUMN_\d+$/i.test(s) || /^COL_\d+$/i.test(s);
}

function detectHeaderRow(matrix: unknown[][]): number {
  const scanLimit = Math.min(25, matrix.length);
  const headerHints = [
    "name", "account", "facility", "hospital", "organization", "company", "email", "phone",
    "title", "department", "owner", "assigned", "type", "status", "date", "timeline", "notes",
  ];

  for (let i = 0; i < scanLimit; i++) {
    const row = Array.isArray(matrix[i]) ? matrix[i] : [];
    const cells = row.map((v) => normalizeKey(String(v ?? ""))).filter(Boolean);
    if (cells.length < 2) continue;
    const hintCount = cells.filter((c) => headerHints.some((h) => c.includes(h))).length;
    if (hintCount >= 2) return i;
  }

  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(20, matrix.length); i++) {
    const row = Array.isArray(matrix[i]) ? matrix[i] : [];
    const cells = row.map((v) => String(v ?? "").trim()).filter(Boolean);
    if (!cells.length) continue;

    const normalized = cells.map((c) => normalizeKey(c));
    const alphaCount = cells.filter((c) => /[A-Za-z]/.test(c)).length;
    const longCount = cells.filter((c) => c.length > 60).length;
    const hintCount = normalized.filter((c) => headerHints.some((h) => c.includes(h))).length;
    const placeholderCount = cells.filter((c) => isPlaceholderHeader(c)).length;
    const uniqueCount = new Set(normalized.filter(Boolean)).size;

    // Header rows are usually: many short labels, diverse values, multiple known hint tokens,
    // and very few placeholder labels like __EMPTY.
    const score =
      cells.length * 2 +
      alphaCount +
      hintCount * 6 +
      uniqueCount -
      longCount * 3 -
      placeholderCount * 5;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  // Guard against title/banner rows like: ["Accounts", "", "", ...]
  const bestRow = Array.isArray(matrix[bestIdx]) ? matrix[bestIdx] : [];
  const bestMeaningful = bestRow.filter((v) => hasValue(v) && !isPlaceholderHeader(v)).length;
  if (bestMeaningful <= 1 && bestIdx + 1 < matrix.length) {
    const nextRow = Array.isArray(matrix[bestIdx + 1]) ? matrix[bestIdx + 1] : [];
    const nextMeaningful = nextRow.filter((v) => hasValue(v) && !isPlaceholderHeader(v)).length;
    if (nextMeaningful >= 2) return bestIdx + 1;
  }

  return bestIdx;
}

function matrixToRows(matrix: unknown[][]): ParsedSheet {
  if (!matrix.length) return { rows: [], columns: [] };

  const headerIdx = detectHeaderRow(matrix);
  const rawHeaders = Array.isArray(matrix[headerIdx]) ? matrix[headerIdx] : [];
  const populatedHeaders = rawHeaders.filter((h) => hasValue(h));
  const meaningfulHeaders = populatedHeaders.filter((h) => !isPlaceholderHeader(h));

  if (populatedHeaders.length > 0 && meaningfulHeaders.length < 2) {
    throw new Error(
      "Could not detect valid column headers. The file appears to contain placeholder headers (for example __EMPTY). Please export again from Monday and ensure the actual header row is included."
    );
  }

  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h, i) => {
    const baseRaw = String(h ?? "").trim();
    const base = !isPlaceholderHeader(baseRaw) ? baseRaw : `column_${i + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count > 1 ? `${base}_${count}` : base;
  });

  const rows: Record<string, unknown>[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = Array.isArray(matrix[i]) ? matrix[i] : [];
    if (!row.some((v) => hasValue(v))) continue;
    const out: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      out[h] = row[idx] ?? "";
    });
    rows.push(out);
  }

  return { rows, columns: headers };
}

function bestSheetMatrix(workbook: XLSX.WorkBook): unknown[][] {
  let best: unknown[][] = [];
  let bestScore = -1;

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false, blankrows: false }) as unknown[][];
    if (!matrix.length) continue;

    const nonEmptyRows = matrix.filter((row) => Array.isArray(row) && row.some((v) => hasValue(v))).length;
    const maxCols = matrix.reduce((m, row) => Math.max(m, Array.isArray(row) ? row.length : 0), 0);
    const headerIdx = detectHeaderRow(matrix);
    const headerRow = Array.isArray(matrix[headerIdx]) ? matrix[headerIdx] : [];
    const meaningfulHeaders = headerRow.filter((v) => hasValue(v) && !isPlaceholderHeader(v)).length;

    const score = nonEmptyRows * 3 + meaningfulHeaders * 8 + maxCols;
    if (score > bestScore) {
      bestScore = score;
      best = matrix;
    }
  }

  return best;
}

async function parseSheet(file: File): Promise<ParsedSheet> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(`File is too large (${Math.round(file.size / (1024 * 1024))} MB). Max is 8 MB.`);
  }

  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv") || file.type.includes("text");
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  try {
    const wb = XLSX.read(data, { type: "array", cellText: false, cellNF: false, cellHTML: false, sheetRows: 10000, dense: true, WTF: false });
    const matrix = bestSheetMatrix(wb);
    return matrixToRows(matrix);
  } catch {
    if (!isCsv) {
      throw new Error("Could not parse this spreadsheet. Please re-export from Monday as CSV or XLSX.");
    }
    const text = Buffer.from(data).toString("utf8");
    const wb = XLSX.read(text, { type: "string", raw: false, dense: true, WTF: false });
    const matrix = bestSheetMatrix(wb);
    return matrixToRows(matrix);
  }
}

// ─── individual importers ──────────────────────────────────────────────────────

async function importAccounts(rows: Record<string, unknown>[], dryRun = false, duplicateMode: DuplicateMode = "update") {
  let created = 0, updated = 0, skipped = 0;
  const errors: string[] = [];
  const skipReasons: Record<string, number> = {};
  const preview: PreviewSample[] = [];

  for (const row of rows) {
    // Try known aliases, then fall back to the very first non-empty column
    const rawName = col(row,
      "Client",
      "Account Name", "Name", "Organization", "Company",
      "Hospital Name", "Facility Name", "Account", "Title",
      "Item", "Item Name", "Board Item"
    ) || colByHeaderToken(row, "account", "facility", "hospital", "organization", "company", "name");
    let name = normalizeMondayCellText(rawName);
    if (!name) {
      // Monday.com: first column is usually the item name regardless of label
      const firstEntry = Object.entries(row).find(([k, v]) => {
        const nk = normalizeKey(k);
        if (nk.includes("subitem") || nk.includes("timeline") || nk.includes("priority")) return false;
        const s = String(v ?? "").trim();
        return s.length > 1 && s !== "undefined" && s !== "null";
      });
      name = firstEntry ? normalizeMondayCellText(String(firstEntry[1])) : "";
    }
    if (!name || normalizeKey(name) === "client") {
      skipped++;
      skipReasons["no name found"] = (skipReasons["no name found"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "no name found", fields: {} });
      continue;
    }

    const type = normalizeMondayCellText(col(row, "Account Type", "Type", "Facility Type", "Type of Facility") || colByHeaderToken(row, "facility type"));
    const location = normalizeMondayCellText(col(row, "Location", "Address", "Billing Address", "City, State"));
    const parsedLocation = parseCityStateZip(location);
    const city  = normalizeMondayCellText(col(row, "Billing City", "City") || parsedLocation.city || "");
    const state = normalizeMondayCellText(col(row, "Billing State", "State", "Billing State/Province") || parsedLocation.state || "");
    const zip   = normalizeMondayCellText(col(row, "Billing Zip", "Zip", "Billing Postal Code", "Postal Code") || parsedLocation.zip || "");
    const phone = normalizeMondayCellText(col(row, "Phone", "Main Phone", "Billing Phone"));
    const npi   = normalizeMondayCellText(col(row, "NPI", "NPI Number"));
    const beds  = col(row, "Bed Count", "Beds", "Number of Beds", "NumberOfEmployees");
    const notes = normalizeMondayCellText(col(row, "Description", "Notes", "Comments"));
    const contactName  = normalizeMondayCellText(col(row, "Primary Contact", "Contact Name", "Main Contact", "Contacts") || colByHeaderToken(row, "contact", "owner", "person"));
    const contactTitle = normalizeMondayCellText(col(row, "Contact Title", "Primary Contact Title", "Title"));
    const contactEmail = normalizeMondayCellText(col(row, "Contact Email", "Primary Email", "Email", "E-mail"));
    const contactPhone = normalizeMondayCellText(col(row, "Contact Phone", "Primary Phone"));

    try {
      const existing = await prisma.hospital.findFirst({
        where: { hospitalName: { equals: name, mode: "insensitive" } },
      });

      const updateData = {
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
        ...(zip ? { zip } : {}),
        ...(npi ? { npi } : {}),
        ...(beds ? { bedCount: parseInt(beds) || undefined } : {}),
        ...(notes ? { notes } : {}),
        ...(contactName ? { primaryContactName: contactName } : {}),
        ...(contactTitle ? { primaryContactTitle: contactTitle } : {}),
        ...(contactEmail ? { primaryContactEmail: contactEmail } : {}),
        ...((contactPhone || phone) ? { primaryContactPhone: contactPhone || phone } : {}),
        ...(type ? { hospitalType: mapFacilityType(type) } : {}),
      };

      if (existing) {
        if (duplicateMode === "update") {
          if (!dryRun) {
            await prisma.hospital.update({
              where: { id: existing.id },
              data: updateData,
            });
          }
          updated++;
          if (preview.length < MAX_PREVIEW) {
            preview.push({
              action: "update",
              fields: Object.fromEntries([
                ["Name", name], ["City", city], ["State", state], ["Phone", phone],
                ["NPI", npi], ["Beds", beds], ["Primary Contact", contactName],
              ].filter(([, v]) => v)),
            });
          }
        } else {
          skipped++;
          skipReasons["already exists"] = (skipReasons["already exists"] ?? 0) + 1;
          if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "already exists", fields: { Name: name } });
        }
        continue;
      }

      if (!dryRun) {
        await prisma.hospital.create({
          data: {
            hospitalName: name,
            city: city || undefined,
            state: state || undefined,
            zip: zip || undefined,
            npi: npi || undefined,
            bedCount: beds ? parseInt(beds) || undefined : undefined,
            notes: notes || undefined,
            primaryContactName: contactName || undefined,
            primaryContactTitle: contactTitle || undefined,
            primaryContactEmail: contactEmail || undefined,
            primaryContactPhone: contactPhone || phone || undefined,
            hospitalType: mapFacilityType(type),
            status: "PROSPECT",
            user: {
              create: {
                email: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@noreply.import`,
                name: contactName || name,
                role: "ACCOUNT",
              },
            },
          },
        });
      }
      created++;
      if (preview.length < MAX_PREVIEW) {
        preview.push({ action: "create", fields: Object.fromEntries([
          ["Name", name], ["City", city], ["State", state], ["Phone", phone],
          ["NPI", npi], ["Beds", beds], ["Primary Contact", contactName],
        ].filter(([, v]) => v)) });
      }
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { created, updated, skipped, errors, skipReasons, preview };
}

async function importContacts(rows: Record<string, unknown>[], dryRun = false, duplicateMode: DuplicateMode = "skip") {
  let created = 0, updated = 0, skipped = 0;
  const errors: string[] = [];
  const skipReasons: Record<string, number> = {};
  const preview: PreviewSample[] = [];

  for (const row of rows) {
    const activitySignal = col(row, "Activity Type", "Timeline", "Due Date", "Completed Date", "Subitem", "Update") || colByHeaderToken(row, "timeline", "activity", "subitem", "due date");
    const contactSignal = col(row, "Email", "Phone", "Contact Name", "First Name", "Last Name") || colByHeaderToken(row, "email", "phone", "contact", "person");
    if (activitySignal && !contactSignal) {
      skipped++;
      skipReasons["looks like activity rows - import this file in Activities"] = (skipReasons["looks like activity rows - import this file in Activities"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "looks like activity row", fields: { "First signal": activitySignal } });
      continue;
    }

    const first = col(row, "First Name", "First", "FirstName");
    const last  = col(row, "Last Name", "Last", "LastName");
    const rawName = col(row, "Contact", "Name", "Full Name", "Contact Name", "Person", "People") || `${first} ${last}`.trim() || firstMeaningfulValue(row);
    const name = normalizeMondayCellText(rawName);
    if (!name || name === " " || normalizeKey(name) === "contact") {
      skipped++;
      skipReasons["no name"] = (skipReasons["no name"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "no name", fields: {} });
      continue;
    }

    const rawAccountName = col(row,
      "Account Name", "Organization", "Company", "Hospital", "Facility",
      "Account", "Linked Account", "Accounts", "Board", "Board Item",
      "Referral Source", "Facility Name", "Hospital Name", "Site", "Partner"
    ) || colByHeaderToken(row, "account", "facility", "hospital", "organization", "company", "site", "partner", "board");
    const accountName = normalizeMondayCellText(rawAccountName);
    const title       = col(row, "Title", "Job Title", "Position", "Role");
    const email       = col(row, "Email", "Work Email", "E-mail", "Email Address");
    const phone       = col(row, "Phone", "Work Phone", "Mobile", "Cell", "Direct", "Phone Number");
    const department  = col(row, "Department", "Dept", "Division");
    const notes       = col(row, "Description", "Notes", "Comments", "Body");
    const typeStr     = col(row, "Contact Type", "Type", "Role");

    if (!accountName) {
      skipped++;
      skipReasons["no account name column"] = (skipReasons["no account name column"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "no account name", fields: { Name: name } });
      continue;
    }

    // Find matching hospital — try contains first, then word-by-word fuzzy match
    let hospital = await prisma.hospital.findFirst({
      where: { hospitalName: { contains: accountName, mode: "insensitive" } },
    });
    if (!hospital) {
      // Try matching on the first significant word (handles truncated / abbreviated names)
      const firstWord = accountName.split(/\s+/)[0];
      if (firstWord.length >= 4) {
        hospital = await prisma.hospital.findFirst({
          where: { hospitalName: { contains: firstWord, mode: "insensitive" } },
        });
      }
    }
    const hospitalId = hospital?.id;

    if (!hospitalId) {
      skipped++;
      const key = `no match for "${accountName.slice(0, 40)}"`;
      skipReasons[key] = (skipReasons[key] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: `no facility matched "${accountName.slice(0, 30)}"`, fields: { Name: name } });
      continue;
    }

    const existingContact = await prisma.contact.findFirst({
      where: {
        hospitalId,
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
        ],
      },
    });

    if (existingContact) {
      if (duplicateMode === "update") {
        try {
          if (!dryRun) {
            await prisma.contact.update({
              where: { id: existingContact.id },
              data: {
                title: title || undefined,
                email: email || undefined,
                phone: phone || undefined,
                department: department || undefined,
                notes: notes || undefined,
                type: mapContactType(typeStr),
              },
            });
          }
          updated++;
          if (preview.length < MAX_PREVIEW) {
            preview.push({ action: "update", fields: Object.fromEntries([
              ["Name", name], ["Title", title], ["Email", email], ["Phone", phone],
              ["Account", accountName], ["Department", department],
            ].filter(([, v]) => v)) });
          }
        } catch (e) {
          errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        skipped++;
        skipReasons["already exists"] = (skipReasons["already exists"] ?? 0) + 1;
        if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "already exists", fields: { Name: name } });
      }
      continue;
    }

    try {
      if (!dryRun) {
        await prisma.contact.create({
          data: {
            hospitalId,
            name,
            title: title || undefined,
            email: email || undefined,
            phone: phone || undefined,
            department: department || undefined,
            notes: notes || undefined,
            type: mapContactType(typeStr),
          },
        });
      }
      created++;
      if (preview.length < MAX_PREVIEW) {
        preview.push({ action: "create", fields: Object.fromEntries([
          ["Name", name], ["Title", title], ["Email", email], ["Phone", phone],
          ["Account", accountName], ["Department", department],
        ].filter(([, v]) => v)) });
      }
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { created, updated, skipped, errors, skipReasons, preview };
}

/** Filter out Monday.com board description text and stray column-header rows */
function isJunkActivitySubject(s: string): boolean {
  const lower = s.toLowerCase().trim();
  // Monday board boilerplate descriptions
  if (lower.includes("activities board shows all") || lower.includes("emails & activities in the page")) return true;
  // Bare column headers that slip through
  if (/^(name|account activities|account|type|date|notes|subject|description|status|activity)$/i.test(s.trim())) return true;
  return false;
}

async function importActivities(rows: Record<string, unknown>[], dryRun = false, duplicateMode: DuplicateMode = "skip") {
  let created = 0, updated = 0, skipped = 0;
  const errors: string[] = [];
  const skipReasons: Record<string, number> = {};
  const preview: PreviewSample[] = [];

  const reps = await prisma.rep.findMany({ include: { user: true } });

  for (const row of rows) {
    // Try known aliases; if nothing matches, fall back to the first non-empty column
    // (Monday.com exports the item name as whatever the board column is called)
    let subject = col(row, "Subject", "Activity", "Account Activities", "Activities", "Title", "Name", "Description",
      "Item", "Task", "Task Name", "Item Name", "Board Item", "Activity Name", "Log", "Summary",
      "Event", "Action", "Record", "Entry");
    if (!subject) {
      subject = firstMeaningfulValue(row);
    }
    subject = normalizeMondayCellText(subject);
    if (!subject) {
      skipped++;
      skipReasons["completely empty row"] = (skipReasons["completely empty row"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "empty row", fields: {} });
      continue;
    }

    // Skip Monday board description text and stray column-header rows
    if (isJunkActivitySubject(subject)) {
      skipped++;
      skipReasons["metadata/header row"] = (skipReasons["metadata/header row"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "metadata/header row", fields: { Subject: subject.slice(0, 80) } });
      continue;
    }

    const typeStr = normalizeMondayCellText(col(row, "Type", "Activity Type", "Call Type", "Subitem", "Status", "Category"));
    const dateStr = col(row, "Date", "Due Date", "Completed Date", "ActivityDate", "Close Date",
      "Created", "Last Updated", "Timeline", "Activities timeline", "Date Created");
    let accountName = col(row, "Account Name", "Organization", "Hospital", "Facility",
      "Account", "Accounts", "Client", "Company", "Partner", "Referral Source", "Linked Account");
    accountName = normalizeMondayCellText(accountName);
    const repName   = col(row, "Owner", "Assigned To", "Rep", "Rep Name", "Created By",
      "Assignee", "Person", "Team Member");
    const notes     = normalizeMondayCellText(col(row, "Description", "Comments", "Notes", "Body", "Details", "Update"));

    // Monday often has "AccountName - ActivityTitle" in a single Name column.
    // If no explicit account column was found, try to split the subject on " - ".
    let resolvedTitle = subject;
    if (!accountName) {
      const dashIdx = subject.indexOf(" - ");
      if (dashIdx > 2 && dashIdx < 80) {
        const potentialAccount = subject.slice(0, dashIdx).trim();
        const potentialTitle   = subject.slice(dashIdx + 3).trim();
        if (potentialTitle) {
          accountName   = potentialAccount;
          resolvedTitle = potentialTitle;
        }
      }
    }

    // Match hospital
    let hospitalId: string | undefined;
    if (accountName) {
      const hosp = await prisma.hospital.findFirst({
        where: { hospitalName: { contains: accountName, mode: "insensitive" } },
      });
      // Try the other direction too: account name contains the stored hospital name
      if (!hosp) {
        const hospAlt = await prisma.hospital.findFirst({
          where: { hospitalName: { contains: accountName.split(" ")[0], mode: "insensitive" } },
        });
        if (hospAlt && accountName.toLowerCase().startsWith(hospAlt.hospitalName.slice(0, 6).toLowerCase())) {
          hospitalId = hospAlt.id;
        }
      } else {
        hospitalId = hosp.id;
      }
    }

    // Match rep by name
    let repId: string | undefined;
    if (repName) {
      const needle = repName.toLowerCase();
      const matched = reps.find((r) => r.user.name?.toLowerCase().includes(needle) || needle.includes(r.user.name?.toLowerCase() ?? "____"));
      repId = matched?.id;
    }

    let completedAt: Date | undefined;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) completedAt = d;
    }

    // Dedup: update or skip when same title + hospital already exists
    const existingActivity = await prisma.activity.findFirst({
      where: {
        title: { equals: resolvedTitle.slice(0, 255), mode: "insensitive" },
        ...(hospitalId ? { hospitalId } : {}),
      },
    });
    if (existingActivity) {
      if (duplicateMode === "update") {
        try {
          if (!dryRun) {
            await prisma.activity.update({
              where: { id: existingActivity.id },
              data: {
                type: mapActivityType(typeStr),
                notes: notes || undefined,
                hospitalId: hospitalId ?? existingActivity.hospitalId ?? undefined,
                repId: repId ?? existingActivity.repId ?? undefined,
                completedAt: completedAt ?? existingActivity.completedAt ?? new Date(),
              },
            });
          }
          updated++;
          if (preview.length < MAX_PREVIEW) {
            preview.push({ action: "update", fields: Object.fromEntries([
              ["Subject", resolvedTitle.slice(0, 80)], ["Type", mapActivityType(typeStr)],
              ["Date", dateStr], ["Account", accountName], ["Rep", repName],
            ].filter(([, v]) => v)) });
          }
        } catch (e) {
          errors.push(`${subject}: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        skipped++;
        skipReasons["already exists"] = (skipReasons["already exists"] ?? 0) + 1;
        if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "already exists", fields: { Subject: resolvedTitle.slice(0, 80) } });
      }
      continue;
    }

    try {
      if (!dryRun) {
        await prisma.activity.create({
          data: {
            type: mapActivityType(typeStr),
            title: resolvedTitle.slice(0, 255),
            notes: notes || undefined,
            hospitalId: hospitalId ?? undefined,
            repId: repId ?? undefined,
            completedAt: completedAt ?? new Date(),
          },
        });
      }
      created++;
      if (preview.length < MAX_PREVIEW) {
        preview.push({ action: "create", fields: Object.fromEntries([
          ["Subject", resolvedTitle.slice(0, 80)], ["Type", mapActivityType(typeStr)],
          ["Date", dateStr], ["Account", accountName], ["Rep", repName],
        ].filter(([, v]) => v)) });
      }
    } catch (e) {
      errors.push(`${subject}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { created, updated, skipped, errors, skipReasons, preview };
}

async function importLeads(rows: Record<string, unknown>[], dryRun = false, duplicateMode: DuplicateMode = "skip") {
  let created = 0, updated = 0, skipped = 0;
  const errors: string[] = [];
  const skipReasons: Record<string, number> = {};
  const preview: PreviewSample[] = [];

  for (const row of rows) {
    let hospitalName = col(row, "Lead", "Hospital Name", "Hospital", "Lead Name", "Prospect", "Company", "Organization", "Account Name");
    hospitalName = normalizeMondayCellText(hospitalName);
    if (!hospitalName) {
      skipped++;
      skipReasons["missing lead name"] = (skipReasons["missing lead name"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "missing lead name", fields: {} });
      continue;
    }

    const status = col(row, "Status") || "NEW";
    const contactName = normalizeMondayCellText(col(row, "Contact Name", "Name", "Contact", "Primary Contact", "POC"));
    const contactEmail = col(row, "Email", "Contact Email", "Email Address");
    const contactPhone = col(row, "Phone", "Contact Phone", "Phone Number");
    const contactTitle = normalizeMondayCellText(col(row, "Title", "Contact Title", "Position", "Role"));
    const serviceInterest = normalizeMondayCellText(col(row, "Service Interest", "Services", "Interest", "Service Line", "Interested In"));
    const estValueStr = col(row, "Estimated Value", "Value", "Est Value", "Potential Value");
    const estimatedValue = estValueStr ? parseFloat(estValueStr) : undefined;
    const notes = normalizeMondayCellText(col(row, "Notes", "Description", "Comments", "Details"));
    const _lastInteractionStr = col(row, "Last Interaction", "Last Activity", "Last Contact", "Last Touchpoint", "Last Date");

    // Detect duplicates by hospitalName
    let existingLead = null;
    if (duplicateMode === "update") {
      existingLead = await prisma.lead.findFirst({
        where: { hospitalName: { contains: hospitalName, mode: "insensitive" } },
      });
    }

    if (existingLead && duplicateMode === "update") {
      try {
        if (!dryRun) {
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              ...(contactName && { contactName }),
              ...(contactEmail && { contactEmail }),
              ...(contactPhone && { contactPhone }),
              ...(contactTitle && { contactTitle }),
              ...(serviceInterest && { serviceInterest }),
              ...(estimatedValue && { estimatedValue: new Prisma.Decimal(estimatedValue) }),
              ...(notes && { notes }),
            },
          });
        }
        updated++;
        if (preview.length < MAX_PREVIEW) preview.push({ action: "update", fields: { Lead: hospitalName } });
      } catch (e) {
        errors.push(`Failed to update lead: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else if (existingLead) {
      skipped++;
      skipReasons["already exists"] = (skipReasons["already exists"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "already exists", fields: { Lead: hospitalName } });
    } else {
      try {
        if (!dryRun) {
          const leadStatus: "NEW" | "CONTACTED" | "QUALIFIED" = status.toUpperCase() === "QUALIFIED" ? "QUALIFIED" : status.toUpperCase() === "CONTACTED" ? "CONTACTED" : "NEW";
          await prisma.lead.create({
            data: {
              hospitalName,
              status: leadStatus,
              contactName: contactName || undefined,
              contactEmail: contactEmail || undefined,
              contactPhone: contactPhone || undefined,
              contactTitle: contactTitle || undefined,
              serviceInterest: serviceInterest || undefined,
              estimatedValue: estimatedValue ? new Prisma.Decimal(estimatedValue) : undefined,
              notes: notes || undefined,
            },
          });
        }
        created++;
        if (preview.length < MAX_PREVIEW) preview.push({ action: "create", fields: { Lead: hospitalName, Email: contactEmail || "", Phone: contactPhone || "" } });
      } catch (e) {
        errors.push(`Failed to create lead: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { created, updated, skipped, errors, skipReasons, preview };
}

async function importMarketingBudget(rows: Record<string, unknown>[], dryRun = false, duplicateMode: DuplicateMode = "skip") {
  let created = 0, updated = 0, skipped = 0;
  const errors: string[] = [];
  const skipReasons: Record<string, number> = {};
  const preview: PreviewSample[] = [];

  const hospitalCache = new Map<string, { id: string; hospitalName: string } | null>();
  let currentSectionPeriod = "";
  let currentSectionAccount = "";
  let currentSectionPointOfContact = "";
  let currentSectionStartDate: Date | undefined;

  async function findHospitalByName(name: string) {
    const normalizedName = normalizeMondayCellText(name);
    if (!normalizedName) return null;
    const cacheKey = normalizeKey(normalizedName);
    if (hospitalCache.has(cacheKey)) return hospitalCache.get(cacheKey) ?? null;

    let hospital = await prisma.hospital.findFirst({
      where: { hospitalName: { equals: normalizedName, mode: "insensitive" } },
      select: { id: true, hospitalName: true },
    });

    if (!hospital) {
      hospital = await prisma.hospital.findFirst({
        where: { hospitalName: { contains: normalizedName, mode: "insensitive" } },
        select: { id: true, hospitalName: true },
      });
    }

    hospitalCache.set(cacheKey, hospital ?? null);
    return hospital ?? null;
  }

  for (const row of rows) {
    let item = normalizeMondayCellText(col(row, "Item", "Item Name", "Budget Item", "Task", "Activity", "Name", "Subitems"));
    const explicitAccountName = normalizeMondayCellText(col(row, "Account", "Hospital", "Facility", "Company", "Organization", "Account Name", "Client"));
    const explicitPointOfContact = normalizeMondayCellText(col(row, "Point of Contact", "POC", "Contact", "Contact Name", "Person", "Point of contact"));
    const explicitPeriodMonth = normalizeMondayCellText(col(row, "Period", "Month", "Period Month", "Time", "Time Period"));
    const explicitStartDate = parseSpreadsheetDate(col(row, "Start Date", "Date", "Due Date", "Timeline", "Activities timeline", "Start Date - Start"));

    const parseMoney = (val: unknown): number | undefined => {
      if (val === undefined || val === null || String(val).trim() === "") return undefined;
      const str = String(val).replace(/[$,]/g, "").trim();
      const num = parseFloat(str);
      return Number.isNaN(num) ? undefined : num;
    };

    const marketingMeals = parseMoney(col(row, "Marketing Meals")) || 0;
    const marketingSupplies = parseMoney(col(row, "Marketing Supplies")) || 0;
    const marketingEvents = parseMoney(col(row, "Marketing Events")) || 0;
    const actualSpend = parseMoney(col(row, "Actual Spend")) || 0;
    const budgeted = parseMoney(col(row, "Budgeted")) || 0;
    const hasMoney = [marketingMeals, marketingSupplies, marketingEvents, actualSpend, budgeted].some((value) => value !== 0);

    const isRepeatedHeader =
      normalizeKey(item) === "name" &&
      normalizeKey(explicitAccountName) === "account" &&
      normalizeKey(explicitPointOfContact) === "point of contact";

    if (isRepeatedHeader) {
      continue;
    }

    const sectionLabel = extractBudgetSectionLabel(item);
    const isSectionTitle = Boolean(sectionLabel) && !explicitAccountName && !explicitPointOfContact && !explicitStartDate && !hasMoney;
    if (isSectionTitle) {
      currentSectionPeriod = sectionLabel;
      currentSectionAccount = "";
      currentSectionPointOfContact = "";
      currentSectionStartDate = undefined;
      continue;
    }

    if (!item && !explicitAccountName && !explicitPointOfContact && !explicitStartDate && !hasMoney) {
      continue;
    }

    if (normalizeKey(item) === "marketing budget" && explicitAccountName) {
      currentSectionAccount = explicitAccountName;
      currentSectionPointOfContact = explicitPointOfContact || currentSectionPointOfContact;
      currentSectionStartDate = explicitStartDate || currentSectionStartDate;
      currentSectionPeriod = explicitPeriodMonth || currentSectionPeriod || formatBudgetPeriod(currentSectionStartDate);
    }

    const startDate = explicitStartDate || currentSectionStartDate;
    const pointOfContact = explicitPointOfContact || currentSectionPointOfContact;
    const periodMonth = formatBudgetPeriod(startDate, explicitPeriodMonth || currentSectionPeriod);
    const accountName = explicitAccountName || currentSectionAccount;

    if (!item) {
      skipped++;
      skipReasons["summary row"] = (skipReasons["summary row"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "summary row", fields: {} });
      continue;
    }

    if (/^task\s+\d+$/i.test(item) && !explicitAccountName && !explicitPointOfContact && !explicitStartDate && !hasMoney) {
      skipped++;
      skipReasons["empty placeholder row"] = (skipReasons["empty placeholder row"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "empty placeholder row", fields: { Item: item } });
      continue;
    }

    if (!accountName) {
      skipped++;
      skipReasons["missing account"] = (skipReasons["missing account"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "missing account", fields: { Item: item } });
      continue;
    }

    let resolvedItem = item;
    let hospital = await findHospitalByName(accountName);
    if (!hospital && explicitAccountName && currentSectionAccount && normalizeKey(explicitAccountName) !== normalizeKey(currentSectionAccount)) {
      const sectionHospital = await findHospitalByName(currentSectionAccount);
      if (sectionHospital) {
        hospital = sectionHospital;
        resolvedItem = `${item} - ${explicitAccountName}`;
      }
    }

    if (!hospital) {
      skipped++;
      skipReasons["account not found"] = (skipReasons["account not found"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "account not found", fields: { Item: item, Account: accountName } });
      continue;
    }

    // Detect duplicates by item + hospitalId + periodMonth
    let existingBudget = null;
    if (duplicateMode === "update") {
      const periodCondition = periodMonth
        ? Prisma.sql`period_month = ${periodMonth}`
        : Prisma.sql`period_month IS NULL`;
      const rows = await prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id
          FROM marketing_budgets
          WHERE hospital_id = ${hospital.id}
            AND LOWER(item) = LOWER(${resolvedItem})
            AND ${periodCondition}
          LIMIT 1
        `,
      );
      existingBudget = rows[0] ?? null;
    }

    if (existingBudget && duplicateMode === "update") {
      try {
        if (!dryRun) {
          const updates: Prisma.Sql[] = [
            Prisma.sql`marketing_meals = ${new Prisma.Decimal(marketingMeals)}`,
            Prisma.sql`marketing_supplies = ${new Prisma.Decimal(marketingSupplies)}`,
            Prisma.sql`marketing_events = ${new Prisma.Decimal(marketingEvents)}`,
            Prisma.sql`actual_spend = ${new Prisma.Decimal(actualSpend)}`,
            Prisma.sql`budgeted = ${new Prisma.Decimal(budgeted)}`,
            Prisma.sql`updated_at = NOW()`,
          ];

          if (pointOfContact) updates.push(Prisma.sql`point_of_contact = ${pointOfContact}`);
          if (startDate) updates.push(Prisma.sql`start_date = ${startDate}`);
          if (periodMonth) updates.push(Prisma.sql`period_month = ${periodMonth}`);

          await prisma.$executeRaw(
            Prisma.sql`
              UPDATE marketing_budgets
              SET ${Prisma.join(updates, Prisma.sql`, `)}
              WHERE id = ${existingBudget.id}
            `,
          );
        }
        updated++;
        if (preview.length < MAX_PREVIEW) preview.push({ action: "update", fields: { Item: resolvedItem, Account: hospital.hospitalName } });
      } catch (e) {
        errors.push(`Failed to update budget: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else if (existingBudget) {
      skipped++;
      skipReasons["already exists"] = (skipReasons["already exists"] ?? 0) + 1;
      if (preview.length < MAX_PREVIEW) preview.push({ action: "skip", reason: "already exists", fields: { Item: item } });
    } else {
      try {
        if (!dryRun) {
          await prisma.$executeRaw(
            Prisma.sql`
              INSERT INTO marketing_budgets (
                id,
                item,
                point_of_contact,
                period_month,
                start_date,
                marketing_meals,
                marketing_supplies,
                marketing_events,
                actual_spend,
                budgeted,
                hospital_id,
                created_at,
                updated_at
              ) VALUES (
                ${randomUUID()},
                ${resolvedItem},
                ${pointOfContact || null},
                ${periodMonth || null},
                ${startDate || null},
                ${new Prisma.Decimal(marketingMeals)},
                ${new Prisma.Decimal(marketingSupplies)},
                ${new Prisma.Decimal(marketingEvents)},
                ${new Prisma.Decimal(actualSpend)},
                ${new Prisma.Decimal(budgeted)},
                ${hospital.id},
                NOW(),
                NOW()
              )
            `,
          );
        }
        created++;
        if (preview.length < MAX_PREVIEW) preview.push({ action: "create", fields: { Item: resolvedItem, Account: hospital.hospitalName, Spent: String(actualSpend) } });
      } catch (e) {
        errors.push(`Failed to create budget: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { created, updated, skipped, errors, skipReasons, preview };
}

// ─── enum mappers ──────────────────────────────────────────────────────────────

function mapFacilityType(s: string) {
  const v = s.toLowerCase();
  if (v.includes("emergency") || v.includes("ed ") || v.includes(" ed")) return "EMERGENCY_DEPARTMENT" as const;
  if (v.includes("inpatient") || v.includes("psychiatric")) return "INPATIENT_MEDICAL" as const;
  if (v.includes("primary care") || v.includes("pcp")) return "PRIMARY_CARE" as const;
  if (v.includes("outpatient") || v.includes("therapy")) return "OUTPATIENT_PSYCHIATRY" as const;
  if (v.includes("iop") || v.includes("php")) return "IOP_PHP" as const;
  if (v.includes("crisis")) return "CRISIS_STABILIZATION_UNIT" as const;
  if (v.includes("court") || v.includes("legal") || v.includes("probation")) return "COURT_LEGAL" as const;
  if (v.includes("community") || v.includes("fqhc")) return "COMMUNITY_MENTAL_HEALTH" as const;
  if (v.includes("school")) return "SCHOOL_COUNSELOR" as const;
  if (v.includes("peer")) return "PEER_SUPPORT" as const;
  if (v.includes("snf") || v.includes("skilled")) return "SNF_LTACH" as const;
  return "OTHER" as const;
}

function mapContactType(s: string) {
  const v = s.toLowerCase();
  if (v.includes("social worker")) return "SOCIAL_WORKER" as const;
  if (v.includes("case manager")) return "CASE_MANAGER" as const;
  if (v.includes("discharge")) return "DISCHARGE_PLANNER" as const;
  if (v.includes("ed physician") || v.includes("emergency physician")) return "ED_PHYSICIAN" as const;
  if (v.includes("primary care") || v.includes("pcp")) return "PRIMARY_CARE_PHYSICIAN" as const;
  if (v.includes("psychiatrist") || v.includes("psychiatry")) return "PSYCHIATRIST" as const;
  if (v.includes("therapist") || v.includes("counselor")) return "THERAPIST" as const;
  if (v.includes("crisis")) return "CRISIS_COUNSELOR" as const;
  if (v.includes("director")) return "DIRECTOR" as const;
  if (v.includes("coordinator")) return "COORDINATOR" as const;
  if (v.includes("cmo") || v.includes("chief medical")) return "CMO" as const;
  if (v.includes("cfo") || v.includes("chief financial")) return "CFO" as const;
  if (v.includes("ceo") || v.includes("chief executive")) return "CEO" as const;
  if (v.includes("coo") || v.includes("chief operating")) return "COO" as const;
  if (v.includes("vp")) return "VP_BUSINESS_DEVELOPMENT" as const;
  return "OTHER" as const;
}

function mapActivityType(s: string) {
  const v = s.toLowerCase();
  if (v.includes("call") || v.includes("phone")) return "CALL" as const;
  if (v.includes("email")) return "EMAIL" as const;
  if (v.includes("meeting") || v.includes("inservice") || v.includes("in-service")) return "MEETING" as const;
  if (v.includes("site") || v.includes("visit")) return "SITE_VISIT" as const;
  if (v.includes("proposal")) return "PROPOSAL_SENT" as const;
  if (v.includes("contract")) return "CONTRACT_SENT" as const;
  if (v.includes("referral")) return "REFERRAL_RECEIVED" as const;
  if (v.includes("follow")) return "FOLLOW_UP" as const;
  return "NOTE" as const;
}

// ─── route handler ─────────────────────────────────────────────────────────────
// Supports: accounts, contacts, activities, leads, marketingbudget

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const type     = (formData.get("type") as string ?? "").toLowerCase(); // accounts | contacts | activities | leads | marketingbudget
    const dryRun   = formData.get("dryRun") === "true";
    const duplicateModeRaw = (formData.get("duplicateMode") as string ?? "skip").toLowerCase();
    const duplicateMode: DuplicateMode = duplicateModeRaw === "update" ? "update" : "skip";

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (!["accounts", "contacts", "activities", "leads", "marketingbudget"].includes(type)) {
      return NextResponse.json({ error: "type must be accounts, contacts, activities, leads, or marketingbudget" }, { status: 400 });
    }

    const parsed = await parseSheet(file);
    const rows = parsed.rows;

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows found in spreadsheet" }, { status: 400 });
    }

    const columns = parsed.columns.length > 0 ? parsed.columns : (rows.length > 0 ? Object.keys(rows[0]) : []);

    let result;
    if (type === "accounts")    result = await importAccounts(rows, dryRun, duplicateMode);
    else if (type === "contacts") result = await importContacts(rows, dryRun, duplicateMode);
    else if (type === "activities") result = await importActivities(rows, dryRun, duplicateMode);
    else if (type === "leads")  result = await importLeads(rows, dryRun, duplicateMode);
    else                         result = await importMarketingBudget(rows, dryRun, duplicateMode);

    return NextResponse.json({ ok: true, isDryRun: dryRun, type, totalRows: rows.length, columns, duplicateMode, ...result });
  } catch (err) {
    console.error("[admin/import]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 500 });
  }
}
