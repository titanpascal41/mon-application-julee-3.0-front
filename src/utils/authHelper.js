// Utilitaire d'aide pour l'authentification et les permissions

// Fonction pour créer un utilisateur de test avec permissions
export const createTestUser = async (userData) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Échec de la création de l\'utilisateur');
    }

    const result = await response.json();
    console.log('Utilisateur créé avec succès:', result);
    return result;
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    throw error;
  }
};

// Fonction pour connecter un utilisateur de test
export const loginTestUser = async (email, password) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Échec de la connexion');
    }

    const userData = await response.json();
    
    // Stocker l'utilisateur
    localStorage.setItem('user', JSON.stringify(userData));
    
    console.log('Connexion réussie:', userData);
    return userData;
  } catch (error) {
    console.error('Erreur connexion:', error);
    throw error;
  }
};

// Fonction pour créer un profil de test avec permissions
export const createTestProfileWithPermissions = async (profileName, permissions) => {
  try {
    // 1. Créer le profil
    const profileResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/profils`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nom: profileName }),
    });

    if (!profileResponse.ok) {
      throw new Error('Échec de la création du profil');
    }

    const profile = await profileResponse.json();

    // 2. Créer les permissions par défaut
    await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/permissions/profil/${profile.id}/defaults`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 3. Mettre à jour les permissions si fournies
    if (permissions && permissions.length > 0) {
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/permissions/profil/${profile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });
    }

    console.log('Profil et permissions créés avec succès:', profile);
    return profile;
  } catch (error) {
    console.error('Erreur création profil/permissions:', error);
    throw error;
  }
};

// Fonction pour obtenir les permissions par défaut
export const getDefaultPermissions = () => {
  return [
    // Administration
    { module: "administration", submodule: "profils", access: false, create: false, read: true, update: false, delete: false },
    { module: "administration", submodule: "utilisateurs", access: false, create: false, read: true, update: false, delete: false },
    
    // Paramétrage
    { module: "parametrage", submodule: "societes", access: true, create: false, read: true, update: false, delete: false },
    { module: "parametrage", submodule: "uo", access: true, create: false, read: true, update: false, delete: false },
    { module: "parametrage", submodule: "statuts", access: true, create: false, read: true, update: false, delete: false },
    { module: "parametrage", submodule: "interlocuteurs", access: true, create: false, read: true, update: false, delete: false },
    
    // Demandes
    { module: "demandes", submodule: "gestion", access: true, create: true, read: true, update: true, delete: false },
  ];
};

// Fonction pour créer un utilisateur de test complet
export const setupTestUser = async () => {
  try {
    // 1. Créer un profil de test
    const testPermissions = getDefaultPermissions();
    const profile = await createTestProfileWithPermissions('Utilisateur Test', testPermissions);
    
    // 2. Créer un utilisateur avec ce profil
    const userData = {
      nom: 'Test',
      prenom: 'User',
      email: 'test@example.com',
      motDePasse: 'Test123!',
      profilId: profile.id
    };
    
    await createTestUser(userData);
    
    // 3. Connecter l'utilisateur
    const loggedInUser = await loginTestUser('test@example.com', 'Test123!');
    return loggedInUser;
  } catch (error) {
    console.error('Erreur setup utilisateur de test:', error);
    throw error;
  }
};

// Fonction pour vérifier si le backend est accessible
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/health`, {
      method: 'GET',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Backend inaccessible:', error);
    return false;
  }
};
