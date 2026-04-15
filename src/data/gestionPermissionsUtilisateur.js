const API_BASE_URL = 'http://localhost:3002';

// Charger les permissions d'un utilisateur spécifique
export const chargerPermissionsUtilisateurIndividuelles = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user-permissions/user/${userId}`);
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des permissions utilisateur');
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
};

// Mettre à jour les permissions d'un utilisateur
export const mettreAJourPermissionsUtilisateur = async (userId, permissions) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user-permissions/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ permissions }),
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la mise à jour des permissions utilisateur');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
};

// Réinitialiser les permissions d'un utilisateur aux permissions du profil
export const reinitialiserPermissionsUtilisateur = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user-permissions/${userId}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la réinitialisation des permissions utilisateur');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
};

// Vérifier si un utilisateur a des permissions personnalisées
export const verifierPermissionsPersonnalisees = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user-permissions/${userId}/has-custom`);
    if (!response.ok) {
      throw new Error('Erreur lors de la vérification des permissions personnalisées');
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
};

// Structure des modules pour le formulaire
export const MODULES_STRUCTURE = {
  administration: {
    label: "Administration",
    submodules: {
      profils: "Profils",
      utilisateurs: "Utilisateurs",
    },
  },
  parametrage: {
    label: "Paramétrage",
    submodules: {
      uo: "Unités Organisationnelles",
      societes: "Sociétés",
    },
  },
  planification: {
    label: "Planification",
    submodules: {
      taches: "Tâches",
      delais: "Délais",
    },
  },
  demandes: {
    label: "Gestion des Demandes",
    submodules: {
      creation: "Création",
      suivi: "Suivi",
      validation: "Validation",
    },
  },
};

// Générer la structure complète des permissions
export const genererPermissionsStructure = () => {
  const permissions = [];
  
  Object.entries(MODULES_STRUCTURE).forEach(([module, moduleData]) => {
    Object.entries(moduleData.submodules).forEach(([submodule, label]) => {
      permissions.push({
        module,
        submodule,
        access: false,
        create: false,
        read: true,
        update: false,
        delete: false,
        moduleLabel: moduleData.label,
        submoduleLabel: label,
      });
    });
  });
  
  return permissions;
};
