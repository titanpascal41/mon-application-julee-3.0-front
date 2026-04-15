import React, { createContext, useContext, useState, useEffect } from "react";
import {
  login,
  logout,
  getAuthState,
  addAuthListener,
  updateUtilisateur,
} from "../services/authService";

// Créer le contexte
const AuthContext = createContext();

// Provider du contexte
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    utilisateur: null,
    isAuthenticated: false,
    isLoading: false,
  });

  // S'abonner aux changements d'état du service d'auth
  useEffect(() => {
    // Initialiser l'état depuis le service
    setAuthState(getAuthState());

    // Écouter les changements
    const unsubscribe = addAuthListener((newState) => {
      setAuthState({ ...newState });
    });

    return unsubscribe;
  }, []);

  // Fonctions exposées
  const handleLogin = async (email, motDePasse) => {
    return await login(email, motDePasse);
  };

  const handleLogout = () => {
    logout();
  };

  const handleUpdateUtilisateur = (nouvellesInfos) => {
    updateUtilisateur(nouvellesInfos);
  };

  const value = {
    ...authState,
    login: handleLogin,
    logout: handleLogout,
    updateUtilisateur: handleUpdateUtilisateur,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook pour utiliser le contexte
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
};

export default AuthContext;
