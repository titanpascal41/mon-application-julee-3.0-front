import { apiFetch } from "../utils/apiFetch";
import { chargerUtilisateurs } from "./baseDeDonnees";
import { chargerSocietes } from "./societes";

// Charger les UO depuis l'API
const chargerUO = async () => {
  try {
    const response = await apiFetch(`/uo`);
    if (!response.ok) throw new Error("Erreur lors du chargement des unités organisationnelles");
    return await response.json();
  } catch (error) {
    console.error("Erreur lors du chargement des UO:", error);
    return [];
  }
};

// Vérifier si une UO a des utilisateurs
const uoContientUtilisateurs = async (uoId) => {
  const utilisateurs = await chargerUtilisateurs();
  return utilisateurs.some((u) => u.uoId === uoId);
};

// Créer une nouvelle UO
const creerUO = async ({ nom, code, chefUO, actif, societeId, projetSoumis, departement }) => {
  if (!nom || societeId === null || societeId === undefined || societeId === "") {
    return { succes: false, message: "Tous les champs obligatoires doivent être remplis" };
  }
  if (nom.length > 100) {
    return { succes: false, message: "Le nom de l'UO ne doit pas dépasser 100 caractères" };
  }

  const societes = await chargerSocietes();
  if (!societes.some((s) => s.id === parseInt(societeId))) {
    return { succes: false, message: "La société sélectionnée n'existe pas" };
  }

  try {
    const response = await apiFetch(`/uo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nom.trim(),
        code: code ? code.trim().toUpperCase() : null,
        chefUO: chefUO ? chefUO.trim() : null,
        departement: departement ? departement.trim() : null,
        actif: actif === true || actif === "true",
        societeId: societeId ? parseInt(societeId) : null,
        projetSoumis: projetSoumis || null,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Erreur lors de la création de l'UO");
    }

    const uoCreee = await response.json();
    return { succes: true, message: "Unité organisationnelle créée avec succès", uo: uoCreee };
  } catch (error) {
    console.error("Erreur lors de la création de l'UO:", error);
    return { succes: false, message: error.message || "Erreur lors de la création de l'unité organisationnelle" };
  }
};

// Mettre à jour une UO
const mettreAJourUO = async (id, { nom, code, chefUO, actif, societeId, projetSoumis, departement }) => {
  if (!nom || societeId === null || societeId === undefined || societeId === "") {
    return { succes: false, message: "Tous les champs obligatoires doivent être remplis" };
  }
  if (nom.length > 100) {
    return { succes: false, message: "Le nom de l'UO ne doit pas dépasser 100 caractères" };
  }

  const societes = await chargerSocietes();
  if (!societes.some((s) => s.id === parseInt(societeId))) {
    return { succes: false, message: "La société sélectionnée n'existe pas" };
  }

  const uoList = await chargerUO();
  const uoActuelle = uoList.find((uo) => uo.id === id);
  if (!uoActuelle) {
    return { succes: false, message: "Unité organisationnelle introuvable" };
  }

  if (parseInt(uoActuelle.societeId) !== parseInt(societeId) && (await uoContientUtilisateurs(id))) {
    return { succes: false, message: "Impossible de changer la société d'une UO qui contient des utilisateurs" };
  }

  try {
    const response = await apiFetch(`/uo/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nom.trim(),
        code: code ? code.trim().toUpperCase() : null,
        chefUO: chefUO ? chefUO.trim() : null,
        departement: departement ? departement.trim() : null,
        actif: actif === true || actif === "true",
        societeId: parseInt(societeId),
        projetSoumis: projetSoumis || null,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 404) return { succes: false, message: "Unité organisationnelle introuvable" };
      throw new Error(errData.error || "Erreur lors de la mise à jour de l'UO");
    }

    const uoUpdated = await response.json();
    return { succes: true, message: "Unité organisationnelle mise à jour avec succès", uo: uoUpdated };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'UO:", error);
    return { succes: false, message: error.message || "Erreur lors de la mise à jour de l'unité organisationnelle" };
  }
};

// Supprimer une UO
const supprimerUO = async (id) => {
  if (await uoContientUtilisateurs(id)) {
    return { succes: false, message: "Impossible de supprimer une UO qui contient des utilisateurs" };
  }

  try {
    const response = await apiFetch(`/uo/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 404) return { succes: false, message: "Unité organisationnelle introuvable" };
      throw new Error(errData.error || "Erreur lors de la suppression de l'UO");
    }

    return { succes: true, message: "Unité organisationnelle supprimée avec succès" };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'UO:", error);
    return { succes: false, message: error.message || "Erreur lors de la suppression de l'unité organisationnelle" };
  }
};

// Activer ou désactiver une UO
const toggleActivationUO = async (id, actif, utilisateurId = null) => {
  try {
    const response = await apiFetch(`/uo/${id}/activation`, {
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

const verifierDemandesUO = async (id) => {
  try {
    const response = await apiFetch(`/uo/${id}/demandes-count`);
    if (!response.ok) return { count: 0, noms: [] };
    const data = await response.json();
    return { count: data.count ?? 0, noms: data.noms ?? [] };
  } catch {
    return { count: 0, noms: [] };
  }
};

export { chargerUO, creerUO, mettreAJourUO, supprimerUO, uoContientUtilisateurs, toggleActivationUO, verifierDemandesUO };
