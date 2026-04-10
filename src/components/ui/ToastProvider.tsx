"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)", icon: "✓" },
  error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.4)",  icon: "✕" },
  warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)", icon: "⚠" },
  info:    { bg: "rgba(0,212,255,0.10)",  border: "rgba(0,212,255,0.35)", icon: "ℹ" },
};

const VARIANT_TEXT: Record<ToastVariant, string> = {
  success: "#34d399",
  error:   "#f87171",
  warning: "#fbbf24",
  info:    "var(--nyx-accent)",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timerRef.current.get(id);
    if (timer) { clearTimeout(timer); timerRef.current.delete(id); }
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev.slice(-4), { id, message, variant }]);
    const timer = setTimeout(() => dismiss(id), 4000);
    timerRef.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast stack */}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: 24,
          right: 20,
          zIndex: 100000,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 360,
          width: "calc(100vw - 40px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map(t => {
          const s = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                background: `linear-gradient(135deg, ${s.bg}, ${s.bg})`,
                border: `1px solid ${s.border}`,
                borderRadius: 10,
                padding: "12px 14px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                animation: "nyxToastIn 0.22s ease",
              }}
            >
              <span style={{ fontSize: "0.95rem", color: VARIANT_TEXT[t.variant], flexShrink: 0, marginTop: 1 }}>
                {s.icon}
              </span>
              <span style={{ flex: 1, fontSize: "0.84rem", color: "var(--nyx-text)", lineHeight: 1.45 }}>
                {t.message}
              </span>
              <button
                onClick={() => dismiss(t.id)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--nyx-text-muted)", fontSize: "0.8rem", padding: 0, flexShrink: 0,
                }}
              >
                &#x2715;
              </button>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes nyxToastIn { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }`}</style>
    </ToastContext.Provider>
  );
}
