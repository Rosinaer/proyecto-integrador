import { PALETA } from "./constants";

const ProfessionalFilter = ({ profesionales, filtroProf, setFiltroProf }) => (
  <div style={{ display: "flex", gap: "16px", marginBottom: "14px", flexWrap: "wrap" }}>
    {profesionales.map((p, i) => {
      const c = PALETA[i % PALETA.length];
      const activo = !filtroProf || filtroProf === p.id;
      return (
        <button
          key={p.id}
          onClick={() => setFiltroProf(filtroProf === p.id ? "" : p.id)}
          title={filtroProf === p.id ? "Ver todas" : `Filtrar por ${p.person?.name}`}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            fontSize: "13px", padding: "5px 12px", borderRadius: "20px",
            border: `1px solid ${activo ? c.border : "#e2e8f0"}`,
            backgroundColor: activo ? c.bg : "#f8fafc",
            color: activo ? c.text : "#94a3b8",
            cursor: "pointer", fontWeight: activo ? "600" : "400",
            transition: "all 0.15s",
          }}
        >
          <span style={{
            width: "9px", height: "9px", borderRadius: "50%",
            backgroundColor: activo ? c.dot : "#cbd5e1",
            display: "inline-block",
          }} />
          {p.person?.name}
        </button>
      );
    })}
  </div>
);

export default ProfessionalFilter;