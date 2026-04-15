// Fichier pour gérer la base de données des statuts

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const chargerStatuts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/statuts`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des statuts");
    }
    const statuts = await response.json();
    return statuts;
  } catch (error) {
    console.error("Erreur lors du chargement des statuts:", error);
    return [];
  }
};

// Fonction obsolète - les données sont maintenant dans MySQL
const sauvegarderStatuts = () => {
  console.warn("sauvegarderStatuts() est obsolète avec MySQL");
};

// Vérifier si un nom de statut existe déjà
const nomStatutExiste = async (nom, idExclu = null) => {
  const statuts = await chargerStatuts();
  const nomTrim = nom.trim();
  return statuts.some(
    (s) => s.nom === nomTrim && (idExclu === null || s.id !== idExclu),
  );
};

// Vérifier si un statut est utilisé dans une demande
const statutEstUtilise = async (statutId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/demandes`);
    if (!response.ok) {
      return false;
    }
    const demandes = await response.json();
    return demandes.some((d) => d.statutId === statutId);
  } catch (e) {
    console.error("Erreur vérification utilisation statut:", e);
    return false;
  }
};

// Créer un nouveau statut
const creerStatut = async ({ nom, description, actif }) => {
  const statuts = await chargerStatuts();

  // Vérifier que le nom est renseigné
  if (!nom) {
    return { succes: false, message: "Le nom du statut est obligatoire" };
  }

  // Vérifier l'unicité du nom
  if (await nomStatutExiste(nom)) {
    return { succes: false, message: "Le nom du statut doit être unique" };
  }

  // Générer un nouvel ID
  const nouvelId =
    statuts.length > 0 ? Math.max(...statuts.map((s) => s.id)) + 1 : 1;

  const nouveauStatut = {
    id: nouvelId,
    nom: nom.trim(),
    description: description ? description.trim() : "",
    // Règle métier: seul l'administrateur peut appliquer/modifier
    quiPeutAppliquer: "Administrateur",
    actif: actif === true || actif === "true",
  };

  try {
    const response = await fetch(`${API_BASE_URL}/statuts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nouveauStatut.nom,
        description: nouveauStatut.description,
        quiPeutAppliquer: nouveauStatut.quiPeutAppliquer,
        actif: nouveauStatut.actif,
      }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création du statut");
    }

    const statutCree = await response.json();
    return {
      succes: true,
      message: "Statut créé avec succès",
      statut: statutCree,
    };
  } catch (err) {
    console.error("Erreur création statut:", err);
    return { succes: false, message: "Erreur lors de la création du statut" };
  }
};

// Mettre à jour un statut
const mettreAJourStatut = async (id, { nom, description, actif }) => {
  const statuts = await chargerStatuts();
  const index = statuts.findIndex((s) => s.id === id);

  if (index === -1) {
    return { succes: false, message: "Statut introuvable" };
  }

  // Vérifier que le nom est renseigné
  if (!nom) {
    return { succes: false, message: "Le nom du statut est obligatoire" };
  }

  // Vérifier l'unicité du nom (en excluant le statut actuel)
  if (await nomStatutExiste(nom, id)) {
    return { succes: false, message: "Le nom du statut doit être unique" };
  }

  const statutMisAJour = {
    nom: nom.trim(),
    description: description ? description.trim() : "",
    quiPeutAppliquer: "Administrateur",
    actif: actif === true || actif === "true",
  };

  try {
    const response = await fetch(`${API_BASE_URL}/statuts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(statutMisAJour),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Statut introuvable" };
      }
      throw new Error("Erreur lors de la mise à jour du statut");
    }

    const statutUpdate = await response.json();
    return {
      succes: true,
      message: "Statut mis à jour avec succès",
      statut: statutUpdate,
    };
  } catch (err) {
    console.error("Erreur mise à jour statut:", err);
    return {
      succes: false,
      message: "Erreur lors de la mise à jour du statut",
    };
  }
};

// Vérifier si un statut peut être supprimé
const verifierSuppressionStatut = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/statuts/${id}/can-delete`);
    if (!response.ok) {
      return { canDelete: false, message: "Erreur lors de la vérification" };
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Erreur vérification suppression statut:", error);
    return { canDelete: false, message: "Erreur lors de la vérification" };
  }
};

// Supprimer un statut
const supprimerStatut = async (id) => {
  const statuts = await chargerStatuts();
  const index = statuts.findIndex((s) => s.id === id);

  if (index === -1) {
    return { succes: false, message: "Statut introuvable" };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/statuts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Statut introuvable" };
      }

      // Gérer les erreurs de contrainte
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 400) {
        return {
          succes: false,
          message: errorData.message || "Impossible de supprimer ce statut",
          details: errorData.details || errorData.error,
        };
      }

      throw new Error(
        errorData.message || "Erreur lors de la suppression du statut",
      );
    }

    const result = await response.json();
    return {
      succes: true,
      message: result.message || "Statut supprimé avec succès",
    };
  } catch (err) {
    console.error("Erreur suppression statut:", err);
    return {
      succes: false,
      message: err.message || "Erreur lors de la suppression du statut",
    };
  }
};

// Réordonner les statuts
const reorderStatuts = async (orderedIds) => {
  try {
    const response = await fetch(`${API_BASE_URL}/statuts/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) throw new Error("Erreur lors du réordonnancement");
    return { succes: true };
  } catch (error) {
    console.error("Erreur reorder statuts:", error);
    return { succes: false, message: error.message };
  }
};

// Exporter les fonctions
export {
  chargerStatuts,
  sauvegarderStatuts,
  creerStatut,
  mettreAJourStatut,
  supprimerStatut,
  nomStatutExiste,
  statutEstUtilise,
  verifierSuppressionStatut,
  reorderStatuts,
};
