import { useState, useEffect, createContext, useContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // <-- AGREGAMOS EL ESTADO DEL TOKEN
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token"); // <-- LEEMOS EL TOKEN AL ARRANCAR
    
    // Validación de seguridad: verificamos que exista y que NO sea el texto "undefined"
    if (storedUser && storedUser !== "undefined") {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken); 
      } catch (error) {
        console.error("Error al leer el usuario de la memoria:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    } else if (storedUser === "undefined") {
      localStorage.removeItem("user");
    }
    
    setIsLoading(false);
  }, []);

  const login = (data) => {
    // Solo guardamos si realmente vino un usuario en los datos
    if (data.user && data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setToken(data.token); // <-- GUARDAMOS EL TOKEN CUANDO SE LOGUEA
    } else {
      console.error("El servidor no envió el token o los datos del usuario");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null); // <-- BORRAMOS EL TOKEN AL SALIR
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token, // <-- ESTÁ DISPONIBLE PARA TODOS
        login,
        logout,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};