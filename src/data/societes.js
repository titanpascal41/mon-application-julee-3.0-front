import { apiFetch } from "../utils/apiFetch";

// Charger les sociétés actives depuis l'API MySQL
const chargerSocietes = async () => {
  try {
    const response = await apiFetch(`/societes`);
    if (!response.ok) throw new Error("Erreur lors du chargement des sociétés");
    return await response.json();
  } catch (error) {
    console.error("Erreur lors du chargement des sociétés:", error);
    return [];
  }
};

// Charger toutes les sociétés (actives + archivées)
const chargerToutesSocietes = async () => {
  try {
    const response = await apiFetch(`/societes?all=true`);
    if (!response.ok) throw new Error("Erreur lors du chargement des sociétés");
    return await response.json();
  } catch (error) {
    console.error("Erreur lors du chargement des sociétés:", error);
    return [];
  }
};

// Ajouter une société existante par son code (crée une nouvelle entrée par combinaison code+département)
const ajouterSocieteExistante = async (code, departement = "", libelle = "") => {
  try {
    const toutes = await chargerToutesSocietes();
    const dept = departement || null;

    const doublon = toutes.find(
      (s) => s.code.toUpperCase() === code.toUpperCase() && (s.departement || null) === dept
    );

    if (doublon) {
      if (!doublon.actif) {
        const response = await apiFetch(`/societes/${doublon.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actif: true }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || "Erreur réactivation");
        }
        const updated = await response.json();
        return { succes: true, message: `Société "${updated.nom}" réactivée avec succès` };
      }
      return {
        succes: false,
        message: `La société "${code}"${dept ? ` (${dept})` : ""} est déjà présente dans la liste.`,
      };
    }

    const nom = libelle && libelle.trim() ? libelle.trim() : code;
    return await creerSociete({ code, nom, departement: departement || "", source: "ajoutee" });
  } catch (error) {
    console.error("Erreur ajout société existante:", error);
    return { succes: false, message: error.message || "Erreur lors de l'ajout de la société" };
  }
};

// Créer une nouvelle société
const creerSociete = async ({ code, nom, departement, source = "creee" }) => {
  if (!code || !nom) {
    return { succes: false, message: "Le code et le libellé sont obligatoires" };
  }

  try {
    const response = await apiFetch(`/societes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.toUpperCase().trim(),
        nom: nom.trim(),
        departement: departement || null,
        source,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Erreur lors de la création de la société");
    }

    const societeCree = await response.json();
    return { succes: true, message: "Société créée avec succès", societe: societeCree };
  } catch (error) {
    console.error("Erreur création société:", error);
    return { succes: false, message: error.message || "Erreur lors de la création de la société" };
  }
};

// Mettre à jour une société
const mettreAJourSociete = async (id, { code, nom, departement }) => {
  if (!code || !nom) {
    return { succes: false, message: "Le code et le libellé sont obligatoires" };
  }

  try {
    const response = await apiFetch(`/societes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.toUpperCase().trim(),
        nom: nom.trim(),
        departement: departement || null,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 404) return { succes: false, message: "Société introuvable" };
      throw new Error(errData.error || "Erreur lors de la mise à jour de la société");
    }

    const societeUpdate = await response.json();
    return { succes: true, message: "Société mise à jour avec succès", societe: societeUpdate };
  } catch (error) {
    console.error("Erreur mise à jour société:", error);
    return { succes: false, message: error.message || "Erreur lors de la mise à jour de la société" };
  }
};

// Archiver une société
const archiverSociete = async (id) => {
  try {
    const response = await apiFetch(`/societes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: false }),
    });
    if (!response.ok) throw new Error("Erreur lors de l'archivage de la société");
    return { succes: true, message: "Société retirée de la liste" };
  } catch (error) {
    console.error("Erreur archivage société:", error);
    return { succes: false, message: "Erreur lors de l'archivage de la société" };
  }
};

// Supprimer une société
const supprimerSociete = async (id) => {
  try {
    const response = await apiFetch(`/societes/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 404) return { succes: false, message: "Société introuvable" };
      throw new Error(errData.error || "Erreur lors de la suppression de la société");
    }

    return { succes: true, message: "Société supprimée avec succès" };
  } catch (error) {
    console.error("Erreur suppression société:", error);
    return { succes: false, message: error.message || "Erreur lors de la suppression de la société" };
  }
};

// Activer ou désactiver une société
const toggleActivationSociete = async (id, actif) => {
  try {
    const response = await apiFetch(`/societes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { succes: false, message: data.error || data.message || "Erreur lors du changement d'activation" };
    }
    return { succes: true };
  } catch (error) {
    console.error("Erreur toggle activation société:", error);
    return { succes: false, message: error.message };
  }
};

export {
  chargerSocietes,
  chargerToutesSocietes,
  creerSociete,
  mettreAJourSociete,
  supprimerSociete,
  archiverSociete,
  ajouterSocieteExistante,
  toggleActivationSociete,
};
