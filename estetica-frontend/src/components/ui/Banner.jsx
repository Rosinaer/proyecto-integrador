import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";

// ============================================================
//  Sistema de banners reutilizable (plantilla para todas las hojas)
//
//  · Cualquier página llama a useBanner().success(...) para mostrar un
//    resumen persistente de la última acción.
//  · El banner NO desaparece solo con el tiempo.
//  · Se borra solo al CAMBIAR de pestaña/ruta (como si se cerrara), o a mano.
//  · Para posicionarlo debajo del título de cada pestaña, la página coloca
//    <BannerSlot /> justo después de su título/subtítulo.
// ============================================================

const BannerContext = createContext(null);

export const useBanner = () => {
  const ctx = useContext(BannerContext);
  if (!ctx) {
    return {
      show: () => {}, success: () => {}, info: () => {},
      warning: () => {}, error: () => {}, clear: () => {},
    };
  }
  return ctx;
};

export const BannerProvider = ({ children }) => {
  const [banner, setBanner] = useState(null);
  const location = useLocation();

  // Al cambiar de ruta (pestaña), el banner se borra automáticamente.
  useEffect(() => {
    setBanner(null);
  }, [location.pathname]);

  const show = useCallback((b) => {
    setBanner({ id: Date.now(), type: "info", ...b });
  }, []);
  const clear = useCallback(() => setBanner(null), []);
  const helper = (type) => (title, extra = {}) => show({ type, title, ...extra });

  const value = {
    banner,
    show,
    clear,
    success: helper("success"),
    info: helper("info"),
    warning: helper("warning"),
    error: helper("error"),
  };

  return <BannerContext.Provider value={value}>{children}</BannerContext.Provider>;
};

// ── Paleta por tipo ───────────────────────────────────────────
const THEME = {
  success: { bg: "#f0fdf4", border: "#86efac", title: "#166534", icon: "✓" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", title: "#1e40af", icon: "ℹ" },
  warning: { bg: "#fef9c3", border: "#fde047", title: "#854d0e", icon: "⚠" },
  error:   { bg: "#fef2f2", border: "#fecaca", title: "#991b1b", icon: "✕" },
};
const WARN_BG = "#fef9c3";
const WARN_TX = "#854d0e";

// ── Slot que renderiza el banner actual (se coloca bajo el título) ──
export const BannerSlot = ({ style }) => {
  const { banner, clear } = useBanner();
  if (!banner) return null;
  const t = THEME[banner.type] || THEME.info;
  const details = banner.details || [];
  const warnings = banner.warnings || [];
  const actions = banner.actions || [];

  return (
    <div
      role="status"
      style={{
        border: `1px solid ${t.border}`,
        background: t.bg,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 16,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ color: t.title, fontSize: 15 }}>
          {t.icon} {banner.title}
        </strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={a.onClick}
              style={{
                background: a.primary ? t.title : "#fff",
                color: a.primary ? "#fff" : t.title,
                border: `1px solid ${t.border}`,
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {a.label}
            </button>
          ))}
          <button
            type="button"
            onClick={clear}
            title="Cerrar"
            style={{ background: "transparent", border: "none", color: t.title, fontSize: 20, lineHeight: 1, cursor: "pointer", padding: "0 4px" }}
          >
            &times;
          </button>
        </div>
      </div>

      {details.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px 20px", fontSize: 13, color: "#334155", marginTop: 10 }}>
          {details.map(([label, val], i) => (
            <div key={i}>
              <span style={{ color: "#64748b" }}>{label}</span><br />
              <strong>{val ?? "—"}</strong>
            </div>
          ))}
        </div>
      )}

      {banner.notes && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#475569" }}>
          <span style={{ color: "#64748b" }}>Notas:</span> {banner.notes}
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ marginTop: 10, background: WARN_BG, color: WARN_TX, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
          {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}
    </div>
  );
};

export default BannerProvider;
