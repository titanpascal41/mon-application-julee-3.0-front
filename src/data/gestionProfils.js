import { apiFetch } from "../utils/apiFetch";
// Fichier pour gérer les profils via l'API

import { chargerUtilisateurs } from "./baseDeDonnees";



// Charger les profils depuis l'API

const chargerProfils = async () => {
  try {
    const response = await apiFetch(`/profils`);

    if (!response.ok) {
      throw new Error("Erreur lors du chargement des profils");
    }

    const profils = await response.json();

    return profils;
  } catch (error) {
    console.error("Erreur lors du chargement des profils:", error);

    return [];
  }
};

// Trouver un profil par ID

const trouverProfilParId = async (id) => {
  try {
    const profils = await chargerProfils();

    return profils.find((profil) => profil.id === id);
  } catch (error) {
    console.error("Erreur lors de la recherche du profil:", error);

    return null;
  }
};

// Trouver un profil par nom (pour vérifier l'unicité)

const trouverProfilParNom = async (nom) => {
  try {
    const profils = await chargerProfils();

    return profils.find(
      (profil) => profil.nom.toLowerCase() === nom.toLowerCase(),
    );
  } catch (error) {
    console.error("Erreur lors de la recherche du profil:", error);

    return null;
  }
};

// Vérifier si un nom de profil existe déjà

const nomProfilExiste = async (nom, idExclu = null) => {
  const profil = await trouverProfilParNom(nom);

  if (!profil) return false;

  // Si on modifie un profil existant, exclure son propre ID

  if (idExclu && profil.id === idExclu) return false;

  return true;
};

// Vérifier si un profil est assigné à un utilisateur

const profilEstUtilise = async (profilId) => {
  const utilisateurs = await chargerUtilisateurs();

  return utilisateurs.some((user) => user.profilId === profilId);
};

// Créer un nouveau profil

const creerProfil = async (nom, code) => {
  // Normaliser le nom (trim seulement)

  const nomNormalise = nom.trim();

  // Vérifier que le champ n'est pas vide

  if (!nomNormalise) {
    return { succes: false, message: "Le nom est obligatoire" };
  }

  // Vérifier si le nom existe déjà

  if (await nomProfilExiste(nomNormalise)) {
    return { succes: false, message: "Un profil avec ce nom existe déjà" };
  }

  try {
    const response = await apiFetch(`/profils`, {
      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({
        nom: nomNormalise,
        code: code ? code.trim().toUpperCase() : null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return { succes: false, message: "Profil introuvable" };
      }

      if (
        response.status === 500 &&
        errorData.error === "Erreur de date invalide"
      ) {
        return {
          succes: false,

          message: errorData.message || "Erreur de date invalide détectée",
        };
      }

      return {
        succes: false,

        message: errorData.error || "Erreur lors de la création du profil",
      };
    }

    const nouveauProfil = await response.json();

    return {
      succes: true,

      message: "Profil créé avec succès",

      profil: nouveauProfil,
    };
  } catch (error) {
    console.error("Erreur lors de la création du profil:", error);

    return { succes: false, message: "Erreur lors de la création du profil" };
  }
};

// Mettre à jour un profil

const mettreAJourProfil = async (id, nom, code) => {
  // Normaliser le nom (trim seulement)

  const nomNormalise = nom.trim();

  // Vérifier que le champ n'est pas vide

  if (!nomNormalise) {
    return { succes: false, message: "Le nom est obligatoire" };
  }

  // Vérifier si le nom existe déjà (en excluant le profil actuel)

  if (await nomProfilExiste(nomNormalise, id)) {
    return { succes: false, message: "Un profil avec ce nom existe déjà" };
  }

  try {
    const response = await apiFetch(`/profils/${id}`, {
      method: "PUT",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({
        nom: nomNormalise,
        code: code ? code.trim().toUpperCase() : null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return { succes: false, message: "Profil introuvable" };
      }

      if (
        response.status === 500 &&
        errorData.error === "Erreur de date invalide"
      ) {
        return {
          succes: false,

          message: errorData.message || "Erreur de date invalide détectée",
        };
      }

      return {
        succes: false,

        message: errorData.error || "Erreur lors de la mise à jour du profil",
      };
    }

    const profilMisAJour = await response.json();

    return {
      succes: true,

      message: "Profil mis à jour avec succès",

      profil: profilMisAJour,
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);

    return {
      succes: false,

      message: "Erreur lors de la mise à jour du profil",
    };
  }
};

// Supprimer un profil

const supprimerProfil = async (id) => {
  // Vérifier si le profil est assigné à un utilisateur

  if (await profilEstUtilise(id)) {
    return {
      succes: false,

      message:
        "Ce profil ne peut pas être supprimé car il est assigné à un ou plusieurs utilisateurs",
    };
  }

  try {
    const response = await apiFetch(`/profils/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return { succes: false, message: "Profil introuvable" };
      }

      if (
        response.status === 500 &&
        errorData.error === "Erreur de date invalide"
      ) {
        return {
          succes: false,

          message: errorData.message || "Erreur de date invalide détectée",
        };
      }

      return {
        succes: false,

        message: errorData.error || "Erreur lors de la suppression du profil",
      };
    }

    return { succes: true, message: "Profil supprimé avec succès" };
  } catch (error) {
    console.error("Erreur lors de la suppression du profil:", error);

    return {
      succes: false,

      message: "Erreur lors de la suppression du profil",
    };
  }
};

// Fonction utilitaire pour garder la compatibilité (non async wrapper)

// Note: Les composants qui utilisaient ces fonctions doivent maintenant gérer async/await

const sauvegarderProfils = () => {
  // Cette fonction n'est plus nécessaire avec l'API

  console.warn("sauvegarderProfils() est obsolète avec l'API");
};

// Activer ou  un profil
const toggleActivationProfil = async (
  id,
  actif,
  motifDesactivation = null,
  utilisateurId = null,
) => {
  try {
    const response = await apiFetch(`/profils/${id}/activation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif, motifDesactivation, utilisateurId }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors du changement d'activation");
    }

    const profil = await response.json();
    return { succes: true, profil };
  } catch (error) {
    console.error("Erreur toggle activation profil:", error);
    return { succes: false, message: error.message };
  }
};

// Exporter les fonctions

export {
  chargerProfils,
  sauvegarderProfils,
  trouverProfilParId,
  trouverProfilParNom,
  nomProfilExiste,
  profilEstUtilise,
  creerProfil,
  mettreAJourProfil,
  supprimerProfil,
  toggleActivationProfil,
};
