// Igual que Input: si recibe `required`, muestra el asterisco rojo desde el
// propio componente (al lado del label, o flotando si no hay label).
export const Select = ({ label, id, options = [], required, ...props }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "100%" }}>
      {label && (
        <label htmlFor={id} style={{ color: "#6a1b9a", fontWeight: "bold", fontSize: "14px" }}>
          {label} {required && <span style={{ color: "#d32f2f" }}>*</span>}
        </label>
      )}
      <div style={{ position: "relative", width: "100%" }}>
        <select id={id} required={required} {...props} style={{ width: "100%", boxSizing: "border-box", backgroundColor: "white" }}>
          <option value="">Seleccione una opción...</option>
          {options.map((opt, index) => (
            <option key={index} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {required && !label && (
          <span
            title="Campo obligatorio"
            style={{ position: "absolute", top: 6, right: 22, color: "#d32f2f", fontWeight: "bold", pointerEvents: "none", fontSize: 14 }}
          >
            *
          </span>
        )}
      </div>
    </div>
  );
};

export default Select;
