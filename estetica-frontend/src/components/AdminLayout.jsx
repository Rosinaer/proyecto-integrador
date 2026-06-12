import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const SIDEBAR_WIDTH = 220;
const MOBILE_BP = 768;

const AdminLayout = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= MOBILE_BP
  );
  const [open, setOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth > MOBILE_BP
  );

  // Al cambiar el tamaño: en desktop el sidebar queda abierto, en mobile cerrado.
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= MOBILE_BP;
      setIsMobile(mobile);
      setOpen(!mobile);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // En mobile, al navegar se cierra el menú para no tapar el contenido.
  const handleNavigate = () => {
    if (isMobile) setOpen(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Sidebar
        open={open}
        isMobile={isMobile}
        onClose={() => setOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Botón flotante para abrir el menú (visible solo cuando está cerrado) */}
      {!open && (
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            top: 14,
            left: 14,
            zIndex: 1100,
            width: 42,
            height: 42,
            borderRadius: 10,
            border: "none",
            background: "#1f2937",
            color: "#fff",
            fontSize: 20,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,.15)",
          }}
        >
          ☰
        </button>
      )}

      {/* Fondo oscuro en mobile cuando el menú está abierto (click para cerrar) */}
      {open && isMobile && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            zIndex: 900,
          }}
        />
      )}

      <main
        style={{
          marginLeft: open && !isMobile ? SIDEBAR_WIDTH : 0,
          transition: "margin-left .25s ease",
          padding: isMobile ? "70px 16px 24px" : "40px",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;