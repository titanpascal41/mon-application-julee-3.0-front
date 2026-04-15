import React, { createContext, useState, useEffect, useContext } from 'react';
import permissionService from '../services/permissionService';

// Contexte d'authentification
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialiser l'authentification au montage du composant
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Vérifier s'il y a un utilisateur stocké (token, session, etc.)
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        const userData = JSON.parse(storedUser);

        // Si les données stockées n'ont pas le profil, recharger depuis l'API
        if (!userData.profil && userData.id) {
          try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/users/${userData.id}/profile`);
            if (response.ok) {
              const fullUserData = await response.json();
              localStorage.setItem('user', JSON.stringify(fullUserData));
              await permissionService.initialize(fullUserData.id, fullUserData);
              setUser(fullUserData);
              console.log('Utilisateur rechargé avec profil:', fullUserData);
              return;
            }
          } catch (e) {
            // Continuer avec les données existantes si l'API échoue
            console.warn('Impossible de recharger le profil utilisateur:', e);
          }
        }

        // Initialiser le service de permissions avec l'ID utilisateur
        await permissionService.initialize(userData.id, userData);

        setUser(userData);
        console.log('Utilisateur authentifié:', userData);
      }
    } catch (error) {
      console.error('Erreur initialisation auth:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      // Appel API pour l'authentification
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Échec de l\'authentification');
      }

      const userData = await response.json();
      
      console.log('Utilisateur reçu depuis l\'API:', userData);
      console.log('Profil de l\'utilisateur:', userData.profilId, userData.profil);
      
      // Stocker l'utilisateur
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Initialiser les permissions
      try {
        console.log('Initialisation des permissions pour l\'utilisateur:', userData.id, 'profil:', userData.profilId);
        await permissionService.initialize(userData.id, userData);
        console.log('Permissions initialisées avec succès pour:', userData.email);
      } catch (error) {
        console.warn('Erreur initialisation permissions:', error);
        // Ne pas bloquer la connexion si les permissions échouent
      }
      
      setUser(userData);
      console.log('Connexion réussie:', userData);
      
      // Forcer le rechargement des permissions après un court délai
      setTimeout(async () => {
        try {
          await permissionService.refresh();
          console.log('Permissions rafraîchies après connexion');
          // Émettre un événement pour notifier que les permissions ont changé
          window.dispatchEvent(new Event('permissionsChanged'));
        } catch (error) {
          console.warn('Erreur rafraîchissement permissions:', error);
          // Émettre quand même l'événement pour la redirection
          window.dispatchEvent(new Event('permissionsChanged'));
        }
      }, 300); // Réduire le délai pour que l'Authentification puisse rediriger plus vite
      
      return userData;
    } catch (error) {
      console.error('Erreur connexion:', error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Vider le service de permissions
    permissionService.clear();
    
    // Supprimer l'utilisateur du stockage
    localStorage.removeItem('user');
    
    // Réinitialiser l'état
    setUser(null);
    setError(null);
    
    console.log('Déconnexion réussie');
  };

  const refreshPermissions = async () => {
    if (user) {
      try {
        await permissionService.refresh();
        console.log('Permissions rafraîchies');
      } catch (error) {
        console.error('Erreur rafraîchissement permissions:', error);
      }
    }
  };

  const updateUser = (newUserData) => {
    const updatedUser = { ...user, ...newUserData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    refreshPermissions,
    updateUser,
    isAuthenticated: !!user,
    // Exposer le service de permissions directement
    permissions: permissionService
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
