// Fichier pour gérer les recettes via l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Statuts possibles pour la recette
export const STATUTS_RECETTE = ["En cours", "OK", "KO", "Bloquée"];

// Charger les recettes depuis l'API
export const chargerRecettes = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/recettes`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des recettes");
    }
    const recettes = await response.json();
    return recettes;
  } catch (error) {
    console.error("Erreur lors du chargement des recettes:", error);
    return [];
  }
};

// Vérifier si une recette a des anomalies bloquantes (bloque automatiquement)
const aAnomaliesBloquantes = (anomaliesBloquantes) => {
  return anomaliesBloquantes > 0;
};

// Créer une nouvelle recette
export const creerRecette = async (donneesRecette) => {
  const {
    dateDebut,
    dateFin,
    anomaliesBloquantes = 0,
    anomaliesMajeures = 0,
    anomaliesMineures = 0,
    statutGlobal = "En cours",
    commentairesGP = ""
  } = donneesRecette;

  // Validation des champs obligatoires
  if (!dateDebut) {
    return { succes: false, message: "La date de début est obligatoire" };
  }

  // Validation des nombres d'anomalies (doivent être >= 0)
  if (anomaliesBloquantes < 0 || anomaliesMajeures < 0 || anomaliesMineures < 0) {
    return { succes: false, message: "Le nombre d'anomalies ne peut pas être négatif" };
  }

  // Règle : Si anomalies bloquantes > 0, la recette est automatiquement bloquée
  let statutFinal = statutGlobal;
  if (aAnomaliesBloquantes(anomaliesBloquantes)) {
    statutFinal = "Bloquée";
  }

  const dateCreation = new Date().toISOString().split('T')[0];

  const nouvelleRecette = {
    dateDebut: dateDebut,
    dateFin: dateFin || null,
    anomaliesBloquantes: parseInt(anomaliesBloquantes) || 0,
    anomaliesMajeures: parseInt(anomaliesMajeures) || 0,
    anomaliesMineures: parseInt(anomaliesMineures) || 0,
    statutGlobal: statutFinal,
    commentairesGP: commentairesGP.trim(),
    dateCreation: dateCreation,
    dateModification: dateCreation
  };

  try {
    const response = await fetch(`${API_BASE_URL}/recettes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouvelleRecette),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création de la recette");
    }

    const recetteCreee = await response.json();
    return { 
      succes: true, 
      message: "Recette créée avec succès" + (statutFinal === "Bloquée" ? " (bloquée automatiquement à cause d'anomalies bloquantes)" : ""), 
      recette: recetteCreee 
    };
  } catch (error) {
    console.error("Erreur lors de la création de la recette:", error);
    return { succes: false, message: "Erreur lors de la création de la recette" };
  }
};

// Mettre à jour une recette
export const mettreAJourRecette = async (id, donneesRecette) => {
  const {
    dateDebut,
    dateFin,
    anomaliesBloquantes,
    anomaliesMajeures,
    anomaliesMineures,
    statutGlobal,
    commentairesGP
  } = donneesRecette;

  // Validation de la date de début
  if (dateDebut !== undefined && !dateDebut) {
    return { succes: false, message: "La date de début est obligatoire" };
  }

  // Validation des nombres d'anomalies
  if (
    (anomaliesBloquantes !== undefined && anomaliesBloquantes < 0) ||
    (anomaliesMajeures !== undefined && anomaliesMajeures < 0) ||
    (anomaliesMineures !== undefined && anomaliesMineures < 0)
  ) {
    return { succes: false, message: "Le nombre d'anomalies ne peut pas être négatif" };
  }

  // Récupérer la recette actuelle
  const recettes = await chargerRecettes();
  const recetteActuelle = recettes.find((r) => r.id === id);
  
  if (!recetteActuelle) {
    return { succes: false, message: "Recette introuvable" };
  }

  // Règle : Si anomalies bloquantes > 0, la recette est automatiquement bloquée
  let statutFinal = statutGlobal !== undefined ? statutGlobal : recetteActuelle.statutGlobal;
  const anomaliesBloquantesFinal = anomaliesBloquantes !== undefined 
    ? parseInt(anomaliesBloquantes) 
    : recetteActuelle.anomaliesBloquantes;

  let messageBloquage = "";
  if (aAnomaliesBloquantes(anomaliesBloquantesFinal)) {
    if (statutFinal !== "Bloquée") {
      messageBloquage = " (bloquée automatiquement à cause d'anomalies bloquantes)";
    }
    statutFinal = "Bloquée";
  }

  const recetteMiseAJour = {
    ...(dateDebut !== undefined && { dateDebut }),
    ...(dateFin !== undefined && { dateFin: dateFin || null }),
    ...(anomaliesBloquantes !== undefined && { anomaliesBloquantes: anomaliesBloquantesFinal }),
    ...(anomaliesMajeures !== undefined && { anomaliesMajeures: parseInt(anomaliesMajeures) || 0 }),
    ...(anomaliesMineures !== undefined && { anomaliesMineures: parseInt(anomaliesMineures) || 0 }),
    statutGlobal: statutFinal,
    ...(commentairesGP !== undefined && { commentairesGP: commentairesGP.trim() }),
    dateModification: new Date().toISOString().split('T')[0]
  };

  try {
    const response = await fetch(`${API_BASE_URL}/recettes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recetteMiseAJour),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Recette introuvable" };
      }
      throw new Error("Erreur lors de la mise à jour de la recette");
    }

    const recetteUpdated = await response.json();
    return { 
      succes: true, 
      message: "Recette mise à jour avec succès" + messageBloquage, 
      recette: recetteUpdated 
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la recette:", error);
    return { succes: false, message: "Erreur lors de la mise à jour de la recette" };
  }
};

// Supprimer une recette
export const supprimerRecette = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/recettes/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Recette introuvable" };
      }
      throw new Error("Erreur lors de la suppression de la recette");
    }

    return { succes: true, message: "Recette supprimée avec succès" };
  } catch (error) {
    console.error("Erreur lors de la suppression de la recette:", error);
    return { succes: false, message: "Erreur lors de la suppression de la recette" };
  }
};

// Obtenir une recette par ID
export const obtenirRecette = async (id) => {
  const recettes = await chargerRecettes();
  return recettes.find((r) => r.id === id);
};
