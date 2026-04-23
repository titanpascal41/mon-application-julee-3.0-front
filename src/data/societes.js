import { apiFetch } from "../utils/apiFetch";
// Fichier pour gérer la base de données des sociétés
import { chargerUtilisateurs } from "./baseDeDonnees";



// Charger les sociétés actives depuis l'API MySQL
const chargerSocietes = async () => {
  try {
    const response = await apiFetch(`/societes`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des sociétés");
    }
    const societes = await response.json();
    return societes;
  } catch (error) {
    console.error("Erreur lors du chargement des sociétés:", error);
    return [];
  }
};

// Charger toutes les sociétés (actives + archivées)
const chargerToutesSocietes = async () => {
  try {
    const response = await apiFetch(`/societes?all=true`);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des sociétés");
    }
    return await response.json();
  } catch (error) {
    console.error("Erreur lors du chargement des sociétés:", error);
    return [];
  }
};

// Archiver une société (soft delete - retirer de la liste active)
const archiverSociete = async (id) => {
  try {
    const response = await apiFetch(`/societes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: false }),
    });
    if (!response.ok) {
      throw new Error("Erreur lors de l'archivage de la société");
    }
    return { succes: true, message: "Société retirée de la liste" };
  } catch (error) {
    console.error("Erreur archivage société:", error);
    return { succes: false, message: "Erreur lors de l'archivage de la société" };
  }
};

// Ajouter une société existante par son code (crée une nouvelle entrée par combinaison code+département)
const ajouterSocieteExistante = async (code, departement = "", libelle = "") => {
  try {
    const toutes = await chargerToutesSocietes();
    const dept = departement || null;

    // Vérifier si la combinaison code+département existe déjà (active ou archivée)
    const doublon = toutes.find(
      (s) =>
        s.code.toUpperCase() === code.toUpperCase() &&
        (s.departement || null) === dept
    );

    if (doublon) {
      if (!doublon.actif) {
        // Réactiver si archivée
        const response = await apiFetch(`/societes/${doublon.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actif: true }),
        });
        if (!response.ok) throw new Error("Erreur réactivation");
        const updated = await response.json();
        return { succes: true, message: `Société "${updated.nom}" réactivée avec succès` };
      }
      return {
        succes: false,
        message: `La société "${code}"${dept ? ` (${dept})` : ""} est déjà présente dans la liste.`,
      };
    }

    // Créer une nouvelle entrée pour ce code+département
    const nom = libelle && libelle.trim() ? libelle.trim() : code;
    return await creerSociete({ code, nom, departement: departement || "", source: "ajoutee" });
  } catch (error) {
    console.error("Erreur ajout société existante:", error);
    return { succes: false, message: "Erreur lors de l'ajout de la société" };
  }
};

// Fonction obsolète - les données sont maintenant dans MySQL
const sauvegarderSocietes = () => {
  console.warn("sauvegarderSocietes() est obsolète avec MySQL");
};

// Vérifier si un code de société existe déjà (parmi toutes, actives + archivées)
const codeSocieteExiste = async (code, idExclu = null) => {
  const societes = await chargerToutesSocietes();
  const codeUpper = code.toUpperCase().trim();
  return societes.some(
    (s) => s.code.toUpperCase() === codeUpper && (idExclu === null || s.id !== idExclu)
  );
};

// Alias pour compatibilité (vérifie par code)
const nomSocieteExiste = codeSocieteExiste;

// Créer une nouvelle société (version simple avec seulement le nom)
const creerSocieteSimple = async (nom) => {
  // Vérifier que le nom est fourni
  if (!nom || !nom.trim()) {
    return { succes: false, message: "Le nom de la société est obligatoire" };
  }

  // Convertir le nom en majuscules
  const nomUpper = nom.toUpperCase().trim();

  // Vérifier l'unicité du nom
  if (await nomSocieteExiste(nomUpper)) {
    // Si la société existe déjà, retourner l'ID de la société existante
    const societes = await chargerSocietes();
    const societeExistante = societes.find((s) => s.nom === nomUpper);
    return { succes: true, message: "Société déjà existante", societe: societeExistante };
  }

  const nouvelleSociete = {
    nom: nomUpper,
    adresse: "À compléter",
    email: "À compléter",
    telephone: "À compléter",
    responsable: "À compléter",
  };

  try {
    const response = await apiFetch(`/societes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nouvelleSociete.nom,
        adresse: nouvelleSociete.adresse,
        email: nouvelleSociete.email,
        telephone: nouvelleSociete.telephone,
        responsable: nouvelleSociete.responsable,
      }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création de la société");
    }

    const societeCree = await response.json();
    return { succes: true, message: "Société créée avec succès", societe: societeCree };
  } catch (error) {
    console.error("Erreur création société:", error);
    return { succes: false, message: "Erreur lors de la création de la société" };
  }
};

// Créer une nouvelle société
const creerSociete = async ({ code, nom, departement, source = "creee" }) => {
  if (!code || !nom) {
    return { succes: false, message: "Le code et le libellé sont obligatoires" };
  }

  const codeUpper = code.toUpperCase().trim();
  const nomTrimmed = nom.trim();

  try {
    const response = await apiFetch(`/societes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeUpper, nom: nomTrimmed, departement: departement || null, source }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création de la société");
    }

    const societeCree = await response.json();
    return { succes: true, message: "Société créée avec succès", societe: societeCree };
  } catch (error) {
    console.error("Erreur création société:", error);
    return { succes: false, message: "Erreur lors de la création de la société" };
  }
};

// Mettre à jour une société
const mettreAJourSociete = async (id, { code, nom, departement }) => {
  if (!code || !nom) {
    return { succes: false, message: "Le code et le libellé sont obligatoires" };
  }

  const codeUpper = code.toUpperCase().trim();
  const nomTrimmed = nom.trim();

  try {
    const response = await apiFetch(`/societes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeUpper, nom: nomTrimmed, departement: departement || null }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Société introuvable" };
      }
      throw new Error("Erreur lors de la mise à jour de la société");
    }

    const societeUpdate = await response.json();
    return { succes: true, message: "Société mise à jour avec succès", societe: societeUpdate };
  } catch (error) {
    console.error("Erreur mise à jour société:", error);
    return { succes: false, message: "Erreur lors de la mise à jour de la société" };
  }
};

// Supprimer une société
const supprimerSociete = async (id) => {
  // Vérifier si la société a des utilisateurs actifs
  const utilisateurs = await chargerUtilisateurs();
  const utilisateursActifs = utilisateurs.filter((u) => u.societeId === id);
  
  if (utilisateursActifs.length > 0) {
    return {
      succes: false,
      message: "Impossible de supprimer une société qui possède des utilisateurs actifs",
    };
  }

  try {
    const response = await apiFetch(`/societes/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Société introuvable" };
      }
      throw new Error("Erreur lors de la suppression de la société");
    }

    return { succes: true, message: "Société supprimée avec succès" };
  } catch (error) {
    console.error("Erreur suppression société:", error);
    return { succes: false, message: "Erreur lors de la suppression de la société" };
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
      return { succes: false, message: data.message || "Erreur lors du changement d'activation" };
    }
    return { succes: true };
  } catch (error) {
    console.error("Erreur toggle activation société:", error);
    return { succes: false, message: error.message };
  }
};

// Exporter les fonctions
export {
  chargerSocietes,
  chargerToutesSocietes,
  sauvegarderSocietes,
  creerSociete,
  creerSocieteSimple,
  mettreAJourSociete,
  supprimerSociete,
  archiverSociete,
  ajouterSocieteExistante,
  nomSocieteExiste,
  toggleActivationSociete,
};

