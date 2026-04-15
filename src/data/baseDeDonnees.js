// Fichier pour gérer la base de données des utilisateurs
// URL de base de l'API backend (adaptable via variable d'environnement)
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Creds admin (connexion exclusive)
const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || "admin@julee.local";
const ADMIN_PASSWORD =
  process.env.REACT_APP_ADMIN_PASSWORD || "JuleeAdmin@2024!";

// Charger les utilisateurs depuis l'API MySQL
const chargerUtilisateurs = async () => {
  try {
    console.log("Chargement des utilisateurs depuis l'API...");
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des utilisateurs");
    }
    const utilisateurs = await response.json();
    console.log(" Utilisateurs chargés:", utilisateurs.length, "utilisateurs");
    console.log("Détails:", utilisateurs);
    return utilisateurs;
  } catch (error) {
    console.error("Erreur lors du chargement des utilisateurs:", error);
    return [];
  }
};

// Fonction obsolète - les données sont maintenant dans MySQL
const sauvegarderUtilisateurs = () => {
  console.warn("sauvegarderUtilisateurs() est obsolète avec MySQL");
};

// Trouver un utilisateur par email
const trouverUtilisateurParEmail = async (email) => {
  const utilisateurs = await chargerUtilisateurs();
  return utilisateurs.find((user) => user.email === email);
};

// Vérifier si un email existe déjà (y compris admin)
const emailExisteComplet = async (email, idExclu = null) => {
  try {
    // Vérifier dans la liste normale (sans admin)
    const utilisateur = await trouverUtilisateurParEmail(email);
    if (utilisateur) {
      // Si on modifie un utilisateur existant, exclure son propre ID
      if (idExclu && utilisateur.id === idExclu) return false;
      return true;
    }

    // Vérifier spécifiquement si c'est l'email admin
    if (email.toLowerCase() === "admin@julee.local") {
      return true; // L'admin existe toujours
    }

    return false;
  } catch (error) {
    console.error("Erreur vérification email:", error);
    return false;
  }
};

// Vérifier si un email existe déjà (version publique - sans admin)
const emailExiste = async (email, idExclu = null) => {
  const utilisateur = await trouverUtilisateurParEmail(email);
  if (!utilisateur) return false;
  // Si on modifie un utilisateur existant, exclure son propre ID
  if (idExclu && utilisateur.id === idExclu) return false;
  return true;
};

// Vérifier la complexité du mot de passe (8 caractères différents minimum)
const validerMotDePasse = (motDePasse) => {
  if (!motDePasse || motDePasse.length < 8) {
    return {
      valide: false,
      message: "Le mot de passe doit contenir au moins 8 caractères",
    };
  }

  // Compter les caractères uniques
  const caracteresUniques = new Set(motDePasse).size;
  if (caracteresUniques < 8) {
    return {
      valide: false,
      message: "Le mot de passe doit contenir au moins 8 caractères différents",
    };
  }

  return { valide: true, message: "" };
};

// Créer un nouvel utilisateur
const creerUtilisateur = async (
  prenom,
  nom,
  email,
  motDePasse,
  profilId,
  description = "",
) => {
  // Vérifier si l'email existe déjà (y compris admin)
  if (await emailExisteComplet(email)) {
    return { succes: false, message: "Cet email est déjà utilisé" };
  }

  // Vérifier que le profil est fourni (obligatoire)
  if (!profilId) {
    return {
      succes: false,
      message: "Un profil doit être sélectionné pour créer un utilisateur",
    };
  }

  // Valider le mot de passe
  if (!motDePasse || motDePasse.trim() === "") {
    return { succes: false, message: "Le mot de passe est obligatoire" };
  }

  const validationMotDePasse = validerMotDePasse(motDePasse);
  if (!validationMotDePasse.valide) {
    return { succes: false, message: validationMotDePasse.message };
  }

  // Vérifier si l'email existe déjà
  const emailExisteDeja = await emailExisteComplet(email);
  if (emailExisteDeja) {
    return { succes: false, message: "Cet email est déjà utilisé" };
  }

  try {
    const userData = {
      email: email,
      nom: nom,
      prenom: prenom,
      motDePasse: motDePasse,
      profilId: profilId,
    };
    console.log("Données utilisateur envoyées:", userData);

    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || "Erreur lors de la création de l'utilisateur",
      );
    }

    const utilisateurCree = await response.json();
    return {
      succes: true,
      message: "Compte créé avec succès",
      utilisateur: utilisateurCree,
    };
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return { succes: false, message: "Erreur lors de la création du compte" };
  }
};

// Mettre à jour un utilisateur
const mettreAJourUtilisateur = async (
  id,
  prenom,
  nom,
  email,
  motDePasse,
  profilId,
  description,
) => {
  // Vérifier si l'email existe déjà (en excluant l'utilisateur actuel)
  if (await emailExiste(email, id)) {
    return { succes: false, message: "Cet email est déjà utilisé" };
  }

  // Vérifier que le profil est fourni
  if (!profilId) {
    return { succes: false, message: "Un profil doit être sélectionné" };
  }

  // Récupérer l'utilisateur actuel
  const utilisateurs = await chargerUtilisateurs();
  const utilisateurActuel = utilisateurs.find((u) => u.id === id);

  if (!utilisateurActuel) {
    return { succes: false, message: "Utilisateur introuvable" };
  }

  // Valider le mot de passe seulement s'il est fourni et différent
  if (motDePasse && motDePasse !== utilisateurActuel.motDePasse) {
    const validationMotDePasse = validerMotDePasse(motDePasse);
    if (!validationMotDePasse.valide) {
      return { succes: false, message: validationMotDePasse.message };
    }
  }

  const utilisateurMisAJour = {
    prenom: prenom,
    nom: nom,
    email: email,
    motDePasse: motDePasse || utilisateurActuel.motDePasse,
    profilId: profilId,
    description: description || "",
  };

  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        nom: nom,
        prenom: prenom,
        motDePasse: utilisateurMisAJour.motDePasse,
        profilId: profilId,
        description: description,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Utilisateur introuvable" };
      }
      throw new Error("Erreur lors de la mise à jour de l'utilisateur");
    }

    const utilisateurUpdate = await response.json();
    return {
      succes: true,
      message: "Utilisateur mis à jour avec succès",
      utilisateur: utilisateurUpdate,
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    return { succes: false, message: "Erreur lors de la mise à jour" };
  }
};

// Supprimer un utilisateur
const supprimerUtilisateur = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Utilisateur introuvable" };
      }
      throw new Error("Erreur lors de la suppression de l'utilisateur");
    }

    return { succes: true, message: "Utilisateur supprimé avec succès" };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return { succes: false, message: "Erreur lors de la suppression" };
  }
};

// Vérifier les identifiants de connexion
const verifierConnexion = async (email, motDePasse) => {
  try {
    // Vérifier si c'est le compte admin
    if (email === ADMIN_EMAIL && motDePasse === ADMIN_PASSWORD) {
      return {
        succes: true,
        message: "Connexion réussie (admin)",
        utilisateur: {
          id: 0,
          prenom: "Admin",
          nom: "Julee",
          email: ADMIN_EMAIL,
          profilId: "admin",
        },
      };
    }

    // Vérifier pour les autres utilisateurs via l'API
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, motDePasse }),
    });

    if (!response.ok) {
      return { succes: false, message: "Email ou mot de passe incorrect" };
    }

    const utilisateur = await response.json();
    return {
      succes: true,
      message: "Connexion réussie",
      utilisateur: utilisateur,
    };
  } catch (error) {
    console.error("Erreur lors de la vérification de connexion:", error);
    return { succes: false, message: "Erreur de connexion" };
  }
};

// Exporter les fonctions
export {
  chargerUtilisateurs,
  sauvegarderUtilisateurs,
  trouverUtilisateurParEmail,
  emailExiste,
  emailExisteComplet,
  validerMotDePasse,
  creerUtilisateur,
  mettreAJourUtilisateur,
  supprimerUtilisateur,
  verifierConnexion,
};
