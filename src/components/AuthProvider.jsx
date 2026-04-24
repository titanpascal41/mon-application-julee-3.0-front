import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import permissionService from '../services/permissionService';
import { setUnauthorizedHandler, saveToken, removeToken } from '../utils/apiFetch';

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
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      permissionService.clear();
      localStorage.removeItem('user');
      removeToken();
      setUser(null);
      navigate('/login', { replace: true });
    });
  }, [navigate]);

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
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/users/${userData.id}/profile`, { headers: { Authorization: `Bearer ${localStorage.getItem('julee_token') || ''}` } });
            if (response.status === 403) {
              // Profil désactivé — forcer la déconnexion
              permissionService.clear();
              localStorage.removeItem('user');
              removeToken();
              setLoading(false);
              return;
            }
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
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Échec de l\'authentification');
      }

      const data = await response.json();
      // Backend returns { token, utilisateur }
      const utilisateur = data.utilisateur || data;
      const token = data.token;

      if (token) saveToken(token);
      localStorage.setItem('user', JSON.stringify(utilisateur));

      // Initialiser les permissions
      try {
        await permissionService.initialize(utilisateur.id, utilisateur);
      } catch (error) {
        console.warn('Erreur initialisation permissions:', error);
      }

      setUser(utilisateur);
      console.log('Connexion réussie:', utilisateur);
      
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
      
      return utilisateur;
    } catch (error) {
      console.error('Erreur connexion:', error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    permissionService.clear();
    localStorage.removeItem('user');
    removeToken();
    setUser(null);
    setError(null);
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
