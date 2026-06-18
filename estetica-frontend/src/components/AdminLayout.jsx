import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { BannerProvider } from "./ui/Banner";
import {colors} from "../theme/colors"; 

const SIDEBAR_WIDTH = 220;
const MOBILE_BP = 768;

const AdminLayout = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= MOBILE_BP
  );
  const [open, setOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth > MOBILE_BP
  );

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
    <div style={{ height: "100dvh", overflow: "hidden", backgroundColor: colors.bg }}>
      <Sidebar
        open={open}
        isMobile={isMobile}
        onClose={() => setOpen(false)}
        onNavigate={handleNavigate}
      />


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
            background: colors.ink,
            color: "#fff",
            fontSize: 20,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,.15)",
          }}
        >
          ☰
        </button>
      )}

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
          height: "100dvh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <BannerProvider>
          <div
            style={{
              flex: 1,
              minHeight: 0,          
              overflowY: "auto",
              overflowX: "hidden",
              padding: isMobile ? "0 16px 24px" : "0 40px 32px",
            }}
          >
            <Outlet />
          </div>
        </BannerProvider>
      </main>
    </div>
  );
};

export default AdminLayout;