// Service d'authentification avec localStorage
import { verifierConnexion } from "../data/baseDeDonnees";
import { saveToken, removeToken } from "../utils/apiFetch";

// Clé pour le localStorage
const AUTH_STORAGE_KEY = "julee_auth_state";

// État global de l'authentification
let authState = {
  utilisateur: null,
  isAuthenticated: false,
  isLoading: false,
  listeners: [],
};

// Initialiser l'état depuis le localStorage au démarrage
const initializeAuthFromStorage = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsedState = JSON.parse(stored);
      authState.utilisateur = parsedState.utilisateur;
      authState.isAuthenticated = parsedState.isAuthenticated;
    }
  } catch (error) {
    console.error("Erreur lors de la lecture du localStorage:", error);
    // En cas d'erreur, on nettoie le localStorage
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

// Sauvegarder l'état dans le localStorage
const saveAuthToStorage = () => {
  try {
    const stateToSave = {
      utilisateur: authState.utilisateur,
      isAuthenticated: authState.isAuthenticated,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Erreur lors de la sauvegarde dans le localStorage:", error);
  }
};

// Nettoyer le localStorage
const clearAuthFromStorage = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error("Erreur lors du nettoyage du localStorage:", error);
  }
};

// Initialiser au démarrage
initializeAuthFromStorage();

// Ajouter un écouteur pour les changements d'état
const addAuthListener = (callback) => {
  authState.listeners.push(callback);
};

// Notifier tous les écouteurs
const notifyListeners = () => {
  authState.listeners.forEach((callback) => callback(authState));
};

// Se connecter
const login = async (email, motDePasse) => {
  authState.isLoading = true;
  notifyListeners();

  try {
    const resultat = await verifierConnexion(email, motDePasse);

    if (resultat.succes) {
      authState.utilisateur = resultat.utilisateur;
      authState.isAuthenticated = true;
      authState.isLoading = false;
      if (resultat.token) saveToken(resultat.token);
      saveAuthToStorage(); // Sauvegarder dans le localStorage
      notifyListeners();
      return { succes: true, utilisateur: resultat.utilisateur };
    } else {
      authState.isLoading = false;
      notifyListeners();
      return { succes: false, message: resultat.message };
    }
  } catch (error) {
    authState.isLoading = false;
    notifyListeners();
    return { succes: false, message: "Erreur de connexion" };
  }
};

// Se déconnecter
const logout = () => {
  authState.utilisateur = null;
  authState.isAuthenticated = false;
  authState.isLoading = false;
  removeToken();
  clearAuthFromStorage();
  notifyListeners();
};

// Obtenir l'état actuel
const getAuthState = () => ({ ...authState });

// Mettre à jour les informations de l'utilisateur
const updateUtilisateur = (nouvellesInfos) => {
  if (authState.utilisateur) {
    authState.utilisateur = { ...authState.utilisateur, ...nouvellesInfos };
    saveAuthToStorage(); // Sauvegarder les changements
    notifyListeners();
  }
};

// Vérifier si l'utilisateur est authentifié
const isAuthenticated = () =>
  authState.isAuthenticated && authState.utilisateur !== null;

// Obtenir l'utilisateur connecté
const getUtilisateurConnecte = () => authState.utilisateur;

export {
  login,
  logout,
  getAuthState,
  addAuthListener,
  updateUtilisateur,
  isAuthenticated,
  getUtilisateurConnecte,
};
