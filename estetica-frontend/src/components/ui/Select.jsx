import { colors, status } from "../../theme/colors";

export const Select = ({ label, id, options = [], required, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
    {label && (
      <label htmlFor={id} style={{ color: colors.brand, fontWeight: "bold", fontSize: 14 }}>
        {label} {required && <span style={{ color: status.error.strong }}>*</span>}
      </label>
    )}
    <div style={{ position: "relative", width: "100%" }}>
      <select id={id} required={required} {...props} style={{ width: "100%", boxSizing: "border-box", backgroundColor: colors.white }}>
        <option value="">Seleccione una opción...</option>
        {options.map((opt, index) => (
          <option key={index} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {required && !label && (
        <span
          title="Campo obligatorio"
          style={{ position: "absolute", top: 6, right: 22, color: status.error.strong, fontWeight: "bold", pointerEvents: "none", fontSize: 14 }}
        >
          *
        </span>
      )}
    </div>
  </div>
);

export default Select;
