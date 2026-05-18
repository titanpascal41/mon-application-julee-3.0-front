import { apiFetch } from "../utils/apiFetch";

const chargerInterlocuteurs = async () => {
  try {
    const response = await apiFetch(`/interlocuteurs`);
    if (!response.ok) throw new Error("Erreur lors du chargement des interlocuteurs");
    return await response.json();
  } catch (error) {
    console.error("Erreur lors du chargement des interlocuteurs:", error);
    return [];
  }
};

const creerInterlocuteur = async (interlocuteurData) => {
  try {
    const response = await apiFetch(`/interlocuteurs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(interlocuteurData),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Erreur lors de la création de l'interlocuteur");
    }

    const interlocuteur = await response.json();
    return { succes: true, message: "Interlocuteur créé avec succès", interlocuteur };
  } catch (error) {
    console.error("Erreur création interlocuteur:", error);
    return { succes: false, message: error.message || "Erreur lors de la création de l'interlocuteur" };
  }
};

const mettreAJourInterlocuteur = async (id, data) => {
  try {
    const response = await apiFetch(`/interlocuteurs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 404) return { succes: false, message: "Interlocuteur introuvable" };
      throw new Error(errData.error || "Erreur lors de la mise à jour de l'interlocuteur");
    }

    const interlocuteur = await response.json();
    return { succes: true, message: "Interlocuteur mis à jour avec succès", interlocuteur };
  } catch (error) {
    console.error("Erreur mise à jour interlocuteur:", error);
    return { succes: false, message: error.message || "Erreur lors de la mise à jour de l'interlocuteur" };
  }
};

const supprimerInterlocuteur = async (id) => {
  try {
    const response = await apiFetch(`/interlocuteurs/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 404) return { succes: false, message: "Interlocuteur introuvable" };
      throw new Error(errData.error || "Erreur lors de la suppression de l'interlocuteur");
    }

    const result = await response.json();
    return { succes: true, message: result.message || "Interlocuteur supprimé avec succès" };
  } catch (error) {
    console.error("Erreur suppression interlocuteur:", error);
    return { succes: false, message: error.message || "Erreur lors de la suppression de l'interlocuteur" };
  }
};

const verifierDemandesInterlocuteur = async (id) => {
  try {
    const response = await apiFetch(`/interlocuteurs/${id}/demandes-count`);
    if (!response.ok) return { count: 0, noms: [] };
    const data = await response.json();
    return { count: data.count ?? 0, noms: data.noms ?? [] };
  } catch {
    return { count: 0, noms: [] };
  }
};

const toggleActivationInterlocuteur = async (id, actif, utilisateurId = null) => {
  try {
    const response = await apiFetch(`/interlocuteurs/${id}/activation`, {
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
  chargerInterlocuteurs,
  creerInterlocuteur,
  mettreAJourInterlocuteur,
  supprimerInterlocuteur,
  toggleActivationInterlocuteur,
  verifierDemandesInterlocuteur,
};
