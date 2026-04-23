import { apiFetch } from "../utils/apiFetch";
// Fichier pour gérer les UAT via l'API
import { chargerRecettes } from './gestionRecettes';



// Statuts possibles pour l'UAT
export const STATUTS_UAT = ["Accepté", "Accepté avec réserve", "Refusé"];

// Charger les UAT depuis l'API
export const chargerUAT = async () => {
  try {
    const response = await apiFetch(`/uat`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des UAT");
    }
    const uat = await response.json();
    return uat;
  } catch (error) {
    console.error("Erreur lors du chargement des UAT:", error);
    return [];
  }
};

// Vérifier si la recette interne est 100% OK (règle de gestion)
export const recetteInterneEstOK = async () => {
  const recettes = await chargerRecettes();
  
  // S'il n'y a pas de recette, on ne peut pas commencer l'UAT
  if (recettes.length === 0) {
    return { 
      estOK: false, 
      message: "Aucune recette interne trouvée. Vous devez d'abord créer et valider une recette interne." 
    };
  }
  
  // Vérifier qu'il existe au moins une recette avec le statut "OK"
  const recetteOK = recettes.find(r => r.statutGlobal === "OK");
  
  if (!recetteOK) {
    return { 
      estOK: false, 
      message: "La recette interne doit être 100% OK (statut = 'OK') avant de pouvoir commencer l'UAT. Actuellement, aucune recette n'est au statut OK." 
    };
  }
  
  // Vérifier qu'il n'y a pas d'anomalies bloquantes dans la recette OK
  if (recetteOK.anomaliesBloquantes > 0) {
    return { 
      estOK: false, 
      message: "La recette interne ne peut pas être OK si elle contient des anomalies bloquantes." 
    };
  }
  
  return { 
    estOK: true, 
    message: "La recette interne est OK, vous pouvez commencer l'UAT.",
    recetteOK: recetteOK
  };
};

// Créer une nouvelle UAT
export const creerUAT = async (donneesUAT) => {
  // Règle de gestion : L'UAT ne peut commencer que si la recette interne est 100% OK
  const validationRecette = await recetteInterneEstOK();
  if (!validationRecette.estOK) {
    return { succes: false, message: validationRecette.message };
  }

  const {
    dateDebutUAT,
    dateFinUAT,
    statutUAT = "",
    nombreRetoursUAT = 0,
    reservesMetier = "",
    commentaireUAT = "",
    signatureValidationClient = "",
    planAction = ""
  } = donneesUAT;

  // Validation des champs obligatoires
  if (!dateDebutUAT) {
    return { succes: false, message: "La date de début UAT est obligatoire" };
  }

  if (!dateFinUAT) {
    return { succes: false, message: "La date de fin UAT est obligatoire" };
  }

  // Validation : la date de fin doit être après la date de début
  if (new Date(dateFinUAT) < new Date(dateDebutUAT)) {
    return { succes: false, message: "La date de fin UAT doit être postérieure à la date de début" };
  }

  if (!statutUAT) {
    return { succes: false, message: "Le statut UAT est obligatoire" };
  }

  // Règle : Si refus → un plan d'action doit être créé par le GP
  if (statutUAT === "Refusé" && !planAction.trim()) {
    return { 
      succes: false, 
      message: "Un plan d'action est obligatoire lorsque le statut UAT est 'Refusé'" 
    };
  }

  // Validation du nombre de retours (doit être >= 0)
  if (nombreRetoursUAT < 0) {
    return { succes: false, message: "Le nombre de retours UAT ne peut pas être négatif" };
  }

  const dateCreation = new Date().toISOString().split('T')[0];

  const nouvelleUAT = {
    dateDebutUAT: dateDebutUAT,
    dateFinUAT: dateFinUAT,
    statutUAT: statutUAT,
    nombreRetoursUAT: parseInt(nombreRetoursUAT) || 0,
    reservesMetier: reservesMetier.trim(),
    commentaireUAT: commentaireUAT.trim(),
    signatureValidationClient: signatureValidationClient.trim(),
    planAction: planAction.trim(),
    dateCreation: dateCreation,
    dateModification: dateCreation,
    recetteInterneId: validationRecette.recetteOK.id // Lier à la recette interne OK
  };

  try {
    const response = await apiFetch(`/uat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouvelleUAT),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création de l'UAT");
    }

    const uatCreee = await response.json();
    return { 
      succes: true, 
      message: "UAT créée avec succès", 
      uat: uatCreee 
    };
  } catch (error) {
    console.error("Erreur lors de la création de l'UAT:", error);
    return { succes: false, message: "Erreur lors de la création de l'UAT" };
  }
};

// Mettre à jour une UAT
export const mettreAJourUAT = async (id, donneesUAT) => {
  const {
    dateDebutUAT,
    dateFinUAT,
    statutUAT,
    nombreRetoursUAT,
    reservesMetier,
    commentaireUAT,
    signatureValidationClient,
    planAction
  } = donneesUAT;

  // Validation de la date de début
  if (dateDebutUAT !== undefined && !dateDebutUAT) {
    return { succes: false, message: "La date de début UAT est obligatoire" };
  }

  // Validation de la date de fin
  if (dateFinUAT !== undefined && !dateFinUAT) {
    return { succes: false, message: "La date de fin UAT est obligatoire" };
  }

  // Récupérer l'UAT actuelle
  const uatList = await chargerUAT();
  const uatActuelle = uatList.find((u) => u.id === id);
  
  if (!uatActuelle) {
    return { succes: false, message: "UAT introuvable" };
  }

  // Validation : la date de fin doit être après la date de début
  const dateDebut = dateDebutUAT !== undefined ? dateDebutUAT : uatActuelle.dateDebutUAT;
  const dateFin = dateFinUAT !== undefined ? dateFinUAT : uatActuelle.dateFinUAT;
  
  if (new Date(dateFin) < new Date(dateDebut)) {
    return { succes: false, message: "La date de fin UAT doit être postérieure à la date de début" };
  }

  // Règle : Si refus → un plan d'action doit être créé par le GP
  const statutFinal = statutUAT !== undefined ? statutUAT : uatActuelle.statutUAT;
  const planActionFinal = planAction !== undefined ? planAction : uatActuelle.planAction;
  
  if (statutFinal === "Refusé" && !planActionFinal.trim()) {
    return { 
      succes: false, 
      message: "Un plan d'action est obligatoire lorsque le statut UAT est 'Refusé'" 
    };
  }

  // Validation du nombre de retours
  if (nombreRetoursUAT !== undefined && nombreRetoursUAT < 0) {
    return { succes: false, message: "Le nombre de retours UAT ne peut pas être négatif" };
  }

  const uatMiseAJour = {
    ...(dateDebutUAT !== undefined && { dateDebutUAT }),
    ...(dateFinUAT !== undefined && { dateFinUAT }),
    ...(statutUAT !== undefined && { statutUAT: statutFinal }),
    ...(nombreRetoursUAT !== undefined && { nombreRetoursUAT: parseInt(nombreRetoursUAT) || 0 }),
    ...(reservesMetier !== undefined && { reservesMetier: reservesMetier.trim() }),
    ...(commentaireUAT !== undefined && { commentaireUAT: commentaireUAT.trim() }),
    ...(signatureValidationClient !== undefined && { signatureValidationClient: signatureValidationClient.trim() }),
    ...(planAction !== undefined && { planAction: planActionFinal }),
    dateModification: new Date().toISOString().split('T')[0]
  };

  try {
    const response = await apiFetch(`/uat/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uatMiseAJour),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "UAT introuvable" };
      }
      throw new Error("Erreur lors de la mise à jour de l'UAT");
    }

    const uatUpdated = await response.json();
    return { 
      succes: true, 
      message: "UAT mise à jour avec succès", 
      uat: uatUpdated 
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'UAT:", error);
    return { succes: false, message: "Erreur lors de la mise à jour de l'UAT" };
  }
};

// Supprimer une UAT
export const supprimerUAT = async (id) => {
  try {
    const response = await apiFetch(`/uat/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "UAT introuvable" };
      }
      throw new Error("Erreur lors de la suppression de l'UAT");
    }

    return { succes: true, message: "UAT supprimée avec succès" };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'UAT:", error);
    return { succes: false, message: "Erreur lors de la suppression de l'UAT" };
  }
};

// Obtenir une UAT par ID
export const obtenirUAT = async (id) => {
  const uatList = await chargerUAT();
  return uatList.find((u) => u.id === id);
};
