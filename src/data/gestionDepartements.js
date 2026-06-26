import { apiFetch } from "../utils/apiFetch";

// Charger les départements (optionnellement filtrés par société)
const chargerDepartements = async (societeId = null) => {
  try {
    const query = societeId ? `?societeId=${societeId}` : "";
    const response = await apiFetch(`/departements${query}`);
    if (!response.ok) throw new Error("Erreur lors du chargement des départements");
    return await response.json();
  } catch (error) {
    console.error("Erreur lors du chargement des départements:", error);
    return [];
  }
};

// Créer un nouveau département
const creerDepartement = async ({ code, nom, societeId, actif = true }) => {
  if (!code || !code.trim()) {
    return { succes: false, message: "Le code du département est requis" };
  }
  if (!nom || !nom.trim()) {
    return { succes: false, message: "Le libellé du département est requis" };
  }
  if (!societeId) {
    return { succes: false, message: "La société est requise" };
  }

  try {
    const response = await apiFetch(`/departements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        nom: nom.trim(),
        societeId: parseInt(societeId),
        actif: actif === true || actif === "true",
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Erreur lors de la création du département");
    }

    const departementCree = await response.json();
    return { succes: true, message: "Département créé avec succès", departement: departementCree };
  } catch (error) {
    console.error("Erreur lors de la création du département:", error);
    return { succes: false, message: error.message || "Erreur lors de la création du département" };
  }
};

// Mettre à jour un département
const mettreAJourDepartement = async (id, { code, nom, societeId, actif }) => {
  if (!code || !code.trim()) {
    return { succes: false, message: "Le code du département est requis" };
  }
  if (!nom || !nom.trim()) {
    return { succes: false, message: "Le libellé du département est requis" };
  }
  if (!societeId) {
    return { succes: false, message: "La société est requise" };
  }

  try {
    const response = await apiFetch(`/departements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        nom: nom.trim(),
        societeId: parseInt(societeId),
        actif: actif === true || actif === "true",
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 404) return { succes: false, message: "Département introuvable" };
      throw new Error(errData.error || "Erreur lors de la mise à jour du département");
    }

    const departementUpdated = await response.json();
    return { succes: true, message: "Département mis à jour avec succès", departement: departementUpdated };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du département:", error);
    return { succes: false, message: error.message || "Erreur lors de la mise à jour du département" };
  }
};

// Supprimer un département
const supprimerDepartement = async (id) => {
  try {
    const response = await apiFetch(`/departements/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 404) return { succes: false, message: "Département introuvable" };
      throw new Error(errData.error || "Erreur lors de la suppression du département");
    }

    return { succes: true, message: "Département supprimé avec succès" };
  } catch (error) {
    console.error("Erreur lors de la suppression du département:", error);
    return { succes: false, message: error.message || "Erreur lors de la suppression du département" };
  }
};

// Activer ou désactiver un département
const toggleActivationDepartement = async (id, actif, utilisateurId = null) => {
  try {
    const response = await apiFetch(`/departements/${id}/activation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif, utilisateurId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { succes: false, message: data.error || data.message || "Erreur lors du changement d'activation" };
    }
    return { succes: true };
  } catch (error) {
    return { succes: false, message: error.message };
  }
};

export {
  chargerDepartements,
  creerDepartement,
  mettreAJourDepartement,
  supprimerDepartement,
  toggleActivationDepartement,
};