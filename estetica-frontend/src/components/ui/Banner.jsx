import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { colors, status, radius } from "../../theme/colors";

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

const THEME = {
  success: { bg: status.success.bg, border: status.success.border, title: status.success.fg, icon: "✓" },
  info:    { bg: status.info.bg, border: status.info.border, title: status.info.fg, icon: "ℹ" },
  warning: { bg: status.warning.bg, border: status.warning.border, title: status.warning.fg, icon: "⚠" },
  error:   { bg: status.error.bg, border: status.error.border, title: status.error.fg, icon: "✕" },
};

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
        borderRadius: radius.md,
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
                background: a.primary ? t.title : colors.white,
                color: a.primary ? colors.white : t.title,
                border: `1px solid ${t.border}`,
                borderRadius: radius.sm,
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px 20px", fontSize: 13, color: colors.text, marginTop: 10 }}>
          {details.map(([label, val], i) => (
            <div key={i}>
              <span style={{ color: colors.textSubtle }}>{label}</span><br />
              <strong>{val ?? "—"}</strong>
            </div>
          ))}
        </div>
      )}

      {banner.notes && (
        <div style={{ marginTop: 10, fontSize: 12, color: colors.textSecondary }}>
          <span style={{ color: colors.textSubtle }}>Notas:</span> {banner.notes}
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ marginTop: 10, background: status.warning.bg, color: status.warning.fg, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
          {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}
    </div>
  );
};

export default BannerProvider;
