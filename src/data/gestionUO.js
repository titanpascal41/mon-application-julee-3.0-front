// Fichier pour gérer les unités organisationnelles via l'API
import { chargerUtilisateurs } from "./baseDeDonnees";
import { chargerSocietes } from "./societes";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Charger les UO depuis l'API
const chargerUO = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/uo`);
    if (!response.ok) {
      throw new Error(
        "Erreur lors du chargement des unités organisationnelles",
      );
    }
    const uo = await response.json();
    return uo;
  } catch (error) {
    console.error("Erreur lors du chargement des UO:", error);
    return [];
  }
};

// Sauvegarder les UO (fonction obsolète avec l'API)
const sauvegarderUO = () => {
  console.warn("sauvegarderUO() est obsolète avec l'API");
};

// Vérifier si une UO a des utilisateurs
const uoContientUtilisateurs = async (uoId) => {
  const utilisateurs = await chargerUtilisateurs();
  return utilisateurs.some((u) => u.uoId === uoId);
};

// Créer une nouvelle UO
const creerUO = async ({ nom, code, chefUO, actif, societeId, projetSoumis, departement }) => {
  if (!nom || societeId === null || societeId === undefined || societeId === "") {
    return {
      succes: false,
      message: "Tous les champs obligatoires doivent être remplis",
    };
  }

  if (nom.length > 100) {
    return {
      succes: false,
      message: "Le nom de l'UO ne doit pas dépasser 100 caractères",
    };
  }

  const societes = await chargerSocietes();
  const societeExiste = societes.some((s) => s.id === parseInt(societeId));
  if (!societeExiste) {
    return { succes: false, message: "La société sélectionnée n'existe pas" };
  }

  const nouvelleUO = {
    nom: nom.trim(),
    code: code ? code.trim().toUpperCase() : null,
    chefUO: chefUO ? chefUO.trim() : null,
    departement: departement ? departement.trim() : null,
    actif: actif === true || actif === "true",
    societeId: societeId ? parseInt(societeId) : null,
    projetSoumis: projetSoumis || null,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/uo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouvelleUO),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création de l'UO");
    }

    const uoCreee = await response.json();
    return {
      succes: true,
      message: "Unité organisationnelle créée avec succès",
      uo: uoCreee,
    };
  } catch (error) {
    console.error("Erreur lors de la création de l'UO:", error);
    return {
      succes: false,
      message: "Erreur lors de la création de l'unité organisationnelle",
    };
  }
};

// Mettre à jour une UO
const mettreAJourUO = async (
  id,
  { nom, code, chefUO, actif, societeId, projetSoumis, departement },
) => {
  if (!nom || societeId === null || societeId === undefined || societeId === "") {
    return {
      succes: false,
      message: "Tous les champs obligatoires doivent être remplis",
    };
  }

  if (nom.length > 100) {
    return {
      succes: false,
      message: "Le nom de l'UO ne doit pas dépasser 100 caractères",
    };
  }

  const societes = await chargerSocietes();
  const societeExiste = societes.some((s) => s.id === parseInt(societeId));
  if (!societeExiste) {
    return { succes: false, message: "La société sélectionnée n'existe pas" };
  }

  const uoList = await chargerUO();
  const uoActuelle = uoList.find((uo) => uo.id === id);

  if (!uoActuelle) {
    return { succes: false, message: "Unité organisationnelle introuvable" };
  }

  const ancienneSocieteId = uoActuelle.societeId;
  const nouvelleSocieteId = parseInt(societeId);

  if (
    ancienneSocieteId !== nouvelleSocieteId &&
    (await uoContientUtilisateurs(id))
  ) {
    return {
      succes: false,
      message: "Impossible de changer la société d'une UO qui contient des utilisateurs",
    };
  }

  const uoMiseAJour = {
    nom: nom.trim(),
    code: code ? code.trim().toUpperCase() : null,
    chefUO: chefUO ? chefUO.trim() : null,
    departement: departement ? departement.trim() : null,
    actif: actif === true || actif === "true",
    societeId: parseInt(societeId),
    projetSoumis: projetSoumis || null,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/uo/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uoMiseAJour),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          succes: false,
          message: "Unité organisationnelle introuvable",
        };
      }
      throw new Error("Erreur lors de la mise à jour de l'UO");
    }

    const uoUpdated = await response.json();
    return {
      succes: true,
      message: "Unité organisationnelle mise à jour avec succès",
      uo: uoUpdated,
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'UO:", error);
    return {
      succes: false,
      message: "Erreur lors de la mise à jour de l'unité organisationnelle",
    };
  }
};

// Supprimer une UO
const supprimerUO = async (id) => {
  // Vérifier si l'UO a des utilisateurs
  if (await uoContientUtilisateurs(id)) {
    return {
      succes: false,
      message: "Impossible de supprimer une UO qui contient des utilisateurs",
    };
  }

  // Vérifier si l'UO a des UO enfants
  const uoList = await chargerUO();
  const uoEnfants = uoList.filter((uo) => uo.uoParenteId === id);
  if (uoEnfants.length > 0) {
    return {
      succes: false,
      message:
        "Impossible de supprimer une UO qui a des unités organisationnelles filles",
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/uo/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          succes: false,
          message: "Unité organisationnelle introuvable",
        };
      }
      throw new Error("Erreur lors de la suppression de l'UO");
    }

    return {
      succes: true,
      message: "Unité organisationnelle supprimée avec succès",
    };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'UO:", error);
    return {
      succes: false,
      message: "Erreur lors de la suppression de l'unité organisationnelle",
    };
  }
};

// Obtenir les types d'UO disponibles
const getTypesUO = () => {
  return ["Direction", "département", "service", "équipe", "filiale"];
};

// Activer ou désactiver une UO
const toggleActivationUO = async (id, actif, utilisateurId = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/uo/${id}/activation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif, utilisateurId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { succes: false, message: data.message || "Erreur lors du changement d'activation" };
    }
    return { succes: true };
  } catch (error) {
    return { succes: false, message: error.message };
  }
};

// Exporter les fonctions
export {
  chargerUO,
  sauvegarderUO,
  creerUO,
  mettreAJourUO,
  supprimerUO,
  uoContientUtilisateurs,
  getTypesUO,
  toggleActivationUO,
};
