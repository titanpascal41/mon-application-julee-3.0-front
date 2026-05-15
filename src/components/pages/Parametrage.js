import { useState, useEffect, useCallback, useRef } from "react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

import "./PageStyles.css";

import {
  chargerToutesSocietes,
  creerSociete,
  mettreAJourSociete,
  supprimerSociete,
  archiverSociete,
  ajouterSocieteExistante,
  toggleActivationSociete,
} from "../../data/societes";

import {
  chargerUO,
  creerUO,
  mettreAJourUO,
  supprimerUO,
  toggleActivationUO,
} from "../../data/gestionUO";

import {
  chargerStatuts,
  creerStatut,
  mettreAJourStatut,
  supprimerStatut,
  reorderStatuts,
} from "../../data/gestionStatuts";

import {
  chargerInterlocuteurs,
  creerInterlocuteur,
  mettreAJourInterlocuteur,
  supprimerInterlocuteur,
  toggleActivationInterlocuteur,
} from "../../data/gestionInterlocuteurs";

import { PermissionGuard, usePermissions } from "../PermissionGuard";

const Parametrage = ({ activeSubPage: activeSubPageProp }) => {
  const { hasPermission } = usePermissions();
  const aActionsStatuts = hasPermission("parametrage", "statuts", "update") || hasPermission("parametrage", "statuts", "delete");
  const aActionsSocietes = hasPermission("parametrage", "societes", "update") || hasPermission("parametrage", "societes", "delete");
  const aActionsUO = hasPermission("parametrage", "uo", "update") || hasPermission("parametrage", "uo", "delete");
  const aActionsInterlocuteurs = hasPermission("parametrage", "interlocuteurs", "update") || hasPermission("parametrage", "interlocuteurs", "delete");

  const [activeSubPage, setActiveSubPage] = useState("societes");

  // États pour la gestion des sociétés

  const [societes, setSocietes] = useState([]);

  const [showSocieteForm, setShowSocieteForm] = useState(false);

  const [editingSociete, setEditingSociete] = useState(null);

  const [societeFormData, setSocieteFormData] = useState({
    code: "",
    nom: "",
    departement: "",
  });

  const [societeMessage, setSocieteMessage] = useState({ type: "", text: "" });

  // Mode du popup société : null | "choice" | "create" | "existing" | "delete"
  const [societePopupMode, setSocietePopupMode] = useState(null);
  const [selectedExistingSociete, setSelectedExistingSociete] = useState("");
  const [selectedExistingDepartement, setSelectedExistingDepartement] =
    useState("");
  const [selectedExistingLibelle, setSelectedExistingLibelle] = useState("");
  const [toutesSocietes, setToutesSocietes] = useState([]);
  // "archive" = retirer de la liste, "permanent" = suppression définitive
  const [societeDeleteMode, setSocieteDeleteMode] = useState("archive");

  const SOCIETES_EXISTANTES = [
    "AWALE",
    "CIE",
    "CIPREL",
    "ERANOVE",
    "GS2E",
    "GS2E/CIE/SODECI",
    "MA2E",
    "OMILAYE",
    "SB2E",
    "SDER",
    "SGA2E",
    "SIVE",
    "SMART ENERGY",
    "SODECI",
  ];

  const DEPARTEMENTS_PAR_CODE = {
    GS2E: [
      "DDI SAPHIR V3",
      "Département Audit Interne",
      "Département Budget Contrôle de Gestion",
      "Département de Développements Informatiques",
      "Département des Ressources Humaines",
      "Département Etudes Economiques",
      "Département Qualité Sécurité Environnement",
      "SMART ENERGY",
      "Système Management Environnemental et Social",
    ],
  };

  const [showSocieteDeleteConfirm, setShowSocieteDeleteConfirm] =
    useState(false);

  const [societeToDelete, setSocieteToDelete] = useState(null);
  const [showSocieteOccupeeModal, setShowSocieteOccupeeModal] = useState(false);
  const [societeOccupeeName, setSocieteOccupeeName] = useState("");

  // États pour la gestion des UO

  const [uoList, setUOList] = useState([]);

  const [showUOForm, setShowUOForm] = useState(false);

  const [editingUO, setEditingUO] = useState(null);

  const [uoFormData, setUOFormData] = useState({
    code: "",
    nom: "",
    departement: "",
    chefUO: "",

    projetSoumis: "",

    actif: true,

    societeId: "",
  });

  const [uoSelectedCode, setUoSelectedCode] = useState("");
  const [uoMessage, setUOMessage] = useState({ type: "", text: "" });

  const [showUODeleteConfirm, setShowUODeleteConfirm] = useState(false);

  const [uoToDelete, setUOToDelete] = useState(null);
  const [showDeactivateUOModal, setShowDeactivateUOModal] = useState(false);
  const [uoToToggle, setUoToToggle] = useState(null);
  const [motifDesactivationUO, setMotifDesactivationUO] = useState("");

  // États pour la gestion des statuts

  const [statuts, setStatuts] = useState([]);

  const [showStatutForm, setShowStatutForm] = useState(false);

  const [editingStatut, setEditingStatut] = useState(null);

  const [statutFormData, setStatutFormData] = useState({
    nom: "",

    description: "",

    actif: true,
  });

  const [statutMessage, setStatutMessage] = useState({ type: "", text: "" });

  const [showStatutDeleteConfirm, setShowStatutDeleteConfirm] = useState(false);

  const [statutToDelete, setStatutToDelete] = useState(null);

  const dragStatutIndex = useRef(null);
  const dragOverStatutIndex = useRef(null);

  const [loading, setLoading] = useState(false);

  // Pagination
  const ITEMS_PER_PAGE = 10;
  const [pageSocietes, setPageSocietes] = useState(1);
  const [pageUO, setPageUO] = useState(1);
  const [pageStatuts, setPageStatuts] = useState(1);
  const [pageInterlocuteurs, setPageInterlocuteurs] = useState(1);

  // Filtres & recherche
  const [rechercheSocietes, setRechercheSocietes] = useState("");
  const [filtreStatutSocietes, setFiltreStatutSocietes] = useState("tous");
  const [rechercheUO, setRechercheUO] = useState("");
  const [filtreStatutUO, setFiltreStatutUO] = useState("tous");
  const [rechercheStatuts, setRechercheStatuts] = useState("");
  const [filtreStatutStatuts, setFiltreStatutStatuts] = useState("tous");
  const [rechercheInterlocuteurs, setRechercheInterlocuteurs] = useState("");
  const [filtreStatutInterlocuteurs, setFiltreStatutInterlocuteurs] = useState("tous");

  // États pour la gestion des interlocuteurs

  const [interlocuteurs, setInterlocuteurs] = useState([]);

  const [showInterlocuteurForm, setShowInterlocuteurForm] = useState(false);

  const [editingInterlocuteur, setEditingInterlocuteur] = useState(null);

  const [interlocuteurFormData, setInterlocuteurFormData] = useState({
    nom: "",
    email: "",
    poste: "",
    telephone: "",
    actif: true,
    uoId: "",
  });

  const [interlocuteurMessage, setInterlocuteurMessage] = useState({
    type: "",

    text: "",
  });

  const [showInterlocuteurDeleteConfirm, setShowInterlocuteurDeleteConfirm] =
    useState(false);

  const [interlocuteurToDelete, setInterlocuteurToDelete] = useState(null);
  const [showDeactivateInterlocuteurModal, setShowDeactivateInterlocuteurModal] = useState(false);
  const [interlocuteurToToggle, setInterlocuteurToToggle] = useState(null);
  const [motifDesactivationInterlocuteur, setMotifDesactivationInterlocuteur] = useState("");

  useEffect(() => {
    if (activeSubPageProp) {
      // Extraire le type de sous-page depuis le path

      if (activeSubPageProp.includes("societes")) setActiveSubPage("societes");
      else if (
        activeSubPageProp.includes("uo") ||
        activeSubPageProp.includes("unites")
      )
        setActiveSubPage("uo");
      else if (activeSubPageProp.includes("statuts"))
        setActiveSubPage("statuts");
      else if (activeSubPageProp.includes("interlocuteurs"))
        setActiveSubPage("interlocuteurs");
    }
  }, [activeSubPageProp]);

  const chargerLesSocietes = useCallback(async () => {
    setLoading(true);
    const toutesChargees = await chargerToutesSocietes();
    setSocietes(toutesChargees);
    setToutesSocietes(toutesChargees);
    setLoading(false);
  }, []);

  const chargerLesUO = useCallback(async () => {
    setLoading(true);
    const uoChargees = await chargerUO();
    setUOList(uoChargees);
    setLoading(false);
  }, []);

  const chargerLesStatuts = useCallback(async () => {
    setLoading(true);
    const statutsCharges = await chargerStatuts();
    setStatuts(statutsCharges);
    setLoading(false);
  }, []);

  const chargerLesInterlocuteurs = useCallback(async () => {
    setLoading(true);
    const interlocuteursCharges = await chargerInterlocuteurs();
    setInterlocuteurs(interlocuteursCharges);
    setLoading(false);
  }, []);

  // Charger les données au montage et quand on change de sous-page

  useEffect(() => {
    if (activeSubPage === "societes") {
      chargerLesSocietes();
    } else if (activeSubPage === "uo") {
      chargerLesSocietes(); // Pour les dropdowns

      chargerLesUO();
    } else if (activeSubPage === "statuts") {
      chargerLesStatuts();
    } else if (activeSubPage === "interlocuteurs") {
      chargerLesInterlocuteurs();
      chargerLesUO();
    }
  }, [
    activeSubPage,

    chargerLesSocietes,

    chargerLesUO,

    chargerLesStatuts,

    chargerLesInterlocuteurs,
  ]);

  // Tableaux filtrés (recherche + statut actif/inactif)
  // eslint-disable-next-line no-misleading-character-class
  const normaliser = (str) =>
    (str || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const applyFiltre = (items, recherche, filtreStatut, fields) => {
    const q = normaliser(recherche);
    return items
      .filter(item => {
        const matchStatut = filtreStatut === "tous"
          || (filtreStatut === "actif" ? item.actif !== false : item.actif === false);
        const matchRecherche = !q || fields.some(f => normaliser(item[f]).includes(q));
        return matchStatut && matchRecherche;
      })
      .sort((a, b) => {
        // Désactivés en haut
        if (a.actif === b.actif) return 0;
        return a.actif === false ? -1 : 1;
      });
  };

  const societesFiltrees       = applyFiltre(societes,       rechercheSocietes,       filtreStatutSocietes,       ["code","nom","departement"]);
  const uoFiltrees             = applyFiltre(uoList,         rechercheUO,             filtreStatutUO,             ["code","nom","chefUO","departement"]);
  const statutsFiltrees        = applyFiltre(statuts,        rechercheStatuts,        filtreStatutStatuts,        ["nom","description"]);
  const interlocuteursFiltrees = applyFiltre(interlocuteurs, rechercheInterlocuteurs, filtreStatutInterlocuteurs, ["nom","email","telephone","structureUO"]);

  // Recule d'une page si la page courante devient vide après suppression ou filtrage
  useEffect(() => {
    const max = Math.max(1, Math.ceil(societesFiltrees.length / ITEMS_PER_PAGE));
    if (pageSocietes > max) setPageSocietes(max);
  }, [societesFiltrees.length, pageSocietes, ITEMS_PER_PAGE]);

  useEffect(() => {
    const max = Math.max(1, Math.ceil(uoFiltrees.length / ITEMS_PER_PAGE));
    if (pageUO > max) setPageUO(max);
  }, [uoFiltrees.length, pageUO, ITEMS_PER_PAGE]);

  useEffect(() => {
    const max = Math.max(1, Math.ceil(statutsFiltrees.length / ITEMS_PER_PAGE));
    if (pageStatuts > max) setPageStatuts(max);
  }, [statutsFiltrees.length, pageStatuts, ITEMS_PER_PAGE]);

  useEffect(() => {
    const max = Math.max(1, Math.ceil(interlocuteursFiltrees.length / ITEMS_PER_PAGE));
    if (pageInterlocuteurs > max) setPageInterlocuteurs(max);
  }, [interlocuteursFiltrees.length, pageInterlocuteurs, ITEMS_PER_PAGE]);

  // Remettre à la page 1 quand filtre ou recherche change
  useEffect(() => { setPageSocietes(1); }, [rechercheSocietes, filtreStatutSocietes]);
  useEffect(() => { setPageUO(1); }, [rechercheUO, filtreStatutUO]);
  useEffect(() => { setPageStatuts(1); }, [rechercheStatuts, filtreStatutStatuts]);
  useEffect(() => { setPageInterlocuteurs(1); }, [rechercheInterlocuteurs, filtreStatutInterlocuteurs]);

  // Fonctions pour la gestion des sociétés

  const handleSocieteInputChange = (e) => {
    const { name, value } = e.target;

    // Validation spécifique pour le téléphone

    if (name === "telephone") {
      // N'accepter que les chiffres

      const telephoneValue = value.replace(/\D/g, "");

      setSocieteFormData((prev) => ({
        ...prev,

        [name]: telephoneValue,
      }));

      // Afficher un message si le numéro n'est pas valide

      if (telephoneValue && telephoneValue.length !== 10) {
        setSocieteMessage({
          type: "error",

          text: "Le numéro doit contenir exactement 10 chiffres",
        });
      } else if (telephoneValue.length === 10) {
        setSocieteMessage({ type: "", text: "" });
      }
    } else {
      setSocieteFormData((prev) => ({
        ...prev,

        [name]: value,
      }));
    }

    if (societeMessage.text && name !== "telephone") {
      setSocieteMessage({ type: "", text: "" });
    }
  };

  const handleCreateSociete = () => {
    setEditingSociete(null);
    setSocieteFormData({ code: "", nom: "", departement: "" });
    setSocieteMessage({ type: "", text: "" });
    setSelectedExistingSociete("");
    setSocietePopupMode("choice");
    setShowSocieteForm(true);
  };

  const handleChoixCreer = () => {
    setSocietePopupMode("create");
  };

  const handleChoixExistante = () => {
    setSelectedExistingSociete("");
    setSelectedExistingDepartement("");
    setSelectedExistingLibelle("");
    setSocietePopupMode("existing");
  };

  const handleSubmitExistante = async () => {
    if (!selectedExistingSociete) {
      setSocieteMessage({
        type: "error",
        text: "Veuillez sélectionner une société.",
      });
      return;
    }
    const departementsDisponibles =
      DEPARTEMENTS_PAR_CODE[selectedExistingSociete] || [];
    if (departementsDisponibles.length > 0 && !selectedExistingDepartement) {
      setSocieteMessage({
        type: "error",
        text: "Veuillez sélectionner un département.",
      });
      return;
    }
    const resultat = await ajouterSocieteExistante(
      selectedExistingSociete,
      selectedExistingDepartement,
      selectedExistingLibelle,
    );
    if (resultat.succes) {
      setSocieteMessage({ type: "success", text: resultat.message });
      await chargerLesSocietes();
      setShowSocieteForm(false);
      setSocietePopupMode(null);
      setSelectedExistingSociete("");
      setSelectedExistingDepartement("");
      setSelectedExistingLibelle("");
      setTimeout(() => setSocieteMessage({ type: "", text: "" }), 3000);
    } else {
      setSocieteMessage({ type: "error", text: resultat.message });
      setTimeout(() => setSocieteMessage({ type: "", text: "" }), 5000);
    }
  };

  const handleEditSociete = (societe) => {
    setEditingSociete(societe);

    setSocieteFormData({
      code: societe.code || "",
      nom: societe.nom,
      departement: societe.departement || "",
    });

    setShowSocieteForm(true);

    setSocieteMessage({ type: "", text: "" });
  };

  const handleToggleActivationSociete = async (societe) => {
    const resultat = await toggleActivationSociete(societe.id, !societe.actif);
    if (resultat.succes) {
      setSocieteMessage({
        type: "success",
        text: `Société "${societe.nom}" ${!societe.actif ? "activée" : "désactivée"}.`,
      });
      await chargerLesSocietes();
      setTimeout(() => setSocieteMessage({ type: "", text: "" }), 3000);
    } else {
      if (societe.actif === true) {
        // Tentative de désactivation bloquée → popup
        setSocieteOccupeeName(societe.nom);
        setShowSocieteOccupeeModal(true);
      } else {
        setSocieteMessage({ type: "error", text: resultat.message || "Erreur" });
        setTimeout(() => setSocieteMessage({ type: "", text: "" }), 5000);
      }
    }
  };

  const handlePermanentDeleteSociete = (societe) => {
    setSocieteToDelete(societe);
    setSocieteDeleteMode("permanent");
    setShowSocieteDeleteConfirm(true);
  };

  const confirmDeleteSociete = async () => {
    if (societeToDelete) {
      let resultat;
      if (societeDeleteMode === "permanent") {
        resultat = await supprimerSociete(societeToDelete.id);
      } else {
        resultat = await archiverSociete(societeToDelete.id);
      }

      if (resultat.succes) {
        setSocieteMessage({ type: "success", text: resultat.message });
        await chargerLesSocietes();
        setTimeout(() => setSocieteMessage({ type: "", text: "" }), 3000);
      } else {
        setSocieteMessage({ type: "error", text: resultat.message });
        setTimeout(() => setSocieteMessage({ type: "", text: "" }), 5000);
      }
    }

    setShowSocieteDeleteConfirm(false);
    setSocieteToDelete(null);
  };

  const cancelDeleteSociete = () => {
    setShowSocieteDeleteConfirm(false);

    setSocieteToDelete(null);
  };

  const validateSocieteForm = () => {
    if (!societeFormData.code.trim()) {
      setSocieteMessage({
        type: "error",
        text: "Le code de la société est obligatoire.",
      });
      return false;
    }

    if (!societeFormData.nom.trim()) {
      setSocieteMessage({
        type: "error",
        text: "Le libellé de la société est obligatoire.",
      });
      return false;
    }

    // Vérifier si la combinaison code + département existe déjà (création uniquement)
    if (!editingSociete) {
      const codeUpper = societeFormData.code.trim().toUpperCase();
      const dept = societeFormData.departement.trim() || null;
      const estEnBase = toutesSocietes.some(
        (s) =>
          s.code.toUpperCase() === codeUpper &&
          (s.departement || null) === dept,
      );
      if (estEnBase) {
        setSocieteMessage({
          type: "error",
          text: `La société "${codeUpper}"${dept ? ` (${dept})` : ""} existe déjà dans la liste.`,
        });
        return false;
      }
    }

    return true;
  };

  const handleSocieteSubmit = async (e) => {
    e.preventDefault();

    setSocieteMessage({ type: "", text: "" });

    // Validation personnalisée

    if (!validateSocieteForm()) {
      return;
    }

    console.log("Données du formulaire société:", societeFormData);

    let resultat;

    if (editingSociete) {
      // Mise à jour

      resultat = await mettreAJourSociete(editingSociete.id, societeFormData);
    } else {
      // Création

      console.log("Appel à creerSociete avec:", societeFormData);

      resultat = await creerSociete(societeFormData);

      console.log("Résultat de creerSociete:", resultat);
    }

    if (resultat.succes) {
      const action = editingSociete ? "modifiée" : "créée";

      setSocieteMessage({
        type: "success",

        text: `Société "${societeFormData.nom}" ${action} avec succès`,
      });

      console.log("Rechargement des sociétés...");

      await chargerLesSocietes();

      console.log("Sociétés rechargées");

      setShowSocieteForm(false);

      setSocieteFormData({
        nom: "",

        adresse: "",

        telephone: "",

        email: "",

        responsable: "",
      });

      setEditingSociete(null);

      setTimeout(() => setSocieteMessage({ type: "", text: "" }), 3000);
    } else {
      setSocieteMessage({ type: "error", text: resultat.message });

      setTimeout(() => setSocieteMessage({ type: "", text: "" }), 5000);
    }
  };

  const handleCancelSociete = () => {
    setShowSocieteForm(false);
    setSocietePopupMode(null);
    setSocieteFormData({ code: "", nom: "", departement: "" });
    setEditingSociete(null);
    setSocieteMessage({ type: "", text: "" });
    setSelectedExistingSociete("");
    setSelectedExistingDepartement("");
    setSelectedExistingLibelle("");
  };

  // Fonctions pour la gestion des UO

  const handleUODeptChange = (dept) => {
    setUOFormData((prev) => {
      const matchingSociete = toutesSocietes.find(
        (s) => s.code === uoSelectedCode && s.actif && (s.departement || "") === dept
      );
      const fallbackSociete = toutesSocietes.find(
        (s) => s.code === uoSelectedCode && s.actif
      );
      return {
        ...prev,
        departement: dept,
        societeId: matchingSociete
          ? String(matchingSociete.id)
          : fallbackSociete
          ? String(fallbackSociete.id)
          : prev.societeId,
      };
    });
    if (uoMessage.text) setUOMessage({ type: "", text: "" });
  };

  const handleUOInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setUOFormData((prev) => ({
      ...prev,

      [name]: type === "checkbox" ? checked : value,
    }));

    if (uoMessage.text) {
      setUOMessage({ type: "", text: "" });
    }
  };

  const handleCreateUO = () => {
    setEditingUO(null);
    setUoSelectedCode("");
    setUOFormData({
      code: "",
      nom: "",
      departement: "",
      chefUO: "",
      projetSoumis: "",
      actif: true,
      societeId: "",
    });

    setShowUOForm(true);

    setUOMessage({ type: "", text: "" });
  };

  const handleEditUO = (uo) => {
    setEditingUO(uo);
    const s = toutesSocietes.find((x) => x.id === uo.societeId);
    setUoSelectedCode(s ? s.code : "");
    setUOFormData({
      code: uo.code || "",
      nom: uo.nom,
      departement: uo.departement || "",
      chefUO: uo.chefUO,
      projetSoumis: uo.projetSoumis || "",
      actif: uo.actif,
      societeId: uo.societeId != null ? uo.societeId.toString() : "",
    });

    setShowUOForm(true);

    setUOMessage({ type: "", text: "" });
  };

  const handleToggleActivationUO = (uo) => {
    if (uo.actif !== false) {
      setUoToToggle(uo);
      setMotifDesactivationUO("");
      setShowDeactivateUOModal(true);
    } else {
      toggleActivationUO(uo.id, true, null).then((resultat) => {
        if (resultat.succes) {
          chargerLesUO();
        } else {
          setUOMessage({ type: "error", text: resultat.message || "Erreur" });
          setTimeout(() => setUOMessage({ type: "", text: "" }), 4000);
        }
      });
    }
  };

  const confirmDeactivationUO = async () => {
    if (!motifDesactivationUO.trim()) return;
    const resultat = await toggleActivationUO(uoToToggle.id, false, null);
    if (resultat.succes) {
      chargerLesUO();
    } else {
      setUOMessage({ type: "error", text: resultat.message || "Erreur" });
      setTimeout(() => setUOMessage({ type: "", text: "" }), 4000);
    }
    setShowDeactivateUOModal(false);
    setUoToToggle(null);
    setMotifDesactivationUO("");
  };

  const confirmDeleteUO = async () => {
    if (uoToDelete) {
      const resultat = await supprimerUO(uoToDelete.id);

      if (resultat.succes) {
        setUOMessage({ type: "success", text: resultat.message });

        chargerLesUO();

        setTimeout(() => setUOMessage({ type: "", text: "" }), 3000);
      } else {
        setUOMessage({ type: "error", text: resultat.message });

        setTimeout(() => setUOMessage({ type: "", text: "" }), 5000);
      }
    }

    setShowUODeleteConfirm(false);

    setUOToDelete(null);
  };

  const cancelDeleteUO = () => {
    setShowUODeleteConfirm(false);

    setUOToDelete(null);
  };

  const validateUOForm = () => {
    if (!uoFormData.societeId) {
      setUOMessage({ type: "error", text: "La société est obligatoire." });
      return false;
    }

    if (!uoFormData.nom.trim()) {
      setUOMessage({
        type: "error",
        text: "Le libellé du service est obligatoire.",
      });
      return false;
    }

    return true;
  };

  const handleUOSubmit = async (e) => {
    e.preventDefault();

    setUOMessage({ type: "", text: "" });

    // Validation personnalisée

    if (!validateUOForm()) {
      return;
    }

    let resultat;

    if (editingUO) {
      resultat = await mettreAJourUO(editingUO.id, uoFormData);
    } else {
      resultat = await creerUO(uoFormData);
    }

    if (resultat.succes) {
      const action = editingUO ? "modifiée" : "créée";

      setUOMessage({
        type: "success",

        text: `Unité organisationnelle "${uoFormData.nom}" ${action} avec succès`,
      });

      chargerLesUO();

      setShowUOForm(false);

      setUOFormData({
        code: "",
        nom: "",
        departement: "",
        chefUO: "",
        projetSoumis: "",
        actif: true,
        societeId: "",
      });

      setEditingUO(null);

      setTimeout(() => setUOMessage({ type: "", text: "" }), 3000);
    } else {
      setUOMessage({ type: "error", text: resultat.message });

      setTimeout(() => setUOMessage({ type: "", text: "" }), 5000);
    }
  };

  const handleCancelUO = () => {
    setShowUOForm(false);
    setUoSelectedCode("");

    setUOFormData({
      code: "",
      nom: "",
      departement: "",
      chefUO: "",
      projetSoumis: "",
      actif: true,
      societeId: "",
    });

    setEditingUO(null);

    setUOMessage({ type: "", text: "" });
  };

  // Fonction pour obtenir le nom de la société


  // Fonctions pour la gestion des statuts

  const handleStatutDragEnd = async () => {
    const from = dragStatutIndex.current;
    const to = dragOverStatutIndex.current;
    if (from === null || to === null || from === to) return;
    const updated = [...statuts];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setStatuts(updated);
    dragStatutIndex.current = null;
    dragOverStatutIndex.current = null;
    await reorderStatuts(updated.map((s) => s.id));
  };

  const handleStatutInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setStatutFormData((prev) => ({
      ...prev,

      [name]: type === "checkbox" ? checked : value,
    }));

    if (statutMessage.text) {
      setStatutMessage({ type: "", text: "" });
    }
  };

  const handleCreateStatut = () => {
    setEditingStatut(null);

    setStatutFormData({
      nom: "",

      description: "",

      actif: true,
    });

    setShowStatutForm(true);

    setStatutMessage({ type: "", text: "" });
  };

  const handleEditStatut = (statut) => {
    setEditingStatut(statut);

    setStatutFormData({
      nom: statut.nom,

      description: statut.description || "",

      actif: statut.actif,
    });

    setShowStatutForm(true);

    setStatutMessage({ type: "", text: "" });
  };

  const handleToggleActivationStatut = async (statut) => {
    const resultat = await mettreAJourStatut(statut.id, { ...statut, actif: !statut.actif });
    if (resultat.succes) {
      setStatuts((prev) => prev.map((s) => (s.id === statut.id ? resultat.statut : s)));
      setStatutMessage({ type: "success", text: `Statut "${statut.nom}" ${!statut.actif ? "activé" : "désactivé"}.` });
      setTimeout(() => setStatutMessage({ type: "", text: "" }), 3000);
    } else {
      setStatutMessage({ type: "error", text: resultat.message || "Erreur lors de la modification." });
    }
  };

  const handleDeleteStatut = (statut) => {
    setStatutToDelete(statut);
    setShowStatutDeleteConfirm(true);
  };

  const confirmDeleteStatut = async () => {
    if (statutToDelete) {
      const resultat = await supprimerStatut(statutToDelete.id);

      if (resultat.succes) {
        setStatutMessage({ type: "success", text: resultat.message });

        chargerLesStatuts();

        setTimeout(() => setStatutMessage({ type: "", text: "" }), 3000);
      } else {
        // Afficher un message d'erreur plus détaillé

        let errorMessage = resultat.message;

        // Ajouter une explication spécifique pour les statuts créés automatiquement
        if (resultat.message && resultat.message.includes("utilisé")) {
          errorMessage +=
            "\n\n💡 Note : Si ce statut a été créé automatiquement depuis une demande, il ne peut être supprimé que lorsque la demande associée est supprimée.";
        }

        const finalErrorMessage = resultat.details
          ? `${errorMessage}\nDétails: ${resultat.details}`
          : errorMessage;

        setStatutMessage({
          type: "error",
          text: finalErrorMessage,

          details: resultat.details,
        });

        setTimeout(
          () => setStatutMessage({ type: "", text: "", details: "" }),
          10000,
        );
      }
    }

    setShowStatutDeleteConfirm(false);
    setStatutToDelete(null);
  };

  const cancelDeleteStatut = () => {
    setShowStatutDeleteConfirm(false);

    setStatutToDelete(null);
  };

  const handleCancelStatut = () => {
    setShowStatutForm(false);

    setStatutFormData({
      nom: "",

      description: "",

      actif: true,
    });

    setEditingStatut(null);

    setStatutMessage({ type: "", text: "" });
  };

  const handleStatutSubmit = async (e) => {
    e.preventDefault();

    setStatutMessage({ type: "", text: "" });

    let resultat;

    if (editingStatut) {
      resultat = await mettreAJourStatut(editingStatut.id, statutFormData);
    } else {
      resultat = await creerStatut(statutFormData);
    }

    if (resultat.succes) {
      const action = editingStatut ? "modifié" : "créé";

      setStatutMessage({
        type: "success",

        text: `Statut "${statutFormData.nom}" ${action} avec succès`,
      });

      // Mettre à jour l'état local immédiatement pour refléter la création/mise à jour

      if (editingStatut) {
        setStatuts((prev) =>
          prev.map((s) => (s.id === editingStatut.id ? resultat.statut : s)),
        );
      } else {
        setStatuts((prev) => [...prev, resultat.statut]);
      }

      setShowStatutForm(false);

      setStatutFormData({
        nom: "",

        description: "",

        actif: true,
      });

      setEditingStatut(null);

      setTimeout(() => setStatutMessage({ type: "", text: "" }), 3000);
    } else {
      setStatutMessage({ type: "error", text: resultat.message });

      setTimeout(() => setStatutMessage({ type: "", text: "" }), 5000);
    }

    setShowStatutForm(false);

    setStatutFormData({
      nom: "",

      description: "",

      actif: true,
    });

    setEditingStatut(null);

    setStatutMessage({ type: "", text: "" });
  };

  // Fonctions pour la gestion des interlocuteurs

  const handleInterlocuteurInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setInterlocuteurFormData((prev) => ({
      ...prev,

      [name]: type === "checkbox" ? checked : value,
    }));

    if (interlocuteurMessage.text) {
      setInterlocuteurMessage({ type: "", text: "" });
    }
  };

  const handleCreateInterlocuteur = () => {
    setEditingInterlocuteur(null);

    setInterlocuteurFormData({
      nom: "",

      email: "",

      poste: "",

      telephone: "",

      actif: true,
    });

    setShowInterlocuteurForm(true);

    setInterlocuteurMessage({ type: "", text: "" });
  };

  const handleEditInterlocuteur = (interlocuteur) => {
    setEditingInterlocuteur(interlocuteur);

    setInterlocuteurFormData({
      nom: interlocuteur.nom,
      email: interlocuteur.email || "",
      poste: interlocuteur.poste || "",
      telephone: interlocuteur.telephone || "",
      actif: interlocuteur.actif,
      uoId: interlocuteur.uoId ? interlocuteur.uoId.toString() : "",
    });

    setShowInterlocuteurForm(true);

    setInterlocuteurMessage({ type: "", text: "" });
  };

  const handleToggleActivationInterlocuteur = (interlocuteur) => {
    if (interlocuteur.actif !== false) {
      setInterlocuteurToToggle(interlocuteur);
      setMotifDesactivationInterlocuteur("");
      setShowDeactivateInterlocuteurModal(true);
    } else {
      toggleActivationInterlocuteur(interlocuteur.id, true, null).then((resultat) => {
        if (resultat.succes) {
          chargerLesInterlocuteurs();
        } else {
          setInterlocuteurMessage({ type: "error", text: resultat.message || "Erreur" });
          setTimeout(() => setInterlocuteurMessage({ type: "", text: "" }), 4000);
        }
      });
    }
  };

  const confirmDeactivationInterlocuteur = async () => {
    if (!motifDesactivationInterlocuteur.trim()) return;
    const resultat = await toggleActivationInterlocuteur(interlocuteurToToggle.id, false, null);
    if (resultat.succes) {
      chargerLesInterlocuteurs();
    } else {
      setInterlocuteurMessage({ type: "error", text: resultat.message || "Erreur" });
      setTimeout(() => setInterlocuteurMessage({ type: "", text: "" }), 4000);
    }
    setShowDeactivateInterlocuteurModal(false);
    setInterlocuteurToToggle(null);
    setMotifDesactivationInterlocuteur("");
  };

  const confirmDeleteInterlocuteur = async () => {
    if (interlocuteurToDelete) {
      const resultat = await supprimerInterlocuteur(interlocuteurToDelete.id);

      if (resultat.succes) {
        setInterlocuteurMessage({ type: "success", text: resultat.message });

        chargerLesInterlocuteurs();
      } else {
        setInterlocuteurMessage({ type: "error", text: resultat.message });
      }

      setShowInterlocuteurDeleteConfirm(false);

      setInterlocuteurToDelete(null);

      setTimeout(() => setInterlocuteurMessage({ type: "", text: "" }), 3000);
    }
  };

  const validateInterlocuteurForm = () => {
    if (!interlocuteurFormData.nom.trim()) {
      setInterlocuteurMessage({
        type: "error",

        text: "Le nom de l'interlocuteur est obligatoire.",
      });

      return false;
    }

    if (!interlocuteurFormData.email.trim()) {
      setInterlocuteurMessage({
        type: "error",

        text: "L'email de l'interlocuteur est obligatoire.",
      });

      return false;
    }

    // Validation email simple

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(interlocuteurFormData.email.trim())) {
      setInterlocuteurMessage({
        type: "error",

        text: "L'email n'est pas valide.",
      });

      return false;
    }

    return true;
  };

  const handleInterlocuteurSubmit = async (e) => {
    e.preventDefault();

    setInterlocuteurMessage({ type: "", text: "" });

    if (!validateInterlocuteurForm()) return;

    let resultat;

    if (editingInterlocuteur) {
      resultat = await mettreAJourInterlocuteur(
        editingInterlocuteur.id,

        interlocuteurFormData,
      );
    } else {
      resultat = await creerInterlocuteur(interlocuteurFormData);
    }

    if (resultat.succes) {

      chargerLesInterlocuteurs();

      setShowInterlocuteurForm(false);

      setInterlocuteurFormData({
        nom: "",

        email: "",

        poste: "",

        telephone: "",

        actif: true,
      });

      setEditingInterlocuteur(null);

    } else {
      setInterlocuteurMessage({ type: "error", text: resultat.message });

      setTimeout(() => setInterlocuteurMessage({ type: "", text: "" }), 5000);
    }
  };

  const handleCancelInterlocuteur = () => {
    setShowInterlocuteurForm(false);

    setInterlocuteurFormData({
      nom: "",

      email: "",

      poste: "",

      telephone: "",

      actif: true,
    });

    setEditingInterlocuteur(null);

    setInterlocuteurMessage({ type: "", text: "" });
  };

  const renderPagination = (total, page, setPage) => {
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    const btnStyle = (disabled) => ({
      padding: "5px 10px", borderRadius: "6px", border: "1px solid #D1D5DB",
      backgroundColor: disabled ? "#F3F4F6" : "#fff", color: disabled ? "#9CA3AF" : "#374151",
      cursor: disabled ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "500",
    });
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "16px" }}>
        <button style={btnStyle(page === 1)} disabled={page === 1} onClick={() => setPage(1)}>«</button>
        <button style={btnStyle(page === 1)} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
        <span style={{ fontSize: "13px", color: "#6B7280", padding: "0 8px" }}>Page {page} / {totalPages}</span>
        <button style={btnStyle(page === totalPages)} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        <button style={btnStyle(page === totalPages)} disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
      </div>
    );
  };

  const subPages = {
    societes: {
      title: "Gestion des Sociétés",

      content: (
        <div>
          <div className="action-buttons">
            <PermissionGuard
              module="parametrage"
              submodule="societes"
              action="create"
            >
              <button className="btn-primary" onClick={handleCreateSociete}>
                Ajouter une société
              </button>
            </PermissionGuard>
          </div>

          {showSocieteForm && (
            <div className="modal-overlay" onClick={handleCancelSociete}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3>
                    {editingSociete
                      ? "Modifier la société"
                      : societePopupMode === "create"
                        ? "Créer une société"
                        : societePopupMode === "existing"
                          ? "Ajouter une société existante"
                          : societePopupMode === "delete"
                            ? "Supprimer une société"
                            : "Gestion des sociétés"}
                  </h3>
                </div>

                {societeMessage.text && (
                  <div
                    style={{
                      margin: "16px 24px 0 24px",
                      padding: "12px",
                      borderRadius: "6px",
                      backgroundColor:
                        societeMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                      border: `1px solid ${societeMessage.type === "error" ? "#fecaca" : "#a7f3d0"}`,
                      color:
                        societeMessage.type === "error" ? "#991b1b" : "#065f46",
                    }}
                  >
                    <p style={{ margin: 0 }}>{societeMessage.text}</p>
                  </div>
                )}

                {/* Mode choix */}
                {societePopupMode === "choice" && (
                  <div
                    style={{
                      padding: "32px 24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleChoixCreer}
                      style={{
                        padding: "16px",
                        margin: "0 64px",
                        fontSize: "15px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: "20px" }}></span>
                      Créer une société
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleChoixExistante}
                      style={{
                        padding: "16px",
                        margin: "0 64px",
                        fontSize: "15px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: "20px" }}></span>
                      Ajouter une société existante
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCancelSociete}
                      style={{
                        padding: "16px",
                        margin: "0 64px",
                        fontSize: "15px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {/* Mode création */}
                {(societePopupMode === "create" || editingSociete) && (
                  <form autoComplete="off" onSubmit={handleSocieteSubmit}>
                    <div className="form-group">
                      <label htmlFor="societeCode">
                        Code <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="societeCode"
                        name="code"
                        value={societeFormData.code}
                        onChange={handleSocieteInputChange}
                        placeholder="Ex: SAPHIR V3"
                        style={{ textTransform: "uppercase" }}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="societeNom">
                        Libellé <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="societeNom"
                        name="nom"
                        value={societeFormData.nom}
                        onChange={handleSocieteInputChange}
                        placeholder="Ex: DDI SAPHIR V3"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="societeDepartement">Département</label>
                      <input
                        type="text"
                        id="societeDepartement"
                        name="departement"
                        value={societeFormData.departement}
                        onChange={handleSocieteInputChange}
                        placeholder="Ex: Département Audit Interne"
                      />
                    </div>
                    <div className="modal-actions">
                      <button type="submit" className="btn-primary">
                        {editingSociete ? "Mettre à jour" : "Créer"}
                      </button>
                      {!editingSociete && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setSocietePopupMode("choice")}
                        >
                          ← Retour
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCancelSociete}
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                )}

                {/* Mode société existante */}
                {societePopupMode === "existing" && (
                  <div style={{ padding: "25px" }}>
                    <div className="form-group">
                      <label htmlFor="societeExistante">
                        Sélectionner un code société{" "}
                        <span className="required">*</span>
                      </label>
                      <select
                        id="societeExistante"
                        value={selectedExistingSociete}
                        onChange={(e) => {
                          setSelectedExistingSociete(e.target.value);
                          setSelectedExistingDepartement("");
                          setSelectedExistingLibelle("");
                        }}
                      >
                        <option value="">-- Choisir un code --</option>
                        {[
                          ...SOCIETES_EXISTANTES,
                          ...toutesSocietes
                            .map((s) => s.code)
                            .filter(
                              (code) => !SOCIETES_EXISTANTES.includes(code),
                            ),
                        ]
                          .filter(
                            (v, i, arr) => arr.indexOf(v) === i,
                          )
                          .map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                      </select>
                    </div>
                    {/* Champ libellé — toujours visible quand un code est sélectionné */}
                    {selectedExistingSociete && (
                      <div className="form-group">
                        <label htmlFor="libelleExistant">Libellé</label>
                        <input
                          type="text"
                          id="libelleExistant"
                          value={selectedExistingLibelle}
                          onChange={(e) =>
                            setSelectedExistingLibelle(e.target.value)
                          }
                          placeholder="À saisir manuellement (optionnel)"
                        />
                      </div>
                    )}
                    {/* Champ département texte libre — si pas de liste prédéfinie */}
                    {selectedExistingSociete &&
                      !DEPARTEMENTS_PAR_CODE[selectedExistingSociete] && (
                        <div className="form-group">
                          <label htmlFor="departementLibreExistant">
                            Département
                          </label>
                          <input
                            type="text"
                            id="departementLibreExistant"
                            value={selectedExistingDepartement}
                            onChange={(e) =>
                              setSelectedExistingDepartement(e.target.value)
                            }
                            placeholder="À saisir manuellement (optionnel)"
                          />
                        </div>
                      )}
                    {selectedExistingSociete &&
                      DEPARTEMENTS_PAR_CODE[selectedExistingSociete] && (
                        <div className="form-group">
                          <label htmlFor="departementExistant">
                            Département <span className="required">*</span>
                          </label>
                          <select
                            id="departementExistant"
                            value={selectedExistingDepartement}
                            onChange={(e) =>
                              setSelectedExistingDepartement(e.target.value)
                            }
                          >
                            <option value="">
                              -- Choisir un département --
                            </option>
                            {DEPARTEMENTS_PAR_CODE[selectedExistingSociete].map(
                              (dep) => (
                                <option key={dep} value={dep}>
                                  {dep}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      )}
                    {selectedExistingSociete &&
                      (() => {
                        const s = toutesSocietes.find(
                          (x) =>
                            x.code.toUpperCase() ===
                            selectedExistingSociete.toUpperCase(),
                        );
                        // N'afficher la prévisualisation que si un libellé distinct du code a été renseigné
                        if (!s || s.nom.toUpperCase() === s.code.toUpperCase())
                          return null;
                        return (
                          <div
                            style={{
                              background: "#f0f9ff",
                              border: "1px solid #bae6fd",
                              borderRadius: "6px",
                              padding: "10px 14px",
                              marginBottom: "12px",
                              fontSize: "13px",
                            }}
                          >
                            <div>
                              <span style={{ color: "#6b7280" }}>
                                Libellé :
                              </span>{" "}
                              <strong>{s.nom}</strong>
                            </div>
                          </div>
                        );
                      })()}
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSubmitExistante}
                      >
                        Ajouter
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setSocietePopupMode("choice")}
                      >
                        ← Retour
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCancelSociete}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode suppression définitive */}
                {societePopupMode === "delete" && (
                  <div style={{ padding: "20px" }}>
                    <p
                      style={{
                        color: "#6b7280",
                        fontSize: "13px",
                        margin: "0 0 12px 0",
                      }}
                    >
                      Sélectionnez une société à supprimer définitivement.
                    </p>
                    {toutesSocietes.filter((s) => s.source === "creee").length === 0 ? (
                      <p style={{ color: "#9ca3af" }}>Aucune société créée.</p>
                    ) : (
                      <div
                        style={{
                          maxHeight: "280px",
                          overflowY: "auto",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                        }}
                      >
                        {toutesSocietes.filter((s) => s.source === "creee").map((societe) => (
                          <div
                            key={societe.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px 14px",
                              borderBottom: "1px solid #f3f4f6",
                              backgroundColor: societe.actif
                                ? "#fff"
                                : "#f9fafb",
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontWeight: "600",
                                  marginRight: "8px",
                                }}
                              >
                                {societe.nom}
                              </span>
                              {!societe.actif && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "#9ca3af",
                                    fontStyle: "italic",
                                  }}
                                >
                                  archivée
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn-danger"
                              style={{ padding: "4px 10px", fontSize: "12px" }}
                              onClick={() =>
                                handlePermanentDeleteSociete(societe)
                              }
                            >
                              Supprimer
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div
                      className="modal-actions"
                      style={{ marginTop: "16px" }}
                    >
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setSocietePopupMode("choice")}
                      >
                        ← Retour
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCancelSociete}
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="table-container" style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "10px", flexWrap: "wrap" }}>
              {(!loading && societes.length > 0) && <h3 style={{ margin: 0 }}>Liste des sociétés</h3>}
              {societes.length >= 5 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ position: "relative" }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "12px", pointerEvents: "none" }} />
                  <input type="text" placeholder="Rechercher..." value={rechercheSocietes} onChange={e => setRechercheSocietes(e.target.value)}
                    style={{ padding: "7px 10px 7px 30px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", width: "180px", outline: "none" }} />
                </div>
                <select value={filtreStatutSocietes} onChange={e => setFiltreStatutSocietes(e.target.value)}
                  className="form-select form-select-sm" style={{ width: "130px" }}>
                  <option value="tous">Tous</option>
                  <option value="actif">Actifs</option>
                  <option value="inactif">Désactivés</option>
                </select>
              </div>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "32px", color: "#4A90E2" }} />
              </div>
            ) : societesFiltrees.length === 0 ? (
              societes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <i className="fa-solid fa-building" style={{ fontSize: "52px", color: "#E5E7EB", display: "block", marginBottom: "16px", marginTop: "119px" }} />
                  <p style={{ margin: 0, fontSize: "14px", color: "#9CA3AF" }}>Aucune société créée pour le moment.</p>
                </div>
              ) : (
                <p style={{ color: "#6b7280", marginTop: "16px", textAlign: "center" }}>
                  {filtreStatutSocietes === "actif" ? "Aucune société active." : filtreStatutSocietes === "inactif" ? "Aucune société désactivée." : "Aucun résultat pour cette recherche."}
                </p>
              )
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Libellé</th>
                    <th>Département</th>
                    {aActionsSocietes && <th>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {societesFiltrees.slice((pageSocietes - 1) * ITEMS_PER_PAGE, pageSocietes * ITEMS_PER_PAGE).map((societe) => (
                    <tr key={societe.id} style={{ opacity: societe.actif === false ? 0.6 : 1, backgroundColor: societe.actif === false ? "#F3F4F6" : "inherit" }}>
                      <td>
                        <span
                          style={{
                            backgroundColor: "#e0e7ff",
                            color: "#3730a3",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontWeight: "600",
                            fontSize: "13px",
                          }}
                        >
                          {societe.code}
                        </span>
                      </td>
                      <td>{societe.nom}</td>
                      <td>
                        {societe.departement || (
                          <span style={{ color: "#9ca3af" }}>—</span>
                        )}
                      </td>
                      {aActionsSocietes && (
                        <td style={{ whiteSpace: "nowrap" }}>
                          <PermissionGuard module="parametrage" submodule="societes" action="update">
                            <button
                              onClick={() => handleEditSociete(societe)}
                              data-tooltip-id="param-tooltip" data-tooltip-content="Modifier"
                              style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "#DBEAFE", color: "#1E40AF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px", marginRight: "4px" }}
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                          </PermissionGuard>
                          <PermissionGuard module="parametrage" submodule="societes" action="delete">
                            <button
                              onClick={() => handleToggleActivationSociete(societe)}
                              data-tooltip-id="param-tooltip" data-tooltip-content={societe.actif !== false ? "Désactiver" : "Activer"}
                              style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: societe.actif !== false ? "#FEF3C7" : "#D1FAE5", color: societe.actif !== false ? "#92400E" : "#065F46", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}
                            >
                              <i className={societe.actif !== false ? "fa-solid fa-ban" : "fa-solid fa-circle-check"}></i>
                            </button>
                          </PermissionGuard>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {renderPagination(societesFiltrees.length, pageSocietes, setPageSocietes)}
          </div>
        </div>
      ),
    },

    uo: {
      title: "Gestion des Unités Organisationnelles",

      content: (
        <div>
          <div className="action-buttons">
            <PermissionGuard
              module="parametrage"
              submodule="uo"
              action="create"
            >
              <button className="btn-primary" onClick={handleCreateUO}>
                Ajouter une unité organisationnelle
              </button>
            </PermissionGuard>
          </div>

          {showUOForm && (
            <div className="modal-overlay" onClick={handleCancelUO}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "600px" }}
              >
                <div className="modal-header">
                  <h3>
                    {editingUO
                      ? "Modifier l'unité organisationnelle"
                      : "Ajouter une unité organisationnelle"}
                  </h3>

                </div>

                {uoMessage.text && (
                  <div
                    className={`info-box ${
                      uoMessage.type === "error" ? "error-box" : "success-box"
                    }`}
                    style={{
                      margin: "16px 24px 0 24px",

                      padding: "12px",

                      borderRadius: "6px",

                      backgroundColor:
                        uoMessage.type === "error" ? "#fee2e2" : "#d1fae5",

                      border: `1px solid ${
                        uoMessage.type === "error" ? "#fecaca" : "#a7f3d0"
                      }`,

                      color: uoMessage.type === "error" ? "#991b1b" : "#065f46",
                    }}
                  >
                    <p style={{ margin: 0 }}>{uoMessage.text}</p>
                  </div>
                )}

                <form autoComplete="off" onSubmit={handleUOSubmit}>
                  <div className="form-group">
                    <label htmlFor="uoCode">Code (acronyme)</label>
                    <input
                      type="text"
                      id="uoCode"
                      name="code"
                      value={uoFormData.code}
                      onChange={handleUOInputChange}
                      placeholder="Ex: DEV-WEB, STAFF-DDI..."
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="uoSocieteCode">
                      Société <span className="required">*</span>
                    </label>
                    <select
                      id="uoSocieteCode"
                      value={uoSelectedCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setUoSelectedCode(code);
                        const entrees = toutesSocietes.filter(
                          (s) => s.code === code && s.actif,
                        );
                        if (entrees.length === 1) {
                          // Une seule entrée → auto-sélectionner
                          setUOFormData((prev) => ({
                            ...prev,
                            societeId: String(entrees[0].id),
                            departement: entrees[0].departement || "",
                            nom: "",
                          }));
                        } else {
                          // Plusieurs entrées → attendre le choix de département
                          setUOFormData((prev) => ({
                            ...prev,
                            societeId: "",
                            departement: "",
                            nom: "",
                          }));
                        }
                        if (uoMessage.text)
                          setUOMessage({ type: "", text: "" });
                      }}
                    >
                      <option value="">-- Choisir une société --</option>
                      {[...new Set(toutesSocietes.filter((s) => s.actif).map((s) => s.code))]
                        .sort()
                        .map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Département : toujours visible quand une société est sélectionnée */}
                  {uoSelectedCode && (
                    <div className="form-group">
                      <label htmlFor="uoDepartement">
                        Département
                        {(DEPARTEMENTS_PAR_CODE[uoSelectedCode] ||
                          toutesSocietes.filter((s) => s.code === uoSelectedCode && s.actif).length > 1) && (
                          <span className="required"> *</span>
                        )}
                      </label>
                      {DEPARTEMENTS_PAR_CODE[uoSelectedCode] ? (
                        <select
                          id="uoDepartement"
                          value={uoFormData.departement}
                          onChange={(e) => handleUODeptChange(e.target.value)}
                        >
                          <option value="">-- Choisir un département --</option>
                          {DEPARTEMENTS_PAR_CODE[uoSelectedCode].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      ) : toutesSocietes.filter((s) => s.code === uoSelectedCode && s.actif).length > 1 ? (
                        <select
                          id="uoDepartement"
                          value={uoFormData.departement}
                          onChange={(e) => {
                            const dept = e.target.value;
                            const societe = toutesSocietes.find(
                              (s) => s.code === uoSelectedCode && s.actif && (s.departement || "") === dept
                            );
                            setUOFormData((prev) => ({
                              ...prev,
                              departement: dept,
                              societeId: societe ? String(societe.id) : "",
                            }));
                          }}
                        >
                          <option value="">-- Choisir un département --</option>
                          {toutesSocietes
                            .filter((s) => s.code === uoSelectedCode && s.actif)
                            .map((s) => (
                              <option key={s.id} value={s.departement || ""}>
                                {s.departement || "(sans département)"}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          id="uoDepartement"
                          name="departement"
                          value={uoFormData.departement}
                          onChange={handleUOInputChange}
                          placeholder="Ex: Département Informatique"
                        />
                      )}
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="uoNom">
                      Libellé du service <span className="required">*</span>
                    </label>
                    {toutesSocietes.find(
                      (s) => s.id === parseInt(uoFormData.societeId),
                    )?.code === "GS2E" || uoFormData.societeId === "GS2E" ? (
                      <select
                        id="uoNom"
                        name="nom"
                        value={uoFormData.nom}
                        onChange={handleUOInputChange}
                      >
                        <option value="">-- Choisir un service --</option>
                        {[
                          "Service Intégration Fonctionnelle et QSE",
                          "Service Cohérence SAPHIR V3",
                          "Service Développement Support V3",
                          "Service Gestion Clientele CIE",
                          "Service Développement OPEN SOURCE",
                          "Service STAFF DDI",
                          "Service Développement SAPHIR V3",
                          "Service Interface",
                          "Service Cohérence Caisse Comptabilité",
                          "Service Développement et Support Technologies Microsoft",
                          "Service Développement Caisse/Comptabilité",
                          "Service Développement Éditiques",
                          "SERVICE SUPPORT",
                          "Service Développement Processus Transverses",
                          "Service Testing Factory",
                          "Service Cohérence Demande",
                          "Service TNR",
                          "Service Développement Demandes",
                          "Service PIC et Migration",
                          "Service Gestion De Projets",
                          "SERVICE DEVELOPPEMENT WEB MOBILE ET LOT",
                          "Service Développement Facturation et Recouvrement",
                          "Service De Gestion Clientele SODECI",
                          "Service Cohérence Facturation",
                        ].map((service) => (
                          <option key={service} value={service}>
                            {service}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        id="uoNom"
                        name="nom"
                        value={uoFormData.nom}
                        onChange={handleUOInputChange}
                        placeholder="Nom complet du service"
                        maxLength={100}
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="uoChefUO">Chef de l'UO</label>
                    <input
                      type="text"
                      id="uoChefUO"
                      name="chefUO"
                      value={uoFormData.chefUO}
                      onChange={handleUOInputChange}
                      placeholder="Nom du chef de l'unité organisationnelle"
                    />
                  </div>

                  <div className="modal-actions">
                    <button type="submit" className="btn-primary">
                      {editingUO ? "Mettre à jour" : "Créer"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCancelUO}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-container" style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "10px", flexWrap: "wrap" }}>
              {(!loading && uoList.length > 0) && <h3 style={{ margin: 0 }}>Liste des unités organisationnelles</h3>}
              {uoList.length >= 5 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ position: "relative" }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "12px", pointerEvents: "none" }} />
                  <input type="text" placeholder="Rechercher..." value={rechercheUO} onChange={e => setRechercheUO(e.target.value)}
                    style={{ padding: "7px 10px 7px 30px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", width: "180px", outline: "none" }} />
                </div>
                <select value={filtreStatutUO} onChange={e => setFiltreStatutUO(e.target.value)}
                  className="form-select form-select-sm" style={{ width: "130px" }}>
                  <option value="tous">Tous</option>
                  <option value="actif">Actifs</option>
                  <option value="inactif">Désactivés</option>
                </select>
              </div>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "32px", color: "#4A90E2" }} />
              </div>
            ) : uoFiltrees.length === 0 ? (
              uoList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <i className="fa-solid fa-sitemap" style={{ fontSize: "52px", color: "#E5E7EB", display: "block", marginBottom: "16px", marginTop: "119px" }} />
                  <p style={{ margin: 0, fontSize: "14px", color: "#9CA3AF" }}>Aucune unité organisationnelle créée pour le moment.</p>
                </div>
              ) : (
                <p style={{ color: "#6b7280", marginTop: "16px", textAlign: "center" }}>
                  {filtreStatutUO === "actif" ? "Aucune unité active." : filtreStatutUO === "inactif" ? "Aucune unité désactivée." : "Aucun résultat pour cette recherche."}
                </p>
              )
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Libellé du service</th>
                    <th>Chef de l'UO</th>
                    <th>Société</th>
                    <th>Département</th>
                    {aActionsUO && <th>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {uoFiltrees.slice((pageUO - 1) * ITEMS_PER_PAGE, pageUO * ITEMS_PER_PAGE).map((uo) => (
                    <tr key={uo.id} style={uo.actif === false ? { opacity: 0.6, backgroundColor: "#F3F4F6" } : {}}>
                      <td>
                        {uo.code ? (
                          <span
                            style={{
                              backgroundColor: "#e0e7ff",
                              color: "#3730a3",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontWeight: "600",
                              fontSize: "13px",
                            }}
                          >
                            {uo.code}
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>—</span>
                        )}
                      </td>
                      <td>
                        {uo.nom || <span style={{ color: "#9ca3af" }}>—</span>}
                      </td>
                      <td>
                        {uo.chefUO || (
                          <span style={{ color: "#9ca3af" }}>—</span>
                        )}
                      </td>
                      <td>
                        {(() => {
                          const s = societes.find((s) => s.id === uo.societeId);
                          return s ? (
                            <span
                              style={{
                                backgroundColor: "#e0e7ff",
                                color: "#3730a3",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontWeight: "600",
                                fontSize: "13px",
                              }}
                            >
                              {s.code}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          );
                        })()}
                      </td>
                      <td>
                        {uo.departement || (
                          <span style={{ color: "#9ca3af" }}>—</span>
                        )}
                      </td>
                      {aActionsUO && (
                        <td style={{ whiteSpace: "nowrap" }}>
                          <PermissionGuard module="parametrage" submodule="uo" action="update">
                            <button
                              onClick={() => handleEditUO(uo)}
                              disabled={uo.actif === false}
                              data-tooltip-id="param-tooltip" data-tooltip-content="Modifier"
                              style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: uo.actif === false ? "#F3F4F6" : "#DBEAFE", color: uo.actif === false ? "#D1D5DB" : "#1E40AF", cursor: uo.actif === false ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px", marginRight: "4px" }}
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                          </PermissionGuard>
                          <PermissionGuard module="parametrage" submodule="uo" action="delete">
                            <button
                              onClick={() => handleToggleActivationUO(uo)}
                              data-tooltip-id="param-tooltip" data-tooltip-content={uo.actif !== false ? "Désactiver" : "Activer"}
                              style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: uo.actif !== false ? "#FEF3C7" : "#D1FAE5", color: uo.actif !== false ? "#92400E" : "#065F46", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}
                            >
                              <i className={uo.actif !== false ? "fa-solid fa-ban" : "fa-solid fa-circle-check"}></i>
                            </button>
                          </PermissionGuard>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {renderPagination(uoFiltrees.length, pageUO, setPageUO)}
          </div>
        </div>
      ),
    },

    statuts: {
      title: "Gestion des Statuts",

      content: (
        <div>
          <div className="action-buttons">
            <PermissionGuard
              module="parametrage"
              submodule="statuts"
              action="create"
            >
              <button className="btn-primary" onClick={handleCreateStatut}>
                Ajouter un statut
              </button>
            </PermissionGuard>
          </div>

          {showStatutForm && (
            <div className="modal-overlay" onClick={handleCancelStatut}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "600px" }}
              >
                <div className="modal-header">
                  <h3>
                    {editingStatut ? "Modifier le statut" : "Ajouter un statut"}
                  </h3>

                </div>

                {statutMessage.text && (
                  <div
                    className={`info-box ${
                      statutMessage.type === "error"
                        ? "error-box"
                        : "success-box"
                    }`}
                    style={{
                      margin: "16px 24px 0 24px",

                      padding: "12px",

                      borderRadius: "6px",

                      backgroundColor:
                        statutMessage.type === "error" ? "#fee2e2" : "#d1fae5",

                      border: `1px solid ${
                        statutMessage.type === "error" ? "#fecaca" : "#a7f3d0"
                      }`,

                      color:
                        statutMessage.type === "error" ? "#991b1b" : "#065f46",
                    }}
                  >
                    <p style={{ margin: 0, whiteSpace: "pre-line" }}>
                      {statutMessage.text}
                    </p>

                    {statutMessage.details && (
                      <p
                        style={{
                          margin: "8px 0 0 0",

                          fontSize: "0.9em",

                          fontStyle: "italic",

                          opacity: 0.8,
                        }}
                      >
                        {statutMessage.details}
                      </p>
                    )}
                  </div>
                )}

                <form autoComplete="off" onSubmit={handleStatutSubmit}>
                  <div className="form-group">
                    <label htmlFor="statutNom">
                      Nom du statut <span className="required">*</span>
                    </label>

                    <input
                      type="text"
                      id="statutNom"
                      name="nom"
                      value={statutFormData.nom}
                      onChange={handleStatutInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="statutDescription">Description</label>

                    <textarea
                      id="statutDescription"
                      name="description"
                      value={statutFormData.description}
                      onChange={handleStatutInputChange}
                      rows="4"
                    />
                  </div>

                  <div className="modal-actions">
                    <button type="submit" className="btn-primary">
                      {editingStatut ? "Mettre à jour" : "Créer"}
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCancelStatut}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-container" style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "10px", flexWrap: "wrap" }}>
              {(!loading && statuts.length > 0) && <h3 style={{ margin: 0 }}>Liste des statuts</h3>}
              {statuts.length >= 5 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ position: "relative" }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "12px", pointerEvents: "none" }} />
                  <input type="text" placeholder="Rechercher..." value={rechercheStatuts} onChange={e => setRechercheStatuts(e.target.value)}
                    style={{ padding: "7px 10px 7px 30px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", width: "180px", outline: "none" }} />
                </div>
                <select value={filtreStatutStatuts} onChange={e => setFiltreStatutStatuts(e.target.value)}
                  className="form-select form-select-sm" style={{ width: "130px" }}>
                  <option value="tous">Tous</option>
                  <option value="actif">Actifs</option>
                  <option value="inactif">Désactivés</option>
                </select>
              </div>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "32px", color: "#4A90E2" }} />
              </div>
            ) : statutsFiltrees.length === 0 ? (
              statuts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <i className="fa-solid fa-tags" style={{ fontSize: "52px", color: "#E5E7EB", display: "block", marginBottom: "16px", marginTop: "119px" }} />
                  <p style={{ margin: 0, fontSize: "14px", color: "#9CA3AF" }}>Aucun statut créé pour le moment.</p>
                </div>
              ) : (
                <p style={{ color: "#6b7280", marginTop: "16px", textAlign: "center" }}>
                  {filtreStatutStatuts === "actif" ? "Aucun statut actif." : filtreStatutStatuts === "inactif" ? "Aucun statut désactivé." : "Aucun résultat pour cette recherche."}
                </p>
              )
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>

                    <th>Description</th>

                    <th>Statut</th>

                    {aActionsStatuts && <th>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {statutsFiltrees.slice((pageStatuts - 1) * ITEMS_PER_PAGE, pageStatuts * ITEMS_PER_PAGE).map((statut, sliceIdx) => {
                    const index = (pageStatuts - 1) * ITEMS_PER_PAGE + sliceIdx;
                    return (
                    <tr
                      key={statut.id}
                      onDragEnter={() => { dragOverStatutIndex.current = index; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnd={handleStatutDragEnd}
                    >
                      <td style={{ userSelect: "none" }}>
                        <span
                          draggable
                          onDragStart={() => { dragStatutIndex.current = index; }}
                          title="Glisser pour réordonner"
                          style={{ marginRight: "8px", color: "#9CA3AF", fontSize: "14px", cursor: "grab" }}
                        >⠿</span>
                        {statut.nom}
                      </td>

                      <td>{statut.description || "-"}</td>

                      <td>
                        <PermissionGuard module="parametrage" submodule="statuts" action="update" fallback={
                          <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", backgroundColor: statut.actif ? "#d1fae5" : "#fee2e2", color: statut.actif ? "#065f46" : "#991b1b" }}>
                            {statut.actif ? "Actif" : "Non actif"}
                          </span>
                        }>
                          <span
                            onClick={() => handleToggleActivationStatut(statut)}
                            title={statut.actif ? "Cliquer pour désactiver" : "Cliquer pour activer"}
                            style={{ display: "inline-block", padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", cursor: "pointer", userSelect: "none", backgroundColor: statut.actif ? "#d1fae5" : "#fee2e2", color: statut.actif ? "#065f46" : "#991b1b", transition: "opacity 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                          >
                            {statut.actif ? "Actif" : "Non actif"}
                          </span>
                        </PermissionGuard>
                      </td>

                      {aActionsStatuts && (
                        <td style={{ whiteSpace: "nowrap" }}>
                          <PermissionGuard module="parametrage" submodule="statuts" action="update">
                            <button
                              onClick={() => handleEditStatut(statut)}
                              data-tooltip-id="param-tooltip" data-tooltip-content="Modifier"
                              style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "#DBEAFE", color: "#1E40AF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px", marginRight: "4px" }}
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                          </PermissionGuard>
                          <PermissionGuard module="parametrage" submodule="statuts" action="delete">
                            <button
                              onClick={() => handleDeleteStatut(statut)}
                              data-tooltip-id="param-tooltip" data-tooltip-content="Supprimer"
                              style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "#FEE2E2", color: "#991B1B", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </PermissionGuard>
                        </td>
                      )}
                    </tr>
                  ); })}
                </tbody>
              </table>
            )}
            {renderPagination(statutsFiltrees.length, pageStatuts, setPageStatuts)}
          </div>
        </div>
      ),
    },

    interlocuteurs: {
      title: "Gestion des interlocuteurs",

      content: (
        <div>
          {/* Section Interlocuteurs */}

          <div style={{ marginBottom: "48px" }}>
            <div className="action-buttons">
              <PermissionGuard
                module="parametrage"
                submodule="interlocuteurs"
                action="create"
              >
                <button
                  className="btn-primary"
                  onClick={handleCreateInterlocuteur}
                >
                  Ajouter un interlocuteur
                </button>
              </PermissionGuard>
            </div>

            {interlocuteurMessage.text && (
              <div
                className={`info-box ${
                  interlocuteurMessage.type === "error"
                    ? "error-box"
                    : "success-box"
                }`}
                style={{
                  margin: "16px 0",

                  backgroundColor:
                    interlocuteurMessage.type === "error"
                      ? "#fee2e2"
                      : "#d1fae5",

                  borderColor:
                    interlocuteurMessage.type === "error"
                      ? "#fecaca"
                      : "#a7f3d0",

                  color:
                    interlocuteurMessage.type === "error"
                      ? "#991b1b"
                      : "#065f46",
                }}
              >
                <p style={{ margin: 0 }}>{interlocuteurMessage.text}</p>
              </div>
            )}

            {showInterlocuteurForm && (
              <div
                className="modal-overlay"
                onClick={handleCancelInterlocuteur}
              >
                <div
                  className="modal-content"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: "620px" }}
                >
                  <div className="modal-header">
                    <h3>
                      {editingInterlocuteur
                        ? "Modifier l'interlocuteur"
                        : "Ajouter un interlocuteur"}
                    </h3>

                  </div>

                  <form autoComplete="off" onSubmit={handleInterlocuteurSubmit}>
                    <div className="form-group">
                      <label htmlFor="collabNom">
                        Nom et prenoms <span className="required">*</span>
                      </label>

                      <input
                        type="text"
                        id="collabNom"
                        name="nom"
                        value={interlocuteurFormData.nom}
                        onChange={handleInterlocuteurInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="collabEmail">
                        Email <span className="required">*</span>
                      </label>

                      <input
                        type="email"
                        id="collabEmail"
                        name="email"
                        value={interlocuteurFormData.email}
                        onChange={handleInterlocuteurInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="collabTelephone">Téléphone</label>

                      <input
                        type="tel"
                        id="collabTelephone"
                        name="telephone"
                        value={interlocuteurFormData.telephone}
                        onChange={handleInterlocuteurInputChange}
                        placeholder="+225..."
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="collabUO">Structure UO</label>
                      <select
                        id="collabUO"
                        name="uoId"
                        value={interlocuteurFormData.uoId}
                        onChange={handleInterlocuteurInputChange}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      >
                        <option value="">— Sélectionner une UO —</option>
                        {uoList.map((uo) => (
                          <option key={uo.id} value={uo.id}>
                            {uo.code ? `${uo.code} - ` : ""}
                            {uo.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="modal-actions">
                      <button type="submit" className="btn-primary">
                        {editingInterlocuteur ? "Mettre à jour" : "Créer"}
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCancelInterlocuteur}
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="table-container" style={{ marginTop: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "10px", flexWrap: "wrap" }}>
                {(!loading && interlocuteurs.length > 0) && <h3 style={{ margin: 0 }}>Liste des interlocuteurs</h3>}
                {interlocuteurs.length >= 5 && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ position: "relative" }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "12px", pointerEvents: "none" }} />
                    <input type="text" placeholder="Rechercher..." value={rechercheInterlocuteurs} onChange={e => setRechercheInterlocuteurs(e.target.value)}
                      style={{ padding: "7px 10px 7px 30px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", width: "180px", outline: "none" }} />
                  </div>
                  <select value={filtreStatutInterlocuteurs} onChange={e => setFiltreStatutInterlocuteurs(e.target.value)}
                    className="form-select form-select-sm" style={{ width: "130px" }}>
                    <option value="tous">Tous</option>
                    <option value="actif">Actifs</option>
                    <option value="inactif">Désactivés</option>
                  </select>
                </div>
                )}
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "32px", color: "#4A90E2" }} />
                </div>
              ) : interlocuteursFiltrees.length === 0 ? (
                interlocuteurs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0" }}>
                    <i className="fa-solid fa-address-book" style={{ fontSize: "52px", color: "#E5E7EB", display: "block", marginBottom: "16px", marginTop: "119px" }} />
                    <p style={{ margin: 0, fontSize: "14px", color: "#9CA3AF" }}>Aucun interlocuteur créé pour le moment.</p>
                  </div>
                ) : (
                  <p style={{ color: "#6b7280", marginTop: "16px", textAlign: "center" }}>
                    {filtreStatutInterlocuteurs === "actif" ? "Aucun interlocuteur actif." : filtreStatutInterlocuteurs === "inactif" ? "Aucun interlocuteur désactivé." : "Aucun résultat pour cette recherche."}
                  </p>
                )
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nom et prenoms</th>
                      <th>Email</th>
                      <th>Téléphone</th>
                      <th>Structure UO</th>

                      {aActionsInterlocuteurs && <th>Actions</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {interlocuteursFiltrees.slice((pageInterlocuteurs - 1) * ITEMS_PER_PAGE, pageInterlocuteurs * ITEMS_PER_PAGE).map((interlocuteur) => (
                      <tr key={interlocuteur.id} style={interlocuteur.actif === false ? { opacity: 0.6, backgroundColor: "#F3F4F6" } : {}}>
                        <td>{interlocuteur.nom}</td>

                        <td>{interlocuteur.email}</td>

                        <td>{interlocuteur.telephone || "-"}</td>
                        <td>
                          {interlocuteur.uoId ? (
                            (() => {
                              const uo = uoList.find(
                                (u) => u.id === interlocuteur.uoId,
                              );
                              return uo ? (
                                <span style={{ fontSize: "13px" }}>
                                  {uo.code ? <strong>{uo.code}</strong> : null}
                                  {uo.code ? " — " : ""}
                                  {uo.nom}
                                </span>
                              ) : (
                                interlocuteur.structureUO || "—"
                              );
                            })()
                          ) : interlocuteur.structureUO ? (
                            <span style={{ fontSize: "13px" }}>{interlocuteur.structureUO}</span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                        {aActionsInterlocuteurs && (
                          <td style={{ whiteSpace: "nowrap" }}>
                            <PermissionGuard module="parametrage" submodule="interlocuteurs" action="update">
                              <button
                                onClick={() => handleEditInterlocuteur(interlocuteur)}
                                disabled={interlocuteur.actif === false}
                                data-tooltip-id="param-tooltip" data-tooltip-content="Modifier"
                                style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: interlocuteur.actif === false ? "#F3F4F6" : "#DBEAFE", color: interlocuteur.actif === false ? "#D1D5DB" : "#1E40AF", cursor: interlocuteur.actif === false ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px", marginRight: "4px" }}
                              >
                                <i className="fa-solid fa-pen"></i>
                              </button>
                            </PermissionGuard>
                            <PermissionGuard module="parametrage" submodule="interlocuteurs" action="delete">
                              <button
                                onClick={() => handleToggleActivationInterlocuteur(interlocuteur)}
                                data-tooltip-id="param-tooltip" data-tooltip-content={interlocuteur.actif !== false ? "Désactiver" : "Activer"}
                                style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: interlocuteur.actif !== false ? "#FEF3C7" : "#D1FAE5", color: interlocuteur.actif !== false ? "#92400E" : "#065F46", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}
                              >
                                <i className={interlocuteur.actif !== false ? "fa-solid fa-ban" : "fa-solid fa-circle-check"}></i>
                              </button>
                            </PermissionGuard>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {renderPagination(interlocuteursFiltrees.length, pageInterlocuteurs, setPageInterlocuteurs)}
            </div>
          </div>
        </div>
      ),
    },
  };

  return (
    <div className="page-container">
      <Tooltip id="param-tooltip" place="top" style={{ backgroundColor: "#1F2937", color: "#fff", borderRadius: "4px", fontSize: "10px", fontWeight: "500", padding: "2px 5px", zIndex: 9999 }} />
      <div className="page-header">
        <h1>{subPages[activeSubPage].title}</h1>

        <p>Configurez les paramètres du système</p>
      </div>

      <div className="page-content">{subPages[activeSubPage].content}</div>

      {/* Popup de confirmation de suppression de statut */}

      {showStatutDeleteConfirm && statutToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteStatut}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>Confirmer la suppression</h3>
            </div>

            <div className="confirm-modal-body">
              <p style={{ textAlign: "center", marginBottom: "10px" }}>
                <strong>ATTENTION ! </strong>
              </p>
              <p style={{ color: "#dc2626" }}>
                Êtes-vous sûr de vouloir supprimer le statut{" "}
                <strong>"{statutToDelete.nom}"</strong> ?
              </p>
            </div>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteStatut}
              >
                Supprimer
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDeleteStatut}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmation de suppression d'UO */}

      {showUODeleteConfirm && uoToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteUO}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>Confirmer la suppression</h3>
            </div>

            <div className="confirm-modal-body">
              <p>
                Êtes-vous sûr de vouloir supprimer l'unité organisationnelle{" "}
                <strong>"{uoToDelete.nom}"</strong> ?
              </p>

              <p className="confirm-warning">
                Cette action est irréversible. Une UO ne peut pas être supprimée
                si elle contient des utilisateurs ou des UO filles.
              </p>
            </div>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteUO}
              >
                Supprimer
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDeleteUO}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmation de suppression de société */}

      {showSocieteDeleteConfirm && societeToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteSociete}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>
                {societeDeleteMode === "permanent"
                  ? "Suppression définitive"
                  : "Retirer de la liste"}
              </h3>
            </div>

            <div className="confirm-modal-body">
              <p>
                {societeDeleteMode === "permanent" ? (
                  <>
                    Êtes-vous sûr de vouloir supprimer définitivement la société{" "}
                    <strong>"{societeToDelete.nom}"</strong> ?
                  </>
                ) : (
                  <>
                    Êtes-vous sûr de vouloir retirer la société{" "}
                    <strong>"{societeToDelete.nom}"</strong> de la liste active
                    ?
                  </>
                )}
              </p>

              <p className="confirm-warning">
                {societeDeleteMode === "permanent"
                  ? "Cette action est irréversible."
                  : "La société restera disponible pour être réajoutée ultérieurement."}
              </p>
            </div>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteSociete}
              >
                {societeDeleteMode === "permanent"
                  ? "Supprimer définitivement"
                  : "Retirer"}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDeleteSociete}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup société attribuée à une UO */}
      {showSocieteOccupeeModal && (
        <div className="modal-overlay" onClick={() => setShowSocieteOccupeeModal(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header" style={{ backgroundColor: "#FEF3C7", borderBottom: "1px solid #FDE68A", borderRadius: "12px 12px 0 0" }}>
              <h3 style={{ color: "#92400E" }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "8px" }}></i>
                Désactivation impossible
              </h3>
            </div>
            <div className="confirm-modal-body">
              <p>
                La société <strong>"{societeOccupeeName}"</strong> est attribuée à une ou plusieurs unités organisationnelles.
              </p>
              <p style={{ color: "#6B7280", fontSize: "14px" }}>
                Veuillez d'abord retirer cette société des unités organisationnelles concernées avant de la désactiver.
              </p>
            </div>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowSocieteOccupeeModal(false)}
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal désactivation UO */}
      {showDeactivateUOModal && uoToToggle && (
        <div className="modal-overlay" onClick={() => setShowDeactivateUOModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "460px", width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderRadius: "12px 12px 0 0" }}>
              <h3 style={{ margin: 0 }}>Désactiver l'unité organisationnelle</h3>
            </div>
            <div style={{ padding: "24px 32px" }}>
              <p style={{ fontSize: "14px", color: "#4B5563", marginBottom: "20px" }}>
                Vous allez désactiver l'UO <strong>"{uoToToggle.nom}"</strong>.<br />
                Veuillez indiquer le motif de désactivation.
              </p>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "8px" }}>
                Motif de désactivation <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <textarea
                value={motifDesactivationUO}
                onChange={(e) => setMotifDesactivationUO(e.target.value)}
                placeholder="Entrez le motif de désactivation..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "14px",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                autoFocus
              />
              {!motifDesactivationUO.trim() && (
                <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "6px" }}>
                  Le motif est obligatoire
                </p>
              )}
            </div>
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              padding: "16px 32px 24px 32px",
              borderTop: "1px solid #e5e7eb",
            }}>
              <button className="btn-secondary" onClick={() => setShowDeactivateUOModal(false)}>
                Annuler
              </button>
              <button
                onClick={confirmDeactivationUO}
                disabled={!motifDesactivationUO.trim()}
                style={{
                  padding: "8px 20px",
                  backgroundColor: motifDesactivationUO.trim() ? "#F59E0B" : "#D1D5DB",
                  color: motifDesactivationUO.trim() ? "#fff" : "#9CA3AF",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: motifDesactivationUO.trim() ? "pointer" : "not-allowed",
                }}
              >
                Confirmer la désactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal désactivation Interlocuteur */}
      {showDeactivateInterlocuteurModal && interlocuteurToToggle && (
        <div className="modal-overlay" onClick={() => setShowDeactivateInterlocuteurModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "460px", width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderRadius: "12px 12px 0 0" }}>
              <h3 style={{ margin: 0 }}>Désactiver l'interlocuteur</h3>
            </div>
            <div style={{ padding: "24px 32px" }}>
              <p style={{ fontSize: "14px", color: "#4B5563", marginBottom: "20px" }}>
                Vous allez désactiver l'interlocuteur <strong>"{interlocuteurToToggle.nom}"</strong>.<br />
                Veuillez indiquer le motif de désactivation.
              </p>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "8px" }}>
                Motif de désactivation <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <textarea
                value={motifDesactivationInterlocuteur}
                onChange={(e) => setMotifDesactivationInterlocuteur(e.target.value)}
                placeholder="Entrez le motif de désactivation..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "14px",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                autoFocus
              />
              {!motifDesactivationInterlocuteur.trim() && (
                <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "6px" }}>
                  Le motif est obligatoire
                </p>
              )}
            </div>
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              padding: "16px 32px 24px 32px",
              borderTop: "1px solid #e5e7eb",
            }}>
              <button className="btn-secondary" onClick={() => setShowDeactivateInterlocuteurModal(false)}>
                Annuler
              </button>
              <button
                onClick={confirmDeactivationInterlocuteur}
                disabled={!motifDesactivationInterlocuteur.trim()}
                style={{
                  padding: "8px 20px",
                  backgroundColor: motifDesactivationInterlocuteur.trim() ? "#F59E0B" : "#D1D5DB",
                  color: motifDesactivationInterlocuteur.trim() ? "#fff" : "#9CA3AF",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: motifDesactivationInterlocuteur.trim() ? "pointer" : "not-allowed",
                }}
              >
                Confirmer la désactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmation de suppression d'interlocuteur */}

      {showInterlocuteurDeleteConfirm && interlocuteurToDelete && (
        <div
          className="modal-overlay"
          onClick={() => setShowInterlocuteurDeleteConfirm(false)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>Confirmer la suppression</h3>
            </div>

            <div className="confirm-modal-body">
              <p>
                Êtes-vous sûr de vouloir supprimer l'interlocuteur{" "}
                <strong>"{interlocuteurToDelete.nom}"</strong> ?
              </p>

              <p className="confirm-warning">Cette action est irréversible.</p>
            </div>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteInterlocuteur}
              >
                Supprimer
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowInterlocuteurDeleteConfirm(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parametrage;
