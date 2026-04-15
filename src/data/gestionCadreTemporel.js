// Fichier pour gérer le Cadre Temporel du Projet via l'API
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Charger le cadre temporel depuis l'API
const chargerCadreTemporel = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/cadre-temporel`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement du cadre temporel");
    }
    const cadre = await response.json();
    return cadre;
  } catch (error) {
    console.error("Erreur lors du chargement du cadre temporel:", error);
    return [];
  }
};

// Sauvegarder le cadre temporel (fonction obsolète avec l'API)
const sauvegarderCadreTemporel = () => {
  console.warn("sauvegarderCadreTemporel() est obsolète avec l'API");
};

// Créer ou mettre à jour le cadre temporel du projet
const creerOuMettreAJourCadreTemporel = async ({ 
  dateDebutProjet, 
  dateFinPrevisionnelle, 
  statutValidationDate, 
  dateCommunicationPlanningClient 
}) => {
  // Vérifier que tous les champs obligatoires sont remplis
  if (!dateDebutProjet || !dateFinPrevisionnelle || !dateCommunicationPlanningClient) {
    return { succes: false, message: "Tous les champs obligatoires doivent être remplis" };
  }

  // Vérifier que la date de fin n'est pas antérieure à la date de début
  if (new Date(dateFinPrevisionnelle) < new Date(dateDebutProjet)) {
    return { succes: false, message: "La date de fin ne peut pas être antérieure à la date de début" };
  }

  const cadreData = {
    dateDebutProjet: dateDebutProjet.trim(),
    dateFinPrevisionnelle: dateFinPrevisionnelle.trim(),
    statutValidationDate: statutValidationDate || "non validé",
    dateCommunicationPlanningClient: dateCommunicationPlanningClient.trim(),
  };

  try {
    // Vérifier si un cadre existe déjà
    const cadreExistant = await chargerCadreTemporel();
    
    if (cadreExistant.length > 0) {
      // Mettre à jour le cadre existant
      const response = await fetch(`${API_BASE_URL}/cadre-temporel/${cadreExistant[0].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cadreData),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour du cadre temporel");
      }

      const cadreMisAJour = await response.json();
      return { succes: true, message: "Cadre temporel mis à jour avec succès", cadre: cadreMisAJour };
    } else {
      // Créer un nouveau cadre
      const response = await fetch(`${API_BASE_URL}/cadre-temporel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cadreData),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création du cadre temporel");
      }

      const nouveauCadre = await response.json();
      return { succes: true, message: "Cadre temporel créé avec succès", cadre: nouveauCadre };
    }
  } catch (error) {
    console.error("Erreur lors de la création/mise à jour du cadre temporel:", error);
    return { succes: false, message: "Erreur lors de la création/mise à jour du cadre temporel" };
  }
};

// Supprimer le cadre temporel
const supprimerCadreTemporel = async () => {
  try {
    const cadreExistant = await chargerCadreTemporel();
    
    if (cadreExistant.length > 0) {
      const response = await fetch(`${API_BASE_URL}/cadre-temporel/${cadreExistant[0].id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression du cadre temporel");
      }

      return { succes: true, message: "Cadre temporel supprimé avec succès" };
    }

    return { succes: true, message: "Aucun cadre temporel à supprimer" };
  } catch (error) {
    console.error("Erreur lors de la suppression du cadre temporel:", error);
    return { succes: false, message: "Erreur lors de la suppression du cadre temporel" };
  }
};

// Exporter les fonctions
export {
  chargerCadreTemporel,
  sauvegarderCadreTemporel,
  creerOuMettreAJourCadreTemporel,
  supprimerCadreTemporel,
};
