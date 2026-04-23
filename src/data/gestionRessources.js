import { apiFetch } from "../utils/apiFetch";
// Gestion des ressources DEV et TIV via l'API


// Charger toutes les ressources depuis l'API
export const chargerRessources = async () => {
  try {
    const response = await apiFetch(`/ressources`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des ressources");
    }
    const ressources = await response.json();
    return ressources;
  } catch (error) {
    console.error("Erreur lors du chargement des ressources:", error);
    return [];
  }
};

// Créer une nouvelle ressource
export const creerRessource = async (ressourceData) => {
  // Validation des données
  if (!ressourceData.nom || !ressourceData.nom.trim()) {
    return { succes: false, message: "Le nom de la ressource est obligatoire." };
  }

  if (!ressourceData.type || !["DEV", "TIV"].includes(ressourceData.type)) {
    return { succes: false, message: "Le type de ressource doit être DEV ou TIV." };
  }

  if (!ressourceData.disponibiliteHJ || ressourceData.disponibiliteHJ <= 0) {
    return { succes: false, message: "La disponibilité doit être supérieure à 0." };
  }

  if (!ressourceData.tauxJournalier || ressourceData.tauxJournalier <= 0) {
    return { succes: false, message: "Le taux journalier doit être supérieur à 0." };
  }

  // Vérifier si le nom existe déjà
  const ressources = await chargerRessources();
  const ressourceExistante = ressources.find(
    r => r.nom.toLowerCase() === ressourceData.nom.trim().toLowerCase()
  );

  if (ressourceExistante) {
    return { succes: false, message: "Une ressource avec ce nom existe déjà." };
  }

  // Créer la nouvelle ressource
  const nouvelleRessource = {
    nom: ressourceData.nom.trim(),
    type: ressourceData.type,
    disponibiliteHJ: parseFloat(ressourceData.disponibiliteHJ),
    tauxJournalier: parseFloat(ressourceData.tauxJournalier),
    actif: ressourceData.actif !== undefined ? ressourceData.actif : true
  };

  try {
    const response = await apiFetch(`/ressources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouvelleRessource),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création de la ressource");
    }

    const ressourceCree = await response.json();
    return { succes: true, message: "Ressource créée avec succès.", ressource: ressourceCree };
  } catch (error) {
    console.error("Erreur lors de la création de la ressource:", error);
    return { succes: false, message: "Erreur lors de la création de la ressource" };
  }
};

// Mettre à jour une ressource existante
export const mettreAJourRessource = async (id, ressourceData) => {
  // Validation des données
  if (!ressourceData.nom || !ressourceData.nom.trim()) {
    return { succes: false, message: "Le nom de la ressource est obligatoire." };
  }

  if (!ressourceData.type || !["DEV", "TIV"].includes(ressourceData.type)) {
    return { succes: false, message: "Le type de ressource doit être DEV ou TIV." };
  }

  if (!ressourceData.disponibiliteHJ || ressourceData.disponibiliteHJ <= 0) {
    return { succes: false, message: "La disponibilité doit être supérieure à 0." };
  }

  if (!ressourceData.tauxJournalier || ressourceData.tauxJournalier <= 0) {
    return { succes: false, message: "Le taux journalier doit être supérieur à 0." };
  }

  // Vérifier si le nom existe déjà (sauf pour la ressource actuelle)
  const ressources = await chargerRessources();
  const ressourceExistante = ressources.find(
    r => r.id !== id && r.nom.toLowerCase() === ressourceData.nom.trim().toLowerCase()
  );

  if (ressourceExistante) {
    return { succes: false, message: "Une ressource avec ce nom existe déjà." };
  }

  const ressource = ressources.find(r => r.id === id);
  if (!ressource) {
    return { succes: false, message: "Ressource introuvable." };
  }

  // Mettre à jour la ressource
  const ressourceMiseAJour = {
    nom: ressourceData.nom.trim(),
    type: ressourceData.type,
    disponibiliteHJ: parseFloat(ressourceData.disponibiliteHJ),
    tauxJournalier: parseFloat(ressourceData.tauxJournalier),
    actif: ressourceData.actif !== undefined ? ressourceData.actif : ressource.actif
  };

  try {
    const response = await apiFetch(`/ressources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ressourceMiseAJour),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Ressource introuvable." };
      }
      throw new Error("Erreur lors de la mise à jour de la ressource");
    }

    const ressourceUpdate = await response.json();
    return { succes: true, message: "Ressource mise à jour avec succès.", ressource: ressourceUpdate };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la ressource:", error);
    return { succes: false, message: "Erreur lors de la mise à jour de la ressource" };
  }
};

// Supprimer une ressource
export const supprimerRessource = async (id) => {
  try {
    const response = await apiFetch(`/ressources/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Ressource introuvable." };
      }
      throw new Error("Erreur lors de la suppression de la ressource");
    }

    return { succes: true, message: "Ressource supprimée avec succès." };
  } catch (error) {
    console.error("Erreur lors de la suppression de la ressource:", error);
    return { succes: false, message: "Erreur lors de la suppression de la ressource" };
  }
};

// Obtenir les ressources par type
export const getRessourcesParType = async (type) => {
  const ressources = await chargerRessources();
  return ressources.filter(r => r.type === type && r.actif);
};

// Obtenir toutes les ressources actives
export const getRessourcesActives = async () => {
  const ressources = await chargerRessources();
  return ressources.filter(r => r.actif);
};
