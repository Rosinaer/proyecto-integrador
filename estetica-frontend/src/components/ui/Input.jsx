import { colors, status } from "../../theme/colors";

export const Input = ({ label, id, type = "text", required, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
    {label && (
      <label htmlFor={id} style={{ color: colors.brand, fontWeight: "bold", fontSize: 14 }}>
        {label} {required && <span style={{ color: status.error.strong }}>*</span>}
      </label>
    )}
    <div style={{ position: "relative", width: "100%" }}>
      <input
        id={id}
        type={type}
        required={required}
        {...props}
        style={{ width: "100%", boxSizing: "border-box" }}
      />
      {required && !label && (
        <span
          title="Campo obligatorio"
          style={{ position: "absolute", top: 6, right: 8, color: status.error.strong, fontWeight: "bold", pointerEvents: "none", fontSize: 14 }}
        >
          *
        </span>
      )}
    </div>
  </div>
);

export default Input;
