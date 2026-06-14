import { colors, status } from "../../theme/colors";
import { TEL_AREA_DEFAULT } from "../../config/clinica";

export const PhoneInput = ({
  label = "Teléfono",
  area = TEL_AREA_DEFAULT,
  numero = "",
  onChange,
  required,
}) => {
  const set = (campo) => (e) => onChange?.({ area, numero, [campo]: e.target.value });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
      {label && (
        <label style={{ color: colors.brand, fontWeight: "bold", fontSize: 14 }}>
          {label} {required && <span style={{ color: status.error.strong }}>*</span>}
        </label>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={area}
          onChange={set("area")}
          placeholder="Área"
          style={{ width: 80, boxSizing: "border-box" }}
        />
        <input
          value={numero}
          onChange={set("numero")}
          placeholder="Número"
          style={{ flex: 1, boxSizing: "border-box" }}
        />
      </div>
    </div>
  );
};

export default PhoneInput;
