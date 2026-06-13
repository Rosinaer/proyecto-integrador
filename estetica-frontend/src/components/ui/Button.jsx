export const Button = ({ children, type = "button", variant = "primary", onClick, ...props }) => {
 
  const customStyle = variant === "danger" 
    ? { backgroundColor: "#d32f2f" } 
    : {};

  return (
    <button 
      type={type} 
      onClick={onClick} 
      style={customStyle}
      {...props}
    >
      {children}
    </button>
  );
};