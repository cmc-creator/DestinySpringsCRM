"use client";
import React, { useState, useEffect, useCallback } from "react";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "REP" | "ACCOUNT";
  createdAt: string;
  rep?: { id: string; title: string | null; status: string } | null;
  hospital?: { id: string; hospitalName: string; status: string } | null;
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN:   "rgba(239,68,68,0.15)",
  REP:     "rgba(201,168,76,0.15)",
  ACCOUNT: "rgba(34,197,94,0.15)",
};
const ROLE_TEXT: Record<string, string> = {
  ADMIN:   "#fca5a5",
  REP:     "#c9a84c",
  ACCOUNT: "#86efac",
};

export default function AdminUsersPage() {
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [toast, setToast]         = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "REP", repTitle: "", hospitalName: "",
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json() as { users?: UserRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { user?: UserRow; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      showToast(`✓ Account created for ${data.user?.name ?? form.email}`);
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "REP", repTitle: "", hospitalName: "" });
      await loadUsers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function deleteUser(id: string, name: string | null) {
    if (!confirm(`Delete account for ${name ?? id}? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      showToast("Account deleted.");
      await loadUsers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  async function approveUser(id: string, name: string | null) {
    setApproving(id);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "PATCH" });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Approval failed");
      showToast(`✓ Approved ${name ?? "user"}`);
      await loadUsers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setApproving(null);
    }
  }

  function getApprovalStatus(user: UserRow) {
    if (user.role === "REP") return user.rep?.status ?? null;
    if (user.role === "ACCOUNT") return user.hospital?.status ?? null;
    return null;
  }

  function needsApproval(user: UserRow) {
    return user.role === "REP"
      ? user.rep?.status === "PENDING_REVIEW"
      : user.role === "ACCOUNT"
      ? user.hospital?.status === "PROSPECT"
      : false;
  }

  function getStatusBadgeStyle(status: string): React.CSSProperties {
    const normalized = status.toUpperCase();
    if (normalized === "ACTIVE") {
      return {
        background: "linear-gradient(180deg, rgba(34,197,94,0.24) 0%, rgba(22,163,74,0.2) 100%)",
        border: "1px solid rgba(74,222,128,0.75)",
        color: "#dcfce7",
        boxShadow: "0 0 0 1px rgba(34,197,94,0.25), 0 0 14px rgba(34,197,94,0.35)",
        fontSize: "0.74rem",
        padding: "5px 10px",
      };
    }

    return {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "rgba(237,228,207,0.58)",
      fontSize: "0.68rem",
      padding: "4px 8px",
    };
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.25)",
    borderRadius: 8, padding: "11px 13px", color: "#d8e8f4", fontSize: "0.9rem", outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.7rem", fontWeight: 700, color: "rgba(201,168,76,0.75)",
    letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 5,
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 9999, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", borderRadius: 10, padding: "12px 18px", color: "#86efac", fontWeight: 700, fontSize: "0.9rem" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#ede4cf" }}>User Accounts</h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "rgba(237,228,207,0.5)" }}>
            Create and manage login accounts for your team. Self-signups stay pending until you approve them.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(""); }}
          style={{ background: "#c9a84c", color: "#100805", fontWeight: 800, fontSize: "0.85rem", border: "none", borderRadius: 10, padding: "11px 18px", cursor: "pointer" }}
        >
          + Add Account
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.22)", borderRadius: 14, padding: "22px 24px", marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "1rem", fontWeight: 800, color: "#ede4cf" }}>Create New Account</h3>
          {formError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "#fca5a5", fontSize: "0.85rem" }}>
              {formError}
            </div>
          )}
          <form onSubmit={createUser} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input required style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Shawn Williams" />
            </div>
            <div>
              <label style={labelStyle}>Work Email *</label>
              <input required type="email" style={inputStyle} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="shawn@destinysprings.com" />
            </div>
            <div>
              <label style={labelStyle}>Temporary Password *</label>
              <input required type="password" minLength={8} style={inputStyle} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Minimum 8 characters" autoComplete="new-password" />
            </div>
            <div>
              <label style={labelStyle}>Role *</label>
              <select required style={{ ...inputStyle }} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="REP">Business Development Rep</option>
                <option value="ACCOUNT">Leadership / Operations (Account)</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {form.role === "REP" && (
              <div>
                <label style={labelStyle}>BD Title</label>
                <input style={inputStyle} value={form.repTitle} onChange={(e) => setForm((f) => ({ ...f, repTitle: e.target.value }))} placeholder="e.g. Clinical Liaison" />
              </div>
            )}
            {form.role === "ACCOUNT" && (
              <div>
                <label style={labelStyle}>Organization Name</label>
                <input style={inputStyle} value={form.hospitalName} onChange={(e) => setForm((f) => ({ ...f, hospitalName: e.target.value }))} placeholder="e.g. Destiny Springs Healthcare" />
              </div>
            )}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, marginTop: 4 }}>
              <button type="submit" disabled={creating} style={{ background: "#c9a84c", color: "#100805", fontWeight: 800, fontSize: "0.85rem", border: "none", borderRadius: 9, padding: "11px 20px", cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1 }}>
                {creating ? "Creating…" : "Create Account"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "rgba(255,255,255,0.05)", color: "rgba(237,228,207,0.6)", fontWeight: 700, fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "11px 18px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "rgba(237,228,207,0.4)", fontSize: "0.9rem" }}>Loading accounts…</div>
      ) : error ? (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: 20, color: "#fca5a5" }}>{error}</div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "rgba(237,228,207,0.35)", fontSize: "0.9rem" }}>No accounts yet. Create one above.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {users.map((u) => (
            <div key={u.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 800, color: "#c9a84c", flexShrink: 0 }}>
                {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#ede4cf", fontSize: "0.95rem" }}>{u.name ?? "—"}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "rgba(237,228,207,0.5)" }}>{u.email}</p>
                {u.rep?.title && <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "rgba(201,168,76,0.7)" }}>{u.rep.title}</p>}
                {u.hospital?.hospitalName && <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "rgba(201,168,76,0.7)" }}>{u.hospital.hospitalName}</p>}
              </div>

              {/* Role badge */}
              <span style={{ background: ROLE_COLORS[u.role] ?? "rgba(255,255,255,0.08)", color: ROLE_TEXT[u.role] ?? "#d8e8f4", fontWeight: 800, fontSize: "0.7rem", padding: "4px 10px", borderRadius: 999, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                {u.role}
              </span>

              {/* Sub-status */}
              {getApprovalStatus(u) && (
                <span style={{ ...getStatusBadgeStyle(getApprovalStatus(u) ?? ""), fontWeight: 800, borderRadius: 999, letterSpacing: "0.06em" }}>
                  {getApprovalStatus(u)?.replace("_", " ")}
                </span>
              )}

              {/* Created */}
              <span style={{ fontSize: "0.75rem", color: "rgba(237,228,207,0.35)", marginLeft: "auto", whiteSpace: "nowrap" }}>
                {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>

              {needsApproval(u) && (
                <button
                  onClick={() => approveUser(u.id, u.name)}
                  disabled={approving === u.id}
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.24)", borderRadius: 8, color: "#86efac", fontWeight: 800, fontSize: "0.75rem", padding: "6px 12px", cursor: "pointer", flexShrink: 0 }}
                >
                  {approving === u.id ? "…" : "Approve"}
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => deleteUser(u.id, u.name)}
                disabled={deleting === u.id}
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 8, color: "#fca5a5", fontWeight: 700, fontSize: "0.75rem", padding: "6px 12px", cursor: "pointer", flexShrink: 0 }}
              >
                {deleting === u.id ? "…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: "0.75rem", color: "rgba(237,228,207,0.3)", textAlign: "center" }}>
        Admin-created users are active immediately. Self-signups remain blocked until you approve them here.
        Share credentials securely and instruct users to change their password after first login.
      </p>
    </div>
  );
}
