"use client";
import { useState, useCallback, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type AType =
  | "CALL" | "EMAIL" | "NOTE" | "MEETING" | "LUNCH" | "TASK"
  | "PROPOSAL_SENT" | "CONTRACT_SENT" | "DEMO_COMPLETED"
  | "SITE_VISIT" | "CONFERENCE" | "FOLLOW_UP";

type Activity = {
  id: string;
  type: AType;
  title: string;
  notes?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  hospitalId?: string | null;
  repId?: string | null;
  hospital?: { id: string; hospitalName: string } | null;
  rep?: { user: { name?: string | null } } | null;
};

export type Hospital = { id: string; hospitalName: string };
export type Rep = { id: string; user: { name?: string | null; email: string } };

type View = "month" | "week" | "list";

// ─── Constants ───────────────────────────────────────────────────────────────

const C = {
  cyan: "var(--nyx-accent)",
  text: "var(--nyx-text)",
  muted: "var(--nyx-text-muted)",
  dim: "var(--nyx-text-muted)",
  card: "var(--nyx-card)",
  border: "var(--nyx-border)",
};

const A_TYPES: AType[] = [
  "MEETING","CALL","LUNCH","DEMO_COMPLETED","SITE_VISIT","EMAIL",
  "NOTE","TASK","PROPOSAL_SENT","CONTRACT_SENT","CONFERENCE","FOLLOW_UP",
];

const TYPE_LABEL: Record<string, string> = {
  MEETING:"Meeting", CALL:"Call", DEMO_COMPLETED:"Demo",
  SITE_VISIT:"Site Visit", LUNCH:"Lunch", EMAIL:"Email", NOTE:"Note",
  TASK:"Task", PROPOSAL_SENT:"Proposal Sent", CONTRACT_SENT:"Contract Sent",
  CONFERENCE:"Conference", FOLLOW_UP:"Follow-up",
};

const TYPE_COLOR: Record<string, string> = {
  MEETING:"#60a5fa", CALL:"var(--nyx-accent)", DEMO_COMPLETED:"#fbbf24",
  SITE_VISIT:"#34d399", LUNCH:"#fb923c", EMAIL:"#94a3b8", NOTE:"#f97316",
  TASK:"#f59e0b", PROPOSAL_SENT:"#a78bfa", CONTRACT_SENT:"#c084fc",
  CONFERENCE:"#f472b6", FOLLOW_UP:"#38bdf8",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86_400_000);
}

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function buildWeekDays(d: Date): Date[] {
  const sun = addDays(d, -d.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(sun, i));
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" });
}

function fmtMonthYear(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDayHeader(d: Date) {
  return d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}

function getActivityDay(a: Activity): Date | null {
  if (!a.scheduledAt) return null;
  return new Date(a.scheduledAt);
}

function groupByDay(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const a of activities) {
    const d = getActivityDay(a);
    if (!d) continue;
    const key = toDateKey(d);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return map;
}

// ─── Event Chip ──────────────────────────────────────────────────────────────

function EventChip({ activity, onClick, small }: { activity: Activity; onClick: () => void; small?: boolean }) {
  const color = TYPE_COLOR[activity.type] ?? C.cyan;
  const done  = !!activity.completedAt;
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={`${TYPE_LABEL[activity.type] ?? activity.type}: ${activity.title}`}
      style={{
        display:"flex", alignItems:"center", gap:4,
        background: done ? "rgba(52,211,153,0.06)" : `${color}18`,
        border: `1px solid ${done ? "rgba(52,211,153,0.2)" : `${color}40`}`,
        borderRadius:4, padding: small ? "1px 5px" : "3px 7px",
        cursor:"pointer", overflow:"hidden",
        opacity: done ? 0.65 : 1,
        transition:"opacity 0.15s",
      }}
    >
      <span style={{ width:5, height:5, borderRadius:"50%", background: done ? "#34d399" : color, flexShrink:0 }} />
      <span style={{
        fontSize: small ? "0.63rem" : "0.7rem",
        color: done ? "#34d399" : color,
        fontWeight:600,
        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
        textDecoration: done ? "line-through" : "none",
        maxWidth: small ? 90 : 130,
      }}>
        {activity.title}
      </span>
    </div>
  );
}

// ─── Activity Modal ──────────────────────────────────────────────────────────

type ModalProps = {
  activity?: Partial<Activity>;
  defaultDate?: string;
  hospitals: Hospital[];
  reps: Rep[];
  onSave: (data: Partial<Activity>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
};

function ActivityModal({ activity, defaultDate, hospitals, reps, onSave, onDelete, onClose }: ModalProps) {
  const isNew = !activity?.id;

  function getInitialTime(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }

  const [type,          setType]     = useState<AType>(activity?.type ?? "MEETING");
  const [title,         setTitle]    = useState(activity?.title ?? "");
  const [notes,         setNotes]    = useState(activity?.notes ?? "");
  const [schedDate,     setSchedDate]= useState(activity?.scheduledAt ? activity.scheduledAt.slice(0,10) : (defaultDate ?? ""));
  const [schedTime,     setSchedTime]= useState(getInitialTime(activity?.scheduledAt));
  const [syncCal,      setSyncCal]  = useState(false);
  const [syncStatus,   setSyncStatus] = useState<"idle"|"syncing"|"done"|"error">("idle");
  const [done,          setDone]     = useState(!!activity?.completedAt);
  const [hospitalId,    setHospId]   = useState(activity?.hospitalId ?? activity?.hospital?.id ?? "");
  const [repId,         setRepId]    = useState(activity?.repId ?? "");
  const [saving,        setSaving]   = useState(false);
  const [confirming,    setConfirming] = useState(false);

  function buildScheduledAt() {
    if (!schedDate) return null;
    const time = schedTime || "00:00";
    const [h, m] = time.split(":").map(Number);
    const d = new Date(schedDate + "T00:00:00");
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const scheduledAt = buildScheduledAt();
    await onSave({
      id: activity?.id,
      type,
      title: title.trim(),
      notes: notes.trim() || null,
      scheduledAt,
      completedAt: done ? (activity?.completedAt ?? new Date().toISOString()) : null,
      hospitalId: hospitalId || null,
      repId: repId || null,
    });

    // Optionally push to connected calendar
    if (syncCal && scheduledAt) {
      setSyncStatus("syncing");
      try {
        const start = new Date(scheduledAt);
        const end   = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour default
        const calRes = await fetch("/api/calendar/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: notes.trim() || undefined,
            start: start.toISOString(),
            end: end.toISOString(),
          }),
        });
        setSyncStatus(calRes.ok ? "done" : "error");
      } catch {
        setSyncStatus("error");
      }
    }

    setSaving(false);
  };

  const inp: React.CSSProperties = {
    background:"rgba(0,0,0,0.35)", border:`1px solid ${C.border}`,
    borderRadius:8, padding:"9px 12px", color:C.text, fontSize:"0.875rem",
    width:"100%", outline:"none", boxSizing:"border-box",
  };
  const lbl: React.CSSProperties = {
    fontSize:"0.62rem", fontWeight:700, color:C.muted,
    letterSpacing:"0.1em", textTransform:"uppercase" as const, display:"block", marginBottom:5,
  };

  return (
    <div
      style={{ position:"fixed", inset:0, background:"var(--nyx-bg)", zIndex:1000,
               display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}
    >
      <div
        style={{ background:"var(--nyx-bg)", border:"1px solid var(--nyx-accent-str)", borderRadius:16,
                 padding:"28px 28px 24px", width:"100%", maxWidth:500, maxHeight:"92vh", overflowY:"auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <h2 style={{ fontSize:"1.05rem", fontWeight:800, color:C.text, margin:0 }}>
            {isNew ? "New Activity" : "Edit Activity"}
          </h2>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:C.muted, fontSize:"1.4rem", cursor:"pointer", lineHeight:1, padding:"0 2px" }}>
            ×
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Type */}
          <div>
            <label style={lbl}>Type</label>
            <select value={type} onChange={e => setType(e.target.value as AType)}
              style={{ ...inp, cursor:"pointer" }}>
              {A_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>

          {/* Title */}
          <div>
            <label style={lbl}>Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Quarterly review with Nashville General"
              style={inp} />
          </div>

          {/* Date + Time */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={lbl}>Date</label>
              <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Time</label>
              <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} style={inp} />
            </div>
          </div>

          {/* Hospital */}
          <div>
            <label style={lbl}>Hospital (optional)</label>
            <select value={hospitalId} onChange={e => setHospId(e.target.value)}
              style={{ ...inp, cursor:"pointer" }}>
              <option value="">None</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.hospitalName}</option>)}
            </select>
          </div>

          {/* Rep */}
          <div>
            <label style={lbl}>BD Rep (optional)</label>
            <select value={repId} onChange={e => setRepId(e.target.value)}
              style={{ ...inp, cursor:"pointer" }}>
              <option value="">Unassigned</option>
              {reps.map(r => <option key={r.id} value={r.id}>{r.user.name ?? r.user.email}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label style={lbl}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Optional notes..."
              style={{ ...inp, resize:"vertical" as const, fontFamily:"inherit" }} />
          </div>

          {/* Completed */}
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <div
              onClick={() => setDone(v => !v)}
              style={{
                width:18, height:18, borderRadius:4, flexShrink:0,
                border:`1.5px solid ${done ? C.cyan : C.border}`,
                background: done ? "var(--nyx-accent-mid)" : "rgba(0,0,0,0.3)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}
            >
              {done && <span style={{ color:C.cyan, fontSize:"0.7rem", fontWeight:900 }}>✓</span>}
            </div>
            <span style={{ fontSize:"0.85rem", color:C.muted }}>Mark as completed</span>
          </label>

          {/* Sync to calendar */}
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <div
              onClick={() => { setSyncCal(v => !v); setSyncStatus("idle"); }}
              style={{
                width:18, height:18, borderRadius:4, flexShrink:0,
                border:`1.5px solid ${syncCal ? "#60a5fa" : C.border}`,
                background: syncCal ? "rgba(96,165,250,0.18)" : "rgba(0,0,0,0.3)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}
            >
              {syncCal && <span style={{ color:"#60a5fa", fontSize:"0.7rem", fontWeight:900 }}>✓</span>}
            </div>
            <span style={{ fontSize:"0.85rem", color:C.muted }}>
              Sync to Outlook / Google Calendar&nbsp;
              {syncStatus === "syncing" && <span style={{ color:"#fbbf24" }}>syncing…</span>}
              {syncStatus === "done"    && <span style={{ color:"#34d399" }}>✓ synced</span>}
              {syncStatus === "error"   && <span style={{ color:"#f87171" }}>⚠ no calendar connected</span>}
            </span>
          </label>
        </div>

        {/* Footer buttons */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:22, gap:10 }}>
          <div>
            {!isNew && !confirming && (
              <button onClick={() => setConfirming(true)}
                style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)",
                         borderRadius:8, padding:"8px 14px", color:"#f87171", fontSize:"0.78rem", fontWeight:700, cursor:"pointer" }}>
                Delete
              </button>
            )}
            {confirming && (
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:"0.75rem", color:"#f87171" }}>Confirm?</span>
                <button onClick={() => onDelete?.(activity!.id!)}
                  style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)",
                           borderRadius:6, padding:"6px 10px", color:"#f87171", fontSize:"0.73rem", cursor:"pointer" }}>
                  Yes, delete
                </button>
                <button onClick={() => setConfirming(false)}
                  style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6,
                           padding:"6px 10px", color:C.muted, fontSize:"0.73rem", cursor:"pointer" }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onClose}
              style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8,
                       padding:"8px 16px", color:C.muted, fontSize:"0.82rem", cursor:"pointer" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!title.trim() || saving}
              style={{
                background: title.trim() ? "var(--nyx-accent-dim)" : "rgba(0,0,0,0.2)",
                border: `1px solid ${title.trim() ? "var(--nyx-accent-str)" : C.border}`,
                borderRadius:8, padding:"8px 20px",
                color: title.trim() ? C.cyan : C.muted,
                fontSize:"0.82rem", fontWeight:700,
                cursor: title.trim() ? "pointer" : "default",
              }}>
              {saving ? "Saving…" : isNew ? "Add Activity" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  activities,
  onDayClick,
  onEventClick,
}: {
  currentDate: Date;
  activities: Activity[];
  onDayClick: (date: Date) => void;
  onEventClick: (a: Activity) => void;
}) {
  const today = new Date();
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const grid  = buildMonthGrid(year, month);
  const byDay = groupByDay(activities);

  return (
    <div>
      {/* Day-of-week headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:2,
        background:"var(--nyx-accent-dim)", borderRadius:"10px 10px 0 0", borderBottom:"1px solid var(--nyx-accent-str)" }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:"0.65rem", fontWeight:800,
            color:"var(--nyx-accent)", letterSpacing:"0.12em", textTransform:"uppercase",
            padding:"10px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, background:"var(--nyx-accent-str)", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>
        {grid.map((day, i) => {
          const isThisMonth = day.getMonth() === month;
          const isToday     = isSameDay(day, today);
          const key         = toDateKey(day);
          const dayEvents   = byDay.get(key) ?? [];
          const showCount   = 3;
          const overflow    = dayEvents.length - showCount;

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              style={{
                background: isToday
                  ? "var(--nyx-accent-dim)"
                  : isThisMonth
                  ? "var(--nyx-bg)"
                  : "rgba(0,0,0,0.45)",
                borderTop: isToday ? `2px solid var(--nyx-accent)` : "2px solid transparent",
                minHeight: 108, padding:"7px 7px 5px",
                cursor:"pointer",
                transition:"background 0.15s",
                opacity: isThisMonth || isToday ? 1 : 0.55,
              }}
            >
              <div style={{
                fontSize:"0.75rem", fontWeight: isToday ? 900 : 500,
                color: isToday ? C.cyan : isThisMonth ? C.text : C.dim,
                marginBottom:4, lineHeight:1,
                width:22, height:22, borderRadius:"50%",
                background: isToday ? "var(--nyx-accent-mid)" : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {day.getDate()}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                {dayEvents.slice(0, showCount).map(a => (
                  <EventChip key={a.id} activity={a} onClick={() => onEventClick(a)} small />
                ))}
                {overflow > 0 && (
                  <span style={{ fontSize:"0.6rem", color:C.muted, fontWeight:600, paddingLeft:2 }}>
                    +{overflow} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  activities,
  onDayClick,
  onEventClick,
}: {
  currentDate: Date;
  activities: Activity[];
  onDayClick: (date: Date) => void;
  onEventClick: (a: Activity) => void;
}) {
  const today  = new Date();
  const week   = buildWeekDays(currentDate);
  const byDay  = groupByDay(activities);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
      {week.map((day, i) => {
        const isToday   = isSameDay(day, today);
        const key       = toDateKey(day);
        const dayEvents = byDay.get(key) ?? [];

        return (
          <div key={i}
            onClick={() => onDayClick(day)}
            style={{ background:C.card, border:`1px solid ${isToday ? "var(--nyx-accent-str)" : C.border}`,
                     borderTop: isToday ? `2px solid var(--nyx-accent-label)` : `2px solid transparent`,
                     borderRadius:10, padding:"10px 8px", minHeight:200, cursor:"pointer" }}>
            {/* Header */}
            <div style={{ marginBottom:10, textAlign:"center" }}>
              <div style={{ fontSize:"0.62rem", fontWeight:700, color:"var(--nyx-accent-label)",
                            letterSpacing:"0.1em", textTransform:"uppercase" }}>
                {DAYS_SHORT[day.getDay()]}
              </div>
              <div style={{
                fontSize:"1.3rem", fontWeight:900,
                color: isToday ? C.cyan : C.text,
                width:36, height:36, borderRadius:"50%",
                background: isToday ? "var(--nyx-accent-dim)" : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center", margin:"4px auto 0",
              }}>
                {day.getDate()}
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {dayEvents.length === 0 && (
                <div style={{ fontSize:"0.65rem", color:C.dim, textAlign:"center", paddingTop:8 }}>
                  -
                </div>
              )}
              {dayEvents.map(a => (
                <EventChip key={a.id} activity={a} onClick={() => onEventClick(a)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── List / Agenda View ───────────────────────────────────────────────────────

function ListView({
  activities,
  onEventClick,
}: {
  activities: Activity[];
  onEventClick: (a: Activity) => void;
}) {
  const today = new Date();
  const todayKey = toDateKey(today);

  // Separate scheduled vs unscheduled
  const scheduled   = activities.filter(a => a.scheduledAt).sort(
    (a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()
  );
  const unscheduled = activities.filter(a => !a.scheduledAt);

  const byDay = groupByDay(scheduled);
  const sortedKeys = Array.from(byDay.keys()).sort();

  const upcoming = sortedKeys.filter(k => k >= todayKey);
  const past     = sortedKeys.filter(k => k <  todayKey).reverse();

  function renderDayGroup(key: string, events: Activity[]) {
    const d       = new Date(key + "T12:00:00");
    const isToday = key === todayKey;
    return (
      <div key={key} style={{ marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <div style={{
            fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em",
            textTransform:"uppercase",
            color: isToday ? C.cyan : C.muted,
          }}>
            {isToday ? "TODAY · " : ""}{fmtDayHeader(d)}
          </div>
          <div style={{ flex:1, height:1, background:C.border }} />
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {events.map(a => {
            const color = TYPE_COLOR[a.type] ?? C.cyan;
            const done  = !!a.completedAt;
            return (
              <div key={a.id}
                onClick={() => onEventClick(a)}
                style={{
                  background: done ? "rgba(52,211,153,0.03)" : C.card,
                  border: `1px solid ${done ? "rgba(52,211,153,0.1)" : C.border}`,
                  borderLeft: `3px solid ${done ? "#34d399" : color}`,
                  borderRadius:"0 8px 8px 0", padding:"10px 14px",
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  cursor:"pointer", opacity: done ? 0.75 : 1,
                  gap:12,
                }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:"0.62rem", fontWeight:700, color, letterSpacing:"0.08em",
                                   background:`${color}18`, padding:"1px 6px", borderRadius:3 }}>
                      {TYPE_LABEL[a.type]}
                    </span>
                    {done && <span style={{ fontSize:"0.62rem", color:"#34d399", fontWeight:600 }}>✓ Done</span>}
                  </div>
                  <div style={{ fontSize:"0.875rem", fontWeight:600, color: done ? C.muted : C.text,
                                 textDecoration: done ? "line-through" : "none",
                                 overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {a.title}
                  </div>
                  {a.hospital && (
                    <div style={{ fontSize:"0.72rem", color:C.muted, marginTop:2 }}>
                      🏥 {a.hospital.hospitalName}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:"0.78rem", color:C.muted }}>
                    {fmtTime(a.scheduledAt)}
                  </div>
                  {a.rep && (
                    <div style={{ fontSize:"0.68rem", color:C.dim, marginTop:2 }}>
                      👤 {a.rep.user.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {upcoming.length === 0 && past.length === 0 && unscheduled.length === 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
                      padding:40, textAlign:"center", color:C.muted, fontSize:"0.875rem" }}>
          No activities yet. Click + Add Activity to get started.
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom:32 }}>
          {upcoming.map(k => renderDayGroup(k, byDay.get(k)!))}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <span style={{ fontSize:"0.65rem", fontWeight:700, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase" }}>PAST</span>
            <div style={{ flex:1, height:1, background:"var(--nyx-accent-dim)" }} />
          </div>
          {past.map(k => renderDayGroup(k, byDay.get(k)!))}
        </div>
      )}

      {unscheduled.length > 0 && (
        <div style={{ marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <span style={{ fontSize:"0.65rem", fontWeight:700, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase" }}>UNSCHEDULED</span>
            <div style={{ flex:1, height:1, background:"var(--nyx-accent-dim)" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {unscheduled.map(a => {
              const color = TYPE_COLOR[a.type] ?? C.cyan;
              return (
                <div key={a.id} onClick={() => onEventClick(a)}
                  style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${color}55`,
                           borderRadius:"0 8px 8px 0", padding:"10px 14px",
                           display:"flex", justifyContent:"space-between", alignItems:"center",
                           cursor:"pointer", gap:12 }}>
                  <div>
                    <span style={{ fontSize:"0.62rem", fontWeight:700, color:`${color}aa`, letterSpacing:"0.08em",
                                   background:`${color}10`, padding:"1px 6px", borderRadius:3, marginRight:8 }}>
                      {TYPE_LABEL[a.type]}
                    </span>
                    <span style={{ fontSize:"0.875rem", color:C.muted }}>{a.title}</span>
                  </div>
                  <span style={{ fontSize:"0.7rem", color:C.dim }}>No date set</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main CalendarClient ──────────────────────────────────────────────────────

export default function CalendarClient({
  hospitals,
  reps,
}: {
  hospitals: Hospital[];
  reps: Rep[];
}) {
  const [view,         setView]    = useState<View>("month");
  const [currentDate,  setDate]    = useState(new Date());
  const [activities,   setActivities] = useState<Activity[]>([]);
  const [loading,      setLoading] = useState(true);
  const [modalOpen,    setModalOpen]  = useState(false);
  const [editActivity, setEditActivity] = useState<Partial<Activity> | undefined>();
  const [defaultDate,  setDefaultDate] = useState<string | undefined>();

  // ── Load activities ─────────────────────────────────────────────────────────
  const loadActivities = useCallback(async () => {
    setLoading(true);
    // Fetch a wide window: 3 months back, 3 months forward
    const from = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
    const to   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 4, 0);
    const res  = await fetch(`/api/activities?from=${from.toISOString()}&to=${to.toISOString()}`);
    if (res.ok) {
      const data = await res.json();
      setActivities(data);
    }
    setLoading(false);
  }, [currentDate]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  function prev() {
    if (view === "month") setDate(d => addMonths(d, -1));
    else if (view === "week") setDate(d => addDays(d, -7));
    else setDate(d => addDays(d, -30));
  }
  function next() {
    if (view === "month") setDate(d => addMonths(d, 1));
    else if (view === "week") setDate(d => addDays(d, 7));
    else setDate(d => addDays(d, 30));
  }
  function today() { setDate(new Date()); }

  function getTitle() {
    if (view === "month") return fmtMonthYear(currentDate);
    if (view === "week") {
      const week = buildWeekDays(currentDate);
      const s = week[0]; const e = week[6];
      if (s.getMonth() === e.getMonth())
        return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
      return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
    }
    return fmtMonthYear(currentDate);
  }

  // ── Modal helpers ────────────────────────────────────────────────────────────
  function openAdd(date?: Date) {
    setEditActivity(undefined);
    setDefaultDate(date ? toDateKey(date) : undefined);
    setModalOpen(true);
  }
  function openEdit(activity: Activity) {
    setEditActivity(activity);
    setDefaultDate(undefined);
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditActivity(undefined); }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (data: Partial<Activity>) => {
    const isNew = !data.id;
    const method  = isNew ? "POST" : "PATCH";
    const url     = isNew ? "/api/activities" : `/api/activities/${data.id}`;
    
    const { id: _omit, ...rest } = data;
    const body = isNew ? rest : data;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isNew ? { ...body } : body),
    });
    if (res.ok) {
      closeModal();
      await loadActivities();
    }
  }, [loadActivities]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
    if (res.ok) {
      closeModal();
      await loadActivities();
    }
  }, [loadActivities]);

  // ── Stats for toolbar ─────────────────────────────────────────────────────────
  const todayStr = toDateKey(new Date());
  const todayCount = activities.filter(a => a.scheduledAt && toDateKey(new Date(a.scheduledAt)) === todayStr).length;

  const btnBase: React.CSSProperties = {
    background: "none", border: `1px solid ${C.border}`,
    borderRadius: 7, padding: "6px 14px", color: C.muted,
    fontSize: "0.78rem", cursor: "pointer", fontWeight: 600,
    transition: "all 0.15s",
  };

  return (
    <div
      style={{
        background: "var(--nyx-card)",
        border: "1px solid var(--nyx-accent-str)",
        borderRadius: 20,
        padding: "24px 24px 28px",
        animation: "nyx-cal-shimmer 5s ease-in-out infinite",
      }}
    >
      {/* ── Toolbar ── */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", marginBottom:20, justifyContent:"space-between" }}>

        {/* Left: date nav */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={prev} style={btnBase}>◀</button>
          <button onClick={today}
            style={{ ...btnBase, borderColor:"var(--nyx-accent-str)", color:C.cyan }}>
            Today
          </button>
          <button onClick={next} style={btnBase}>▶</button>
          <span style={{ fontSize:"1rem", fontWeight:800, color:C.text, marginLeft:8, minWidth:200 }}>
            {getTitle()}
          </span>
        </div>

        {/* Center: view switcher */}
        <div style={{ display:"flex", background:"rgba(0,0,0,0.4)", border:`1px solid ${C.border}`, borderRadius:9, overflow:"hidden" }}>
          {(["month","week","list"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                background: view===v ? "var(--nyx-accent-dim)" : "none",
                border:"none", borderRight: v!=="list" ? `1px solid ${C.border}` : "none",
                padding:"7px 16px",
                color: view===v ? C.cyan : C.muted,
                fontSize:"0.78rem", fontWeight: view===v ? 700 : 500,
                cursor:"pointer", textTransform:"capitalize",
              }}>
              {v === "list" ? "Agenda" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Right: today count + add */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {todayCount > 0 && (
            <span style={{ fontSize:"0.72rem", color:C.cyan, background:"var(--nyx-accent-dim)",
                           border:`1px solid var(--nyx-accent-str)`, borderRadius:6,
                           padding:"4px 10px", fontWeight:700 }}>
              {todayCount} today
            </span>
          )}
          <button onClick={() => openAdd()}
            style={{ background:"var(--nyx-accent-dim)", border:"1px solid var(--nyx-accent-str)",
                     borderRadius:8, padding:"8px 16px", color:C.cyan,
                     fontSize:"0.82rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            + Add Activity
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign:"center", color:C.muted, padding:40, fontSize:"0.875rem" }}>
          Loading activities…
        </div>
      )}

      {/* ── Calendar views ── */}
      {!loading && view === "month" && (
        <MonthView
          currentDate={currentDate}
          activities={activities}
          onDayClick={date => openAdd(date)}
          onEventClick={openEdit}
        />
      )}
      {!loading && view === "week" && (
        <WeekView
          currentDate={currentDate}
          activities={activities}
          onDayClick={date => openAdd(date)}
          onEventClick={openEdit}
        />
      )}
      {!loading && view === "list" && (
        <ListView
          activities={activities}
          onEventClick={openEdit}
        />
      )}

      {/* ── Modal ── */}
      {modalOpen && (
        <ActivityModal
          activity={editActivity}
          defaultDate={defaultDate}
          hospitals={hospitals}
          reps={reps}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
