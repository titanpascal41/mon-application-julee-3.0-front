import { apiFetch } from "../utils/apiFetch";
// Fichier pour gérer les interlocuteurs via l'API


// Charger les interlocuteurs depuis l'API
const chargerInterlocuteurs = async () => {
  try {
    const response = await apiFetch(`/interlocuteurs`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des interlocuteurs");
    }
    const interlocuteurs = await response.json();
    return interlocuteurs;
  } catch (error) {
    console.error("Erreur lors du chargement des interlocuteurs:", error);
    return [];
  }
};

// Créer un nouvel interlocuteur
const creerInterlocuteur = async (interlocuteurData) => {
  try {
    const response = await apiFetch(`/interlocuteurs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interlocuteurData)
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la création de l\'interlocuteur');
    }
    
    const interlocuteur = await response.json();
    return { succes: true, message: 'Interlocuteur créé avec succès', interlocuteur };
  } catch (error) {
    console.error('Erreur lors de la création de l\'interlocuteur:', error);
    return { succes: false, message: 'Erreur lors de la création de l\'interlocuteur' };
  }
};

// Mettre à jour un interlocuteur
const mettreAJourInterlocuteur = async (id, data) => {
  try {
    const response = await apiFetch(`/interlocuteurs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la mise à jour de l\'interlocuteur');
    }
    
    const interlocuteur = await response.json();
    return { succes: true, message: 'Interlocuteur mis à jour avec succès', interlocuteur };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'interlocuteur:', error);
    return { succes: false, message: 'Erreur lors de la mise à jour de l\'interlocuteur' };
  }
};

// Supprimer un interlocuteur
const supprimerInterlocuteur = async (id) => {
  try {
    const response = await apiFetch(`/interlocuteurs/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la suppression de l\'interlocuteur');
    }
    
    return { succes: true, message: 'Interlocuteur supprimé avec succès' };
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'interlocuteur:', error);
    return { succes: false, message: 'Erreur lors de la suppression de l\'interlocuteur' };
  }
};

// Vérifier si un interlocuteur existe déjà
const interlocuteurExiste = async (nom) => {
  try {
    const interlocuteurs = await chargerInterlocuteurs();
    return interlocuteurs.some(interlocuteur => 
      interlocuteur.nom.toLowerCase() === nom.toLowerCase().trim()
    );
  } catch (error) {
    console.error("Erreur lors de la vérification de l'interlocuteur:", error);
    return false;
  }
};

// Rechercher des interlocuteurs par nom
const rechercherInterlocuteurs = async (termeRecherche) => {
  try {
    const interlocuteurs = await chargerInterlocuteurs();
    if (!termeRecherche || !termeRecherche.trim()) {
      return interlocuteurs;
    }
    
    const terme = termeRecherche.toLowerCase().trim();
    return interlocuteurs.filter(interlocuteur =>
      interlocuteur.nom.toLowerCase().includes(terme) ||
      (interlocuteur.societe && interlocuteur.societe.toLowerCase().includes(terme))
    );
  } catch (error) {
    console.error("Erreur lors de la recherche d'interlocuteurs:", error);
    return [];
  }
};

// Activer ou désactiver un interlocuteur
const toggleActivationInterlocuteur = async (id, actif, utilisateurId = null) => {
  try {
    const response = await apiFetch(`/interlocuteurs/${id}/activation`, {
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
  chargerInterlocuteurs,
  creerInterlocuteur,
  mettreAJourInterlocuteur,
  supprimerInterlocuteur,
  interlocuteurExiste,
  rechercherInterlocuteurs,
  toggleActivationInterlocuteur,
};
