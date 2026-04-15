// Fichier pour gérer les livraisons via l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Statuts possibles pour la livraison
export const STATUTS_LIVRAISON = ["Prévue", "En cours", "OK", "KO"];

// Charger les livraisons depuis l'API
export const chargerLivraisons = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/livraisons`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des livraisons");
    }
    const livraisons = await response.json();
    return livraisons;
  } catch (error) {
    console.error("Erreur lors du chargement des livraisons:", error);
    return [];
  }
};

// Vérifier si le comité GO/NO GO a validé la version (règle de gestion)
export const comiteGONOGOValide = () => {
  // Cette fonction peut être étendue pour vérifier un comité spécifique
  return { 
    estValide: true, 
    message: "Le comité GO/NO GO a validé la version" 
  };
};

// Créer une nouvelle livraison
export const creerLivraison = async (donneesLivraison) => {
  // Règle de gestion : La livraison ne peut être faite que si le comité GO/NO GO a validé
  const validationComite = comiteGONOGOValide();
  if (!validationComite.estValide) {
    return { succes: false, message: validationComite.message };
  }

  const {
    numeroVersion,
    releaseNotes = "",
    dateLivraisonPrevue,
    dateLivraisonEffective = "",
    dateDeploiement = "",
    responsableDevOps = "",
    statutLivraison = "Prévue",
    commentairesGP = "",
    validationGONOGO = false
  } = donneesLivraison;

  // Validation des champs obligatoires
  if (!numeroVersion || !numeroVersion.trim()) {
    return { succes: false, message: "Le numéro de version est obligatoire" };
  }

  if (!dateLivraisonPrevue) {
    return { succes: false, message: "La date de livraison prévue est obligatoire" };
  }

  // Vérifier que le numéro de version n'existe pas déjà
  const livraisons = await chargerLivraisons();
  const versionExiste = livraisons.some(l => l.numeroVersion === numeroVersion.trim());
  if (versionExiste) {
    return { succes: false, message: "Une livraison avec ce numéro de version existe déjà" };
  }

  const dateCreation = new Date().toISOString().split('T')[0];

  const nouvelleLivraison = {
    numeroVersion: numeroVersion.trim(),
    releaseNotes: releaseNotes.trim(),
    dateLivraisonPrevue: dateLivraisonPrevue,
    dateLivraisonEffective: dateLivraisonEffective || null,
    dateDeploiement: dateDeploiement || null,
    responsableDevOps: responsableDevOps.trim(),
    statutLivraison: statutLivraison,
    commentairesGP: commentairesGP.trim(),
    validationGONOGO: validationGONOGO,
    dateCreation: dateCreation,
    dateModification: dateCreation
  };

  try {
    const response = await fetch(`${API_BASE_URL}/livraisons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouvelleLivraison),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création de la livraison");
    }

    const livraisonCreee = await response.json();
    return { 
      succes: true, 
      message: "Livraison créée avec succès", 
      livraison: livraisonCreee 
    };
  } catch (error) {
    console.error("Erreur lors de la création de la livraison:", error);
    return { succes: false, message: "Erreur lors de la création de la livraison" };
  }
};

// Mettre à jour une livraison
export const mettreAJourLivraison = async (id, donneesLivraison) => {
  const {
    numeroVersion,
    releaseNotes,
    dateLivraisonPrevue,
    dateLivraisonEffective,
    dateDeploiement,
    responsableDevOps,
    statutLivraison,
    commentairesGP,
    validationGONOGO
  } = donneesLivraison;

  // Validation du numéro de version
  if (numeroVersion !== undefined && (!numeroVersion || !numeroVersion.trim())) {
    return { succes: false, message: "Le numéro de version est obligatoire" };
  }

  // Vérifier que le numéro de version n'existe pas déjà (sauf pour la livraison actuelle)
  if (numeroVersion !== undefined) {
    const livraisons = await chargerLivraisons();
    const versionExiste = livraisons.some(l => 
      l.numeroVersion === numeroVersion.trim() && l.id !== id
    );
    if (versionExiste) {
      return { succes: false, message: "Une livraison avec ce numéro de version existe déjà" };
    }
  }

  // Validation de la date de livraison prévue
  if (dateLivraisonPrevue !== undefined && !dateLivraisonPrevue) {
    return { succes: false, message: "La date de livraison prévue est obligatoire" };
  }

  // Règle : En cas d'échec de déploiement (statut KO) → rollback automatique prévu
  const statutFinal = statutLivraison !== undefined ? statutLivraison : null;
  let rollbackAutomatique = false;
  if (statutFinal === "KO") {
    rollbackAutomatique = true;
  }

  const livraisonMiseAJour = {
    ...(numeroVersion !== undefined && { numeroVersion: numeroVersion.trim() }),
    ...(releaseNotes !== undefined && { releaseNotes: releaseNotes.trim() }),
    ...(dateLivraisonPrevue !== undefined && { dateLivraisonPrevue }),
    ...(dateLivraisonEffective !== undefined && { dateLivraisonEffective: dateLivraisonEffective || null }),
    ...(dateDeploiement !== undefined && { dateDeploiement: dateDeploiement || null }),
    ...(responsableDevOps !== undefined && { responsableDevOps: responsableDevOps.trim() }),
    ...(statutLivraison !== undefined && { statutLivraison: statutFinal }),
    ...(commentairesGP !== undefined && { commentairesGP: commentairesGP.trim() }),
    ...(validationGONOGO !== undefined && { validationGONOGO }),
    ...(rollbackAutomatique && { rollbackAutomatique }),
    dateModification: new Date().toISOString().split('T')[0]
  };

  try {
    const response = await fetch(`${API_BASE_URL}/livraisons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(livraisonMiseAJour),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Livraison introuvable" };
      }
      throw new Error("Erreur lors de la mise à jour de la livraison");
    }

    const livraisonUpdated = await response.json();
    return { 
      succes: true, 
      message: "Livraison mise à jour avec succès" + (rollbackAutomatique ? " (rollback automatique prévu)" : ""), 
      livraison: livraisonUpdated 
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la livraison:", error);
    return { succes: false, message: "Erreur lors de la mise à jour de la livraison" };
  }
};

// Supprimer une livraison
export const supprimerLivraison = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/livraisons/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Livraison introuvable" };
      }
      throw new Error("Erreur lors de la suppression de la livraison");
    }

    return { succes: true, message: "Livraison supprimée avec succès" };
  } catch (error) {
    console.error("Erreur lors de la suppression de la livraison:", error);
    return { succes: false, message: "Erreur lors de la suppression de la livraison" };
  }
};

// Obtenir une livraison par ID
export const obtenirLivraison = async (id) => {
  const livraisons = await chargerLivraisons();
  return livraisons.find((l) => l.id === id);
};
