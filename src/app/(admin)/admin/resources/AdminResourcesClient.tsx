"use client";
import { useState, useEffect, useCallback } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const CATEGORIES = [
  { value: "BROCHURE",           label: "📄 Brochure" },
  { value: "CLINICAL_PROTOCOL",  label: "🏥 Clinical Protocol" },
  { value: "INSURANCE_GUIDE",    label: "💳 Insurance Guide" },
  { value: "VISITATION_POLICY",  label: "🚪 Visitation Policy" },
  { value: "BED_AVAILABILITY",   label: "🛏️ Bed Availability" },
  { value: "REFERRAL_FORM",      label: "📋 Referral Form" },
  { value: "TRAINING_MATERIAL",  label: "🎓 Training Material" },
  { value: "MARKETING_ASSET",    label: "📢 Marketing Asset" },
  { value: "OTHER",              label: "📁 Other" },
];

type Resource = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  tags: string[];
  fileUrl?: string | null;
  externalUrl?: string | null;
  mimeType?: string | null;
  fileSizeKb?: number | null;
  active: boolean;
  createdAt: string;
};

const EMPTY: Partial<Resource> = {
  title: "", description: "", category: "OTHER", tags: [],
  fileUrl: "", externalUrl: "", mimeType: "",
};

const C = {
  cyan:   "var(--nyx-accent)",
  text:   "var(--nyx-text)",
  muted:  "var(--nyx-text-muted)",
  card:   "var(--nyx-card)",
  border: "var(--nyx-border)",
  lbl:    "var(--nyx-accent-label)",
};

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.35)", border: `1px solid ${C.border}`,
  borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: "0.875rem",
  width: "100%", outline: "none", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  fontSize: "0.62rem", fontWeight: 700, color: C.muted,
  letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5,
};

const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

export default function AdminResourcesClient() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState<Partial<Resource>>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [tagInput, setTagInput]   = useState("");
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (catFilter) params.set("category", catFilter);
      if (filter)    params.set("search", filter);
      const res = await fetch(`/api/resources?${params}`);
      if (res.ok) setResources(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filter, catFilter]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditId(null);
    setForm(EMPTY);
    setTagInput("");
    setShowForm(true);
  }

  function openEdit(r: Resource) {
    setEditId(r.id);
    setForm({ ...r });
    setTagInput(r.tags.join(", "));
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title?.trim()) return;
    setSaving(true);
    try {
      const tags = tagInput.split(",").map(t => t.trim()).filter(Boolean);
      const body = { ...form, tags };
      const res = editId
        ? await fetch(`/api/resources/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/resources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { alert("Save failed"); return; }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setConfirmArchiveId(id);
  }
  async function confirmArchive(id: string) {
    setConfirmArchiveId(null);
    await fetch(`/api/resources/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      {confirmArchiveId && (
        <ConfirmDialog
          message="Archive this resource?"
          subtext="It will be hidden from the field team."
          confirmLabel="Archive"
          confirmColor="#f59e0b"
          onConfirm={() => confirmArchive(confirmArchiveId)}
          onCancel={() => setConfirmArchiveId(null)}
        />
      )}
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: C.lbl, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>ADMIN</p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: C.text }}>Resource Library</h1>
        <p style={{ color: C.muted, fontSize: "0.875rem", marginTop: 4 }}>Brochures, guides, forms, and training materials for the field team</p>
      </div>

      {/* Actions bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search resources…"
          style={{ ...inp, maxWidth: 260 }} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ ...inp, maxWidth: 200, cursor: "pointer" }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={openAdd}
          style={{ background: "var(--nyx-accent-dim)", border: "1px solid var(--nyx-accent-str)", borderRadius: 8,
                   padding: "8px 18px", color: C.cyan, fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>
          + Add Resource
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ color: C.muted, padding: 32, textAlign: "center" }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {resources.length === 0 && (
            <div style={{ gridColumn: "1/-1", color: C.muted, textAlign: "center", padding: 48 }}>
              No resources yet. Click <strong style={{ color: C.cyan }}>+ Add Resource</strong> to get started.
            </div>
          )}
          {resources.map(r => (
            <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: C.lbl, background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>
                  {CAT_LABEL[r.category] ?? r.category}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openEdit(r)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.75rem", padding: "2px 6px" }}>Edit</button>
                  <button onClick={() => handleDelete(r.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.75rem", padding: "2px 6px" }}>Archive</button>
                </div>
              </div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: "0.95rem" }}>{r.title}</div>
              {r.description && <div style={{ fontSize: "0.8rem", color: C.muted }}>{r.description}</div>}
              {r.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {r.tags.map(t => (
                    <span key={t} style={{ fontSize: "0.62rem", background: "rgba(0,0,0,0.3)", color: C.muted, padding: "1px 7px", borderRadius: 4 }}>{t}</span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {r.fileUrl && (
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "0.75rem", color: C.cyan, fontWeight: 700 }}>📥 Download</a>
                )}
                {r.externalUrl && (
                  <a href={r.externalUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "0.75rem", color: "#60a5fa", fontWeight: 700 }}>🔗 Open Link</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setShowForm(false)}>
          <div style={{ background: "var(--nyx-bg)", border: "1px solid var(--nyx-accent-str)", borderRadius: 16, padding: "28px 28px 24px", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: C.text, margin: 0 }}>{editId ? "Edit Resource" : "Add Resource"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: C.muted, fontSize: "1.4rem", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Title *</label>
                <input value={form.title ?? ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} placeholder="e.g. Patient Brochure 2025" />
              </div>
              <div>
                <label style={lbl}>Category</label>
                <select value={form.category ?? "OTHER"} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Description</label>
                <textarea value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={lbl}>File URL (PDF, doc, etc.)</label>
                <input value={form.fileUrl ?? ""} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} style={inp} placeholder="https://…/brochure.pdf" />
              </div>
              <div>
                <label style={lbl}>External Link (optional)</label>
                <input value={form.externalUrl ?? ""} onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))} style={inp} placeholder="https://…" />
              </div>
              <div>
                <label style={lbl}>Tags (comma-separated)</label>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} style={inp} placeholder="e.g. adult, insurance, arizona" />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px", color: C.muted, cursor: "pointer", fontSize: "0.85rem" }}>Cancel</button>
                <button onClick={handleSave} disabled={!form.title?.trim() || saving}
                  style={{ flex: 2, background: form.title?.trim() ? "var(--nyx-accent-dim)" : "rgba(0,0,0,0.2)", border: `1px solid ${form.title?.trim() ? "var(--nyx-accent-str)" : C.border}`, borderRadius: 8, padding: "9px", color: form.title?.trim() ? C.cyan : C.muted, fontWeight: 700, cursor: form.title?.trim() ? "pointer" : "default", fontSize: "0.85rem" }}>
                  {saving ? "Saving…" : editId ? "Save Changes" : "Add Resource"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
