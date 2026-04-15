// Gestion des collaborateurs

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const chargerDepuisAPI = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/interlocuteurs`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des collaborateurs");
    }
    return await response.json();
  } catch (e) {
    console.error("Erreur chargement collaborateurs:", e);
    return [];
  }
};

export const chargerCollaborateurs = async () => await chargerDepuisAPI();

export const creerCollaborateur = async (data) => {
  const nouveau = {
    nom: (data.nom || "").trim(),
    email: (data.email || "").trim(),
    poste: (data.poste || "").trim(),
    telephone: (data.telephone || "").trim(),
    actif: data.actif ?? true,
  };

  if (!nouveau.nom) {
    return { succes: false, message: "Le nom est obligatoire." };
  }
  if (!nouveau.email) {
    return { succes: false, message: "L'email est obligatoire." };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/interlocuteurs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveau),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création du collaborateur");
    }

    const collaborateurCree = await response.json();
    return {
      succes: true,
      message: "interlocuteur créé avec succès.",
      collaborateur: collaborateurCree,
    };
  } catch (e) {
    console.error("Erreur création collaborateur:", e);
    return {
      succes: false,
      message: "Erreur lors de la création du collaborateur.",
    };
  }
};

export const mettreAJourCollaborateur = async (id, data) => {
  const collaborateurs = await chargerDepuisAPI();
  const existant = collaborateurs.find((c) => c.id === id);
  if (!existant) {
    return { succes: false, message: "Collaborateur introuvable." };
  }

  const maj = {
    nom: (data.nom ?? existant.nom).trim(),
    email: (data.email ?? existant.email).trim(),
    poste: (data.poste ?? existant.poste).trim(),
    telephone: (data.telephone ?? existant.telephone).trim(),
    actif: data.actif ?? existant.actif,
  };

  if (!maj.nom) {
    return { succes: false, message: "Le nom est obligatoire." };
  }
  if (!maj.email) {
    return { succes: false, message: "L'email est obligatoire." };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/interlocuteurs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(maj),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Collaborateur introuvable." };
      }
      throw new Error("Erreur lors de la mise à jour du collaborateur");
    }

    const collaborateurUpdate = await response.json();
    return {
      succes: true,
      message: "Collaborateur mis à jour avec succès.",
      collaborateur: collaborateurUpdate,
    };
  } catch (e) {
    console.error("Erreur mise à jour collaborateur:", e);
    return {
      succes: false,
      message: "Erreur lors de la mise à jour du collaborateur.",
    };
  }
};

export const supprimerCollaborateur = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/interlocuteurs/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Collaborateur introuvable." };
      }
      throw new Error("Erreur lors de la suppression du collaborateur");
    }

    return { succes: true, message: "interlocuteur supprimé avec succès." };
  } catch (e) {
    console.error("Erreur suppression collaborateur:", e);
    return {
      succes: false,
      message: "Erreur lors de la suppression du collaborateur.",
    };
  }
};
