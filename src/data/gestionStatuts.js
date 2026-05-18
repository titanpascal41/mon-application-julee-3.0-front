import { apiFetch } from "../utils/apiFetch";

const chargerStatuts = async () => {
  try {
    const response = await apiFetch(`/statuts`);
    if (!response.ok) throw new Error("Erreur lors du chargement des statuts");
    return await response.json();
  } catch (error) {
    console.error("Erreur lors du chargement des statuts:", error);
    return [];
  }
};

// Créer un nouveau statut
const creerStatut = async ({ nom, description, actif }) => {
  if (!nom) return { succes: false, message: "Le nom du statut est obligatoire" };

  try {
    const response = await apiFetch(`/statuts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: nom.trim(), description: description?.trim() || "", actif: actif === true || actif === "true" }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Erreur lors de la création du statut");
    }

    const statutCree = await response.json();
    return { succes: true, message: "Statut créé avec succès", statut: statutCree };
  } catch (err) {
    console.error("Erreur création statut:", err);
    return { succes: false, message: err.message || "Erreur lors de la création du statut" };
  }
};

// Mettre à jour un statut
const mettreAJourStatut = async (id, { nom, description, actif }) => {
  if (!nom) return { succes: false, message: "Le nom du statut est obligatoire" };

  try {
    const response = await apiFetch(`/statuts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: nom.trim(), description: description?.trim() || "", actif: actif === true || actif === "true" }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 404) return { succes: false, message: "Statut introuvable" };
      throw new Error(errData.error || "Erreur lors de la mise à jour du statut");
    }

    const statutUpdate = await response.json();
    return { succes: true, message: "Statut mis à jour avec succès", statut: statutUpdate };
  } catch (err) {
    console.error("Erreur mise à jour statut:", err);
    return { succes: false, message: err.message || "Erreur lors de la mise à jour du statut" };
  }
};

// Supprimer un statut
const supprimerStatut = async (id) => {
  try {
    const response = await apiFetch(`/statuts/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 404) return { succes: false, message: "Statut introuvable" };
      throw new Error(errData.error || "Erreur lors de la suppression du statut");
    }

    const result = await response.json();
    return { succes: true, message: result.message || "Statut supprimé avec succès" };
  } catch (err) {
    console.error("Erreur suppression statut:", err);
    return { succes: false, message: err.message || "Erreur lors de la suppression du statut" };
  }
};

// Réordonner les statuts
const reorderStatuts = async (orderedIds) => {
  try {
    const response = await apiFetch(`/statuts/reorder`, {
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

export { chargerStatuts, creerStatut, mettreAJourStatut, supprimerStatut, reorderStatuts };
