import { useState, useEffect } from "react";
import { BannerSlot } from "./Banner";

// ============================================================
//  PageHeader — encabezado estándar de cada pestaña del admin.
//
//  Centraliza en UN solo lugar:
//   · el estilo y los márgenes del título/subtítulo,
//   · la zona de acciones a la derecha (botones tipo "+ Nuevo …"),
//   · y el BannerSlot, que queda SIEMPRE debajo del título/subtítulo.
//
//  Además queda FIJO arriba (sticky): el contenido / los listados largos
//  scrollean por debajo mientras el título y las acciones siguen visibles.
//  El scroll lo provee la zona de contenido del AdminLayout.
//
//  Uso:
//    <PageHeader title="Gestión de Pacientes"
//                actions={<Button>+ Nuevo Paciente</Button>} />
//    <PageHeader title="Reportes" subtitle="Resumen del período." />
//    <PageHeader center title="¡Hola, Ana! 👋" subtitle="Resumen de…" />
// ============================================================
const PURPLE = "#6b21a8";
const MOBILE_BP = 768;

// Hook chico para saber si estamos en mobile (ajusta el espacio superior:
// en mobile hay que dejar lugar al botón flotante del menú).
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
        background: "#f8fafc",            // tapa el contenido que scrollea por debajo
        paddingTop: isMobile ? 64 : 32,   // en mobile deja pasar el botón ☰ flotante
        paddingBottom: 14,
        marginBottom: 20,
        borderBottom: "1px solid #e2e8f0",
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
          <h2 style={{ color: PURPLE, margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>{subtitle}</p>
          )}
        </div>
        {actions && !center && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
      </div>

      <BannerSlot style={{ marginTop: 16, marginBottom: 0 }} />
    </div>
  );
};

export default PageHeader;