import { useState, useEffect, useCallback } from "react";
import "./PageStyles.css";
import {
  creerDemande,
  chargerDemandes,
  supprimerDemande,
} from "../../data/gestionDemandes";
import { chargerSocietes } from "../../data/societes";
import { chargerCollaborateurs } from "../../data/gestionCollaborateurs";
import { chargerInterlocuteurs } from "../../data/gestionInterlocuteurs";
import { useAuth } from "../AuthProvider";
import { PermissionGuard, usePermissions } from "../PermissionGuard";

// Utilitaire pour formater les dates pour les input type="date"
const formatDateForInput = (dateString) => {
  if (!dateString) return "";

  // Si c'est déjà au format yyyy-MM-dd, retourner tel quel
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;

  try {
    // Gérer les différents formats de date
    const date = new Date(dateString);

    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      console.warn("Date invalide:", dateString);
      return "";
    }

    // Retourner le format yyyy-MM-dd pour les input type="date"
    return date.toISOString().split("T")[0];
  } catch (error) {
    console.error("Erreur de formatage de date:", dateString, error);
    return "";
  }
};

const getNouvelleDemandeInitialState = () => ({
  // Étape 1: Enregistrement de la demande
  dateEnregistrement: new Date().toISOString().split("T")[0],
  demandeur: "",
  societesDemandeurs: [],
  societesDemandeursNames: [],
  interlocuteurClient: "",
  typeProjet: "",
  nomProjet: "",
  descriptionProjet: "",
  descriptionPerimetre: "",
  statutDemande: "",
  dateReception: "",
  lienIngridCDC: "",
  // Étape 2: Clarification de la demande
  dateTransmissionBacklog: "",
  dateConfirmationValidation: "",
  // Étape 3: Planification du périmètre
  dateDemandePlanificationDev: "",
  dateDemandePlanificationTif: "",
  dateRetourEquipesDev: "",
  dateRetourEquipesTif: "",
  dateCommunicationPlanningClient: "",
  nombreSprint: "",
  chargePrevisionnelleParSprint: [],
  dateLivraisonPrevisionnelleTIFParSprint: [],
  dateLivraisonPrevisionnelleClientParSprint: [],
  roadmap: "",
  sprintsData: [],
  dateEffectiveLivraisonTIF: "",
  motifsRetardTIF: "",
  dateEffectiveLivraisonClient: "",
  motifsRetardClient: "",
  // Étape 4: Codage de l'application
  statutCodage: "en attente",
  // Étape 5: Présentation des documents
  lienIngridKickoff: "",
  lienIngridPointsControleTIF: "",
  lienIngridSignoff: "",
  // Étape 6: Réalisation des TIF
  statutTIF: "en attente",
  // Étape 7: Livraison effective au client
  statutLivraisonClient: "en attente",
});

// Fonction pour formater les dates pour l'affichage (français)
const formatDateForDisplay = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }); // DD/MM/YYYY
};

const Demandes = ({ activeSubPage }) => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  // Vérifier si l'utilisateur est administrateur
  const isAdmin = user?.profil?.nom === "Administrateur";

  // Vérifier la permission de créer des demandes
  const peutCreerDemande = hasPermission("demandes", "gestion", "create");

  // États pour la sélection de type de demande
  const [selectedDemandeType, setSelectedDemandeType] = useState(null);
  const [showSelectionCards, setShowSelectionCards] = useState(() => {
    try {
      const saved = localStorage.getItem("julee_nouvelle_demande_wip");
      return saved ? !JSON.parse(saved).open : true;
    } catch { return true; }
  });
  const [showDemandesList, setShowDemandesList] = useState(true);

  // États pour la gestion des demandes
  const [demandes, setDemandes] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [interlocuteurs, setInterlocuteurs] = useState([]);

  // États pour le formulaire multi-étapes "Nouvelle demande"
  const FORM_STORAGE_KEY = "julee_nouvelle_demande_wip";

  const [showNouvelleDemandeForm, setShowNouvelleDemandeForm] = useState(() => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      return saved ? JSON.parse(saved).open === true : false;
    } catch { return false; }
  });
  const [nouvelleDemandeStep, setNouvelleDemandeStep] = useState(() => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      return saved ? (JSON.parse(saved).step || 1) : 1;
    } catch { return 1; }
  });
  const [nouvelleDemandeFormData, setNouvelleDemandeFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      return saved ? (JSON.parse(saved).formData || getNouvelleDemandeInitialState()) : getNouvelleDemandeInitialState();
    } catch { return getNouvelleDemandeInitialState(); }
  });

  // États pour le formulaire multi-étapes "Demande prospecte"
  const [showProspecteForm, setShowProspecteForm] = useState(false);
  const [prospecteFormData, setProspecteFormData] = useState({
    dateEnregistrement: new Date().toISOString().split("T")[0],
    societesDemandeurs: [],
    interlocuteur: "",
    nomProjet: "",
    descriptionPerimetre: "",
    dateReception: "",
  });

  // États pour le formulaire multi-étapes "Demande d'évolution"
  const [showEvolutionForm, setShowEvolutionForm] = useState(false);
  const [evolutionStep, setEvolutionStep] = useState(1); // 1 à 3
  const [evolutionFormData, setEvolutionFormData] = useState({
    dateEnregistrement: new Date().toISOString().split("T")[0],
    societesDemandeurs: [],
    interlocuteur: "",
    nomProjet: "",
    dateReception: "",
    // Étape 1
    dateDemandeMiseAJourDATFL: "",
    dateReponseMiseAJourDATFL: "",
    // Étape 2
    charge: "",
    planningDateDebut: "",
    planningDateFin: "",
    // Étape 3
    dateDemandeDevolution: "",
    dateReponseDevolution: "",
    slt: "",
    aleasNormeParJour: "",
  });

  // Fonction pour formater une date en français (ex: "lundi 15 janvier 2025")
  const formatDateEnFrancais = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    const jours = [
      "dimanche",
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi",
    ];
    const mois = [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre",
    ];
    const jourSemaine = jours[date.getDay()];
    const jour = date.getDate();
    const moisNom = mois[date.getMonth()];
    const annee = date.getFullYear();
    return `${jourSemaine} ${jour} ${moisNom} ${annee}`;
  };

  // Fonctions de navigation pour le formulaire "Nouvelle demande" multi-étapes
  const scrollToFormTop = () => {
    const wrapper = document.querySelector(".content-wrapper");
    if (wrapper) {
      wrapper.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNouvelleDemandeNext = () => {
    if (nouvelleDemandeStep < 6) {
      if (nouvelleDemandeStep === 1) scrollToFormTop();
      setNouvelleDemandeStep(nouvelleDemandeStep + 1);
      setDemandeMessage({ type: "", text: "" });
    }
  };

  const handleNouvelleDemandePrevious = () => {
    if (nouvelleDemandeStep > 1) {
      setNouvelleDemandeStep(nouvelleDemandeStep - 1);
      setDemandeMessage({ type: "", text: "" });
    }
  };

  const handleNouvelleDemandeCancel = () => {
    localStorage.removeItem(FORM_STORAGE_KEY);
    setShowNouvelleDemandeForm(false);
    setShowSelectionCards(true);
    setNouvelleDemandeStep(1);
    setDemandeMessage({ type: "", text: "" });
  };

  const handleNouvelleDemandeSubmit = async (e) => {
    e.preventDefault();
    setDemandeMessage({ type: "", text: "" });

    // Si on est à l'étape 6, ne rien faire (le bouton "Terminer" gère ça)
    if (nouvelleDemandeStep === 6) {
      return;
    }

    // Validation de l'étape actuelle avant de terminer
    if (nouvelleDemandeStep === 1) {
      if (
        !nouvelleDemandeFormData.societesDemandeurs ||
        nouvelleDemandeFormData.societesDemandeurs.length === 0 ||
        !nouvelleDemandeFormData.nomProjet
      ) {
        setDemandeMessage({
          type: "error",
          text: "Veuillez remplir tous les champs obligatoires de l'étape 1.",
        });
        return;
      }
    }

    // Sauvegarder comme brouillon (comme le bouton Enregistrer le brouillon)
    await sauvegarderNouvelleDemandeBrouillon();

    setDemandeMessage({
      type: "success",
      text: "Brouillon enregistré avec succès !",
    });
    chargerLesDemandes();
    localStorage.removeItem(FORM_STORAGE_KEY);
    setShowNouvelleDemandeForm(false);
    setShowSelectionCards(true);
    setNouvelleDemandeStep(1);
    setNouvelleDemandeFormData(getNouvelleDemandeInitialState());
    setDraftStepInfo(null);
    setTimeout(() => setDemandeMessage({ type: "", text: "" }), 3000);
  };

  // Nouvelle fonction pour le bouton "Terminer" à l'étape 7
  const handleTerminerDemande = async () => {
    // Sauvegarder comme demande finale (pas brouillon)
    // Pour l'instant, on sauvegarde comme brouillon mais on pourrait changer isDraft: false
    await sauvegarderNouvelleDemandeBrouillon();

    setDemandeMessage({
      type: "success",
      text: "Demande terminée avec succès !",
    });
    chargerLesDemandes();
    setTimeout(() => {
      localStorage.removeItem(FORM_STORAGE_KEY);
      setShowNouvelleDemandeForm(false);
      setShowSelectionCards(true);
      setNouvelleDemandeStep(1);
      setNouvelleDemandeFormData(getNouvelleDemandeInitialState());
      setDraftStepInfo(null);
    }, 1000);
  };

  const handleNouvelleDemandeInputChange = (e) => {
    const { name, value } = e.target;

    // Debug pour les dates
    if (name === "dateReception") {
      console.log("dateReception changée:", {
        name,
        value,
        type: typeof value,
        formDataAvant: nouvelleDemandeFormData.dateReception,
      });
    }

    setNouvelleDemandeFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (demandeMessage.text) {
      setDemandeMessage({ type: "", text: "" });
    }
  };
  const handleSprintDataChange = (index, field, value) => {
    setNouvelleDemandeFormData((prev) => {
      const updatedSprints = [...(prev.sprintsData || [])];
      if (!updatedSprints[index]) updatedSprints[index] = {};
      updatedSprints[index] = { ...updatedSprints[index], [field]: value };
      return { ...prev, sprintsData: updatedSprints };
    });
  };

  const perimetreOptions = [
    "ND",
    "ANL",
    "DEV",
    "DEP",
    "DEM",
    "REC",
    "TIF",
    "LIV",
    "FREC",
    "ANN",
    "SUSP",
    "A PLAN",
    "ENREG",
  ];

  const [demandeMessage, setDemandeMessage] = useState({ type: "", text: "" });
  const [showDemandeDeleteConfirm, setShowDemandeDeleteConfirm] =
    useState(false);
  const [demandeToDelete, setDemandeToDelete] = useState(null);
  const [, setDraftStepInfo] = useState(null);
  const [showDeleteDraftModal, setShowDeleteDraftModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDemandeDetail, setSelectedDemandeDetail] = useState(null);
  const [showStatusEditModal, setShowStatusEditModal] = useState(false);
  const [selectedDemandeIdForStatus, setSelectedDemandeIdForStatus] = useState(null);
  const [newStatusValue, setNewStatusValue] = useState("");
  const [statutsDisponibles, setStatutsDisponibles] = useState([]);
  const [suspensionMotif, setSuspensionMotif] = useState("");
  const [suspensionDate, setSuspensionDate] = useState("");

  const sauvegarderNouvelleDemandeBrouillon = async (stepOverride) => {
    console.log("Début de sauvegarderNouvelleDemandeBrouillon");
    console.log("stepOverride:", stepOverride);
    console.log("nouvelleDemandeStep:", nouvelleDemandeStep);

    const stepToStore = stepOverride || nouvelleDemandeStep;

    try {
      // Afficher un indicateur de chargement
      setDemandeMessage({
        type: "info",
        text: "Enregistrement du brouillon...",
      });

      // Récupérer les données du formulaire (adapté de votre approche)
      console.log(
        "🔍 nouvelleDemandeFormData avant construction:",
        nouvelleDemandeFormData,
      );
      console.log(
        "🗓️ dateReception avant sauvegarde:",
        nouvelleDemandeFormData.dateReception,
      );

      const formData = {
        // Étape 1: Enregistrement
        typeProjet: nouvelleDemandeFormData.typeProjet || "",
        nomProjet: nouvelleDemandeFormData.nomProjet || "",
        demandeur: nouvelleDemandeFormData.demandeur || null,
        descriptionProjet: nouvelleDemandeFormData.descriptionProjet || null,
        dateEnregistrement: nouvelleDemandeFormData.dateEnregistrement || null,
        interlocuteurClient:
          nouvelleDemandeFormData.interlocuteurClient || null,
        societesDemandeurs:
          nouvelleDemandeFormData.societesDemandeursNames?.join(", ") || null,

        // Étape 2: Clarification
        dateReception: nouvelleDemandeFormData.dateReception || null,
        descriptionPerimetre:
          nouvelleDemandeFormData.descriptionPerimetre || null,
        statutDemande: nouvelleDemandeFormData.statutDemande || null,
        lienIngridCDC: nouvelleDemandeFormData.lienIngridCDC || null,

        // Étape 3: Planification
        dateTransmissionBacklog:
          nouvelleDemandeFormData.dateTransmissionBacklog || null,
        dateConfirmationValidation:
          nouvelleDemandeFormData.dateConfirmationValidation || null,
        dateDemandePlanificationDev:
          nouvelleDemandeFormData.dateDemandePlanificationDev || null,
        dateDemandePlanificationTif:
          nouvelleDemandeFormData.dateDemandePlanificationTif || null,
        dateRetourEquipesDev: nouvelleDemandeFormData.dateRetourEquipesDev || null,
        dateRetourEquipesTif: nouvelleDemandeFormData.dateRetourEquipesTif || null,
        dateCommunicationPlanningClient:
          nouvelleDemandeFormData.dateCommunicationPlanningClient || null,
        nombreSprint: nouvelleDemandeFormData.nombreSprint || null,
        chargePrevisionnelleParSprint:
          nouvelleDemandeFormData.chargePrevisionnelleParSprint || null,
        dateLivraisonPrevisionnelleTIFParSprint:
          nouvelleDemandeFormData.dateLivraisonPrevisionnelleTIFParSprint ||
          null,
        dateLivraisonPrevisionnelleClientParSprint:
          nouvelleDemandeFormData.dateLivraisonPrevisionnelleClientParSprint ||
          null,
        roadmap: nouvelleDemandeFormData.roadmap || null,
        sprintsData: nouvelleDemandeFormData.sprintsData?.length > 0 ? nouvelleDemandeFormData.sprintsData : null,

        // Étape 4: Codage
        statutCodage: nouvelleDemandeFormData.statutCodage || null,

        // Étape 5: Documents
        statutPresentationDocs:
          nouvelleDemandeFormData.statutPresentationDocs || null,
        lienIngridKickoff: nouvelleDemandeFormData.lienIngridKickoff || null,
        lienIngridPointsControleTIF:
          nouvelleDemandeFormData.lienIngridPointsControleTIF || null,
        lienIngridSignoff: nouvelleDemandeFormData.lienIngridSignoff || null,

        // Étape 6: TIF
        statutRecette: nouvelleDemandeFormData.statutRecette || null,
        statutTIF: nouvelleDemandeFormData.statutTIF || null,

        // Étape 6: Livraison
        dateEffectiveLivraisonTIF:
          nouvelleDemandeFormData.dateEffectiveLivraisonTIF || null,
        motifsRetardTIF: nouvelleDemandeFormData.motifsRetardTIF || null,
        dateEffectiveLivraisonClient:
          nouvelleDemandeFormData.dateEffectiveLivraisonClient || null,
        motifsRetardClient: nouvelleDemandeFormData.motifsRetardClient || null,
        statutLivraison: nouvelleDemandeFormData.statutLivraisonClient || null,

        // Champs manquants pour le backend
        societeDemandeur: nouvelleDemandeFormData.societeDemandeur || null,
        interlocuteur: nouvelleDemandeFormData.interlocuteur || null,
      };

      const draftStepLabel = getStepLabel(stepToStore);

      // Préparer les données avec validation
      const payload = {
        ...formData,
        isDraft: true,
        draftStep: Number(stepToStore), // Assurer que c'est un nombre
        draftStepLabel: draftStepLabel,
        utilisateurId: user?.id || 1, // Admin par défaut si pas d'utilisateur
      };

      // DEBUG : Vérifier l'utilisateur
      console.log("Utilisateur connecté:", user);
      console.log("utilisateurId dans payload:", user?.id || 1);

      // Si pas d'utilisateur, utiliser l'admin par défaut
      if (!user?.id) {
        console.warn(
          "⚠️ Pas d'utilisateur connecté, utilisation de l'admin par défaut",
        );
      }

      // DEBUG : Voir ce qui est envoyé au backend
      console.log("Payload envoyé au backend:", payload);
      console.log("Étape 2 dans payload:", {
        descriptionPerimetre: payload.descriptionPerimetre,
        statutDemande: payload.statutDemande,
        lienIngridCDC: payload.lienIngridCDC,
        dateTransmissionBacklog: payload.dateTransmissionBacklog,
        dateConfirmationValidation: payload.dateConfirmationValidation,
      });
      console.log("Étape 3 dans payload:", {
        dateDemandePlanificationDev: payload.dateDemandePlanificationDev,
        dateDemandePlanificationTif: payload.dateDemandePlanificationTif,
        dateRetourEquipesDev: payload.dateRetourEquipesDev,
        dateRetourEquipesTif: payload.dateRetourEquipesTif,
        dateCommunicationPlanningClient:
          payload.dateCommunicationPlanningClient,
        nombreSprint: payload.nombreSprint,
        chargePrevisionnelleParSprint: payload.chargePrevisionnelleParSprint,
        roadmap: payload.roadmap,
      });

      // Validation des champs obligatoires (assouplie pour les brouillons)
      console.log("FormData avant validation:", formData);
      console.log(
        "nouvelleDemandeFormData complet:",
        nouvelleDemandeFormData,
      );
      // Pour les brouillons, on permet les champs vides
      if (!formData.typeProjet?.trim() || !formData.nomProjet?.trim()) {
        console.log("typeProjet:", formData.typeProjet);
        console.log("nomProjet:", formData.nomProjet);
        // Pour un brouillon, on utilise des valeurs par défaut
        formData.typeProjet = formData.typeProjet?.trim() || "Brouillon";
        formData.nomProjet = formData.nomProjet?.trim() || "Sans nom";
      }

      // Vérifier si on est en train d'éditer une demande existante
      const currentDemandeId = nouvelleDemandeFormData.id;
      let response;

      const API_BASE_URL =
        process.env.REACT_APP_API_URL || "http://localhost:3001";

      if (currentDemandeId) {
        // Mettre à jour la demande existante
        response = await fetch(`${API_BASE_URL}/demandes/${currentDemandeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        // Si la demande n'existe plus en base, on recrée
        if (response.status === 404) {
          console.warn("Demande introuvable, recréation en POST");
          response = await fetch(`${API_BASE_URL}/demandes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      } else {
        // Créer une nouvelle demande
        response = await fetch(`${API_BASE_URL}/demandes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔍 Erreur backend:", errorText);
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      // Plus de sauvegarde localStorage - tout vient de la base de données

      // Mettre à jour l'affichage (adapté de votre approche)
      await chargerLesDemandes(); // Recharge la liste depuis le backend
      setDraftStepInfo(stepToStore);

      // Si c'était une nouvelle demande, récupérer l'ID pour les futures mises à jour
      if (!currentDemandeId && response.ok) {
        const createdDemande = await response.json();
        setNouvelleDemandeFormData((prev) => ({
          ...prev,
          id: createdDemande.id,
        }));
        console.log(
          "📝 ID de la nouvelle demande enregistré:",
          createdDemande.id,
        );
      }

      // Fermer le formulaire et afficher les cartes de sélection
      setShowNouvelleDemandeForm(false);
      setShowSelectionCards(true);
      setSelectedDemandeType(null);
      setNouvelleDemandeStep(1);
      setNouvelleDemandeFormData(getNouvelleDemandeInitialState());
      setDraftStepInfo(null);

      // Afficher un message de succès
      setDemandeMessage({
        type: "success",
        text: currentDemandeId
          ? "Brouillon mis à jour avec succès."
          : "Nouvelle demande créée avec succès.",
      });
      setTimeout(() => setDemandeMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Erreur:", error);
      setDemandeMessage({
        type: "error",
        text: `Impossible d'enregistrer le brouillon. ${error?.message || "Vérifiez la connexion au serveur."}`,
      });
    }
  };

  const sauvegarderEvolutionBrouillon = async (stepOverride) => {
    const stepToStore = stepOverride || evolutionStep;
    const evolutionStepLabels = {
      1: "Info demande",
      2: "DATFL",
      3: "Planning & SLT",
    };

    // Vérifier si on est en train d'éditer une demande existante
    const currentDemandeId = evolutionFormData.id;

    const payload = {
      dateEnregistrement:
        evolutionFormData.dateEnregistrement ||
        new Date().toISOString().split("T")[0],
      dateReception: evolutionFormData.dateReception || "",
      societeDemandeur: evolutionFormData.societeDemandeur || "",
      interlocuteur: evolutionFormData.interlocuteur || "",
      typeProjet: "Evolution",
      nomProjet: evolutionFormData.nomProjet || "",
      descriptionProjet: evolutionFormData.descriptionProjet || "",
      descriptionPerimetre: evolutionFormData.descriptionPerimetre || "",
      perimetre: evolutionFormData.perimetre || "",
      statutDemande: evolutionFormData.statutDemande || "",
      dateTransmissionBacklog: evolutionFormData.dateTransmissionBacklog || "",
      dateConfirmationValidation:
        evolutionFormData.dateConfirmationValidation || "",
      dateDemandePlanificationDev:
        evolutionFormData.dateDemandePlanificationDev || "",
      dateDemandePlanificationTif:
        evolutionFormData.dateDemandePlanificationTif || "",
      dateRetourEquipesDev: evolutionFormData.dateRetourEquipesDev || "",
      dateRetourEquipesTif: evolutionFormData.dateRetourEquipesTif || "",
      dateCommunicationPlanningClient:
        evolutionFormData.dateCommunicationPlanningClient || "",
      nombreSprint: evolutionFormData.nombreSprint || "",
      roadmap: evolutionFormData.roadmap || "",
      isDraft: true,
      draftStep: stepToStore,
      draftStepLabel:
        evolutionStepLabels[stepToStore] || `Étape ${stepToStore}/3`,
      utilisateurId: user?.id,
    };

    try {
      if (currentDemandeId) {
        // Mettre à jour la demande existante
        await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:3001"}/demandes/${currentDemandeId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        console.log(
          "🔄 Mise à jour du brouillon évolution existant:",
          currentDemandeId,
        );
      } else {
        // Créer une nouvelle demande
        const response = await creerDemande(payload);
        console.log("Création d'une nouvelle demande évolution");

        // Récupérer l'ID pour les futures mises à jour
        if (response && response.id) {
          setEvolutionFormData((prev) => ({
            ...prev,
            id: response.id,
          }));
          console.log(
            "📝 ID de la nouvelle demande évolution enregistré:",
            response.id,
          );
        }
      }

      chargerLesDemandes();
      setDemandeMessage({
        type: "success",
        text: currentDemandeId
          ? "Brouillon évolution mis à jour."
          : "Brouillon évolution enregistré.",
      });
    } catch (error) {
      console.error("Erreur évolution brouillon:", error);
      setDemandeMessage({
        type: "error",
        text: `Impossible d'enregistrer le brouillon. ${error?.message || "Vérifiez la connexion au serveur."}`,
      });
    }
  };

  const sauvegarderProspecteBrouillon = async () => {
    // Vérifier si on est en train d'éditer une demande existante
    const currentDemandeId = prospecteFormData.id;

    const payload = {
      dateEnregistrement:
        prospecteFormData.dateEnregistrement ||
        new Date().toISOString().split("T")[0],
      dateReception: prospecteFormData.dateReception || "",
      societeDemandeur: prospecteFormData.societeDemandeur || "",
      interlocuteur: prospecteFormData.interlocuteur || "",
      typeProjet: "Prospecte",
      nomProjet: prospecteFormData.nomProjet || "",
      perimetre: prospecteFormData.perimetre || "",
      isDraft: true,
      draftStepLabel: "Info demande",
      utilisateurId: user?.id,
    };

    try {
      if (currentDemandeId) {
        // Mettre à jour la demande existante
        await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:3001"}/demandes/${currentDemandeId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        console.log(
          "🔄 Mise à jour du brouillon prospecte existant:",
          currentDemandeId,
        );
      } else {
        // Créer une nouvelle demande
        const response = await creerDemande(payload);
        console.log("Création d'une nouvelle demande prospecte");

        // Récupérer l'ID pour les futures mises à jour
        if (response && response.id) {
          setProspecteFormData((prev) => ({
            ...prev,
            id: response.id,
          }));
          console.log(
            "📝 ID de la nouvelle demande prospecte enregistré:",
            response.id,
          );
        }
      }

      chargerLesDemandes();
      setDemandeMessage({
        type: "success",
        text: currentDemandeId
          ? "Brouillon prospecte mis à jour."
          : "Brouillon prospecte enregistré.",
      });
    } catch (error) {
      setDemandeMessage({
        type: "error",
        text: "Impossible d'enregistrer le brouillon. Vérifiez l'espace disponible.",
      });
    }
  };

  const supprimerBrouillonNouvelleDemande = () => {
    setNouvelleDemandeFormData(getNouvelleDemandeInitialState());
    setNouvelleDemandeStep(1);
    setDraftStepInfo(null);
  };

  const confirmDeleteDraft = async () => {
    supprimerBrouillonNouvelleDemande();
    setShowDeleteDraftModal(false);
  };

  const cancelDeleteDraft = () => {
    setShowDeleteDraftModal(false);
  };

  const handleShowDetail = (demande) => {
    console.log("Données brutes de la demande:", demande);
    console.log(
      "Étape 2 - descriptionPerimetre:",
      demande.descriptionPerimetre,
    );
    console.log("Étape 2 - statutDemande:", demande.statutDemande);
    console.log("Étape 2 - lienIngridCDC:", demande.lienIngridCDC);
    console.log(
      "Étape 3 - dateDemandePlanificationDevTif:",
      demande.dateDemandePlanificationDevTif,
    );
    console.log("Étape 3 - dateRetourEquipes:", demande.dateRetourEquipes);
    console.log("Étape 3 - nombreSprint:", demande.nombreSprint);
    setSelectedDemandeDetail(demande);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDemandeDetail(null);
  };

  const handleEditStatus = (status, demandeId) => {

    setSelectedDemandeIdForStatus(demandeId || null);
    setNewStatusValue(typeof status === "object" ? status.nom : status);
    setShowStatusEditModal(true);
  };

  const handleStatusEditSubmit = async () => {
    if (!selectedDemandeIdForStatus || !newStatusValue) return;

    // Règle de gestion suspension : motif + date obligatoires
    if (isSuspensionStatus(newStatusValue)) {
      if (!suspensionMotif.trim()) {
        setDemandeMessage({ type: "error", text: "Le motif de suspension est obligatoire." });
        return;
      }
      if (!suspensionDate) {
        setDemandeMessage({ type: "error", text: "La date de suspension est obligatoire." });
        return;
      }
    }

    try {
      const API_BASE_URL =
        process.env.REACT_APP_API_URL || "http://localhost:3001";

      // Trouver l'ID du statut sélectionné
      const statutChoisi = statutsDisponibles.find((s) => s.nom === newStatusValue);
      if (!statutChoisi) {
        setDemandeMessage({ type: "error", text: "Statut introuvable." });
        return;
      }

      // Mettre à jour le statutId de la demande
      const body = { statutId: statutChoisi.id };
      if (isSuspensionStatus(newStatusValue)) {
        body.motifSuspension = suspensionMotif;
        body.dateSuspension = suspensionDate;
      }

      const response = await fetch(
        `${API_BASE_URL}/demandes/${selectedDemandeIdForStatus}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (response.ok) {
        setDemandeMessage({ type: "success", text: "Statut modifié avec succès !" });
        chargerLesDemandes();
        setShowStatusEditModal(false);
        setSelectedDemandeIdForStatus(null);
        setNewStatusValue("");
        setSuspensionMotif("");
        setSuspensionDate("");
        setTimeout(() => setDemandeMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error("Erreur lors de la modification du statut");
      }
    } catch (error) {
      setDemandeMessage({ type: "error", text: "Impossible de modifier le statut." });
      setTimeout(() => setDemandeMessage({ type: "", text: "" }), 5000);
    }
  };

  const handleStatusEditCancel = () => {
    setShowStatusEditModal(false);
    setNewStatusValue("");
    setSuspensionMotif("");
    setSuspensionDate("");
  };

  const isSuspensionStatus = (val) => {
    if (!val) return false;
    const nom = typeof val === "object" ? val.nom : val;
    return nom && nom.toUpperCase().includes("SUSP");
  };

  const chargerLesDemandes = useCallback(async () => {
    // Si admin : charge toutes les demandes, sinon : charge seulement les demandes de l'utilisateur
    const demandesChargees = await chargerDemandes(isAdmin ? null : user?.id);

    // Charger les statuts pour avoir les informations complètes
    try {
      const API_BASE_URL =
        process.env.REACT_APP_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_BASE_URL}/statuts`);
      if (response.ok) {
        const statuts = await response.json();

        // Enrichir les demandes avec les informations du statut
        const demandesEnrichies = demandesChargees.map((demande) => {
          const statut = statuts.find((s) => s.id === demande.statutId);
          return {
            ...demande,
            statutInfo: statut,
            statutDemande: statut ? statut.nom : demande.statutDemande,
          };
        });

        setDemandes(demandesEnrichies);
      } else {
        setDemandes(demandesChargees);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des statuts:", error);
      setDemandes(demandesChargees);
    }
  }, [isAdmin, user?.id]);

  const chargerLesSocietes = useCallback(async () => {
    const societesChargees = await chargerSocietes();
    setSocietes(societesChargees);
  }, []);

  const chargerLesCollaborateurs = useCallback(async () => {
    const collaborateursCharges = await chargerCollaborateurs();
    setCollaborateurs(collaborateursCharges);
  }, []);

  const chargerLesInterlocuteurs = useCallback(async () => {
    const interlocuteursCharges = await chargerInterlocuteurs();
    setInterlocuteurs(interlocuteursCharges);
  }, []);

  const chargerLesStatuts = useCallback(async () => {
    try {
      const API_BASE_URL =
        process.env.REACT_APP_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_BASE_URL}/statuts`);
      if (response.ok) {
        const statuts = await response.json();
        setStatutsDisponibles(statuts);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des statuts:", error);
    }
  }, []);

  // Charger les données au montage
  useEffect(() => {
    chargerLesDemandes();
    chargerLesSocietes();
    chargerLesCollaborateurs();
    chargerLesInterlocuteurs();
    chargerLesStatuts();
    setDraftStepInfo(null);
  }, [
    chargerLesDemandes,
    chargerLesSocietes,
    chargerLesCollaborateurs,
    chargerLesInterlocuteurs,
    chargerLesStatuts,
  ]);

  // Sauvegarder l'état du formulaire en cours dans localStorage
  useEffect(() => {
    if (showNouvelleDemandeForm) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
        open: true,
        step: nouvelleDemandeStep,
        formData: nouvelleDemandeFormData,
      }));
    }
  }, [showNouvelleDemandeForm, nouvelleDemandeStep, nouvelleDemandeFormData]);

  const handleCreateDemande = () => {
    localStorage.removeItem(FORM_STORAGE_KEY);
    setNouvelleDemandeStep(1);
    setNouvelleDemandeFormData(getNouvelleDemandeInitialState());
    setDraftStepInfo(null);
    setDemandeMessage({ type: "", text: "" });

    // Plus de localStorage - tout vient de la base de données

    setShowNouvelleDemandeForm(true);
    setShowSelectionCards(false);
  };

  // Création d'une demande prospecte avec formulaire multi-étapes
  const handleCreateDemandeProspecte = () => {
    setProspecteFormData({
      dateEnregistrement: new Date().toISOString().split("T")[0],
      societesDemandeurs: [],
      interlocuteur: "",
      nomProjet: "",
      descriptionPerimetre: "",
      dateReception: "",
    });

    // Plus de localStorage - tout vient de la base de données

    setShowProspecteForm(true);
    setShowSelectionCards(false);
  };

  const handleProspecteInputChange = (e) => {
    const { name, value } = e.target;
    setProspecteFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (demandeMessage.text) {
      setDemandeMessage({ type: "", text: "" });
    }
  };

  const handleProspecteCancel = () => {
    setShowProspecteForm(false);
    setShowSelectionCards(true);
    setDemandeMessage({ type: "", text: "" });
  };

  const handleProspecteSubmit = (e) => {
    e.preventDefault();
    setDemandeMessage({ type: "", text: "" });

    const dataToSave = {
      ...prospecteFormData,
      typeProjet: "Prospecte",
      perimetre: "",
    };

    const resultat = creerDemande(dataToSave);

    if (resultat.succes) {
      setDemandeMessage({
        type: "success",
        text: "Demande prospecte créée avec succès !",
      });
      chargerLesDemandes();
      setShowProspecteForm(false);
      setShowSelectionCards(true);
      setTimeout(() => setDemandeMessage({ type: "", text: "" }), 3000);
    } else {
      setDemandeMessage({ type: "error", text: resultat.message });
    }
  };

  // Création d'une demande d'évolution avec formulaire multi-étapes
  const handleCreateDemandeEvolution = () => {
    setEvolutionFormData({
      dateEnregistrement: new Date().toISOString().split("T")[0],
      societesDemandeurs:
        societes.length > 0 ? [societes[0].id.toString()] : [],
      interlocuteur: "",
      nomProjet: "",
      dateReception: "",
      dateDemandeMiseAJourDATFL: "",
      dateReponseMiseAJourDATFL: "",
      charge: "",
      dateTransmissionBacklog: "",
      dateConfirmationValidation: "",
      dateDemandePlanificationDevTif: "",
      dateRetourEquipes: "",
      dateCommunicationPlanningClient: "",
      nombreSprint: "",
      chargePrevisionnelleParSprint: "",
      dateLivraisonPrevisionnelleTIFParSprint: "",
      dateLivraisonPrevisionnelleClientParSprint: "",
      roadmap: "",
      dateEffectiveLivraisonTIF: "",
      motifsRetardTIF: "",
      dateEffectiveLivraisonClient: "",
      motifsRetardClient: "",
      statutCodage: "",
      statutPresentationDocs: "",
      statutRecette: "",
      statutLivraison: "",
    });

    // Plus de localStorage - tout vient de la base de données

    setEvolutionStep(1);
    setShowEvolutionForm(true);
    setShowSelectionCards(false);
    setDemandeMessage({ type: "", text: "" });
  };

  const handleEvolutionInputChange = (e) => {
    const { name, value } = e.target;
    setEvolutionFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (demandeMessage.text) {
      setDemandeMessage({ type: "", text: "" });
    }
  };

  const handleEvolutionNext = () => {
    if (evolutionStep < 3) {
      setEvolutionStep(evolutionStep + 1);
      setDemandeMessage({ type: "", text: "" });
      scrollToFormTop();
    }
  };

  const handleEvolutionPrevious = () => {
    if (evolutionStep > 1) {
      setEvolutionStep(evolutionStep - 1);
      setDemandeMessage({ type: "", text: "" });
      scrollToFormTop();
    }
  };

  const handleEvolutionCancel = () => {
    setShowEvolutionForm(false);
    setShowSelectionCards(true);
    setEvolutionStep(1);
    setDemandeMessage({ type: "", text: "" });
  };

  const handleEvolutionSubmit = async (e) => {
    e.preventDefault();
    setDemandeMessage({ type: "", text: "" });

    // Sauvegarder comme brouillon (comme le bouton Enregistrer le brouillon)
    await sauvegarderEvolutionBrouillon();

    setDemandeMessage({
      type: "success",
      text: "Brouillon d'évolution enregistré avec succès !",
    });
    chargerLesDemandes();
    setShowEvolutionForm(false);
    setShowSelectionCards(true);
    setEvolutionStep(1);
    setEvolutionFormData({
      dateEnregistrement: new Date().toISOString().split("T")[0],
      societesDemandeurs: [],
      interlocuteur: "",
      nomProjet: "",
      dateReception: "",
      // Étape 1
      dateDemandeMiseAJourDATFL: "",
      dateReponseMiseAJourDATFL: "",
      // Étape 2
      charge: "",
      planningDateDebut: "",
      planningDateFin: "",
      // Étape 3
      dateDemandeDevolution: "",
      dateReponseDevolution: "",
      slt: "",
      aleasNormeParJour: "",
    });
    setTimeout(() => setDemandeMessage({ type: "", text: "" }), 3000);
  };

  const mapLabelToStep = (label) => {
    if (!label) return null;
    const l = label.toLowerCase();
    if (l.includes("clarification")) return 2;
    if (l.includes("planification")) return 3;
    if (l.includes("réalisation") || l.includes("realisation") || l.includes("codage") || l.includes("tif")) return 4;
    if (l.includes("document")) return 5;
    if (l.includes("livraison")) return 6;
    if (l.includes("enregistrement") || l.includes("enreg")) return 1;
    return null;
  };

  // Poursuivre un brouillon via le formulaire multi-étapes
  const handlePoursuivreDemande = (demande) => {
    const fallbackLabel = demande.draftStep
      ? getStepLabel(demande.draftStep)
      : null;
    const stepFromLabel = mapLabelToStep(
      demande.draftStepLabel || fallbackLabel,
    );
    const stepNumeric = Number(demande.draftStep);
    const stepRaw =
      stepFromLabel || (Number.isFinite(stepNumeric) ? stepNumeric : 1);
    const step = Math.min(Math.max(stepRaw, 1), 6);
    setSelectedDemandeType("nouvelle");
    setShowSelectionCards(false);
    setShowNouvelleDemandeForm(true);
    setNouvelleDemandeStep(step);
    setDemandeMessage({ type: "", text: "" });

    setNouvelleDemandeFormData((prev) => {
      const updatedData = {
        ...getNouvelleDemandeInitialState(),
        ...prev,
        ...demande,
        dateEnregistrement: formatDateForInput(
          demande.dateEnregistrement ||
            prev.dateEnregistrement ||
            new Date().toISOString().split("T")[0],
        ),
        demandeur: demande.demandeur || prev.demandeur || "",
        interlocuteurClient:
          demande.interlocuteurClient || prev.interlocuteurClient || "",
        typeProjet: demande.typeProjet || prev.typeProjet || "",
        nomProjet: demande.nomProjet || prev.nomProjet || "",
        descriptionProjet:
          demande.descriptionProjet || prev.descriptionProjet || "",
        descriptionPerimetre:
          demande.descriptionPerimetre || prev.descriptionPerimetre || "",
        statutDemande: demande.statutDemande || prev.statutDemande || "",
        dateReception: formatDateForInput(
          demande.dateReception || prev.dateReception || "",
        ),
        lienIngridCDC: demande.lienIngridCDC || prev.lienIngridCDC || "",
        sprintsData: demande.sprintsData || prev.sprintsData || [],
        statutLivraisonClient: demande.statutLivraison || demande.statutLivraisonClient || prev.statutLivraisonClient || "en attente",
        dateEffectiveLivraisonClient: formatDateForInput(demande.dateEffectiveLivraisonClient || prev.dateEffectiveLivraisonClient || ""),
      };

      console.log("dateReception chargée depuis brouillon:", {
        original: demande.dateReception,
        formatted: updatedData.dateReception,
      });

      return updatedData;
    });

    // Remonter sur le formulaire
    const wrapper = document.querySelector(".content-wrapper");
    if (wrapper) {
      wrapper.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleDeleteDemande = (demande) => {
    setDemandeToDelete(demande);
    setShowDemandeDeleteConfirm(true);
  };

  const confirmDeleteDemande = async () => {
    if (demandeToDelete) {
      const resultat = await supprimerDemande(demandeToDelete.id, user?.id);
      if (resultat.succes) {
        let message = resultat.message;
        if (resultat.statutNettoyage) {
          message +=
            "\n✅ Le statut associé a été nettoyé s'il n'est plus utilisé.";
        }
        setDemandeMessage({ type: "success", text: message });
        chargerLesDemandes();
        // Recharger aussi les statuts pour mettre à jour la liste
        chargerLesStatuts();
        setTimeout(() => setDemandeMessage({ type: "", text: "" }), 4000);
      } else {
        setDemandeMessage({ type: "error", text: resultat.message });
        setTimeout(() => setDemandeMessage({ type: "", text: "" }), 5000);
      }
    }
    setShowDemandeDeleteConfirm(false);
    setDemandeToDelete(null);
  };

  const cancelDeleteDemande = () => {
    setShowDemandeDeleteConfirm(false);
    setDemandeToDelete(null);
  };

  // Fonction helper pour normaliser le type de projet pour la comparaison
  const normalizeTypeProjet = (typeProjet) => {
    if (!typeProjet) return "";
    return String(typeProjet).trim().toLowerCase();
  };

  const getTypeDemandeLabel = (typeProjet) => {
    const t = normalizeTypeProjet(typeProjet);
    if (t === "prospecte") return "Demande prospecte";
    if (t === "evolution") return "Demande d'évolution";
    return "Nouvelle demande";
  };

  const getStepLabel = (step) => {
    const map = {
      1: "Enregistrement",
      2: "Clarification",
      3: "Planification",
      4: "Réalisation",
      5: "Documents",
      6: "Livraison",
    };
    return map[step] || `Étape ${step || ""}`.trim();
  };

  const getTypeDemandeStyle = (typeProjet) => {
    const t = normalizeTypeProjet(typeProjet);
    if (t === "prospecte") {
      return { backgroundColor: "#ff6b35", color: "#ffffff" };
    }
    if (t === "evolution") {
      return { backgroundColor: "#10b981", color: "#ffffff" };
    }
    return { backgroundColor: "#4a90e2", color: "#ffffff" };
  };

  // Gérer la sélection d'une carte
  const handleCardSelect = (type) => {
    setSelectedDemandeType(type === selectedDemandeType ? null : type);
  };

  // Gérer le clic sur "Commencer"
  const handleStartDemande = () => {
    if (!selectedDemandeType) return;

    if (selectedDemandeType === "nouvelle") {
      handleCreateDemande();
    } else if (selectedDemandeType === "prospecte") {
      handleCreateDemandeProspecte();
    } else if (selectedDemandeType === "evolution") {
      handleCreateDemandeEvolution();
    }
  };

  // Types de demandes avec leurs configurations
  const demandeTypes = [
    {
      id: "nouvelle",
      label: "Nouvelle demande",
      icon: "fa-solid fa-plus-circle",
      iconColor: "#4A90E2",
      borderColor: "#4A90E2",
      buttonColor: "#4A90E2",
      description: "Créer une nouvelle demande de développement",
    },
    // {
    //   id: "prospecte",
    //   label: "Demande prospecte",
    //   icon: "fa-solid fa-search",
    //   iconColor: "#FF6B35",
    //   borderColor: "#FF6B35",
    //   buttonColor: "#FF6B35",
    //   description: "Demande pour un projet prospecté",
    // },
    // {
    //   id: "evolution",
    //   label: "Demande d'évolution",
    //   icon: "fa-solid fa-arrow-up",
    //   iconColor: "#10B981",
    //   borderColor: "#10B981",
    //   buttonColor: "#10B981",
    //   description: "Demande d'amélioration ou d'évolution",
    // },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestion des Demandes</h1>
        <p>Gérez les demandes de développement </p>
      </div>

      <div className="page-content">
        {/* Interface de sélection par cartes (visible uniquement si permission créer) */}
        {showSelectionCards && peutCreerDemande && (
          <div className="demandes-selection-container">
            <div className="demandes-cards-grid">
              {(demandeTypes || []).map((type) => {
                const isSelected = selectedDemandeType === type.id;
                return (
                  <div
                    key={type.id}
                    className={`demande-selection-card demande-card-${
                      type.id
                    } ${isSelected ? "selected" : ""}`}
                    onClick={() => handleCardSelect(type.id)}
                    style={{
                      borderColor: isSelected ? type.borderColor : "#e5e7eb",
                    }}
                  >
                    <div
                      className="card-checkbox"
                      style={{
                        background: isSelected ? type.borderColor : "white",
                        borderColor: isSelected ? type.borderColor : "#9ca3af",
                      }}
                    ></div>
                    <div className="card-icon">
                      <i
                        className={type.icon}
                        style={{ color: type.iconColor }}
                      ></i>
                    </div>
                    <p
                      className="card-text"
                      style={{
                        color: isSelected ? type.borderColor : "#1a1a1a",
                      }}
                    >
                      {type.label}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="demande-selection-actions">
              <button
                className="demande-selection-button"
                onClick={handleStartDemande}
                disabled={!selectedDemandeType}
                style={{
                  background: selectedDemandeType
                    ? `linear-gradient(135deg, ${
                        demandeTypes.find((t) => t.id === selectedDemandeType)
                          ?.buttonColor || "#4A90E2"
                      } 0%, ${
                        demandeTypes.find((t) => t.id === selectedDemandeType)
                          ?.buttonColor || "#4A90E2"
                      }dd 100%)`
                    : "#9ca3af",
                  boxShadow: selectedDemandeType
                    ? `0 4px 12px rgba(${
                        selectedDemandeType === "nouvelle"
                          ? "74, 144, 226"
                          : selectedDemandeType === "prospecte"
                            ? "255, 107, 53"
                            : "16, 185, 129"
                      }, 0.3)`
                    : "none",
                }}
              >
                Commencer
              </button>
            </div>
          </div>
        )}

        {/* Formulaire multi-étapes "Nouvelle demande" */}
        {showNouvelleDemandeForm && (
          <div
            className="nouvelle-demande-form-container"
            style={{
              maxWidth: "1200px",
              margin: "0 auto 32px auto",
              padding: "32px",
              backgroundColor: "#f8fafc",
              borderRadius: "16px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Indicateur de progression des étapes */}
            <div
              className="steps-indicator"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "40px",
                padding: "0 20px",
                position: "relative",
              }}
            >
              {[
                { num: 1, label: "Enregistrement" },
                { num: 2, label: "Clarification" },
                { num: 3, label: "Planification" },
                { num: 4, label: "Réalisation" },
                { num: 5, label: "Documents" },
                { num: 6, label: "Livraison" },
              ].map((step, index) => (
                <div
                  key={step.num}
                  onClick={() => step.num <= nouvelleDemandeStep && setNouvelleDemandeStep(step.num)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    zIndex: 1,
                    cursor: step.num <= nouvelleDemandeStep ? "pointer" : "default",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor:
                        nouvelleDemandeStep >= step.num ? "#4A90E2" : "#e5e7eb",
                      color:
                        nouvelleDemandeStep >= step.num ? "white" : "#6b7280",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      marginBottom: "8px",
                      transition: "all 0.3s ease",
                      border:
                        nouvelleDemandeStep === step.num
                          ? "3px solid #357ABD"
                          : "none",
                      boxShadow:
                        nouvelleDemandeStep === step.num
                          ? "0 0 0 4px rgba(74, 144, 226, 0.2)"
                          : "none",
                    }}
                  >
                    {step.num}
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      color:
                        nouvelleDemandeStep >= step.num ? "#4A90E2" : "#6b7280",
                      fontWeight:
                        nouvelleDemandeStep >= step.num ? "600" : "400",
                      textAlign: "center",
                    }}
                  >
                    {step.label}
                  </span>
                  {index < 5 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "24px",
                        left: "calc(50% + 24px)",
                        width: "calc(100% - 96px)",
                        height: "3px",
                        backgroundColor:
                          nouvelleDemandeStep > step.num
                            ? "#4A90E2"
                            : "#e5e7eb",
                        zIndex: 0,
                        transition: "all 0.3s ease",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Formulaire selon l'étape */}
            <form autoComplete="off" onSubmit={handleNouvelleDemandeSubmit}>
              {demandeMessage.text && (
                <div
                  className={`info-box ${
                    demandeMessage.type === "error"
                      ? "error-box"
                      : "success-box"
                  }`}
                  style={{
                    marginBottom: "24px",
                    padding: "12px",
                    borderRadius: "6px",
                    backgroundColor:
                      demandeMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                    border: `1px solid ${
                      demandeMessage.type === "error" ? "#fecaca" : "#a7f3d0"
                    }`,
                    color:
                      demandeMessage.type === "error" ? "#991b1b" : "#065f46",
                  }}
                >
                  <p style={{ margin: 0 }}>{demandeMessage.text}</p>
                </div>
              )}

              <div
                className="form-step-content"
                style={{
                  backgroundColor: "white",
                  padding: "40px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                  minHeight: nouvelleDemandeStep === 1 ? "500px" : "auto",
                }}
              >
                {/* Étape 1: Enregistrement de la demande */}
                {nouvelleDemandeStep === 1 && (
                  <div>
                    <h3
                      style={{
                        marginBottom: "32px",
                        color: "#1a1a1a",
                        fontSize: "24px",
                        fontWeight: "600",
                      }}
                    >
                      1. Enregistrement de la demande
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "24px",
                      }}
                    >
                      <div className="form-group">
                        <label>
                          Date d'enregistrement
                        </label>
                        <input
                          type="date"
                          name="dateEnregistrement"
                          value={formatDateForInput(
                            nouvelleDemandeFormData.dateEnregistrement,
                          )}
                          onChange={handleNouvelleDemandeInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Société demandeur
                        </label>
                        <select
                          name="societesDemandeurs"
                          value={
                            nouvelleDemandeFormData.societesDemandeurs?.[0] ||
                            ""
                          }
                          onChange={(e) => {
                            const selectedSociete = societes.find(
                              (s) => s.id.toString() === e.target.value,
                            );
                            setNouvelleDemandeFormData((prev) => ({
                              ...prev,
                              societesDemandeurs: e.target.value
                                ? [e.target.value]
                                : [],
                              societesDemandeursNames:
                                e.target.value && selectedSociete
                                  ? [selectedSociete.nom]
                                  : [],
                            }));
                            if (demandeMessage.text) {
                              setDemandeMessage({ type: "", text: "" });
                            }
                          }}
                          required
                        >
                          <option value="">
                            -- Sélectionner une société --
                          </option>
                          {societes.length === 0 && (
                            <option value="" disabled>
                              Aucune société disponible (ajoutez-en dans
                              Paramétrage)
                            </option>
                          )}
                          {(societes || []).map((societe) => (
                            <option
                              key={societe.id}
                              value={societe.id.toString()}
                            >
                              {societe.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>
                          L'interlocuteur
                        </label>
                        <select
                          name="interlocuteurClient"
                          value={nouvelleDemandeFormData.interlocuteurClient}
                          onChange={handleNouvelleDemandeInputChange}
                          required
                        >
                          <option value="">Sélectionner un interlocuteur</option>
                          {interlocuteurs.map((interlocuteur) => (
                            <option key={interlocuteur.id} value={interlocuteur.nom}>
                              {interlocuteur.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>
                          Type de projet
                        </label>
                        <select
                          name="typeProjet"
                          value={nouvelleDemandeFormData.typeProjet}
                          onChange={handleNouvelleDemandeInputChange}
                          required
                        >
                          <option value="">-- Choisir un type --</option>
                          <option value="Agile">Agile</option>
                          <option value="Classique">Classique</option>
                        </select>
                      </div>
                      <div
                        className="form-group"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <label>
                          Nom du projet / Applicatif
                        </label>
                        <input
                          type="text"
                          name="nomProjet"
                          value={nouvelleDemandeFormData.nomProjet}
                          onChange={handleNouvelleDemandeInputChange}
                          placeholder="Nom du projet"
                          required
                        />
                      </div>
                      <div
                        className="form-group"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <label>
                          Description du projet
                        </label>
                        <textarea
                          name="descriptionProjet"
                          value={nouvelleDemandeFormData.descriptionProjet}
                          onChange={handleNouvelleDemandeInputChange}
                          rows={4}
                          placeholder="Décrivez le projet..."
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Périmètre
                        </label>
                        <input
                          type="text"
                          name="descriptionPerimetre"
                          value={nouvelleDemandeFormData.descriptionPerimetre}
                          onChange={handleNouvelleDemandeInputChange}
                          placeholder="Saisir le périmètre de la demande..."
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Statut de la demande
                        </label>
                        <select
                          name="statutDemande"
                          value={nouvelleDemandeFormData.statutDemande}
                          onChange={handleNouvelleDemandeInputChange}
                          required
                        >
                          <option value="">Sélectionnez un statut</option>
                          {statutsDisponibles
                            .filter((statut) => statut.actif)
                            .map((statut) => (
                              <option key={statut.id} value={statut.nom}>
                                {statut.nom}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>
                          Date de réception de la demande
                        </label>
                        <input
                          type="date"
                          name="dateReception"
                          value={formatDateForInput(
                            nouvelleDemandeFormData.dateReception,
                          )}
                          onChange={handleNouvelleDemandeInputChange}
                          required
                        />
                      </div>
                      <div
                        className="form-group"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <label>
                          Enregistrement du lien INGRID du CDC
                        </label>
                        <input
                          type="url"
                          name="lienIngridCDC"
                          value={nouvelleDemandeFormData.lienIngridCDC}
                          onChange={handleNouvelleDemandeInputChange}
                          placeholder="https://ingrid.example.com/..."
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Étape 2: Clarification de la demande */}
                {nouvelleDemandeStep === 2 && (
                  <div>
                    <h3
                      style={{
                        marginBottom: "24px",
                        color: "#1a1a1a",
                        fontSize: "24px",
                        fontWeight: "600",
                      }}
                    >
                      2. Clarification de la demande
                    </h3>

                    {/* Dates sur 2 colonnes */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>
                          Date de transmission du backlog <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="date"
                          name="dateTransmissionBacklog"
                          value={nouvelleDemandeFormData.dateTransmissionBacklog}
                          onChange={handleNouvelleDemandeInputChange}
                          required
                          style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>
                          Date de confirmation de validation <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="date"
                          name="dateConfirmationValidation"
                          value={nouvelleDemandeFormData.dateConfirmationValidation}
                          onChange={handleNouvelleDemandeInputChange}
                          required
                          style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    {/* Lien CDC pleine largeur */}
                    <div className="form-group" style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>
                        Lien Ingrid CDC
                      </label>
                      <input
                        type="text"
                        name="lienIngridCDC"
                        value={nouvelleDemandeFormData.lienIngridCDC || ""}
                        onChange={handleNouvelleDemandeInputChange}
                        placeholder="URL du Cahier Des Charges dans Ingrid..."
                        style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    </div>

                    {/* Zone de commentaires pour remplir l'espace */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>
                        Observations / Commentaires
                      </label>
                      <textarea
                        name="descriptionPerimetre"
                        value={nouvelleDemandeFormData.descriptionPerimetre || ""}
                        onChange={handleNouvelleDemandeInputChange}
                        placeholder="Notez ici les observations issues de la clarification, les points à préciser, les décisions prises..."
                        rows={6}
                        style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                )}

                {/* Étape 3: Planification du périmètre */}
                {nouvelleDemandeStep === 3 && (
                  <div>
                    <h3
                      style={{
                        marginBottom: "32px",
                        color: "#1a1a1a",
                        fontSize: "24px",
                        fontWeight: "600",
                      }}
                    >
                      3. Planification du périmètre
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "24px",
                      }}
                    >
                      <div className="form-group">
                        <label>Date de demande de planification DEV</label>
                        <input
                          type="date"
                          name="dateDemandePlanificationDev"
                          value={nouvelleDemandeFormData.dateDemandePlanificationDev}
                          onChange={handleNouvelleDemandeInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Date de demande de planification TIF</label>
                        <input
                          type="date"
                          name="dateDemandePlanificationTif"
                          value={nouvelleDemandeFormData.dateDemandePlanificationTif}
                          onChange={handleNouvelleDemandeInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Date du retour des équipes DEV</label>
                        <input
                          type="date"
                          name="dateRetourEquipesDev"
                          value={nouvelleDemandeFormData.dateRetourEquipesDev}
                          onChange={handleNouvelleDemandeInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Date du retour des équipes TIF</label>
                        <input
                          type="date"
                          name="dateRetourEquipesTif"
                          value={nouvelleDemandeFormData.dateRetourEquipesTif}
                          onChange={handleNouvelleDemandeInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Date de communication du planning au client
                        </label>
                        <input
                          type="date"
                          name="dateCommunicationPlanningClient"
                          value={
                            nouvelleDemandeFormData.dateCommunicationPlanningClient
                          }
                          onChange={handleNouvelleDemandeInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Nombre de sprint pour le périmètre
                        </label>
                        <input
                          type="number"
                          name="nombreSprint"
                          value={nouvelleDemandeFormData.nombreSprint}
                          onChange={handleNouvelleDemandeInputChange}
                          min="1"
                          placeholder="Ex: 3"
                          required
                        />
                      </div>
                    </div>

                    {/* Tableau de planification par sprint */}
                    {parseInt(nouvelleDemandeFormData.nombreSprint) > 0 && (
                      <div style={{ marginTop: "32px" }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", marginBottom: "16px" }}>
                          Planification par sprint
                        </h4>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "900px" }}>
                            <thead>
                              <tr style={{ backgroundColor: "#f3f4f6" }}>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Sprint</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600" }}>Chantiers</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Date Prév. TIF</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Date Liv. Effect. TIF</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Date Livraison Prév.</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Date Livraison Effect.</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600" }}>Charges (j/h)</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Nb Fonctionnalités</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: parseInt(nouvelleDemandeFormData.nombreSprint) }, (_, i) => {
                                const sprintData = (nouvelleDemandeFormData.sprintsData || [])[i] || {};
                                const retardTIF = sprintData.datePrevTIF && sprintData.dateEffTIF && sprintData.dateEffTIF > sprintData.datePrevTIF;
                                const retardClient = sprintData.datePrevClient && sprintData.dateEffClient && sprintData.dateEffClient > sprintData.datePrevClient;
                                return (
                                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "8px", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap", color: "#374151" }}>
                                      Sprint {i + 1}
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input
                                        type="text"
                                        value={sprintData.chantier || ""}
                                        onChange={(e) => handleSprintDataChange(i, "chantier", e.target.value)}
                                        placeholder="Nom du chantier..."
                                        style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input
                                        type="date"
                                        value={sprintData.datePrevTIF || ""}
                                        onChange={(e) => handleSprintDataChange(i, "datePrevTIF", e.target.value)}
                                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", background: retardTIF ? "#fff7ed" : undefined }}>
                                      <input
                                        type="date"
                                        value={sprintData.dateEffTIF || ""}
                                        onChange={(e) => handleSprintDataChange(i, "dateEffTIF", e.target.value)}
                                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                      {retardTIF && (
                                        <div style={{ marginTop: "4px" }}>
                                          <textarea
                                            value={sprintData.motifRetardTIF || ""}
                                            onChange={(e) => handleSprintDataChange(i, "motifRetardTIF", e.target.value)}
                                            placeholder="Motif du retard TIF..."
                                            rows={2}
                                            style={{ width: "100%", fontSize: "12px", border: "1px solid #fed7aa", borderRadius: "4px", padding: "4px", resize: "vertical", background: "#fff7ed" }}
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input
                                        type="date"
                                        value={sprintData.datePrevClient || ""}
                                        onChange={(e) => handleSprintDataChange(i, "datePrevClient", e.target.value)}
                                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", background: retardClient ? "#fff7ed" : undefined }}>
                                      <input
                                        type="date"
                                        value={sprintData.dateEffClient || ""}
                                        onChange={(e) => handleSprintDataChange(i, "dateEffClient", e.target.value)}
                                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                      {retardClient && (
                                        <div style={{ marginTop: "4px" }}>
                                          <textarea
                                            value={sprintData.motifRetardClient || ""}
                                            onChange={(e) => handleSprintDataChange(i, "motifRetardClient", e.target.value)}
                                            placeholder="Motif du retard client..."
                                            rows={2}
                                            style={{ width: "100%", fontSize: "12px", border: "1px solid #fed7aa", borderRadius: "4px", padding: "4px", resize: "vertical", background: "#fff7ed" }}
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input
                                        type="number"
                                        value={sprintData.charges || ""}
                                        onChange={(e) => handleSprintDataChange(i, "charges", e.target.value)}
                                        min="0"
                                        placeholder="0"
                                        style={{ width: "70px", border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input
                                        type="number"
                                        value={sprintData.nbFonctionnalites || ""}
                                        onChange={(e) => handleSprintDataChange(i, "nbFonctionnalites", e.target.value)}
                                        min="0"
                                        placeholder="0"
                                        style={{ width: "70px", border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Roadmap — Vue Gantt */}
                    {parseInt(nouvelleDemandeFormData.nombreSprint) > 0 && (() => {
                      const sprints = Array.from({ length: parseInt(nouvelleDemandeFormData.nombreSprint) }, (_, i) => ({
                        num: i + 1,
                        ...((nouvelleDemandeFormData.sprintsData || [])[i] || {}),
                      }));
                      const allDates = sprints.flatMap((s) =>
                        [s.datePrevTIF, s.dateEffTIF, s.datePrevClient, s.dateEffClient].filter(Boolean)
                      );
                      if (allDates.length < 2) return (
                        <div style={{ marginTop: "32px" }}>
                          <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", marginBottom: "12px" }}>Roadmap — Vue Gantt</h4>
                          <div style={{ padding: "20px", background: "#f9fafb", borderRadius: "8px", color: "#9ca3af", textAlign: "center", border: "1px dashed #d1d5db" }}>
                            Renseignez des dates dans le tableau ci-dessus pour afficher la vue Gantt
                          </div>
                        </div>
                      );
                      const minTs = Math.min(...allDates.map((d) => new Date(d).getTime()));
                      const maxTs = Math.max(...allDates.map((d) => new Date(d).getTime()));
                      const totalMs = maxTs - minTs || 1;
                      const toPercent = (dateStr) => {
                        if (!dateStr) return null;
                        return Math.max(0, Math.min(100, ((new Date(dateStr).getTime() - minTs) / totalMs) * 100));
                      };
                      return (
                        <div style={{ marginTop: "32px" }}>
                          <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", marginBottom: "12px" }}>Roadmap — Vue Gantt</h4>
                          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", color: "#6b7280" }}>
                              <span>{formatDateForDisplay(new Date(minTs).toISOString())}</span>
                              <span>{formatDateForDisplay(new Date(maxTs).toISOString())}</span>
                            </div>
                            {sprints.map((sprint, i) => {
                              const pTIF = toPercent(sprint.datePrevTIF);
                              const pClient = toPercent(sprint.datePrevClient);
                              const eTIF = toPercent(sprint.dateEffTIF);
                              const eClient = toPercent(sprint.dateEffClient);
                              return (
                                <div key={i} style={{ marginBottom: "12px" }}>
                                  <div style={{ fontSize: "12px", color: "#374151", marginBottom: "3px", fontWeight: "500" }}>
                                    Sprint {sprint.num}{sprint.chantier ? ` — ${sprint.chantier}` : ""}
                                  </div>
                                  <div style={{ position: "relative", height: "24px", background: "#f3f4f6", borderRadius: "6px", overflow: "hidden" }}>
                                    {pTIF !== null && pClient !== null && (
                                      <div style={{
                                        position: "absolute",
                                        left: `${Math.min(pTIF, pClient)}%`,
                                        width: `${Math.max(1, Math.abs(pClient - pTIF))}%`,
                                        height: "100%",
                                        background: "#3b82f6",
                                        borderRadius: "4px",
                                        opacity: 0.75,
                                      }} title={`Planifié TIF→Client`} />
                                    )}
                                    {eTIF !== null && eClient !== null && (
                                      <div style={{
                                        position: "absolute",
                                        left: `${Math.min(eTIF, eClient)}%`,
                                        width: `${Math.max(1, Math.abs(eClient - eTIF))}%`,
                                        height: "60%",
                                        top: "20%",
                                        background: "#10b981",
                                        borderRadius: "4px",
                                        opacity: 0.9,
                                      }} title={`Réalisé TIF→Client`} />
                                    )}
                                    {pTIF !== null && (
                                      <div style={{ position: "absolute", left: `${pTIF}%`, top: 0, bottom: 0, width: "2px", background: "#1d4ed8", opacity: 0.6 }} title="Date prév. TIF" />
                                    )}
                                    {pClient !== null && (
                                      <div style={{ position: "absolute", left: `${pClient}%`, top: 0, bottom: 0, width: "2px", background: "#1d4ed8", opacity: 0.6 }} title="Date livraison prév." />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "12px", color: "#6b7280" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <div style={{ width: "14px", height: "8px", background: "#3b82f6", borderRadius: "2px", opacity: 0.75 }} />
                                <span>Planifié</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <div style={{ width: "14px", height: "8px", background: "#10b981", borderRadius: "2px" }} />
                                <span>Réalisé</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Étape 4: Réalisation – Codage + TIF */}
                {nouvelleDemandeStep === 4 && (
                  <div>
                    <h3 style={{ marginBottom: "32px", color: "#1a1a1a", fontSize: "24px", fontWeight: "600" }}>
                      4. Réalisation – Statut (Codage + TIF)
                    </h3>

                    {/* Statuts Codage + TIF */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "600px" }}>
                      <div className="form-group">
                        <label>Statut Codage</label>
                        <select
                          name="statutCodage"
                          value={nouvelleDemandeFormData.statutCodage}
                          onChange={handleNouvelleDemandeInputChange}
                        >
                          <option value="en attente">En attente</option>
                          <option value="en cours">En cours</option>
                          <option value="terminé">Terminé</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Statut TIF</label>
                        <select
                          name="statutTIF"
                          value={nouvelleDemandeFormData.statutTIF}
                          onChange={handleNouvelleDemandeInputChange}
                        >
                          <option value="en attente">En attente</option>
                          <option value="en cours">En cours</option>
                          <option value="terminé">Terminé</option>
                        </select>
                      </div>
                    </div>

                    {/* Suivi des sprints */}
                    {parseInt(nouvelleDemandeFormData.nombreSprint) > 0 && (
                      <div style={{ marginTop: "32px" }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", marginBottom: "16px" }}>
                          Suivi des sprints
                        </h4>

                        {/* Avancement global calculé */}
                        {(() => {
                          const total = parseInt(nouvelleDemandeFormData.nombreSprint) || 0;
                          const sprints = nouvelleDemandeFormData.sprintsData || [];
                          const termines = sprints.filter((s) => s.statutSprint === "terminé").length;
                          const enCours = sprints.findIndex((s) => s.statutSprint === "en cours");
                          const pct = total > 0 ? Math.round((termines / total) * 100) : 0;
                          return (
                            <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "20px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                              <div>
                                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Avancement global</div>
                                <div style={{ fontSize: "24px", fontWeight: "700", color: pct === 100 ? "#10b981" : "#3b82f6" }}>{pct}%</div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ height: "12px", background: "#e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#10b981" : "#3b82f6", borderRadius: "6px", transition: "width 0.4s ease" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "12px", color: "#6b7280" }}>
                                  <span>{termines} sprint{termines > 1 ? "s" : ""} terminé{termines > 1 ? "s" : ""}</span>
                                  <span>{total - termines} restant{total - termines > 1 ? "s" : ""}</span>
                                </div>
                              </div>
                              {enCours >= 0 && (
                                <div style={{ padding: "6px 12px", background: "#dbeafe", color: "#1d4ed8", borderRadius: "20px", fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap" }}>
                                  Sprint {enCours + 1} en cours
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                              <tr style={{ backgroundColor: "#f3f4f6" }}>
                                <th style={{ padding: "10px 12px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600" }}>Sprint</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600" }}>Chantier</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600" }}>Statut</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600" }}>Avancement (%)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: parseInt(nouvelleDemandeFormData.nombreSprint) }, (_, i) => {
                                const sprintData = (nouvelleDemandeFormData.sprintsData || [])[i] || {};
                                const isEnCours = sprintData.statutSprint === "en cours";
                                const isTermine = sprintData.statutSprint === "terminé";
                                return (
                                  <tr key={i} style={{ backgroundColor: isEnCours ? "#eff6ff" : isTermine ? "#f0fdf4" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "10px 12px", border: "1px solid #e5e7eb", fontWeight: "600", color: isEnCours ? "#1d4ed8" : "#374151" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        {isEnCours && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />}
                                        {isTermine && <span style={{ color: "#10b981" }}>✓</span>}
                                        Sprint {i + 1}
                                      </div>
                                    </td>
                                    <td style={{ padding: "10px 12px", border: "1px solid #e5e7eb", color: "#6b7280" }}>
                                      {sprintData.chantier || "—"}
                                    </td>
                                    <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>
                                      <select
                                        value={sprintData.statutSprint || "en attente"}
                                        onChange={(e) => handleSprintDataChange(i, "statutSprint", e.target.value)}
                                        style={{ fontSize: "13px", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", background: "white" }}
                                      >
                                        <option value="en attente">En attente</option>
                                        <option value="en cours">En cours</option>
                                        <option value="terminé">Terminé</option>
                                      </select>
                                    </td>
                                    <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <input
                                          type="number"
                                          value={sprintData.avancement || ""}
                                          onChange={(e) => handleSprintDataChange(i, "avancement", e.target.value)}
                                          min="0"
                                          max="100"
                                          placeholder="0"
                                          style={{ width: "60px", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px" }}
                                        />
                                        <span style={{ color: "#6b7280" }}>%</span>
                                        {sprintData.avancement > 0 && (
                                          <div style={{ flex: 1, height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${Math.min(100, sprintData.avancement)}%`, background: sprintData.avancement >= 100 ? "#10b981" : "#3b82f6", borderRadius: "3px" }} />
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Étape 5: Présentation des documents */}
                {nouvelleDemandeStep === 5 && (
                  <div>
                    <h3
                      style={{
                        marginBottom: "32px",
                        color: "#1a1a1a",
                        fontSize: "24px",
                        fontWeight: "600",
                      }}
                    >
                      5. Présentation des documents
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: "24px",
                      }}
                    >
                      <div className="form-group">
                        <label>
                          Présentation de kickoff - Lien INGRID
                        </label>
                        <input
                          type="url"
                          name="lienIngridKickoff"
                          value={nouvelleDemandeFormData.lienIngridKickoff}
                          onChange={handleNouvelleDemandeInputChange}
                          placeholder="https://ingrid.example.com/..."
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Rédaction des points de contrôles (TIF) - Lien INGRID
                        </label>
                        <input
                          type="url"
                          name="lienIngridPointsControleTIF"
                          value={
                            nouvelleDemandeFormData.lienIngridPointsControleTIF
                          }
                          onChange={handleNouvelleDemandeInputChange}
                          placeholder="https://ingrid.example.com/..."
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Rédaction du signoff document - Lien INGRID
                        </label>
                        <input
                          type="url"
                          name="lienIngridSignoff"
                          value={nouvelleDemandeFormData.lienIngridSignoff}
                          onChange={handleNouvelleDemandeInputChange}
                          placeholder="https://ingrid.example.com/..."
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Étape 6: Livraison effective au client */}
                {nouvelleDemandeStep === 6 && (
                  <div>
                    <h3 style={{ marginBottom: "32px", color: "#1a1a1a", fontSize: "24px", fontWeight: "600" }}>
                      6. Livraison effective au client
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "600px" }}>
                      <div className="form-group">
                        <label>Date effective de livraison au client</label>
                        <input
                          type="date"
                          name="dateEffectiveLivraisonClient"
                          value={nouvelleDemandeFormData.dateEffectiveLivraisonClient}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNouvelleDemandeFormData((prev) => ({
                              ...prev,
                              dateEffectiveLivraisonClient: val,
                              statutLivraisonClient: val ? "livré au client" : prev.statutLivraisonClient,
                            }));
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Statut livraison</label>
                        <select
                          name="statutLivraisonClient"
                          value={nouvelleDemandeFormData.statutLivraisonClient}
                          onChange={handleNouvelleDemandeInputChange}
                        >
                          <option value="en attente">En attente</option>
                          <option value="en cours">En cours</option>
                          <option value="livré au client">Livré au client</option>
                        </select>
                      </div>
                    </div>
                    {nouvelleDemandeFormData.dateEffectiveLivraisonClient && (
                      <div style={{ marginTop: "16px", padding: "12px 16px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", color: "#15803d", fontSize: "14px" }}>
                        <span style={{ fontSize: "18px" }}>✓</span>
                        <span>Livraison effectuée le <strong>{formatDateForDisplay(nouvelleDemandeFormData.dateEffectiveLivraisonClient)}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Boutons de navigation */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: nouvelleDemandeStep === 1 ? "32px" : "16px",
                  paddingTop: "16px",
                  borderTop: "2px solid #e5e7eb",
                }}
              >
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleNouvelleDemandeCancel}
                  >
                    ← Retour à la page principale
                  </button>
                  {nouvelleDemandeStep > 1 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleNouvelleDemandePrevious}
                    >
                      ← Retour
                    </button>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => sauvegarderNouvelleDemandeBrouillon()}
                  >
                    Enregistrer le brouillon
                  </button>
                  {nouvelleDemandeStep < 6 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleNouvelleDemandeNext}
                    >
                      Suivant &rarr;
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleTerminerDemande}
                    >
                      Terminer
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Formulaire "Demande prospecte" - 1 étape simple */}
        {showProspecteForm && (
          <div
            className="nouvelle-demande-form-container"
            style={{
              maxWidth: "800px",
              margin: "0 auto 32px auto",
              padding: "32px",
              backgroundColor: "#f8fafc",
              borderRadius: "16px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h2
              style={{
                marginBottom: "32px",
                color: "#FF6B35",
                fontSize: "28px",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Demande Prospecte
            </h2>

            <form autoComplete="off" onSubmit={handleProspecteSubmit}>
              {demandeMessage.text && (
                <div
                  className={`info-box ${
                    demandeMessage.type === "error"
                      ? "error-box"
                      : "success-box"
                  }`}
                  style={{
                    marginBottom: "24px",
                    padding: "12px",
                    borderRadius: "6px",
                    backgroundColor:
                      demandeMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                    border: `1px solid ${
                      demandeMessage.type === "error" ? "#fecaca" : "#a7f3d0"
                    }`,
                    color:
                      demandeMessage.type === "error" ? "#991b1b" : "#065f46",
                  }}
                >
                  <p style={{ margin: 0 }}>{demandeMessage.text}</p>
                </div>
              )}

              <div
                className="form-step-content"
                style={{
                  backgroundColor: "white",
                  padding: "40px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "24px",
                  }}
                >
                  <div className="form-group">
                    <label>
                      Date d'enregistrement <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      name="dateEnregistrement"
                      value={formatDateForInput(
                        prospecteFormData.dateEnregistrement,
                      )}
                      onChange={handleProspecteInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Date de réception <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      name="dateReception"
                      value={formatDateForInput(
                        prospecteFormData.dateReception,
                      )}
                      onChange={handleProspecteInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Société demandeur
                    </label>
                    <select
                      name="societesDemandeurs"
                      value={prospecteFormData.societesDemandeurs?.[0] || ""}
                      onChange={(e) => {
                        setProspecteFormData((prev) => ({
                          ...prev,
                          societesDemandeurs: e.target.value
                            ? [e.target.value]
                            : [],
                        }));
                        if (demandeMessage.text) {
                          setDemandeMessage({ type: "", text: "" });
                        }
                      }}
                      required
                    >
                      <option value="">-- Sélectionner une société --</option>
                      {societes.length === 0 && (
                        <option value="" disabled>
                          Aucune société disponible (ajoutez-en dans
                          Paramétrage)
                        </option>
                      )}
                      {(societes || []).map((societe) => (
                        <option key={societe.id} value={societe.id.toString()}>
                          {societe.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      Interlocuteur <span className="required">*</span>
                    </label>
                    <select
                      name="interlocuteur"
                      value={prospecteFormData.interlocuteur}
                      onChange={handleProspecteInputChange}
                      required
                    >
                      <option value="">
                        -- Sélectionner un interlocuteur --
                      </option>
                      {(collaborateurs || []).map((collab) => (
                        <option
                          key={collab.id}
                          value={collab.nom}
                        >
                          {collab.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label>
                      Nom du projet <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="nomProjet"
                      value={prospecteFormData.nomProjet}
                      onChange={handleProspecteInputChange}
                      placeholder="Nom du projet"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Périmètre
                    </label>
                    <select
                      name="descriptionPerimetre"
                      value={prospecteFormData.descriptionPerimetre}
                      onChange={handleProspecteInputChange}
                      required
                    >
                      <option value="">-- Sélectionnez un périmètre --</option>
                      {(perimetreOptions || []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "32px",
                  paddingTop: "24px",
                  borderTop: "2px solid #e5e7eb",
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleProspecteCancel}
                >
                  ← Retour à la page principale
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => sauvegarderProspecteBrouillon()}
                >
                  Enregistrer le brouillon
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    background:
                      "linear-gradient(135deg, #FF6B35 0%, #FF6B35dd 100%)",
                    boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
                  }}
                >
                  Créer la demande prospecte
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulaire "Demande d'évolution" - 3 étapes */}
        {showEvolutionForm && (
          <div
            className="nouvelle-demande-form-container"
            style={{
              maxWidth: "1200px",
              margin: "0 auto 32px auto",
              padding: "32px",
              backgroundColor: "#f8fafc",
              borderRadius: "16px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Indicateur de progression des étapes */}
            <div
              className="steps-indicator"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "40px",
                padding: "0 20px",
                position: "relative",
              }}
            >
              {[
                { num: 1, label: "Info demande" },
                { num: 2, label: "DATFL" },
                { num: 3, label: "Planning & SLT" },
              ].map((step, index) => (
                <div
                  key={step.num}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor:
                        evolutionStep >= step.num ? "#10B981" : "#e5e7eb",
                      color: evolutionStep >= step.num ? "white" : "#6b7280",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      marginBottom: "8px",
                      transition: "all 0.3s ease",
                      border:
                        evolutionStep === step.num
                          ? "3px solid #059669"
                          : "none",
                      boxShadow:
                        evolutionStep === step.num
                          ? "0 0 0 4px rgba(16, 185, 129, 0.2)"
                          : "none",
                    }}
                  >
                    {step.num}
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      color: evolutionStep >= step.num ? "#10B981" : "#6b7280",
                      fontWeight: evolutionStep >= step.num ? "600" : "400",
                      textAlign: "center",
                    }}
                  >
                    {step.label}
                  </span>
                  {index < 2 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "24px",
                        left: "calc(50% + 24px)",
                        width: "calc(100% - 96px)",
                        height: "3px",
                        backgroundColor:
                          evolutionStep > step.num ? "#10B981" : "#e5e7eb",
                        zIndex: 0,
                        transition: "all 0.3s ease",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <form autoComplete="off" onSubmit={handleEvolutionSubmit}>
              {demandeMessage.text && (
                <div
                  className={`info-box ${
                    demandeMessage.type === "error"
                      ? "error-box"
                      : "success-box"
                  }`}
                  style={{
                    marginBottom: "24px",
                    padding: "12px",
                    borderRadius: "6px",
                    backgroundColor:
                      demandeMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                    border: `1px solid ${
                      demandeMessage.type === "error" ? "#fecaca" : "#a7f3d0"
                    }`,
                    color:
                      demandeMessage.type === "error" ? "#991b1b" : "#065f46",
                  }}
                >
                  <p style={{ margin: 0 }}>{demandeMessage.text}</p>
                </div>
              )}

              <div
                className="form-step-content"
                style={{
                  backgroundColor: "white",
                  padding: "40px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                  minHeight: "400px",
                }}
              >
                {/* Étape 1: Info demande */}
                {evolutionStep === 1 && (
                  <div>
                    <h3
                      style={{
                        marginBottom: "32px",
                        color: "#1a1a1a",
                        fontSize: "24px",
                        fontWeight: "600",
                      }}
                    >
                      1. Informations de la demande
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "24px",
                      }}
                    >
                      <div className="form-group">
                        <label>
                          Date d'enregistrement
                        </label>
                        <input
                          type="date"
                          name="dateEnregistrement"
                          value={formatDateForInput(
                            evolutionFormData.dateEnregistrement,
                          )}
                          onChange={handleEvolutionInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Date de réception <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          name="dateReception"
                          value={formatDateForInput(
                            evolutionFormData.dateReception,
                          )}
                          onChange={handleEvolutionInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Société demandeur
                        </label>
                        <select
                          name="societesDemandeurs"
                          value={
                            evolutionFormData.societesDemandeurs?.[0] || ""
                          }
                          onChange={(e) => {
                            setEvolutionFormData((prev) => ({
                              ...prev,
                              societesDemandeurs: e.target.value
                                ? [e.target.value]
                                : [],
                            }));
                            if (demandeMessage.text) {
                              setDemandeMessage({ type: "", text: "" });
                            }
                          }}
                          required
                        >
                          <option value="">
                            -- Sélectionner une société --
                          </option>
                          {societes.length === 0 && (
                            <option value="" disabled>
                              Aucune société disponible (ajoutez-en dans
                              Paramétrage)
                            </option>
                          )}
                          {(societes || []).map((societe) => (
                            <option
                              key={societe.id}
                              value={societe.id.toString()}
                            >
                              {societe.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>
                          Interlocuteur <span className="required">*</span>
                        </label>
                        <select
                          name="interlocuteur"
                          value={evolutionFormData.interlocuteur}
                          onChange={handleEvolutionInputChange}
                          required
                        >
                          <option value="">
                            -- Sélectionner un interlocuteur --
                          </option>
                          {(collaborateurs || []).map((collab) => (
                            <option
                              key={collab.id}
                              value={collab.nom}
                            >
                              {collab.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div
                        className="form-group"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <label>
                          Nom du projet <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          name="nomProjet"
                          value={evolutionFormData.nomProjet}
                          onChange={handleEvolutionInputChange}
                          placeholder="Nom du projet"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Étape 2: DATFL */}
                {evolutionStep === 2 && (
                  <div>
                    <h3
                      style={{
                        marginBottom: "32px",
                        color: "#1a1a1a",
                        fontSize: "24px",
                        fontWeight: "600",
                      }}
                    >
                      2. Mise à jour du DATFL
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "24px",
                      }}
                    >
                      <div className="form-group">
                        <label>
                          Date de demande de la mise à jour du DATFL{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          name="dateDemandeMiseAJourDATFL"
                          value={evolutionFormData.dateDemandeMiseAJourDATFL}
                          onChange={handleEvolutionInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Date de réponse de la mise à jour du DATFL{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          name="dateReponseMiseAJourDATFL"
                          value={evolutionFormData.dateReponseMiseAJourDATFL}
                          onChange={handleEvolutionInputChange}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Étape 3: Planning & SLT */}
                {evolutionStep === 3 && (
                  <div>
                    <h3
                      style={{
                        marginBottom: "32px",
                        color: "#1a1a1a",
                        fontSize: "24px",
                        fontWeight: "600",
                      }}
                    >
                      3. Planning et SLT
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "24px",
                      }}
                    >
                      <div className="form-group">
                        <label>
                          Charge (nombre de jours){" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="number"
                          name="charge"
                          value={evolutionFormData.charge}
                          onChange={handleEvolutionInputChange}
                          placeholder="Ex: 5"
                          min="0"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Date de début du planning{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          name="planningDateDebut"
                          value={evolutionFormData.planningDateDebut}
                          onChange={handleEvolutionInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Date de fin du planning{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          name="planningDateFin"
                          value={evolutionFormData.planningDateFin}
                          onChange={handleEvolutionInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Date de demande devolution{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          name="dateDemandeDevolution"
                          value={evolutionFormData.dateDemandeDevolution}
                          onChange={handleEvolutionInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Date de réponse devolution{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          name="dateReponseDevolution"
                          value={evolutionFormData.dateReponseDevolution}
                          onChange={handleEvolutionInputChange}
                          required
                        />
                      </div>
                      <div
                        className="form-group"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <label>
                          Renseigner les SLT <span className="required">*</span>
                        </label>
                        <textarea
                          name="slt"
                          value={evolutionFormData.slt}
                          onChange={handleEvolutionInputChange}
                          rows={4}
                          placeholder="Saisissez les SLT..."
                          required
                        />
                      </div>
                      <div
                        className="form-group"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <label>
                          Renseigner un aléas en norme par jour{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          name="aleasNormeParJour"
                          value={evolutionFormData.aleasNormeParJour}
                          onChange={handleEvolutionInputChange}
                          placeholder="Ex: 0.5"
                          required
                        />
                      </div>
                      {evolutionFormData.planningDateDebut &&
                        evolutionFormData.planningDateFin && (
                          <div
                            style={{
                              gridColumn: "1 / -1",
                              padding: "12px",
                              backgroundColor: "#f0f9ff",
                              borderRadius: "6px",
                              marginTop: "8px",
                              color: "#1e40af",
                            }}
                          >
                            <strong>Planning :</strong>{" "}
                            {formatDateEnFrancais(
                              evolutionFormData.planningDateDebut,
                            )}{" "}
                            au{" "}
                            {formatDateEnFrancais(
                              evolutionFormData.planningDateFin,
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>

              {/* Boutons de navigation */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "32px",
                  paddingTop: "24px",
                  borderTop: "2px solid #e5e7eb",
                }}
              >
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleEvolutionCancel}
                  >
                    ← Retour à la page principale
                  </button>
                  {evolutionStep > 1 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleEvolutionPrevious}
                    >
                      ← Retour
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => sauvegarderEvolutionBrouillon()}
                  >
                    Enregistrer le brouillon
                  </button>
                  {evolutionStep < 3 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleEvolutionNext}
                      style={{
                        background:
                          "linear-gradient(135deg, #10B981 0%, #10B981dd 100%)",
                        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      Suivant &rarr;
                    </button>
                  ) : (
                    <PermissionGuard
                      module="demandes"
                      submodule="gestion"
                      action="create"
                    >
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{
                          padding: "12px 24px",
                          fontSize: "16px",
                          fontWeight: "600",
                          backgroundColor: "#ff6b35",
                          borderColor: "#ff6b35",
                          boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
                        }}
                      >
                        Créer la demande prospecte
                      </button>
                    </PermissionGuard>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Liste unifiée des demandes */}
        <div
          className="section-rubrique"
          style={{ marginBottom: showDemandesList ? "32px" : "8px" }}
        >
          <button
            type="button"
            onClick={() => setShowDemandesList((v) => !v)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
            aria-expanded={showDemandesList}
          >
            <h2
              style={{
                marginBottom: "24px",
                paddingBottom: "12px",
                borderBottom: "2px solid #e5e7eb",
                color: "#4A90E2",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span>Liste des demandes</span>
              <span style={{ color: "#6b7280", fontSize: "14px" }}>
                {showDemandesList ? "Masquer" : "Afficher"}
              </span>
            </h2>
          </button>

          {showDemandesList && (
            <div className="table-container" style={{ marginTop: "24px" }}>
              {demandes.length === 0 ? (
                <p style={{ color: "#6b7280", marginTop: "16px" }}>
                  Aucune demande créée pour le moment.
                </p>
              ) : (
                <table className="data-table" style={{ tableLayout: "auto" }}>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: "nowrap" }}>Date d'enre.</th>
                      <th style={{ whiteSpace: "nowrap" }}>Date de réc.</th>
                      <th style={{ whiteSpace: "nowrap" }}>Type de demande</th>
                      <th style={{ whiteSpace: "nowrap" }}>
                        Statut de la demande
                      </th>
                      <th style={{ whiteSpace: "nowrap" }}>Sociétés dem.</th>
                      <th style={{ whiteSpace: "nowrap" }}>Interlocuteur</th>
                      <th style={{ whiteSpace: "nowrap" }}>Nom projet</th>
                      <th style={{ whiteSpace: "nowrap" }}>Périmètre</th>
                      {isAdmin && (
                        <th style={{ whiteSpace: "nowrap" }}>Créé par</th>
                      )}
                      <th style={{ whiteSpace: "nowrap" }}>Détail</th>
                      <th style={{ whiteSpace: "nowrap" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(demandes || []).map((demande) => (
                      <tr key={demande.id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {demande.dateEnregistrement
                            ? demande.dateEnregistrement.split("T")[0]
                            : "-"}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {demande.dateReception
                            ? demande.dateReception.split("T")[0]
                            : "-"}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "6px 10px",
                              borderRadius: "999px",
                              fontWeight: 600,
                              fontSize: "13px",
                              ...getTypeDemandeStyle(demande.typeProjet),
                            }}
                          >
                            {getTypeDemandeLabel(demande.typeProjet)}
                          </span>
                        </td>
                        <td>
                          {demande.statutDemande ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "4px 8px",
                                  borderRadius: "999px",
                                  backgroundColor: "#e5e7eb",
                                  color: "#111827",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                {demande.statutDemande}
                              </span>
                              <button
                                className="btn-secondary"
                                onClick={() =>
                                  handleEditStatus(
                                    demande.statutInfo || {
                                      id: demande.statutId,
                                      nom: demande.statutDemande,
                                    },
                                    demande.id,
                                  )
                                }
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "11px",
                                  borderRadius: "4px",
                                  border: "1px solid #d1d5db",
                                  backgroundColor: "white",
                                  color: "#374151",
                                  cursor: "pointer",
                                }}
                                title="Modifier ce statut"
                              >
                                Modifier
                              </button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {demande.societesDemandeurs ||
                            demande.societeDemandeur ||
                            "-"}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {demande.interlocuteurClient ||
                            demande.interlocuteur ||
                            "-"}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {demande.nomProjet || "-"}
                        </td>
                        <td
                          style={{
                            maxWidth: "150px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {demande.descriptionPerimetre ||
                            demande.perimetre ||
                            "-"}
                        </td>
                        {isAdmin && (
                          <td
                            style={{ whiteSpace: "nowrap", fontSize: "13px" }}
                          >
                            <div>
                              <div style={{ fontWeight: "600" }}>
                                {demande.nomCreateur || "-"}
                              </div>
                              {demande.emailCreateur && (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#6b7280",
                                    marginTop: "2px",
                                  }}
                                >
                                  {demande.emailCreateur}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        <td>
                          <button
                            className="btn-secondary"
                            onClick={() => handleShowDetail(demande)}
                            style={{
                              padding: "6px 12px",
                              fontSize: "13px",
                            }}
                          >
                            Détail
                          </button>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "5px",
                              alignItems: "center",
                            }}
                          >
                            <button
                              className="btn-secondary"
                              onClick={() => handlePoursuivreDemande(demande)}
                              style={{
                                padding: "6px 10px",
                                fontSize: "13px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Modifier
                            </button>
                            <PermissionGuard
                              module="demandes"
                              submodule="gestion"
                              action="delete"
                            >
                              <button
                                className="btn-danger"
                                onClick={() => handleDeleteDemande(demande)}
                                style={{
                                  padding: "6px 10px",
                                  fontSize: "13px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Supprimer
                              </button>
                            </PermissionGuard>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Sections prospecte / évolution fusionnées dans la liste unique */}
      </div>

      {/* Popup de détail de la demande */}
      {showDetailModal && selectedDemandeDetail && (() => {
        const typeColor =
          selectedDemandeDetail.typeProjet === "Prospecte" ? "#FF6B35"
          : selectedDemandeDetail.typeProjet === "Evolution" ? "#10B981"
          : "#4A90E2";
        const societe =
          selectedDemandeDetail.societesDemandeurs ||
          selectedDemandeDetail.societeDemandeur || "-";
        const interlocuteur =
          selectedDemandeDetail.interlocuteurClient ||
          selectedDemandeDetail.interlocuteur || "-";

        const isUrl = (val) => {
          if (!val) return false;
          try { new URL(val); return val.startsWith("http://") || val.startsWith("https://"); } catch { return false; }
        };
        const InfoField = ({ label, value, full }) => (
          <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "14px", color: "#1F2937", background: "#F9FAFB", borderRadius: "6px", padding: "8px 10px", border: "1px solid #E5E7EB", wordBreak: "break-all" }}>
              {value && isUrl(value)
                ? <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: "#4A90E2", textDecoration: "underline" }}>{value}</a>
                : (value || "-")}
            </div>
          </div>
        );

        const Section = ({ icon, title, color, children }) => (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", paddingBottom: "10px", borderBottom: `2px solid ${color}20` }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={icon} style={{ color, fontSize: "13px" }}></i>
              </div>
              <span style={{ fontSize: "13px", fontWeight: "700", color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>{children}</div>
          </div>
        );

        return (
          <div className="modal-overlay" onClick={closeDetailModal}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff",
                borderRadius: "16px",
                width: "100%",
                maxWidth: "860px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
                overflow: "hidden",
              }}
            >
              {/* Header coloré */}
              <div style={{ background: typeColor, padding: "24px 28px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#fff" }}>
                      {selectedDemandeDetail.nomProjet || "Sans nom"}
                    </h2>
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                      {selectedDemandeDetail.typeProjet && (
                        <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "12px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px", backdropFilter: "blur(4px)" }}>
                          {selectedDemandeDetail.typeProjet}
                        </span>
                      )}
                      {selectedDemandeDetail.isDraft && (
                        <span style={{ background: "rgba(0,0,0,0.2)", color: "#fff", fontSize: "12px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px" }}>
                          Brouillon — Étape {selectedDemandeDetail.draftStep}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", color: "rgba(255,255,255,0.8)", fontSize: "12px", lineHeight: "1.8" }}>
                    {selectedDemandeDetail.dateEnregistrement && (
                      <div>Enregistré le {formatDateForInput(selectedDemandeDetail.dateEnregistrement)}</div>
                    )}
                    {selectedDemandeDetail.dateReception && (
                      <div>Reçu le {selectedDemandeDetail.dateReception.split("T")[0]}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Corps scrollable */}
              <div style={{ overflowY: "auto", padding: "24px 28px", flex: 1 }}>

                {/* Section Identification */}
                <Section icon="fa-solid fa-circle-info" title="Identification" color={typeColor}>
                  <InfoField label="Société demandeur" value={societe} />
                  <InfoField label="Interlocuteur" value={interlocuteur} />
                  <InfoField label="Type de projet" value={selectedDemandeDetail.typeProjet} />
                  <InfoField label="Nom du projet" value={selectedDemandeDetail.nomProjet} />
                  {selectedDemandeDetail.typeProjet !== "Prospecte" && (
                    <InfoField label="Description" value={selectedDemandeDetail.descriptionProjet} full />
                  )}
                  {selectedDemandeDetail.typeProjet === "Prospecte" && (
                    <InfoField label="Périmètre" value={selectedDemandeDetail.perimetre} full />
                  )}
                </Section>

              {/* Clarification */}
              {selectedDemandeDetail.typeProjet !== "Prospecte" && (
                <Section icon="fa-solid fa-magnifying-glass" title="Clarification" color={typeColor}>
                  <InfoField label="Date transmission backlog" value={formatDateForDisplay(selectedDemandeDetail.dateTransmissionBacklog)} />
                  <InfoField label="Date confirmation validation" value={formatDateForDisplay(selectedDemandeDetail.dateConfirmationValidation)} />
                  <InfoField label="Lien Ingrid CDC" value={selectedDemandeDetail.lienIngridCDC} full />
                </Section>
              )}

              {/* Planification */}
              {selectedDemandeDetail.typeProjet !== "Prospecte" && (
                <Section icon="fa-solid fa-calendar-days" title="Planification" color={typeColor}>
                  <InfoField label="Date demande planification DEV" value={formatDateForDisplay(selectedDemandeDetail.dateDemandePlanificationDev)} />
                  <InfoField label="Date demande planification TIF" value={formatDateForDisplay(selectedDemandeDetail.dateDemandePlanificationTif)} />
                  <InfoField label="Date retour des équipes DEV" value={formatDateForDisplay(selectedDemandeDetail.dateRetourEquipesDev)} />
                  <InfoField label="Date retour des équipes TIF" value={formatDateForDisplay(selectedDemandeDetail.dateRetourEquipesTif)} />
                  <InfoField label="Date communication planning client" value={formatDateForDisplay(selectedDemandeDetail.dateCommunicationPlanningClient)} />
                  <InfoField label="Nombre de sprints" value={selectedDemandeDetail.nombreSprint} />
                  <InfoField label="Roadmap" value={selectedDemandeDetail.roadmap} full />
                  {selectedDemandeDetail.motifsRetardTIF && (
                    <InfoField label="Motifs retard TIF" value={selectedDemandeDetail.motifsRetardTIF} full />
                  )}
                  {selectedDemandeDetail.motifsRetardClient && (
                    <InfoField label="Motifs retard client" value={selectedDemandeDetail.motifsRetardClient} full />
                  )}
                </Section>
              )}

              {/* Réalisation */}
              {selectedDemandeDetail.typeProjet !== "Prospecte" &&
                selectedDemandeDetail.typeProjet !== "Evolution" && (
                <Section icon="fa-solid fa-code" title="Réalisation – Codage + TIF" color={typeColor}>
                  <InfoField label="Statut de codage" value={selectedDemandeDetail.statutCodage} />
                  <InfoField label="Statut TIF" value={selectedDemandeDetail.statutTIF} />
                </Section>
              )}

              {/* Documents */}
              {selectedDemandeDetail.typeProjet !== "Prospecte" &&
                selectedDemandeDetail.typeProjet !== "Evolution" && (
                <Section icon="fa-solid fa-file-lines" title="Documents" color={typeColor}>
                  <InfoField label="Lien Ingrid Kickoff" value={selectedDemandeDetail.lienIngridKickoff} full />
                  <InfoField label="Lien Ingrid Points contrôle TIF" value={selectedDemandeDetail.lienIngridPointsControleTIF} full />
                  <InfoField label="Lien Ingrid Signoff" value={selectedDemandeDetail.lienIngridSignoff} full />
                </Section>
              )}

              {/* Livraison */}
              {selectedDemandeDetail.typeProjet !== "Prospecte" &&
                selectedDemandeDetail.typeProjet !== "Evolution" && (
                <Section icon="fa-solid fa-truck" title="Livraison effective au client" color={typeColor}>
                  <InfoField label="Statut livraison client" value={selectedDemandeDetail.statutLivraisonClient} />
                  <InfoField label="Date effective livraison client" value={formatDateForDisplay(selectedDemandeDetail.dateEffectiveLivraisonClient)} />
                  {selectedDemandeDetail.motifsRetardClient && (
                    <InfoField label="Motifs de retard client" value={selectedDemandeDetail.motifsRetardClient} full />
                  )}
                </Section>
              )}

              </div>

              {/* Footer */}
              <div style={{ padding: "16px 28px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "center" }}>
                <button
                  onClick={closeDetailModal}
                  style={{ background: "#F3F4F6", border: "none", borderRadius: "8px", padding: "10px 32px", fontSize: "14px", fontWeight: "600", color: "#374151", cursor: "pointer" }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Popup de confirmation de suppression de brouillon */}
      {showDeleteDraftModal && (
        <div className="modal-overlay" onClick={cancelDeleteDraft}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>Confirmer la suppression</h3>
            </div>
            <div className="confirm-modal-body">
              <p>Voulez-vous vraiment supprimer ce brouillon ?</p>
              <p className="confirm-warning">Cette action est irréversible.</p>
            </div>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteDraft}
              >
                Supprimer
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDeleteDraft}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmation de suppression de demande */}
      {showDemandeDeleteConfirm && demandeToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteDemande}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>Confirmer la suppression</h3>
            </div>
            <div className="confirm-modal-body" >
              <p>
                Êtes-vous sûr de vouloir supprimer la demande
              </p>
              <p className="confirm-warning">Cette action est irréversible.</p>
            </div>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteDemande}
              >
                Supprimer
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDeleteDemande}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de modification de statut */}
      {showStatusEditModal && (
        <div className="modal-overlay" onClick={handleStatusEditCancel}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "500px",
              padding: "0",
            }}
          >
            <div
              className="modal-header"
              style={{
                padding: "24px",
                borderBottom: "1px solid #e5e7eb",
                backgroundColor: "#f8fafc",
              }}
            >
              <h3 style={{ margin: 0, color: "#1a1a1a" }}>
                Modifier le statut
              </h3>
            </div>

            <div className="modal-body" style={{ padding: "24px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Nouveau statut :
                </label>
                <select
                  value={newStatusValue}
                  onChange={(e) => {
                    setNewStatusValue(e.target.value);
                    if (!isSuspensionStatus(e.target.value)) {
                      setSuspensionMotif("");
                      setSuspensionDate("");
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Sélectionnez un statut</option>
                  <option value="ND - non démarré">ND - non démarré</option>
                  <option value="enregistré">enregistré</option>
                  {statutsDisponibles
                    .filter((statut) => !statut.estAutomatique)
                    .map((statut) => (
                      <option key={statut.id} value={statut.nom}>
                        {statut.nom}
                      </option>
                    ))}
                </select>
              </div>

              {isSuspensionStatus(newStatusValue) && (
                <>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                      Motif de suspension <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <textarea
                      value={suspensionMotif}
                      onChange={(e) => setSuspensionMotif(e.target.value)}
                      placeholder="Indiquez le motif de la suspension..."
                      rows={3}
                      style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                      Date de suspension <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={suspensionDate}
                      onChange={(e) => setSuspensionDate(e.target.value)}
                      style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>
                </>
              )}
            </div>

            <div
              className="modal-footer"
              style={{
                padding: "24px",
                borderTop: "1px solid #e5e7eb",
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={handleStatusEditCancel}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  color: "#374151",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleStatusEditSubmit}
                disabled={!newStatusValue}
                style={{
                  padding: "10px 20px",
                  backgroundColor: newStatusValue ? "#4A90E2" : "#9ca3af",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: newStatusValue ? "pointer" : "not-allowed",
                }}
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Demandes;
