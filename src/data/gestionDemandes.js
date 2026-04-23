import { apiFetch } from "../utils/apiFetch";
// Fichier pour gérer les demandes via l'API
import { chargerSocietes } from "./societes";



// Normaliser le type de projet pour la comparaison
const normalizeTypeProjet = (typeProjet) => {
  if (!typeProjet) return "";
  return String(typeProjet).trim().toLowerCase();
};

// Règles de champs obligatoires selon le type
const getDemandeRequirements = (typeProjet) => {
  const t = normalizeTypeProjet(typeProjet);
  return {
    // Pour "Prospecte" et "Evolution", pas de description de périmètre obligatoire
    requiresDescriptionPerimetre: t !== "prospecte" && t !== "evolution",
    // Pour "Prospecte", pas de périmètre obligatoire
    requiresPerimetre: t !== "prospecte",
  };
};

// Charger les demandes depuis l'API (filtrées par utilisateur si spécifié)
const chargerDemandes = async (utilisateurId = null) => {
  try {
    const path = utilisateurId
      ? `/demandes?utilisateurId=${utilisateurId}`
      : `/demandes`;

    const response = await apiFetch(path);
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des demandes");
    }
    const demandes = await response.json();

    // Les champs JSON sont déjà parsés par le backend
    return demandes;
  } catch (error) {
    console.error("Erreur lors du chargement des demandes:", error);
    return [];
  }
};

// Sauvegarder les demandes (fonction obsolète avec l'API)
const sauvegarderDemandes = () => {
  console.warn("sauvegarderDemandes() est obsolète avec l'API");
};

// Créer une nouvelle demande
const creerDemande = async ({
  dateReception,
  societesDemandeurs,
  collaborateurIds,
  interlocuteur,
  typeProjet,
  nomProjet,
  descriptionPerimetre,
  perimetre,
  isDraft = false,
  utilisateurId,
  ...rest
}) => {
  const { requiresDescriptionPerimetre, requiresPerimetre } =
    getDemandeRequirements(typeProjet);

  if (!isDraft) {
    // Vérifier que tous les champs obligatoires sont remplis
    if (!dateReception) {
      return {
        succes: false,
        message: "Tous les champs obligatoires doivent être remplis",
      };
    }

    if (!societesDemandeurs || societesDemandeurs.length === 0) {
      return {
        succes: false,
        message: "Tous les champs obligatoires doivent être remplis",
      };
    }

    if (!interlocuteur) {
      return {
        succes: false,
        message: "Tous les champs obligatoires doivent être remplis",
      };
    }

    if (!typeProjet) {
      return {
        succes: false,
        message: "Tous les champs obligatoires doivent être remplis",
      };
    }

    if (!nomProjet) {
      return {
        succes: false,
        message: "Tous les champs obligatoires doivent être remplis",
      };
    }

    if (requiresDescriptionPerimetre && !descriptionPerimetre) {
      return {
        succes: false,
        message: "Tous les champs obligatoires doivent être remplis",
      };
    }

    if (requiresPerimetre && !perimetre) {
      return {
        succes: false,
        message: "Tous les champs obligatoires doivent être remplis",
      };
    }

    // Vérifier que les sociétés existent (seulement si des sociétés sont sélectionnées)
    const societes = await chargerSocietes();
    if (societes.length > 0) {
      const societesIds = Array.isArray(societesDemandeurs)
        ? societesDemandeurs
        : [societesDemandeurs];
      const toutesSocietesExistantes = societesIds.every((id) =>
        societes.some((s) => s.id === parseInt(id)),
      );

      if (!toutesSocietesExistantes) {
        return {
          succes: false,
          message: "Une ou plusieurs sociétés sélectionnées n'existent pas",
        };
      }
    }
  }

  const societesIds =
    Array.isArray(societesDemandeurs) && societesDemandeurs.length > 0
      ? societesDemandeurs
      : societesDemandeurs
        ? [societesDemandeurs]
        : [];

  // Date d'enregistrement automatique
  const dateEnregistrement = new Date().toISOString().split("T")[0];

  const nouvelleDemande = {
    dateEnregistrement: dateEnregistrement,
    dateReception: dateReception,
    societesDemandeurs: JSON.stringify(societesIds.map((id) => parseInt(id))),
    collaborateurIds: JSON.stringify(
      (collaborateurIds || []).map((id) => parseInt(id)),
    ),
    interlocuteur: interlocuteur ? interlocuteur.trim() : "",
    typeProjet: typeProjet ? typeProjet.trim() : "",
    nomProjet: nomProjet ? nomProjet.trim() : "",
    descriptionPerimetre: descriptionPerimetre
      ? String(descriptionPerimetre).trim()
      : "",
    perimetre: perimetre ? String(perimetre) : "",
    isDraft: !!isDraft,
    utilisateurId: utilisateurId || null,
    ...rest,
  };

  try {
    const response = await apiFetch(`/demandes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouvelleDemande),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création de la demande");
    }

    const demandeCreee = await response.json();
    return {
      succes: true,
      message: "Demande créée avec succès",
      demande: demandeCreee,
    };
  } catch (error) {
    console.error("Erreur lors de la création de la demande:", error);
    return {
      succes: false,
      message: "Erreur lors de la création de la demande",
    };
  }
};

// Mettre à jour une demande
const mettreAJourDemande = async (
  id,
  {
    dateReception,
    societesDemandeurs,
    collaborateurIds,
    interlocuteur,
    typeProjet,
    nomProjet,
    descriptionPerimetre,
    perimetre,
    // Champs de soumission et validation
    dateSoumissionBacklog,
    lienCompteRendu,
    redacteurBacklog,
    dateValidationBacklog,
    dateElaborationDATFL,
    dateValidationDATFL,
    dateElaborationPlanningDEV,
    dateValidationPlanningDEV,
    statutSoumission,
    isDraft = false,
    ...rest
  },
) => {
  // Vérifier que tous les champs obligatoires sont remplis (seulement si on met à jour les champs de base)
  if (!isDraft) {
    if (
      dateReception !== undefined &&
      societesDemandeurs !== undefined &&
      interlocuteur !== undefined &&
      typeProjet !== undefined &&
      nomProjet !== undefined &&
      descriptionPerimetre !== undefined &&
      perimetre !== undefined
    ) {
      const { requiresDescriptionPerimetre, requiresPerimetre } =
        getDemandeRequirements(typeProjet);

      if (
        !dateReception ||
        !societesDemandeurs ||
        societesDemandeurs.length === 0 ||
        !interlocuteur ||
        !typeProjet ||
        !nomProjet ||
        (requiresDescriptionPerimetre && !descriptionPerimetre) ||
        (requiresPerimetre && !perimetre)
      ) {
        return {
          succes: false,
          message: "Tous les champs obligatoires doivent être remplis",
        };
      }

      // Vérifier que les sociétés existent (seulement si des sociétés sont sélectionnées)
      const societes = await chargerSocietes();
      if (societes.length > 0) {
        const societesIds = Array.isArray(societesDemandeurs)
          ? societesDemandeurs
          : [societesDemandeurs];
        const toutesSocietesExistantes = societesIds.every((id) =>
          societes.some((s) => s.id === parseInt(id)),
        );

        if (!toutesSocietesExistantes) {
          return {
            succes: false,
            message: "Une ou plusieurs sociétés sélectionnées n'existent pas",
          };
        }
      }
    }
  }

  // Construire l'objet de mise à jour
  const updateData = {
    ...(dateReception !== undefined && { dateReception }),
    ...(societesDemandeurs !== undefined && {
      societesDemandeurs: JSON.stringify(
        Array.isArray(societesDemandeurs)
          ? societesDemandeurs.map((id) => parseInt(id))
          : [parseInt(societesDemandeurs)],
      ),
    }),
    ...(collaborateurIds !== undefined && {
      collaborateurIds: JSON.stringify(
        Array.isArray(collaborateurIds)
          ? collaborateurIds.map((id) => parseInt(id))
          : [parseInt(collaborateurIds)],
      ),
    }),
    ...(interlocuteur !== undefined && { interlocuteur: interlocuteur.trim() }),
    ...(typeProjet !== undefined && { typeProjet: typeProjet.trim() }),
    ...(nomProjet !== undefined && { nomProjet: nomProjet.trim() }),
    ...(descriptionPerimetre !== undefined && {
      descriptionPerimetre: descriptionPerimetre.trim(),
    }),
    ...(perimetre !== undefined && { perimetre }),
    // Champs de soumission et validation
    ...(dateSoumissionBacklog !== undefined && { dateSoumissionBacklog }),
    ...(lienCompteRendu !== undefined && { lienCompteRendu }),
    ...(redacteurBacklog !== undefined && { redacteurBacklog }),
    ...(dateValidationBacklog !== undefined && { dateValidationBacklog }),
    ...(dateElaborationDATFL !== undefined && { dateElaborationDATFL }),
    ...(dateValidationDATFL !== undefined && { dateValidationDATFL }),
    ...(dateElaborationPlanningDEV !== undefined && {
      dateElaborationPlanningDEV,
    }),
    ...(dateValidationPlanningDEV !== undefined && {
      dateValidationPlanningDEV,
    }),
    ...(statutSoumission !== undefined && { statutSoumission }),
    ...(isDraft !== undefined && { isDraft }),
    ...(rest || {}),
  };

  try {
    const response = await apiFetch(`/demandes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Demande introuvable" };
      }
      throw new Error("Erreur lors de la mise à jour de la demande");
    }

    const demandeMiseAJour = await response.json();
    return {
      succes: true,
      message: "Demande mise à jour avec succès",
      demande: demandeMiseAJour,
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la demande:", error);
    return {
      succes: false,
      message: "Erreur lors de la mise à jour de la demande",
    };
  }
};

// Supprimer une demande
const supprimerDemande = async (id, utilisateurId) => {
  try {
    const path = utilisateurId
      ? `/demandes/${id}?utilisateurId=${utilisateurId}`
      : `/demandes/${id}`;
    const response = await apiFetch(path, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { succes: false, message: "Demande introuvable" };
      }
      throw new Error("Erreur lors de la suppression de la demande");
    }

    const result = await response.json();
    return {
      succes: true,
      message: result.message || "Demande supprimée avec succès",
      statutNettoyage: result.statutNettoyage,
    };
  } catch (error) {
    console.error("Erreur lors de la suppression de la demande:", error);
    return {
      succes: false,
      message: "Erreur lors de la suppression de la demande",
    };
  }
};

// Exporter les fonctions
export {
  chargerDemandes,
  sauvegarderDemandes,
  creerDemande,
  mettreAJourDemande,
  supprimerDemande,
};
