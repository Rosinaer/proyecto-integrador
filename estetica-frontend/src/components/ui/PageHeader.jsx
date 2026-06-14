import { useState, useEffect } from "react";
import { BannerSlot } from "./Banner";
import { colors } from "../../theme/colors";

const MOBILE_BP = 768;

const useIsMobile = () => {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= MOBILE_BP
  );
  useEffect(() => {
    const on = () => setMobile(window.innerWidth <= MOBILE_BP);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return mobile;
};

export const PageHeader = ({ title, subtitle, actions, center = false }) => {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: colors.bg,
        paddingTop: isMobile ? 64 : 32,
        paddingBottom: 14,
        marginBottom: 20,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: center ? "center" : "space-between",
          alignItems: center ? "center" : "flex-end",
          gap: 12,
          flexWrap: "wrap",
          textAlign: center ? "center" : "left",
        }}
      >
        <div style={center ? { width: "100%" } : undefined}>
          <h2 style={{ color: colors.brand, margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ color: colors.textSubtle, fontSize: 13, margin: "4px 0 0" }}>{subtitle}</p>
          )}
        </div>
        {actions && !center && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>
        )}
      </div>

      <BannerSlot style={{ marginTop: 16, marginBottom: 0 }} />
    </div>
  );
};

export default PageHeader;
