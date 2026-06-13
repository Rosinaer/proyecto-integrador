export const Input = ({ label, id, type = "text", required, ...props }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "100%" }}>
      {label && (
        <label htmlFor={id} style={{ color: "#6a1b9a", fontWeight: "bold", fontSize: "14px" }}>
          {label} {required && <span style={{ color: "#d32f2f" }}>*</span>}
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
            style={{ position: "absolute", top: 6, right: 8, color: "#d32f2f", fontWeight: "bold", pointerEvents: "none", fontSize: 14 }}
          >
            *
          </span>
        )}
      </div>
    </div>
  );
};

export default Input;
