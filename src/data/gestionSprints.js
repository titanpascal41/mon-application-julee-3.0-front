// Fichier pour gérer les sprints via l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Charger les sprints depuis l'API
const chargerSprints = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/sprints`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des sprints");
    }
    const sprints = await response.json();
    return sprints;
  } catch (error) {
    console.error("Erreur lors du chargement des sprints:", error);
    return [];
  }
};

// Trouver un sprint par ID
const trouverSprintParId = async (id) => {
  const sprints = await chargerSprints();
  return sprints.find((sprint) => sprint.id === id);
};

// Valider les données d'un sprint
const validerSprint = (sprintData) => {
  if (!sprintData.nom || sprintData.nom.trim() === "") {
    return { valide: false, message: "Le nom du sprint est obligatoire" };
  }

  if (!sprintData.dateDebut) {
    return { valide: false, message: "La date de début est obligatoire" };
  }

  if (!sprintData.dateFin) {
    return { valide: false, message: "La date de fin est obligatoire" };
  }

  if (new Date(sprintData.dateDebut) > new Date(sprintData.dateFin)) {
    return {
      valide: false,
      message: "La date de fin doit être postérieure à la date de début",
    };
  }

  // Valider les ressources
  if (sprintData.ressources && sprintData.ressources.length > 0) {
    for (const ressource of sprintData.ressources) {
      if (!ressource.type || (ressource.type !== "DEV" && ressource.type !== "TIV")) {
        return {
          valide: false,
          message: "Chaque ressource doit être typée DEV ou TIV",
        };
      }

      if (
        ressource.disponibilite === undefined ||
        ressource.disponibilite === null ||
        ressource.disponibilite < 0
      ) {
        return {
          valide: false,
          message: "Chaque ressource doit avoir une disponibilité en Homme/Jour (>= 0)",
        };
      }

      if (
        ressource.tjm === undefined ||
        ressource.tjm === null ||
        ressource.tjm < 0
      ) {
        return {
          valide: false,
          message: "Chaque ressource doit avoir un Taux Journalier (TJM) >= 0",
        };
      }
    }
  }

  return { valide: true, message: "" };
};

// Créer un nouveau sprint
const creerSprint = async (sprintData) => {
  // Validation
  const validation = validerSprint(sprintData);
  if (!validation.valide) {
    return { succes: false, message: validation.message };
  }

  const nouveauSprint = {
    nom: sprintData.nom.trim(),
    description: sprintData.description || "",
    dateDebut: sprintData.dateDebut,
    dateFin: sprintData.dateFin,
    dateValidationSI: sprintData.dateValidationSI || null,
    dateReponseDEV: sprintData.dateReponseDEV || null,
    dateReponseTIV: sprintData.dateReponseTIV || null,
    etape: sprintData.etape || "",
    evenementImportant: sprintData.evenementImportant || "",
    pointsControle: sprintData.pointsControle || [],
    ressources: sprintData.ressources || [],
    respectPlanning: sprintData.respectPlanning || false,
    dateCreation: new Date().toISOString(),
    dateModification: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/sprints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveauSprint),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création du sprint");
    }

    const sprintCree = await response.json();
    return {
      succes: true,
      message: "Sprint créé avec succès",
      sprint: sprintCree,
    };
  } catch (error) {
    console.error("Erreur lors de la création du sprint:", error);
    return { succes: false, message: "Erreur lors de la création du sprint" };
  }
};

// Mettre à jour un sprint
const mettreAJourSprint = async (id, sprintData) => {
  // Validation
  const validation = validerSprint(sprintData);
  if (!validation.valide) {
    return { succes: false, message: validation.message };
  }

  const sprintModifie = {
    nom: sprintData.nom.trim(),
    description: sprintData.description || "",
    dateDebut: sprintData.dateDebut,
    dateFin: sprintData.dateFin,
    dateValidationSI: sprintData.dateValidationSI || null,
    dateReponseDEV: sprintData.dateReponseDEV || null,
    dateReponseTIV: sprintData.dateReponseTIV || null,
    etape: sprintData.etape || "",
    evenementImportant: sprintData.evenementImportant || "",
    pointsControle: sprintData.pointsControle || [],
    ressources: sprintData.ressources || [],
    respectPlanning: sprintData.respectPlanning || false,
    dateModification: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/sprints/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sprintModifie),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Sprint non trouvé" };
      }
      throw new Error("Erreur lors de la mise à jour du sprint");
    }

    const sprintUpdate = await response.json();
    return {
      succes: true,
      message: "Sprint mis à jour avec succès",
      sprint: sprintUpdate,
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du sprint:", error);
    return { succes: false, message: "Erreur lors de la mise à jour du sprint" };
  }
};

// Supprimer un sprint
const supprimerSprint = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/sprints/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Sprint non trouvé" };
      }
      throw new Error("Erreur lors de la suppression du sprint");
    }

    return { succes: true, message: "Sprint supprimé avec succès" };
  } catch (error) {
    console.error("Erreur lors de la suppression du sprint:", error);
    return { succes: false, message: "Erreur lors de la suppression du sprint" };
  }
};

// Calculer le coût total d'un sprint
const calculerCoutSprint = async (sprintId) => {
  const sprint = await trouverSprintParId(sprintId);
  if (!sprint || !sprint.ressources || sprint.ressources.length === 0) {
    return 0;
  }

  let coutTotal = 0;
  sprint.ressources.forEach((ressource) => {
    const coutRessource = ressource.disponibilite * ressource.tjm;
    coutTotal += coutRessource;
  });

  return coutTotal;
};

export {
  chargerSprints,
  trouverSprintParId,
  creerSprint,
  mettreAJourSprint,
  supprimerSprint,
  calculerCoutSprint,
  validerSprint,
};
