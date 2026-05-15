import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./PageStyles.css";
import { apiFetch } from "../../utils/apiFetch";
import {
  chargerDemandes,
} from "../../data/gestionDemandes";
import { chargerSocietes } from "../../data/societes";
import { chargerCollaborateurs } from "../../data/gestionCollaborateurs";
import { chargerInterlocuteurs } from "../../data/gestionInterlocuteurs";
import { useAuth } from "../AuthProvider";
import { PermissionGuard, usePermissions } from "../PermissionGuard";

// ─── Composant Gantt réutilisable ────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];

const genColonnes = (mode, start, end) => {
  const cols = [];
  const cur = new Date(start);
  if (mode === "mois") {
    while (cur < end) {
      cols.push({ label: MONTH_NAMES[cur.getMonth()], ts: cur.getTime() });
      cur.setMonth(cur.getMonth() + 1);
    }
  } else if (mode === "semaine") {
    const jour = cur.getDay();
    cur.setDate(cur.getDate() - (jour === 0 ? 6 : jour - 1));
    let n = 1;
    while (cur < end) {
      cols.push({ label: `S${n++}`, sub: `${cur.getDate()}/${cur.getMonth()+1}`, ts: cur.getTime() });
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    while (cur < end) {
      cols.push({ label: `${cur.getDate()}`, ts: cur.getTime() });
      cur.setDate(cur.getDate() + 1);
    }
  }
  return cols;
};

const genGroupes = (mode, cols) => {
  const map = {};
  const ordre = [];
  cols.forEach((c) => {
    const d = new Date(c.ts);
    let key;
    if (mode === "mois") key = `T${Math.floor(d.getMonth()/3)+1} ${d.getFullYear()}`;
    else if (mode === "semaine") key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    else {
      const lun = new Date(d); const j = lun.getDay(); lun.setDate(lun.getDate() - (j===0?6:j-1));
      key = `Sem. ${lun.getDate()}/${lun.getMonth()+1}`;
    }
    if (!map[key]) { map[key] = 0; ordre.push(key); }
    map[key]++;
  });
  return ordre.map(k => ({ label: k, count: map[k] }));
};

const GanttChart = ({ sprints, compact = false }) => {
  const [mode, setMode] = React.useState("mois");

  const allDates = sprints.flatMap(s =>
    [s.datePrevTIF, s.dateEffTIF, s.datePrevClient, s.dateEffClient].filter(Boolean)
  );
  if (allDates.length < 2) return (
    <div style={{ padding: "20px", background: "#f9fafb", borderRadius: "8px", color: "#9ca3af", textAlign: "center", border: "1px dashed #d1d5db" }}>
      Renseignez des dates dans le tableau pour afficher la vue Gantt
    </div>
  );

  const allTs = allDates.map(d => new Date(d).getTime());
  const rawMin = new Date(Math.min(...allTs));
  const rawMax = new Date(Math.max(...allTs));
  const nbJoursTotal = Math.round((rawMax - rawMin) / 86400000);
  const jourDisponible = nbJoursTotal <= 90;

  let timelineStart, timelineEnd;
  if (mode === "mois") {
    timelineStart = new Date(rawMin.getFullYear(), rawMin.getMonth(), 1);
    timelineEnd   = new Date(rawMax.getFullYear(), rawMax.getMonth() + 1, 1);
  } else if (mode === "semaine") {
    timelineStart = new Date(rawMin); const j = timelineStart.getDay(); timelineStart.setDate(timelineStart.getDate() - (j===0?6:j-1));
    timelineEnd   = new Date(rawMax); timelineEnd.setDate(timelineEnd.getDate() + (7 - (timelineEnd.getDay()||7)));
  } else {
    timelineStart = new Date(rawMin.getFullYear(), rawMin.getMonth(), rawMin.getDate());
    timelineEnd   = new Date(rawMax.getFullYear(), rawMax.getMonth(), rawMax.getDate() + 1);
  }

  const totalMs = timelineEnd - timelineStart;
  const cols    = genColonnes(mode, timelineStart, timelineEnd);
  const groupes = genGroupes(mode, cols);
  const toP = d => d ? Math.max(0, Math.min(100, ((new Date(d)-timelineStart)/totalMs)*100)) : null;

  const labelW = compact ? 130 : 160;
  const colMinW = mode === "jour" ? 28 : mode === "semaine" ? 52 : 70;

  return (
    <div>
      {/* Toggle vue */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px", justifyContent: "flex-end" }}>
        {["jour","semaine","mois"].map(v => {
          const disabled = v === "jour" && !jourDisponible;
          return (
            <button key={v} type="button" onClick={() => !disabled && setMode(v)} title={disabled ? `Vue Jour indisponible (plage de ${nbJoursTotal} jours > 90)` : undefined} style={{
              padding: "4px 14px", borderRadius: "6px", border: "1px solid",
              borderColor: mode === v ? "#4A90E2" : disabled ? "#E5E7EB" : "#D1D5DB",
              background: mode === v ? "#4A90E2" : disabled ? "#F9FAFB" : "white",
              color: mode === v ? "white" : disabled ? "#D1D5DB" : "#374151",
              fontWeight: mode === v ? "600" : "400",
              fontSize: "12px", cursor: disabled ? "not-allowed" : "pointer", textTransform: "capitalize",
            }}>{v === "jour" ? "Jour" : v === "semaine" ? "Semaine" : "Mois"}</button>
          );
        })}
      </div>

      <div className="roadmap-scroll" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", overflowX: "auto" }}>
        <div style={{ minWidth: `${labelW + cols.length * colMinW}px`, display: "grid", gridTemplateColumns: `${labelW}px repeat(${cols.length}, minmax(${colMinW}px, 1fr))` }}>

          {/* Groupes (trimestres / mois / semaines) */}
          <div style={{ background: "#F3F4F6", borderRight: "1px solid #D1D5DB", borderBottom: "1px solid #D1D5DB" }} />
          {groupes.map((g, i) => (
            <div key={i} style={{ gridColumn: `span ${g.count}`, background: "#F3F4F6", padding: "4px 6px", fontSize: "11px", fontWeight: "700", color: "#374151", textAlign: "center", borderRight: "1px solid #D1D5DB", borderBottom: "1px solid #D1D5DB", whiteSpace: "nowrap", overflow: "hidden" }}>{g.label}</div>
          ))}

          {/* En-têtes colonnes */}
          <div style={{ background: "#F9FAFB", borderRight: "1px solid #D1D5DB", borderBottom: "2px solid #D1D5DB", padding: "4px 8px", fontSize: "11px", color: "#6B7280", fontWeight: "600" }}>Sprint</div>
          {cols.map((c, i) => (
            <div key={i} style={{ background: "#F9FAFB", padding: "2px 2px", fontSize: "10px", color: "#6B7280", fontWeight: "500", borderRight: "1px solid #E5E7EB", borderBottom: "2px solid #D1D5DB", textAlign: "center", overflow: "hidden" }}>
              <div>{c.label}</div>
              {c.sub && <div style={{ fontSize: "9px", color: "#9ca3af" }}>{c.sub}</div>}
            </div>
          ))}

          {/* Lignes sprints */}
          {sprints.map((sprint, i) => {
            const pTIF = toP(sprint.datePrevTIF), pCli = toP(sprint.datePrevClient);
            const eTIF = toP(sprint.dateEffTIF),  eCli = toP(sprint.dateEffClient);
            const barLeft  = pTIF !== null && pCli !== null ? Math.min(pTIF, pCli) : (eTIF !== null && eCli !== null ? Math.min(eTIF, eCli) : null);
            const barWidth = pTIF !== null && pCli !== null ? Math.abs(pCli - pTIF) : (eTIF !== null && eCli !== null ? Math.abs(eCli - eTIF) : null);
            const avancement = sprint.avancement ?? 0;
            return (
              <React.Fragment key={i}>
                <div style={{ background: "#6B7280", padding: "5px 10px", display: "flex", alignItems: "center", borderBottom: "1px solid #4B5563", borderRight: "1px solid #E5E7EB" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Sprint {sprint.num}</span>
                </div>
                <div style={{ gridColumn: `span ${cols.length}`, position: "relative", height: "36px", borderBottom: "1px solid #E5E7EB", background: "#FAFAFA" }}>
                  {cols.map((_, mi) => <div key={mi} style={{ position: "absolute", left: `${((mi+1)/cols.length)*100}%`, top: 0, bottom: 0, width: "1px", background: "#E5E7EB" }} />)}
                  {barLeft !== null && (
                    <div style={{ position: "absolute", left: `${barLeft}%`, width: `${Math.max(1, barWidth)}%`, top: "8px", bottom: "8px", background: "#DBEAFE", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${avancement}%`, height: "100%", background: "#4A90E2", display: "flex", alignItems: "center", paddingLeft: "6px", transition: "width 0.4s ease" }}>
                        {avancement > 12 && <span style={{ fontSize: "10px", color: "white", fontWeight: "600", whiteSpace: "nowrap" }}>{avancement}%</span>}
                      </div>
                      {avancement <= 12 && avancement > 0 && <span style={{ position: "absolute", left: `${avancement + 2}%`, top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: "#1D4ED8", fontWeight: "600", whiteSpace: "nowrap" }}>{avancement}%</span>}
                      {avancement === 0 && <span style={{ position: "absolute", left: "4px", top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: "#93C5FD", fontWeight: "600", whiteSpace: "nowrap" }}>0%</span>}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}

        </div>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

// Utilitaire pour formater les dates pour les input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min="2000-01-01" max={`${new Date().getFullYear() + 15}-12-31`}
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

    // Retourner le format yyyy-MM-dd pour les input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min="2000-01-01" max={`${new Date().getFullYear() + 15}-12-31`}
    return date.toISOString().split("T")[0];
  } catch (error) {
    console.error("Erreur de formatage de date:", dateString, error);
    return "";
  }
};

const PROSPECTE_STORAGE_KEY = "julee_prospecte_demande_wip";
const EVOLUTION_STORAGE_KEY = "julee_evolution_demande_wip";
const NOUVELLE_STORAGE_KEY  = "julee_nouvelle_demande_wip";

// Retourne quel formulaire était actif en dernier (un seul à la fois)
const _getInitialActiveForm = () => {
  try {
    if (localStorage.getItem(EVOLUTION_STORAGE_KEY)) return "evolution";
    if (localStorage.getItem(PROSPECTE_STORAGE_KEY)) return "prospecte";
    const nouv = localStorage.getItem(NOUVELLE_STORAGE_KEY);
    if (nouv && JSON.parse(nouv).open) return "nouvelle";
  } catch {}
  return null;
};

const getProspecteInitialState = () => ({
  dateEnregistrement: new Date().toISOString().split("T")[0],
  societesDemandeurs: [],
  interlocuteur: "",
  nomProjet: "",
  descriptionPerimetre: "",
  dateReception: "",
});

const getEvolutionInitialState = () => ({
  dateEnregistrement: new Date().toISOString().split("T")[0],
  societesDemandeurs: [],
  societesDemandeursNames: [],
  interlocuteur: "",
  nomProjet: "",
  dateReception: "",
  dateDemandeMiseAJourDATFL: "",
  dateReponseMiseAJourDATFL: "",
  charge: "",
  planningDateDebut: "",
  planningDateFin: "",
  dateDemandeDevolution: "",
  dateReponseDevolution: "",
  slt: "",
  aleasNormeParJour: "",
  interlocuteurClient: "",
  methodologie: "",
  demandeur: "",
  descriptionProjet: "",
  descriptionPerimetre: "",
  statutDemande: "",
  lienIngridCDC: "",
  dateTransmissionBacklog: "",
  dateConfirmationValidation: "",
  observations: "",
  dateDemandePlanificationDev: "",
  dateDemandePlanificationTif: "",
  dateRetourEquipesDev: "",
  dateRetourEquipesTif: "",
  dateCommunicationPlanningClient: "",
  nombreSprint: "",
  sprintsData: [],
  statutCodage: "en attente",
  statutTIF: "en attente",
  lienIngridKickoff: "",
  lienIngridPointsControleTIF: "",
  lienIngridSignoff: "",
  dateEffectiveLivraisonTIF: "",
  motifsRetardTIF: "",
  dateEffectiveLivraisonClient: "",
  motifsRetardClient: "",
  statutLivraisonClient: "en attente",
});

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
  observations: "",
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

const Demandes = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const openDemandeIdRef = useRef(location.state?.openDemandeId || null);
  const openDemandeStepRef = useRef(location.state?.openDemandeStep || null);
  const [flashRetards, setFlashRetards] = useState(!!location.state?.highlightRetards);

  // Vérifier si l'utilisateur est administrateur
  const isAdmin = user?.profil?.nom === "Administrateur";

  // Vérifier la permission de créer des demandes
  const peutCreerDemande = hasPermission("demandes", "gestion", "create");
  const peutModifierDemande = hasPermission("demandes", "gestion", "update");
  const peutSupprimerDemande = hasPermission("demandes", "gestion", "delete");
  const peutVoirActions = peutModifierDemande || peutSupprimerDemande;

  // États pour la sélection de type de demande
  const [selectedDemandeType, setSelectedDemandeType] = useState(null);
  const [isModificationMode, setIsModificationMode] = useState(false);
  const [showSelectionCards, setShowSelectionCards] = useState(() => _getInitialActiveForm() === null);
  const [showDemandesList, setShowDemandesList] = useState(true);

  // États pour la gestion des demandes
  const [demandes, setDemandes] = useState([]);
  const [vueLivrees, setVueLivrees] = useState(false);

  // Filtres avancés liste demandes
  const [filtreRecherche, setFiltreRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("");
  const [filtreSociete, setFiltreSociete] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreDateDebut, setFiltreDateDebut] = useState("");
  const [filtreDateFin, setFiltreDateFin] = useState("");
  const resetFiltres = () => { setFiltreRecherche(""); setFiltreType(""); setFiltreSociete(""); setFiltreStatut(""); setFiltreDateDebut(""); setFiltreDateFin(""); };
  const [societes, setSocietes] = useState([]);
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [interlocuteurs, setInterlocuteurs] = useState([]);

  // États pour le formulaire multi-étapes "Nouvelle demande"
  const FORM_STORAGE_KEY = NOUVELLE_STORAGE_KEY;

  const [showNouvelleDemandeForm, setShowNouvelleDemandeForm] = useState(() => _getInitialActiveForm() === "nouvelle");
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
  const [showProspecteForm, setShowProspecteForm] = useState(() => _getInitialActiveForm() === "prospecte");
  const [prospecteFormData, setProspecteFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(PROSPECTE_STORAGE_KEY);
      return saved ? { ...getProspecteInitialState(), ...JSON.parse(saved).formData } : getProspecteInitialState();
    } catch { return getProspecteInitialState(); }
  });

  // États pour le formulaire multi-étapes "Demande d'évolution"
  const [showEvolutionForm, setShowEvolutionForm] = useState(() => _getInitialActiveForm() === "evolution");
  const [evolutionStep, setEvolutionStep] = useState(() => {
    try {
      const saved = localStorage.getItem(EVOLUTION_STORAGE_KEY);
      return saved ? (JSON.parse(saved).step || 1) : 1;
    } catch { return 1; }
  });
  const [evolutionFormData, setEvolutionFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(EVOLUTION_STORAGE_KEY);
      return saved ? { ...getEvolutionInitialState(), ...JSON.parse(saved).formData } : getEvolutionInitialState();
    } catch { return getEvolutionInitialState(); }
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

  const nomProjetEstDuplique = (nom, currentId) => {
    if (!nom?.trim()) return false;
    const nomNorm = nom.trim().toLowerCase();
    return demandes.some(
      (d) => d.nomProjet?.trim().toLowerCase() === nomNorm && d.id !== currentId
    );
  };

  const handleNouvelleDemandeNext = () => {
    if (nouvelleDemandeStep < 6) {

      // ── ÉTAPE 1 ──────────────────────────────────────────────────────────
      if (nouvelleDemandeStep === 1) {
        const newErrors = {};
        if (!nouvelleDemandeFormData.societesDemandeurs || nouvelleDemandeFormData.societesDemandeurs.length === 0 || !nouvelleDemandeFormData.societesDemandeurs[0]) {
          newErrors.societesDemandeurs = "Veuillez sélectionner une société.";
        }
        if (!nouvelleDemandeFormData.interlocuteurClient) {
          newErrors.interlocuteurClient = "Veuillez sélectionner un interlocuteur.";
        }
        if (!nouvelleDemandeFormData.nomProjet?.trim()) {
          newErrors.nomProjet = "Le nom du projet est obligatoire.";
        }
        if (Object.keys(newErrors).length > 0) {
          setErrorsNouvelle(newErrors);
          setTimeout(() => {
            const el = document.querySelector('[data-field-error="true"]');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
          return;
        }
        if (nomProjetEstDuplique(nouvelleDemandeFormData.nomProjet, nouvelleDemandeFormData.id)) {
          setDemandeMessage({ type: "error", text: `Un projet nommé "${nouvelleDemandeFormData.nomProjet.trim()}" existe déjà. Veuillez choisir un autre nom.` });
          scrollToFormTop(); return;
        }
        if (!nouvelleDemandeFormData.typeProjet) {
          setErrorsNouvelle(prev => ({ ...prev, typeProjet: "Le type de projet est obligatoire." }));
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
        if (nouvelleDemandeFormData.dateReception && nouvelleDemandeFormData.dateEnregistrement &&
            nouvelleDemandeFormData.dateReception > nouvelleDemandeFormData.dateEnregistrement) {
          setDemandeMessage({ type: "error", text: "La date de réception ne peut pas dépasser la date d'enregistrement." });
          scrollToFormTop(); return;
        }
        setErrorsNouvelle({});
        scrollToFormTop();
      }

      // ── ÉTAPE 2 ──────────────────────────────────────────────────────────
      if (nouvelleDemandeStep === 2) {
        const newErrors2 = {};
        if (!nouvelleDemandeFormData.dateTransmissionBacklog) {
          newErrors2.dateTransmissionBacklog = "La date de transmission du backlog est obligatoire.";
        } else if (nouvelleDemandeFormData.dateReception && nouvelleDemandeFormData.dateTransmissionBacklog < nouvelleDemandeFormData.dateReception) {
          newErrors2.dateTransmissionBacklog = "Ne peut pas être avant la date de réception.";
        }
        if (!nouvelleDemandeFormData.dateConfirmationValidation) {
          newErrors2.dateConfirmationValidation = "La date de confirmation/validation est obligatoire.";
        } else if (nouvelleDemandeFormData.dateTransmissionBacklog && nouvelleDemandeFormData.dateConfirmationValidation < nouvelleDemandeFormData.dateTransmissionBacklog) {
          newErrors2.dateConfirmationValidation = "Ne peut pas être avant la date de transmission du backlog.";
        }
        if (Object.keys(newErrors2).length > 0) {
          setErrorsNouvelle(newErrors2);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
      }

      // ── ÉTAPE 3 ──────────────────────────────────────────────────────────
      if (nouvelleDemandeStep === 3) {
        const newErrors3 = {};
        if (!nouvelleDemandeFormData.dateCommunicationPlanningClient) {
          newErrors3.dateCommunicationPlanningClient = "La date de communication du planning client est obligatoire.";
        }
        const nb = parseInt(nouvelleDemandeFormData.nombreSprint) || 0;
        if (nb < 1) {
          newErrors3.nombreSprint = "Le nombre de sprints doit être d'au moins 1.";
        }
        if (Object.keys(newErrors3).length > 0) {
          setErrorsNouvelle(newErrors3);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
        const sprints = nouvelleDemandeFormData.sprintsData || [];
        const manquants = Array.from({ length: nb }, (_, i) => i + 1).filter(
          (i) => !sprints[i - 1]?.chantier?.trim()
        );
        if (manquants.length > 0) {
          setDemandeMessage({ type: "error", text: `Le chantier est obligatoire pour chaque sprint. Sprint${manquants.length > 1 ? "s" : ""} sans chantier : ${manquants.map((n) => `Sprint ${n}`).join(", ")}.` });
          scrollToFormTop(); return;
        }
      }

      // ── ÉTAPE 4 ──────────────────────────────────────────────────────────
      if (nouvelleDemandeStep === 4) {
        const newErrors4 = {};
        if (!nouvelleDemandeFormData.statutCodage) {
          newErrors4.statutCodage = "Le statut du codage est obligatoire.";
        }
        if (!nouvelleDemandeFormData.statutTIF) {
          newErrors4.statutTIF = "Le statut TIF est obligatoire.";
        }
        if (Object.keys(newErrors4).length > 0) {
          setErrorsNouvelle(newErrors4);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
      }

      // ── ÉTAPE 5 ──────────────────────────────────────────────────────────
      if (nouvelleDemandeStep === 5) {
        const newErrors5 = {};
        if (!nouvelleDemandeFormData.lienIngridKickoff?.trim()) {
          newErrors5.lienIngridKickoff = "Le lien du document Kickoff est obligatoire.";
        }
        if (!nouvelleDemandeFormData.lienIngridPointsControleTIF?.trim()) {
          newErrors5.lienIngridPointsControleTIF = "Le lien des points de contrôle TIF est obligatoire.";
        }
        if (!nouvelleDemandeFormData.lienIngridSignoff?.trim()) {
          newErrors5.lienIngridSignoff = "Le lien du document Signoff est obligatoire.";
        }
        if (Object.keys(newErrors5).length > 0) {
          setErrorsNouvelle(newErrors5);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
      }

      // ── ÉTAPE 5 → 6 : vérifier que tous les sprints sont terminés ─────────
      if (nouvelleDemandeStep === 5) {
        const nb = parseInt(nouvelleDemandeFormData.nombreSprint) || 0;
        if (nb > 0) {
          const sprints = nouvelleDemandeFormData.sprintsData || [];
          const nonTermines = Array.from({ length: nb }, (_, i) => sprints[i] || {})
            .filter(s => s.statutSprint !== "terminé").length;
          if (nonTermines > 0) {
            setDemandeMessage({
              type: "error",
              text: `Impossible de passer à la livraison : ${nonTermines} sprint${nonTermines > 1 ? "s" : ""} non terminé${nonTermines > 1 ? "s" : ""}. Terminez tous les sprints à l'étape Réalisation.`,
            });
            scrollToFormTop(); return;
          }
        }
      }

      setErrorsNouvelle({});
      setNouvelleDemandeStep(nouvelleDemandeStep + 1);
      setDemandeMessage({ type: "", text: "" });
    }
  };

  const handleNouvelleDemandePrevious = () => {
    if (nouvelleDemandeStep > 1) {
      setNouvelleDemandeStep(nouvelleDemandeStep - 1);
      setDemandeMessage({ type: "", text: "" });
      setErrorsNouvelle({});
    }
  };

  const handleNouvelleDemandeCancel = () => {
    localStorage.removeItem(FORM_STORAGE_KEY);
    setShowNouvelleDemandeForm(false);
    setShowSelectionCards(true);
    setNouvelleDemandeStep(1);
    setDemandeMessage({ type: "", text: "" });
    setErrorsNouvelle({});
    setIsModificationMode(false);
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

  // Bouton "Terminer" à l'étape 6 : sauvegarde finale (isDraft: false)
  const handleTerminerDemande = async () => {
    const statutLiv = nouvelleDemandeFormData.statutLivraisonClient;
    const dateLiv = nouvelleDemandeFormData.dateEffectiveLivraisonClient;

    // Vérifier que tous les sprints sont terminés
    const nb = parseInt(nouvelleDemandeFormData.nombreSprint) || 0;
    if (nb > 0) {
      const sprints = nouvelleDemandeFormData.sprintsData || [];
      const nonTermines = Array.from({ length: nb }, (_, i) => sprints[i] || {})
        .filter(s => s.statutSprint !== "terminé");
      if (nonTermines.length > 0) {
        setDemandeMessage({
          type: "error",
          text: `Impossible de livrer : ${nonTermines.length} sprint${nonTermines.length > 1 ? "s" : ""} non terminé${nonTermines.length > 1 ? "s" : ""}. Tous les sprints doivent être à "Terminé" avant la livraison.`,
        });
        scrollToFormTop();
        return;
      }
    }

    if (!dateLiv?.trim() || statutLiv !== "livré au client") {
      setDemandeMessage({
        type: "error",
        text: "La demande ne peut pas être terminée : la livraison au client n'a pas été effectuée. Veuillez renseigner la date de livraison effective et s'assurer que le statut est « Livré au client ».",
      });
      scrollToFormTop();
      return;
    }
    try {
      setDemandeMessage({ type: "info", text: "Finalisation en cours..." });
      const currentDemandeId = nouvelleDemandeFormData.id;
      const payload = {
        typeProjet: nouvelleDemandeFormData.typeProjet || "Brouillon",
        nomProjet: nouvelleDemandeFormData.nomProjet || "",
        demandeur: nouvelleDemandeFormData.demandeur || null,
        descriptionProjet: nouvelleDemandeFormData.descriptionProjet || null,
        dateEnregistrement: nouvelleDemandeFormData.dateEnregistrement || null,
        interlocuteurClient: nouvelleDemandeFormData.interlocuteurClient || null,
        societesDemandeurs: nouvelleDemandeFormData.societesDemandeursNames?.join(", ") || null,
        dateReception: nouvelleDemandeFormData.dateReception || null,
        descriptionPerimetre: nouvelleDemandeFormData.descriptionPerimetre || null,
        statutDemande: nouvelleDemandeFormData.statutDemande || null,
        lienIngridCDC: nouvelleDemandeFormData.lienIngridCDC || null,
        dateTransmissionBacklog: nouvelleDemandeFormData.dateTransmissionBacklog || null,
        dateConfirmationValidation: nouvelleDemandeFormData.dateConfirmationValidation || null,
        dateDemandePlanificationDev: nouvelleDemandeFormData.dateDemandePlanificationDev || null,
        dateDemandePlanificationTif: nouvelleDemandeFormData.dateDemandePlanificationTif || null,
        dateRetourEquipesDev: nouvelleDemandeFormData.dateRetourEquipesDev || null,
        dateRetourEquipesTif: nouvelleDemandeFormData.dateRetourEquipesTif || null,
        dateCommunicationPlanningClient: nouvelleDemandeFormData.dateCommunicationPlanningClient || null,
        nombreSprint: nouvelleDemandeFormData.nombreSprint || null,
        sprintsData: nouvelleDemandeFormData.sprintsData?.length > 0 ? nouvelleDemandeFormData.sprintsData : null,
        roadmap: nouvelleDemandeFormData.roadmap || null,
        dateEffectiveLivraisonTIF: nouvelleDemandeFormData.dateEffectiveLivraisonTIF || null,
        motifsRetardTIF: nouvelleDemandeFormData.motifsRetardTIF || null,
        dateEffectiveLivraisonClient: nouvelleDemandeFormData.dateEffectiveLivraisonClient || null,
        motifsRetardClient: nouvelleDemandeFormData.motifsRetardClient || null,
        statutCodage: nouvelleDemandeFormData.statutCodage || null,
        statutTIF: nouvelleDemandeFormData.statutTIF || null,
        statutLivraison: nouvelleDemandeFormData.statutLivraisonClient || null,
        lienIngridKickoff: nouvelleDemandeFormData.lienIngridKickoff || null,
        lienIngridPointsControleTIF: nouvelleDemandeFormData.lienIngridPointsControleTIF || null,
        lienIngridSignoff: nouvelleDemandeFormData.lienIngridSignoff || null,
        societeDemandeur: nouvelleDemandeFormData.societeDemandeur || null,
        interlocuteur: nouvelleDemandeFormData.interlocuteur || null,
        isDraft: false,
        draftStep: 6,
        draftStepLabel: "Livraison",
        utilisateurId: user?.id || 1,
      };

      if (currentDemandeId) {
        const resp = await apiFetch(`/demandes/${currentDemandeId}`, { method: "PUT", body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error("Erreur sauvegarde");
      } else {
        const resp = await apiFetch(`/demandes`, { method: "POST", body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error("Erreur création");
      }

      await chargerLesDemandes();
      setVueLivrees(true);
      setShowDemandesList(true);
      localStorage.removeItem(FORM_STORAGE_KEY);
      setShowNouvelleDemandeForm(false);
      setShowSelectionCards(true);
      setNouvelleDemandeStep(1);
      setNouvelleDemandeFormData(getNouvelleDemandeInitialState());
      setDraftStepInfo(null);
      setDemandeMessage({ type: "success", text: "Demande terminée avec succès !" });
      setTimeout(() => setDemandeMessage({ type: "", text: "" }), 4000);
    } catch (error) {
      setDemandeMessage({ type: "error", text: `Impossible de terminer la demande. ${error?.message || ""}` });
    }
  };

  const sanitizeDate = (value) => {
    if (!value) return value;
    const parts = value.split("-");
    if (parts.length !== 3 || parts[0].length !== 4) return value;
    const year = parseInt(parts[0], 10);
    if (isNaN(year)) return value;
    const currentYear = new Date().getFullYear();
    if (year > currentYear + 15) return `${currentYear}-${parts[1]}-${parts[2]}`;
    return value;
  };

  const handleNouvelleDemandeInputChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === "date" ? sanitizeDate(value) : value;
    setNouvelleDemandeFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
    if (errorsNouvelle[name]) {
      setErrorsNouvelle((prev) => ({ ...prev, [name]: "" }));
    }
    if (demandeMessage.text) {
      setDemandeMessage({ type: "", text: "" });
    }
  };
  const handleSprintDataChange = (index, field, value) => {
    const isDateField = ["datePrevTIF", "dateEffTIF", "datePrevClient", "dateEffClient"].includes(field);
    const finalValue = isDateField ? sanitizeDate(value) : value;
    setNouvelleDemandeFormData((prev) => {
      const updatedSprints = [...(prev.sprintsData || [])];
      if (!updatedSprints[index]) updatedSprints[index] = {};
      updatedSprints[index] = { ...updatedSprints[index], [field]: finalValue };
      return { ...prev, sprintsData: updatedSprints };
    });
  };

  const handleEvolutionSprintDataChange = (index, field, value) => {
    const isDateField = ["datePrevTIF", "dateEffTIF", "datePrevClient", "dateEffClient"].includes(field);
    const finalValue = isDateField ? sanitizeDate(value) : value;
    setEvolutionFormData((prev) => {
      const updatedSprints = [...(prev.sprintsData || [])];
      if (!updatedSprints[index]) updatedSprints[index] = {};
      updatedSprints[index] = { ...updatedSprints[index], [field]: finalValue };
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
  const [errorsProspecte, setErrorsProspecte] = useState({});
  const [errorsNouvelle, setErrorsNouvelle] = useState({});
  const [errorsEvolution, setErrorsEvolution] = useState({});
  const [showDemandeDeleteConfirm, setShowDemandeDeleteConfirm] = useState(false);
  const [demandeToDelete, setDemandeToDelete] = useState(null);
  const [showSupprimerTermineeConfirm, setShowSupprimerTermineeConfirm] = useState(false);
  const [demandeToSupprimer, setDemandeToSupprimer] = useState(null);
  const [showLivraisonErreurModal, setShowLivraisonErreurModal] = useState(false);
  const [livraisonErreurNom, setLivraisonErreurNom] = useState("");
  const [, setDraftStepInfo] = useState(null);
  const [showDeleteDraftModal, setShowDeleteDraftModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDemandeDetail, setSelectedDemandeDetail] = useState(null);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
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
        id: nouvelleDemandeFormData.id || null,
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
        observations: nouvelleDemandeFormData.observations || null,

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
      if (!formData.nomProjet?.trim()) {
        setDemandeMessage({
          type: "error",
          text: "Le nom du projet est obligatoire pour enregistrer le brouillon.",
        });
        scrollToFormTop();
        return;
      }
      if (nomProjetEstDuplique(formData.nomProjet, formData.id)) {
        setDemandeMessage({
          type: "error",
          text: `Un projet nommé "${formData.nomProjet.trim()}" existe déjà. Veuillez choisir un autre nom.`,
        });
        scrollToFormTop();
        return;
      }
      // Validation : chantier obligatoire pour chaque sprint (étape 3)
      if (nouvelleDemandeStep === 3) {
        const nb = parseInt(formData.nombreSprint) || 0;
        if (nb > 0) {
          const sprints = formData.sprintsData || [];
          const manquants = Array.from({ length: nb }, (_, i) => i + 1).filter(
            (i) => !sprints[i - 1]?.chantier?.trim()
          );
          if (manquants.length > 0) {
            setDemandeMessage({
              type: "error",
              text: `Le chantier est obligatoire pour chaque sprint. Sprint${manquants.length > 1 ? "s" : ""} sans chantier : ${manquants.map((n) => `Sprint ${n}`).join(", ")}.`,
            });
            scrollToFormTop();
            return;
          }
        }
      }
      if (!formData.typeProjet?.trim()) {
        formData.typeProjet = "Brouillon";
      }

      // Vérifier si on est en train d'éditer une demande existante
      const currentDemandeId = nouvelleDemandeFormData.id;
      let response;

      if (currentDemandeId) {
        response = await apiFetch(`/demandes/${currentDemandeId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (response.status === 404) {
          response = await apiFetch(`/demandes`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
      } else {
        response = await apiFetch(`/demandes`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔍 Erreur backend:", errorText);
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      // Si c'était une nouvelle demande, récupérer l'ID AVANT de recharger les demandes
      // (évite le bug de timing où demandes contient le projet mais id est encore null)
      if (!currentDemandeId && response.ok) {
        const createdDemande = await response.json();
        setNouvelleDemandeFormData((prev) => ({
          ...prev,
          id: createdDemande.id,
        }));
        console.log("📝 ID de la nouvelle demande enregistré:", createdDemande.id);
      }

      // Recharger la liste depuis le backend (après avoir défini l'ID)
      await chargerLesDemandes();
      setDraftStepInfo(stepToStore);

      // Fermer le formulaire et effacer le localStorage
      localStorage.removeItem(FORM_STORAGE_KEY);
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
      4: "Enregistrement",
      5: "Clarification",
      6: "Planification",
      7: "Réalisation",
      8: "Documents",
      9: "Livraison",
    };

    if (!evolutionFormData.nomProjet?.trim()) {
      setDemandeMessage({ type: "error", text: "Le nom du projet est obligatoire pour enregistrer le brouillon." });
      scrollToFormTop();
      return;
    }

    const currentDemandeId = evolutionFormData.id;

    const payload = {
      typeProjet: "Evolution",
      nomProjet: evolutionFormData.nomProjet || "",
      dateEnregistrement: evolutionFormData.dateEnregistrement || new Date().toISOString().split("T")[0],
      dateReception: evolutionFormData.dateReception || null,
      societeDemandeur: evolutionFormData.societesDemandeursNames?.[0] || null,
      societesDemandeurs: evolutionFormData.societesDemandeursNames?.join(", ") || null,
      interlocuteur: evolutionFormData.interlocuteur || null,
      interlocuteurClient: evolutionFormData.interlocuteurClient || null,
      demandeur: evolutionFormData.demandeur || null,
      dateDemandeMiseAJourDATFL: evolutionFormData.dateDemandeMiseAJourDATFL || null,
      dateReponseMiseAJourDATFL: evolutionFormData.dateReponseMiseAJourDATFL || null,
      charge: evolutionFormData.charge ? parseFloat(evolutionFormData.charge) : null,
      planningDateDebut: evolutionFormData.planningDateDebut || null,
      planningDateFin: evolutionFormData.planningDateFin || null,
      dateDemandeDevolution: evolutionFormData.dateDemandeDevolution || null,
      dateReponseDevolution: evolutionFormData.dateReponseDevolution || null,
      slt: evolutionFormData.slt || null,
      aleasNormeParJour: evolutionFormData.aleasNormeParJour || null,
      descriptionProjet: evolutionFormData.descriptionProjet || null,
      descriptionPerimetre: evolutionFormData.descriptionPerimetre || null,
      statutDemande: evolutionFormData.statutDemande || null,
      lienIngridCDC: evolutionFormData.lienIngridCDC || null,
      dateTransmissionBacklog: evolutionFormData.dateTransmissionBacklog || null,
      dateConfirmationValidation: evolutionFormData.dateConfirmationValidation || null,
      observations: evolutionFormData.observations || null,
      dateDemandePlanificationDev: evolutionFormData.dateDemandePlanificationDev || null,
      dateDemandePlanificationTif: evolutionFormData.dateDemandePlanificationTif || null,
      dateRetourEquipesDev: evolutionFormData.dateRetourEquipesDev || null,
      dateRetourEquipesTif: evolutionFormData.dateRetourEquipesTif || null,
      dateCommunicationPlanningClient: evolutionFormData.dateCommunicationPlanningClient || null,
      nombreSprint: evolutionFormData.nombreSprint || null,
      sprintsData: evolutionFormData.sprintsData?.length > 0 ? evolutionFormData.sprintsData : null,
      statutCodage: evolutionFormData.statutCodage || null,
      statutTIF: evolutionFormData.statutTIF || null,
      lienIngridKickoff: evolutionFormData.lienIngridKickoff || null,
      lienIngridPointsControleTIF: evolutionFormData.lienIngridPointsControleTIF || null,
      lienIngridSignoff: evolutionFormData.lienIngridSignoff || null,
      dateEffectiveLivraisonTIF: evolutionFormData.dateEffectiveLivraisonTIF || null,
      motifsRetardTIF: evolutionFormData.motifsRetardTIF || null,
      dateEffectiveLivraisonClient: evolutionFormData.dateEffectiveLivraisonClient || null,
      motifsRetardClient: evolutionFormData.motifsRetardClient || null,
      statutLivraison: evolutionFormData.statutLivraisonClient || null,
      isDraft: true,
      draftStep: stepToStore,
      draftStepLabel: evolutionStepLabels[stepToStore] || `Étape ${stepToStore}`,
      utilisateurId: user?.id || 1,
    };

    try {
      if (currentDemandeId) {
        const resp = await apiFetch(`/demandes/${currentDemandeId}`, { method: "PUT", body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error(`Erreur HTTP ${resp.status}`);
      } else {
        const resp = await apiFetch(`/demandes`, { method: "POST", body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error(`Erreur HTTP ${resp.status}`);
        const created = await resp.json();
        if (created?.id) {
          setEvolutionFormData((prev) => ({ ...prev, id: created.id }));
        }
      }

      await chargerLesDemandes();
      localStorage.removeItem(EVOLUTION_STORAGE_KEY);
      setShowEvolutionForm(false);
      setShowSelectionCards(true);
      setEvolutionStep(1);
      setIsModificationMode(false);
      setDemandeMessage({
        type: "success",
        text: currentDemandeId ? "Brouillon évolution mis à jour." : "Brouillon évolution enregistré.",
      });
      setTimeout(() => setDemandeMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      setDemandeMessage({
        type: "error",
        text: `Impossible d'enregistrer le brouillon. ${error?.message || "Vérifiez la connexion au serveur."}`,
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
      const body = { statutDemande: newStatusValue };
      // Si le statut existe déjà en base, on envoie aussi son ID pour éviter un doublon
      const statutExistant = statutsDisponibles.find((s) => s.nom === newStatusValue);
      if (statutExistant) body.statutId = statutExistant.id;

      if (isSuspensionStatus(newStatusValue)) {
        body.motifSuspension = suspensionMotif;
        body.dateSuspension = suspensionDate;
      }

      const response = await apiFetch(`/demandes/${selectedDemandeIdForStatus}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });

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

  const parseSprintsData = (raw) => {
    if (!raw) return [];
    if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return []; } }
    return Array.isArray(raw) ? raw : [];
  };

  const chargerLesDemandes = useCallback(async () => {
    // Si admin : charge toutes les demandes, sinon : charge seulement les demandes de l'utilisateur
    const demandesChargees = await chargerDemandes(isAdmin ? null : user?.id);

    // Normaliser sprintsData pour chaque demande (peut arriver comme string JSON depuis MySQL)
    const demandesNormalisees = demandesChargees.map((d) => ({
      ...d,
      sprintsData: parseSprintsData(d.sprintsData),
    }));

    // Charger les statuts pour avoir les informations complètes
    try {
      const response = await apiFetch(`/statuts`);
      if (response.ok) {
        const statuts = await response.json();

        // Enrichir les demandes avec les informations du statut
        const demandesEnrichies = demandesNormalisees.map((demande) => {
          const statut = statuts.find((s) => s.id === demande.statutId);
          return {
            ...demande,
            statutInfo: statut,
            statutDemande: statut ? statut.nom : demande.statutDemande,
          };
        });

        setDemandes(demandesEnrichies);
      } else {
        setDemandes(demandesNormalisees);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des statuts:", error);
      setDemandes(demandesNormalisees);
    }
  }, [isAdmin, user?.id]);

  const chargerLesSocietes = useCallback(async () => {
    const societesChargees = await chargerSocietes();
    setSocietes(societesChargees);
  }, []);

  // Déduplique les sociétés par nom pour les sélecteurs (le département ne doit pas créer de doublons)
  const societesSelectOptions = [...new Map((societes || []).map(s => [s.nom, s])).values()];

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
      const response = await apiFetch(`/statuts`);
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

  // Réinitialiser flashRetards après l'animation
  useEffect(() => {
    if (!flashRetards) return;
    const t = setTimeout(() => setFlashRetards(false), 3500);
    return () => clearTimeout(t);
  }, [flashRetards]);

  // Ouvrir automatiquement une demande à l'étape en cours si on vient du dashboard
  useEffect(() => {
    const id = openDemandeIdRef.current;
    if (!id || demandes.length === 0) return;
    const demande = demandes.find(d => d.id === id);
    if (demande) {
      openDemandeIdRef.current = null;
      const forceStep = openDemandeStepRef.current;
      openDemandeStepRef.current = null;
      if (forceStep) {
        const stepLabels = { 1: "Enregistrement", 2: "Clarification", 3: "Planification", 4: "Réalisation", 5: "Documents", 6: "Livraison" };
        handlePoursuivreDemande({ ...demande, draftStep: forceStep, draftStepLabel: stepLabels[forceStep] });
      } else {
        handlePoursuivreDemande(demande);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandes]);

  // Sauvegarder l'état des formulaires en cours dans localStorage
  useEffect(() => {
    if (showNouvelleDemandeForm) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
        open: true,
        step: nouvelleDemandeStep,
        formData: nouvelleDemandeFormData,
      }));
    }
  }, [showNouvelleDemandeForm, nouvelleDemandeStep, nouvelleDemandeFormData]);

  useEffect(() => {
    if (showProspecteForm) {
      localStorage.setItem(PROSPECTE_STORAGE_KEY, JSON.stringify({ formData: prospecteFormData }));
    }
  }, [showProspecteForm, prospecteFormData]);

  useEffect(() => {
    if (showEvolutionForm) {
      localStorage.setItem(EVOLUTION_STORAGE_KEY, JSON.stringify({ step: evolutionStep, formData: evolutionFormData }));
    }
  }, [showEvolutionForm, evolutionStep, evolutionFormData]);

  const handleCreateDemande = () => {
    setShowProspecteForm(false);
    setShowEvolutionForm(false);
    localStorage.removeItem(FORM_STORAGE_KEY);
    localStorage.removeItem(PROSPECTE_STORAGE_KEY);
    localStorage.removeItem(EVOLUTION_STORAGE_KEY);
    setNouvelleDemandeStep(1);
    setNouvelleDemandeFormData(getNouvelleDemandeInitialState());
    setDraftStepInfo(null);
    setDemandeMessage({ type: "", text: "" });
    setErrorsNouvelle({});
    setShowNouvelleDemandeForm(true);
    setShowSelectionCards(false);
  };

  // Création d'une demande prospecte avec formulaire multi-étapes
  const handleCreateDemandeProspecte = () => {
    setShowNouvelleDemandeForm(false);
    setShowEvolutionForm(false);
    localStorage.removeItem(FORM_STORAGE_KEY);
    localStorage.removeItem(EVOLUTION_STORAGE_KEY);
    setProspecteFormData(getProspecteInitialState());
    setErrorsProspecte({});
    setShowProspecteForm(true);
    setShowSelectionCards(false);
  };

  const handleProspecteInputChange = (e) => {
    const { name, value } = e.target;
    setProspecteFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errorsProspecte[name]) {
      setErrorsProspecte((prev) => ({ ...prev, [name]: "" }));
    }
    if (demandeMessage.text) {
      setDemandeMessage({ type: "", text: "" });
    }
  };

  const handleProspecteCancel = () => {
    localStorage.removeItem(PROSPECTE_STORAGE_KEY);
    setShowProspecteForm(false);
    setShowSelectionCards(true);
    setDemandeMessage({ type: "", text: "" });
    setErrorsProspecte({});
    setIsModificationMode(false);
  };

  const handleProspecteSubmit = async (e) => {
    e.preventDefault();
    setDemandeMessage({ type: "", text: "" });

    const newErrors = {};
    if (!prospecteFormData.societesDemandeurs?.[0]) {
      newErrors.societesDemandeurs = "Veuillez sélectionner une société.";
    }
    if (!prospecteFormData.nomProjet?.trim()) {
      newErrors.nomProjet = "Le nom du projet est obligatoire.";
    }
    if (!prospecteFormData.dateReception) {
      newErrors.dateReception = "La date de réception est obligatoire.";
    } else if (prospecteFormData.dateEnregistrement && prospecteFormData.dateReception > prospecteFormData.dateEnregistrement) {
      newErrors.dateReception = "La date de réception ne peut pas dépasser la date d'enregistrement.";
    }
    if (!prospecteFormData.interlocuteur) {
      newErrors.interlocuteur = "L'interlocuteur est obligatoire.";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrorsProspecte(newErrors);
      setTimeout(() => {
        const el = document.querySelector('[data-field-error="true"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    try {
      setDemandeMessage({ type: "info", text: "Création en cours..." });
      const currentId = prospecteFormData.id;

      const societe = societes.find(s => s.id.toString() === prospecteFormData.societesDemandeurs?.[0]);
      const societyName = societe?.nom || prospecteFormData.societesDemandeurs?.[0] || "";

      const payload = {
        typeProjet: "Prospecte",
        nomProjet: prospecteFormData.nomProjet,
        dateEnregistrement: prospecteFormData.dateEnregistrement,
        dateReception: prospecteFormData.dateReception,
        societesDemandeurs: societyName,
        societeDemandeur: societyName,
        interlocuteur: prospecteFormData.interlocuteur,
        descriptionPerimetre: prospecteFormData.descriptionPerimetre || "",
        isDraft: true,
        draftStep: 1,
        draftStepLabel: "Info demande",
        utilisateurId: user?.id || 1,
      };

      if (currentId) {
        const resp = await apiFetch(`/demandes/${currentId}`, { method: "PUT", body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error(`Erreur HTTP ${resp.status}`);
      } else {
        const resp = await apiFetch(`/demandes`, { method: "POST", body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error(`Erreur HTTP ${resp.status}`);
      }

      await chargerLesDemandes();
      localStorage.removeItem(PROSPECTE_STORAGE_KEY);
      setShowProspecteForm(false);
      setShowSelectionCards(true);
      setIsModificationMode(false);
      setDemandeMessage({ type: "success", text: "Demande prospecte créée avec succès !" });
      setTimeout(() => setDemandeMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      setDemandeMessage({ type: "error", text: `Impossible de créer la demande. ${error?.message || "Vérifiez la connexion."}` });
    }
  };

  // Création d'une demande d'évolution avec formulaire multi-étapes
  const handleCreateDemandeEvolution = () => {
    setShowNouvelleDemandeForm(false);
    setShowProspecteForm(false);
    localStorage.removeItem(FORM_STORAGE_KEY);
    localStorage.removeItem(PROSPECTE_STORAGE_KEY);
    localStorage.removeItem(EVOLUTION_STORAGE_KEY);
    setEvolutionFormData(getEvolutionInitialState());
    setEvolutionStep(1);
    setErrorsEvolution({});
    setShowEvolutionForm(true);
    setShowSelectionCards(false);
    setDemandeMessage({ type: "", text: "" });
  };

  const handleEvolutionInputChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === "date" ? sanitizeDate(value) : value;
    setEvolutionFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
    if (errorsEvolution[name]) {
      setErrorsEvolution((prev) => ({ ...prev, [name]: "" }));
    }
    if (demandeMessage.text) {
      setDemandeMessage({ type: "", text: "" });
    }
  };

  const handleEvolutionNext = () => {
    if (evolutionStep < 9) {
      setDemandeMessage({ type: "", text: "" });

      if (evolutionStep === 1) {
        const newErrors = {};
        if (!evolutionFormData.societesDemandeurs?.[0]) {
          newErrors.societesDemandeurs = "Veuillez sélectionner une société.";
        }
        if (!evolutionFormData.interlocuteur) {
          newErrors.interlocuteur = "Veuillez sélectionner un interlocuteur.";
        }
        if (!evolutionFormData.nomProjet?.trim()) {
          newErrors.nomProjet = "Le nom du projet est obligatoire.";
        }
        if (Object.keys(newErrors).length > 0) {
          setErrorsEvolution(newErrors);
          setTimeout(() => {
            const el = document.querySelector('[data-field-error="true"]');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
          return;
        }
        if (!evolutionFormData.dateReception) {
          newErrors.dateReception = "La date de réception est obligatoire.";
        } else if (evolutionFormData.dateEnregistrement && evolutionFormData.dateReception > evolutionFormData.dateEnregistrement) {
          newErrors.dateReception = "La date de réception ne peut pas dépasser la date d'enregistrement.";
        }
        if (Object.keys(newErrors).length > 0) {
          setErrorsEvolution(newErrors);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
        setErrorsEvolution({});
      }

      if (evolutionStep === 2) {
        const newErrEv2 = {};
        if (!evolutionFormData.dateDemandeMiseAJourDATFL) {
          newErrEv2.dateDemandeMiseAJourDATFL = "La date de demande de mise à jour du DATFL est obligatoire.";
        } else if (evolutionFormData.dateReception && evolutionFormData.dateDemandeMiseAJourDATFL < evolutionFormData.dateReception) {
          newErrEv2.dateDemandeMiseAJourDATFL = "Ne peut pas être avant la date de réception.";
        }
        if (!evolutionFormData.dateReponseMiseAJourDATFL) {
          newErrEv2.dateReponseMiseAJourDATFL = "La date de réponse de mise à jour du DATFL est obligatoire.";
        } else if (evolutionFormData.dateDemandeMiseAJourDATFL && evolutionFormData.dateReponseMiseAJourDATFL < evolutionFormData.dateDemandeMiseAJourDATFL) {
          newErrEv2.dateReponseMiseAJourDATFL = "Ne peut pas être avant la date de demande DATFL.";
        }
        if (Object.keys(newErrEv2).length > 0) {
          setErrorsEvolution(newErrEv2);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
      }

      if (evolutionStep === 3) {
        const newErrEv3 = {};
        if (!evolutionFormData.charge) {
          newErrEv3.charge = "La charge est obligatoire.";
        }
        if (!evolutionFormData.planningDateDebut) {
          newErrEv3.planningDateDebut = "La date de début du planning est obligatoire.";
        }
        if (!evolutionFormData.planningDateFin) {
          newErrEv3.planningDateFin = "La date de fin du planning est obligatoire.";
        } else if (evolutionFormData.planningDateDebut && evolutionFormData.planningDateFin < evolutionFormData.planningDateDebut) {
          newErrEv3.planningDateFin = "Ne peut pas être avant la date de début.";
        }
        if (Object.keys(newErrEv3).length > 0) {
          setErrorsEvolution(newErrEv3);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
        if (evolutionFormData.dateDemandeDevolution && evolutionFormData.dateReponseDevolution &&
            evolutionFormData.dateReponseDevolution < evolutionFormData.dateDemandeDevolution) {
          setDemandeMessage({ type: "error", text: "La date de réponse dévolution ne peut pas être avant la date de demande." });
          scrollToFormTop(); return;
        }
      }

      if (evolutionStep === 4) {
        const newErrEv4 = {};
        if (!evolutionFormData.societesDemandeurs?.[0]) {
          newErrEv4.societesDemandeurs = "La société demandeuse est obligatoire.";
        }
        if (!evolutionFormData.interlocuteurClient) {
          newErrEv4.interlocuteurClient = "L'interlocuteur client est obligatoire.";
        }
        if (!evolutionFormData.methodologie) {
          newErrEv4.methodologie = "La méthodologie est obligatoire.";
        }
        if (!evolutionFormData.nomProjet?.trim()) {
          newErrEv4.nomProjet = "Le nom du projet est obligatoire.";
        }
        if (Object.keys(newErrEv4).length > 0) {
          setErrorsEvolution(newErrEv4);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
      }

      if (evolutionStep === 5) {
        const newErrEv5 = {};
        if (!evolutionFormData.dateTransmissionBacklog) {
          newErrEv5.dateTransmissionBacklog = "La date de transmission du backlog est obligatoire.";
        }
        if (!evolutionFormData.dateConfirmationValidation) {
          newErrEv5.dateConfirmationValidation = "La date de confirmation/validation est obligatoire.";
        } else if (evolutionFormData.dateTransmissionBacklog && evolutionFormData.dateConfirmationValidation < evolutionFormData.dateTransmissionBacklog) {
          newErrEv5.dateConfirmationValidation = "Ne peut pas être avant la date de transmission.";
        }
        if (Object.keys(newErrEv5).length > 0) {
          setErrorsEvolution(newErrEv5);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
      }

      if (evolutionStep === 6) {
        const newErrEv6 = {};
        if (!evolutionFormData.dateCommunicationPlanningClient) {
          newErrEv6.dateCommunicationPlanningClient = "La date de communication du planning client est obligatoire.";
        }
        const nbEv6 = parseInt(evolutionFormData.nombreSprint) || 0;
        if (nbEv6 < 1) {
          newErrEv6.nombreSprint = "Le nombre de sprints doit être d'au moins 1.";
        }
        if (Object.keys(newErrEv6).length > 0) {
          setErrorsEvolution(newErrEv6);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
        const sprints = evolutionFormData.sprintsData || [];
        const manquants = Array.from({ length: nbEv6 }, (_, i) => i + 1).filter(
          (i) => !sprints[i - 1]?.chantier?.trim()
        );
        if (manquants.length > 0) {
          setDemandeMessage({ type: "error", text: `Le chantier est obligatoire pour chaque sprint. Sprint${manquants.length > 1 ? "s" : ""} sans chantier : ${manquants.map((n) => `Sprint ${n}`).join(", ")}.` });
          scrollToFormTop(); return;
        }
      }

      if (evolutionStep === 7) {
        const newErrEv7 = {};
        if (!evolutionFormData.statutCodage) {
          newErrEv7.statutCodage = "Le statut du codage est obligatoire.";
        }
        if (!evolutionFormData.statutTIF) {
          newErrEv7.statutTIF = "Le statut TIF est obligatoire.";
        }
        if (Object.keys(newErrEv7).length > 0) {
          setErrorsEvolution(newErrEv7);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
      }

      if (evolutionStep === 8) {
        const newErrEv8 = {};
        if (!evolutionFormData.lienIngridKickoff?.trim()) {
          newErrEv8.lienIngridKickoff = "Le lien du document Kickoff est obligatoire.";
        }
        if (!evolutionFormData.lienIngridPointsControleTIF?.trim()) {
          newErrEv8.lienIngridPointsControleTIF = "Le lien des points de contrôle TIF est obligatoire.";
        }
        if (!evolutionFormData.lienIngridSignoff?.trim()) {
          newErrEv8.lienIngridSignoff = "Le lien du document Signoff est obligatoire.";
        }
        if (Object.keys(newErrEv8).length > 0) {
          setErrorsEvolution(newErrEv8);
          setTimeout(() => { const el = document.querySelector('[data-field-error="true"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
          return;
        }
        const nb = parseInt(evolutionFormData.nombreSprint) || 0;
        if (nb > 0) {
          const sprints = evolutionFormData.sprintsData || [];
          const nonTermines = Array.from({ length: nb }, (_, i) => sprints[i] || {})
            .filter(s => s.statutSprint !== "terminé").length;
          if (nonTermines > 0) {
            setDemandeMessage({
              type: "error",
              text: `Impossible de passer à la livraison : ${nonTermines} sprint${nonTermines > 1 ? "s" : ""} non terminé${nonTermines > 1 ? "s" : ""}. Terminez tous les sprints à l'étape Réalisation.`,
            });
            scrollToFormTop(); return;
          }
        }
      }

      setErrorsEvolution({});
      setEvolutionStep(evolutionStep + 1);
      scrollToFormTop();
    }
  };

  const handleEvolutionPrevious = () => {
    if (evolutionStep > 1) {
      setEvolutionStep(evolutionStep - 1);
      setDemandeMessage({ type: "", text: "" });
      setErrorsEvolution({});
      scrollToFormTop();
    }
  };

  const handleEvolutionCancel = () => {
    localStorage.removeItem(EVOLUTION_STORAGE_KEY);
    setShowEvolutionForm(false);
    setShowSelectionCards(true);
    setEvolutionStep(1);
    setDemandeMessage({ type: "", text: "" });
    setErrorsEvolution({});
    setIsModificationMode(false);
  };

  const handleEvolutionSubmit = (e) => {
    e.preventDefault();
  };

  const handleTerminerEvolution = async () => {
    const statutLiv = evolutionFormData.statutLivraisonClient;
    const dateLiv = evolutionFormData.dateEffectiveLivraisonClient;

    const nb = parseInt(evolutionFormData.nombreSprint) || 0;
    if (nb > 0) {
      const sprints = evolutionFormData.sprintsData || [];
      const nonTermines = Array.from({ length: nb }, (_, i) => sprints[i] || {})
        .filter(s => s.statutSprint !== "terminé");
      if (nonTermines.length > 0) {
        setDemandeMessage({
          type: "error",
          text: `Impossible de livrer : ${nonTermines.length} sprint${nonTermines.length > 1 ? "s" : ""} non terminé${nonTermines.length > 1 ? "s" : ""}. Tous les sprints doivent être à "Terminé" avant la livraison.`,
        });
        scrollToFormTop();
        return;
      }
    }

    if (!dateLiv?.trim() || statutLiv !== "livré au client") {
      setDemandeMessage({
        type: "error",
        text: "La demande ne peut pas être terminée : la livraison au client n'a pas été effectuée. Veuillez renseigner la date de livraison effective.",
      });
      scrollToFormTop();
      return;
    }

    try {
      setDemandeMessage({ type: "info", text: "Finalisation en cours..." });
      const currentDemandeId = evolutionFormData.id;
      const payload = {
        typeProjet: "Evolution",
        nomProjet: evolutionFormData.nomProjet || "",
        dateEnregistrement: evolutionFormData.dateEnregistrement || null,
        dateReception: evolutionFormData.dateReception || null,
        societeDemandeur: evolutionFormData.societesDemandeursNames?.[0] || evolutionFormData.societesDemandeurs?.[0] || null,
        societesDemandeurs: evolutionFormData.societesDemandeursNames?.join(", ") || null,
        interlocuteur: evolutionFormData.interlocuteur || null,
        interlocuteurClient: evolutionFormData.interlocuteurClient || null,
        demandeur: evolutionFormData.demandeur || null,
        dateDemandeMiseAJourDATFL: evolutionFormData.dateDemandeMiseAJourDATFL || null,
        dateReponseMiseAJourDATFL: evolutionFormData.dateReponseMiseAJourDATFL || null,
        charge: evolutionFormData.charge ? parseFloat(evolutionFormData.charge) : null,
        planningDateDebut: evolutionFormData.planningDateDebut || null,
        planningDateFin: evolutionFormData.planningDateFin || null,
        dateDemandeDevolution: evolutionFormData.dateDemandeDevolution || null,
        dateReponseDevolution: evolutionFormData.dateReponseDevolution || null,
        slt: evolutionFormData.slt || null,
        aleasNormeParJour: evolutionFormData.aleasNormeParJour || null,
        descriptionProjet: evolutionFormData.descriptionProjet || null,
        descriptionPerimetre: evolutionFormData.descriptionPerimetre || null,
        statutDemande: evolutionFormData.statutDemande || null,
        lienIngridCDC: evolutionFormData.lienIngridCDC || null,
        dateTransmissionBacklog: evolutionFormData.dateTransmissionBacklog || null,
        dateConfirmationValidation: evolutionFormData.dateConfirmationValidation || null,
        observations: evolutionFormData.observations || null,
        dateDemandePlanificationDev: evolutionFormData.dateDemandePlanificationDev || null,
        dateDemandePlanificationTif: evolutionFormData.dateDemandePlanificationTif || null,
        dateRetourEquipesDev: evolutionFormData.dateRetourEquipesDev || null,
        dateRetourEquipesTif: evolutionFormData.dateRetourEquipesTif || null,
        dateCommunicationPlanningClient: evolutionFormData.dateCommunicationPlanningClient || null,
        nombreSprint: evolutionFormData.nombreSprint || null,
        sprintsData: evolutionFormData.sprintsData?.length > 0 ? evolutionFormData.sprintsData : null,
        statutCodage: evolutionFormData.statutCodage || null,
        statutTIF: evolutionFormData.statutTIF || null,
        lienIngridKickoff: evolutionFormData.lienIngridKickoff || null,
        lienIngridPointsControleTIF: evolutionFormData.lienIngridPointsControleTIF || null,
        lienIngridSignoff: evolutionFormData.lienIngridSignoff || null,
        dateEffectiveLivraisonTIF: evolutionFormData.dateEffectiveLivraisonTIF || null,
        motifsRetardTIF: evolutionFormData.motifsRetardTIF || null,
        dateEffectiveLivraisonClient: evolutionFormData.dateEffectiveLivraisonClient || null,
        motifsRetardClient: evolutionFormData.motifsRetardClient || null,
        statutLivraison: evolutionFormData.statutLivraisonClient || null,
        isDraft: false,
        draftStep: 9,
        draftStepLabel: "Livraison",
        utilisateurId: user?.id || 1,
      };

      if (currentDemandeId) {
        const resp = await apiFetch(`/demandes/${currentDemandeId}`, { method: "PUT", body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error("Erreur sauvegarde");
      } else {
        const resp = await apiFetch(`/demandes`, { method: "POST", body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error("Erreur création");
      }

      await chargerLesDemandes();
      await chargerLesDemandes();
      localStorage.removeItem(EVOLUTION_STORAGE_KEY);
      setVueLivrees(true);
      setShowDemandesList(true);
      setShowEvolutionForm(false);
      setShowSelectionCards(true);
      setEvolutionStep(1);
      setIsModificationMode(false);
      setDemandeMessage({ type: "success", text: "Demande d'évolution terminée avec succès !" });
      setTimeout(() => setDemandeMessage({ type: "", text: "" }), 4000);
    } catch (error) {
      setDemandeMessage({ type: "error", text: `Impossible de terminer la demande. ${error?.message || ""}` });
    }
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

  // Convertit un nom/code de société en son ID (pour pré-sélectionner le select)
  const getSocieteIdByName = (nom) => {
    if (!nom) return null;
    const found = societes.find(s => s.nom === nom || s.code === nom || s.id.toString() === nom);
    return found ? found.id.toString() : nom;
  };

  // Poursuivre un brouillon via le formulaire multi-étapes
  const handlePoursuivreDemande = (demande) => {
    // Fermer tout formulaire ouvert avant d'en ouvrir un autre
    setShowNouvelleDemandeForm(false);
    setShowProspecteForm(false);
    setShowEvolutionForm(false);

    // Rediriger vers le bon formulaire selon le type
    if (demande.typeProjet === "Prospecte") {
      setProspecteFormData((prev) => ({
        ...prev,
        id: demande.id,
        dateEnregistrement: demande.dateEnregistrement?.split?.("T")[0] || new Date().toISOString().split("T")[0],
        dateReception: demande.dateReception?.split?.("T")[0] || "",
        societesDemandeurs: (() => { const n = demande.societesDemandeurs || demande.societeDemandeur || ""; return n ? [getSocieteIdByName(n)] : []; })(),
        interlocuteur: demande.interlocuteur || demande.interlocuteurClient || "",
        nomProjet: demande.nomProjet || "",
        descriptionPerimetre: demande.descriptionPerimetre || "",
      }));
      setShowSelectionCards(false);
      setShowProspecteForm(true);
      setDemandeMessage({ type: "", text: "" });
      setErrorsProspecte({});
      setIsModificationMode(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (demande.typeProjet === "Evolution") {
      setEvolutionFormData((prev) => ({
        ...prev,
        id: demande.id,
        dateEnregistrement: demande.dateEnregistrement?.split?.("T")[0] || new Date().toISOString().split("T")[0],
        dateReception: demande.dateReception?.split?.("T")[0] || "",
        societesDemandeurs: (() => { const n = demande.societesDemandeurs || demande.societeDemandeur || ""; return n ? [getSocieteIdByName(n)] : []; })(),
        societesDemandeursNames: (() => { const n = demande.societesDemandeurs || demande.societeDemandeur || ""; return n ? [n] : []; })(),
        interlocuteur: demande.interlocuteur || "",
        interlocuteurClient: demande.interlocuteurClient || "",
        nomProjet: demande.nomProjet || "",
        dateDemandeMiseAJourDATFL: demande.dateDemandeMiseAJourDATFL?.split?.("T")[0] || "",
        dateReponseMiseAJourDATFL: demande.dateReponseMiseAJourDATFL?.split?.("T")[0] || "",
        charge: demande.charge ? String(demande.charge) : "",
        planningDateDebut: demande.planningDateDebut?.split?.("T")[0] || "",
        planningDateFin: demande.planningDateFin?.split?.("T")[0] || "",
        dateDemandeDevolution: demande.dateDemandeDevolution?.split?.("T")[0] || "",
        dateReponseDevolution: demande.dateReponseDevolution?.split?.("T")[0] || "",
        slt: demande.slt || "",
        aleasNormeParJour: demande.aleasNormeParJour || "",
        typeProjet: demande.typeProjet || "",
        demandeur: demande.demandeur || "",
        descriptionProjet: demande.descriptionProjet || "",
        descriptionPerimetre: demande.descriptionPerimetre || "",
        statutDemande: demande.statutDemande || "",
        lienIngridCDC: demande.lienIngridCDC || "",
        dateTransmissionBacklog: formatDateForInput(demande.dateTransmissionBacklog || ""),
        dateConfirmationValidation: formatDateForInput(demande.dateConfirmationValidation || ""),
        observations: demande.observations || "",
        dateDemandePlanificationDev: formatDateForInput(demande.dateDemandePlanificationDev || ""),
        dateDemandePlanificationTif: formatDateForInput(demande.dateDemandePlanificationTif || ""),
        dateRetourEquipesDev: formatDateForInput(demande.dateRetourEquipesDev || ""),
        dateRetourEquipesTif: formatDateForInput(demande.dateRetourEquipesTif || ""),
        dateCommunicationPlanningClient: formatDateForInput(demande.dateCommunicationPlanningClient || ""),
        nombreSprint: demande.nombreSprint != null ? String(demande.nombreSprint) : "",
        sprintsData: parseSprintsData(demande.sprintsData),
        statutCodage: demande.statutCodage || "en attente",
        statutTIF: demande.statutTIF || "en attente",
        lienIngridKickoff: demande.lienIngridKickoff || "",
        lienIngridPointsControleTIF: demande.lienIngridPointsControleTIF || "",
        lienIngridSignoff: demande.lienIngridSignoff || "",
        dateEffectiveLivraisonTIF: formatDateForInput(demande.dateEffectiveLivraisonTIF || ""),
        motifsRetardTIF: demande.motifsRetardTIF || "",
        dateEffectiveLivraisonClient: formatDateForInput(demande.dateEffectiveLivraisonClient || ""),
        motifsRetardClient: demande.motifsRetardClient || "",
        statutLivraisonClient: demande.statutLivraison || demande.statutLivraisonClient || "en attente",
      }));
      const savedStep = Number(demande.draftStep) || 1;
      setEvolutionStep(Math.min(Math.max(savedStep, 1), 9));
      setShowSelectionCards(false);
      setShowEvolutionForm(true);
      setDemandeMessage({ type: "", text: "" });
      setErrorsEvolution({});
      setIsModificationMode(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

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
    setErrorsNouvelle({});
    setIsModificationMode(true);

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
        observations: demande.observations || prev.observations || "",
        // Étape 2: Clarification — formatage obligatoire (ISO → YYYY-MM-DD)
        dateTransmissionBacklog: formatDateForInput(demande.dateTransmissionBacklog || prev.dateTransmissionBacklog || ""),
        dateConfirmationValidation: formatDateForInput(demande.dateConfirmationValidation || prev.dateConfirmationValidation || ""),
        // Étape 3: Planification — formatage obligatoire (ISO → YYYY-MM-DD)
        dateDemandePlanificationDev: formatDateForInput(demande.dateDemandePlanificationDev || prev.dateDemandePlanificationDev || ""),
        dateDemandePlanificationTif: formatDateForInput(demande.dateDemandePlanificationTif || prev.dateDemandePlanificationTif || ""),
        dateRetourEquipesDev: formatDateForInput(demande.dateRetourEquipesDev || prev.dateRetourEquipesDev || ""),
        dateRetourEquipesTif: formatDateForInput(demande.dateRetourEquipesTif || prev.dateRetourEquipesTif || ""),
        dateCommunicationPlanningClient: formatDateForInput(demande.dateCommunicationPlanningClient || prev.dateCommunicationPlanningClient || ""),
        nombreSprint: demande.nombreSprint != null ? String(demande.nombreSprint) : (prev.nombreSprint || ""),
        // Étape 4: Réalisation
        dateEffectiveLivraisonTIF: formatDateForInput(demande.dateEffectiveLivraisonTIF || prev.dateEffectiveLivraisonTIF || ""),
        // Suspension
        dateSuspension: formatDateForInput(demande.dateSuspension || prev.dateSuspension || ""),
        sprintsData: (() => {
          const raw = demande.sprintsData ?? prev.sprintsData;
          if (!raw) return [];
          if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return []; } }
          return Array.isArray(raw) ? raw : [];
        })(),
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
    const statut = demande.statutLivraison || demande.statutLivraisonClient;
    if (statut !== "livré au client") {
      setLivraisonErreurNom(demande.nomProjet || `#${demande.id}`);
      setShowLivraisonErreurModal(true);
      return;
    }
    setDemandeToDelete(demande);
    setShowDemandeDeleteConfirm(true);
  };

  const confirmDeleteDemande = async () => {
    if (demandeToDelete) {
      try {
        const resp = await apiFetch(`/demandes/${demandeToDelete.id}`, {
          method: "PUT",
          body: JSON.stringify({ isDraft: false, utilisateurId: user?.id || 1 }),
        });
        if (resp.ok) {
          setDemandeMessage({ type: "success", text: "Demande marquée comme terminée." });
          await chargerLesDemandes();
          setVueLivrees(true);
          setShowDemandesList(true);
          setTimeout(() => setDemandeMessage({ type: "", text: "" }), 4000);
        } else {
          setDemandeMessage({ type: "error", text: "Impossible de terminer la demande." });
          setTimeout(() => setDemandeMessage({ type: "", text: "" }), 5000);
        }
      } catch {
        setDemandeMessage({ type: "error", text: "Erreur de connexion au serveur." });
      }
    }
    setShowDemandeDeleteConfirm(false);
    setDemandeToDelete(null);
  };

  const cancelDeleteDemande = () => {
    setShowDemandeDeleteConfirm(false);
    setDemandeToDelete(null);
  };

  const handleSupprimerDemandeTerminee = (demande) => {
    setDemandeToSupprimer(demande);
    setShowSupprimerTermineeConfirm(true);
  };

  const confirmSupprimerDemandeTerminee = async () => {
    if (!demandeToSupprimer) return;
    try {
      const resp = await apiFetch(`/demandes/${demandeToSupprimer.id}`, { method: "DELETE" });
      if (resp.ok) {
        setDemandeMessage({ type: "success", text: `Demande "${demandeToSupprimer.nomProjet || `#${demandeToSupprimer.id}`}" supprimée définitivement.` });
        await chargerLesDemandes();
        setTimeout(() => setDemandeMessage({ type: "", text: "" }), 4000);
      } else {
        setDemandeMessage({ type: "error", text: "Impossible de supprimer la demande." });
        setTimeout(() => setDemandeMessage({ type: "", text: "" }), 5000);
      }
    } catch {
      setDemandeMessage({ type: "error", text: "Erreur de connexion au serveur." });
    }
    setShowSupprimerTermineeConfirm(false);
    setDemandeToSupprimer(null);
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
    if (t === "brouillon" || t === "") return "Brouillon";
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
    if (t === "prospecte")              return { backgroundColor: "#FF6B35", color: "#ffffff" };
    if (t === "evolution")              return { backgroundColor: "#10B981", color: "#ffffff" };
    if (t === "brouillon" || t === "")  return { backgroundColor: "#9CA3AF", color: "#ffffff" };
    return { backgroundColor: "#4A90E2", color: "#ffffff" };
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
    {
      id: "prospecte",
      label: "Demande prospecte",
      icon: "fa-solid fa-search",
      iconColor: "#FF6B35",
      borderColor: "#FF6B35",
      buttonColor: "#FF6B35",
      description: "Demande pour un projet prospecté",
    },
    {
      id: "evolution",
      label: "Demande d'évolution",
      icon: "fa-solid fa-arrow-up",
      iconColor: "#10B981",
      borderColor: "#10B981",
      buttonColor: "#10B981",
      description: "Demande d'amélioration ou d'évolution",
    },
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

            {/* Aperçu du nom du projet */}
            {nouvelleDemandeFormData.nomProjet && nouvelleDemandeStep > 1 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)",
                borderRadius: "10px",
                padding: "12px 20px",
                marginBottom: "24px",
                boxShadow: "0 2px 8px rgba(74, 144, 226, 0.25)",
              }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: "15px", color: "white" }}></i>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "600", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>Projet en cours</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "white" }}>{nouvelleDemandeFormData.nomProjet}</div>
                </div>
              </div>
            )}

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
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min="2000-01-01" max={new Date().toISOString().split("T")[0]}
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
                          Société demandeur <span className="required">*</span>
                        </label>
                        <select
                          name="societesDemandeurs"
                          value={
                            nouvelleDemandeFormData.societesDemandeurs?.[0] ||
                            ""
                          }
                          data-field-error={errorsNouvelle.societesDemandeurs ? "true" : undefined}
                          style={{ borderColor: errorsNouvelle.societesDemandeurs ? "#EF4444" : undefined }}
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
                            if (errorsNouvelle.societesDemandeurs) {
                              setErrorsNouvelle((prev) => ({ ...prev, societesDemandeurs: "" }));
                            }
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
                          {societesSelectOptions.map((societe) => (
                            <option
                              key={societe.id}
                              value={societe.id.toString()}
                            >
                              {societe.code || societe.nom}
                            </option>
                          ))}
                        </select>
                        {errorsNouvelle.societesDemandeurs && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.societesDemandeurs}</span>}
                      </div>
                      <div className="form-group">
                        <label>
                          L'interlocuteur <span className="required">*</span>
                        </label>
                        <select
                          name="interlocuteurClient"
                          value={nouvelleDemandeFormData.interlocuteurClient}
                          data-field-error={errorsNouvelle.interlocuteurClient ? "true" : undefined}
                          style={{ borderColor: errorsNouvelle.interlocuteurClient ? "#EF4444" : undefined }}
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
                        {errorsNouvelle.interlocuteurClient && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.interlocuteurClient}</span>}
                      </div>
                      <div className="form-group">
                        <label>
                          Type de projet <span className="required">*</span>
                        </label>
                        <select
                          name="typeProjet"
                          value={nouvelleDemandeFormData.typeProjet}
                          onChange={handleNouvelleDemandeInputChange}
                          data-field-error={errorsNouvelle.typeProjet ? "true" : undefined}
                          style={{ borderColor: errorsNouvelle.typeProjet ? "#EF4444" : undefined }}
                          required
                        >
                          <option value="">-- Choisir un type --</option>
                          <option value="Agile">Agile</option>
                          <option value="Classique">Classique</option>
                        </select>
                        {errorsNouvelle.typeProjet && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.typeProjet}</span>}
                      </div>
                      <div
                        className="form-group"
                        style={{ gridColumn: "1 / -1" }}
                      >
                        <label>
                          Nom du projet / Applicatif <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          name="nomProjet"
                          value={nouvelleDemandeFormData.nomProjet}
                          data-field-error={errorsNouvelle.nomProjet ? "true" : undefined}
                          style={{ borderColor: errorsNouvelle.nomProjet ? "#EF4444" : undefined }}
                          onChange={handleNouvelleDemandeInputChange}
                          onBlur={() => {
                            if (nomProjetEstDuplique(nouvelleDemandeFormData.nomProjet, nouvelleDemandeFormData.id)) {
                              setDemandeMessage({
                                type: "error",
                                text: `Un projet nommé "${nouvelleDemandeFormData.nomProjet.trim()}" existe déjà. Veuillez choisir un autre nom.`,
                              });
                              scrollToFormTop();
                            }
                          }}
                          placeholder="Nom du projet"
                          required
                        />
                        {errorsNouvelle.nomProjet && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.nomProjet}</span>}
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
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min="2000-01-01" max={formatDateForInput(nouvelleDemandeFormData.dateEnregistrement) || `${new Date().getFullYear() + 15}-12-31`}
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
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={nouvelleDemandeFormData.dateReception || formatDateForInput(nouvelleDemandeFormData.dateEnregistrement) || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateTransmissionBacklog"
                          value={nouvelleDemandeFormData.dateTransmissionBacklog}
                          onChange={handleNouvelleDemandeInputChange}
                          data-field-error={errorsNouvelle.dateTransmissionBacklog ? "true" : undefined}
                          required
                          style={{ width: "100%", padding: "10px", border: `1px solid ${errorsNouvelle.dateTransmissionBacklog ? "#EF4444" : "#d1d5db"}`, borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
                        />
                        {errorsNouvelle.dateTransmissionBacklog && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.dateTransmissionBacklog}</span>}
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>
                          Date de confirmation de validation <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={nouvelleDemandeFormData.dateTransmissionBacklog || formatDateForInput(nouvelleDemandeFormData.dateEnregistrement) || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateConfirmationValidation"
                          value={nouvelleDemandeFormData.dateConfirmationValidation}
                          onChange={handleNouvelleDemandeInputChange}
                          data-field-error={errorsNouvelle.dateConfirmationValidation ? "true" : undefined}
                          required
                          style={{ width: "100%", padding: "10px", border: `1px solid ${errorsNouvelle.dateConfirmationValidation ? "#EF4444" : "#d1d5db"}`, borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
                        />
                        {errorsNouvelle.dateConfirmationValidation && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.dateConfirmationValidation}</span>}
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
                        name="observations"
                        value={nouvelleDemandeFormData.observations || ""}
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
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={nouvelleDemandeFormData.dateConfirmationValidation || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateDemandePlanificationDev"
                          value={nouvelleDemandeFormData.dateDemandePlanificationDev}
                          onChange={handleNouvelleDemandeInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Date de demande de planification TIF</label>
                        <input
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={nouvelleDemandeFormData.dateConfirmationValidation || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateDemandePlanificationTif"
                          value={nouvelleDemandeFormData.dateDemandePlanificationTif}
                          onChange={handleNouvelleDemandeInputChange}
                        />
                      </div>
                      {(() => {
                        const today = new Date(); today.setHours(0,0,0,0);
                        const retard = (d) => d && new Date(d) < today;
                        const flashClass = flashRetards ? "flash-retard" : "";
                        return (
                          <>
                            <div className="form-group">
                              <label>Date du retour des équipes DEV</label>
                              <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={nouvelleDemandeFormData.dateDemandePlanificationDev || nouvelleDemandeFormData.dateConfirmationValidation || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`} name="dateRetourEquipesDev"
                                value={nouvelleDemandeFormData.dateRetourEquipesDev}
                                onChange={handleNouvelleDemandeInputChange}
                                className={retard(nouvelleDemandeFormData.dateRetourEquipesDev) ? flashClass : ""}
                              />
                            </div>
                            <div className="form-group">
                              <label>Date du retour des équipes TIF</label>
                              <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={nouvelleDemandeFormData.dateDemandePlanificationTif || nouvelleDemandeFormData.dateConfirmationValidation || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`} name="dateRetourEquipesTif"
                                value={nouvelleDemandeFormData.dateRetourEquipesTif}
                                onChange={handleNouvelleDemandeInputChange}
                                className={retard(nouvelleDemandeFormData.dateRetourEquipesTif) ? flashClass : ""}
                              />
                            </div>
                            <div className="form-group">
                              <label>Date de communication du planning au client <span className="required">*</span></label>
                              <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={[nouvelleDemandeFormData.dateRetourEquipesDev, nouvelleDemandeFormData.dateRetourEquipesTif, nouvelleDemandeFormData.dateConfirmationValidation].filter(Boolean).sort().pop() || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`} name="dateCommunicationPlanningClient"
                                value={nouvelleDemandeFormData.dateCommunicationPlanningClient}
                                onChange={handleNouvelleDemandeInputChange}
                                data-field-error={errorsNouvelle.dateCommunicationPlanningClient ? "true" : undefined}
                                required
                                className={retard(nouvelleDemandeFormData.dateCommunicationPlanningClient) ? flashClass : ""}
                                style={{ borderColor: errorsNouvelle.dateCommunicationPlanningClient ? "#EF4444" : undefined }}
                              />
                              {errorsNouvelle.dateCommunicationPlanningClient && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.dateCommunicationPlanningClient}</span>}
                            </div>
                          </>
                        );
                      })()}
                      <div className="form-group">
                        <label>
                          Nombre de sprint pour le périmètre <span className="required">*</span>
                        </label>
                        <input
                          type="number"
                          name="nombreSprint"
                          value={nouvelleDemandeFormData.nombreSprint}
                          onChange={handleNouvelleDemandeInputChange}
                          min="1"
                          placeholder="Ex: 3"
                          data-field-error={errorsNouvelle.nombreSprint ? "true" : undefined}
                          style={{ borderColor: errorsNouvelle.nombreSprint ? "#EF4444" : undefined }}
                          required
                        />
                        {errorsNouvelle.nombreSprint && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.nombreSprint}</span>}
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
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600" }}>Chantiers <span style={{ color: "#EF4444" }}>*</span></th>
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
                                const prevSprintData = i > 0 ? ((nouvelleDemandeFormData.sprintsData || [])[i - 1] || {}) : null;
                                // Min du sprint N = fin du sprint N-1 (dateEffClient ou datePrevClient)
                                const minDateSprint = prevSprintData
                                  ? (prevSprintData.dateEffClient || prevSprintData.datePrevClient || prevSprintData.dateEffTIF || prevSprintData.datePrevTIF || nouvelleDemandeFormData.dateCommunicationPlanningClient || "2000-01-01")
                                  : (nouvelleDemandeFormData.dateCommunicationPlanningClient || "2000-01-01");
                                const retardTIF = sprintData.datePrevTIF && sprintData.dateEffTIF && sprintData.dateEffTIF > sprintData.datePrevTIF;
                                const retardClient = sprintData.datePrevClient && sprintData.dateEffClient && sprintData.dateEffClient > sprintData.datePrevClient;
                                const today = new Date(); today.setHours(0,0,0,0);
                                const tifDepasse = sprintData.datePrevTIF && !sprintData.dateEffTIF && new Date(sprintData.datePrevTIF) < today;
                                const clientDepasse = sprintData.datePrevClient && !sprintData.dateEffClient && new Date(sprintData.datePrevClient) < today;
                                return (
                                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "8px", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap", color: "#374151" }}>
                                      Sprint {i + 1}
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", background: sprintData.chantier?.trim() ? "transparent" : "#FEF2F2" }}>
                                      <input
                                        type="text"
                                        value={sprintData.chantier || ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const nb = parseInt(nouvelleDemandeFormData.nombreSprint) || 0;
                                          setNouvelleDemandeFormData((prev) => {
                                            const updated = [...(prev.sprintsData || [])];
                                            for (let idx = 0; idx < nb; idx++) {
                                              updated[idx] = { ...(updated[idx] || {}), chantier: val };
                                            }
                                            return { ...prev, sprintsData: updated };
                                          });
                                        }}
                                        placeholder="Chantier obligatoire..."
                                        style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                    </td>

                                    <td className={tifDepasse && flashRetards ? "flash-retard" : ""} style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input
                                        type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={minDateSprint} max={`${new Date().getFullYear() + 15}-12-31`}
                                        value={sprintData.datePrevTIF || ""}
                                        onChange={(e) => handleSprintDataChange(i, "datePrevTIF", e.target.value)}
                                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", background: retardTIF ? "#fff7ed" : undefined }}>
                                      <input
                                        type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={minDateSprint} max={`${new Date().getFullYear() + 15}-12-31`}
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
                                    <td className={clientDepasse && flashRetards ? "flash-retard" : ""} style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input
                                        type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={sprintData.datePrevTIF || minDateSprint} max={`${new Date().getFullYear() + 15}-12-31`}
                                        value={sprintData.datePrevClient || ""}
                                        onChange={(e) => handleSprintDataChange(i, "datePrevClient", e.target.value)}
                                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", background: retardClient ? "#fff7ed" : undefined }}>
                                      <input
                                        type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={sprintData.dateEffTIF || sprintData.datePrevTIF || minDateSprint} max={`${new Date().getFullYear() + 15}-12-31`}
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
                      return (
                        <div style={{ marginTop: "32px" }}>
                          <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", marginBottom: "12px" }}>Roadmap — Vue Gantt</h4>
                          <GanttChart sprints={sprints} compact={true} />
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
                        <label>Statut Codage <span className="required">*</span></label>
                        <select
                          name="statutCodage"
                          value={nouvelleDemandeFormData.statutCodage}
                          onChange={handleNouvelleDemandeInputChange}
                          data-field-error={errorsNouvelle.statutCodage ? "true" : undefined}
                          style={{ borderColor: errorsNouvelle.statutCodage ? "#EF4444" : undefined }}
                        >
                          <option value="en attente">En attente</option>
                          <option value="en cours">En cours</option>
                          <option value="terminé">Terminé</option>
                        </select>
                        {errorsNouvelle.statutCodage && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.statutCodage}</span>}
                      </div>
                      <div className="form-group">
                        <label>Statut TIF <span className="required">*</span></label>
                        <select
                          name="statutTIF"
                          value={nouvelleDemandeFormData.statutTIF}
                          onChange={handleNouvelleDemandeInputChange}
                          data-field-error={errorsNouvelle.statutTIF ? "true" : undefined}
                          style={{ borderColor: errorsNouvelle.statutTIF ? "#EF4444" : undefined }}
                        >
                          <option value="en attente">En attente</option>
                          <option value="en cours">En cours</option>
                          <option value="terminé">Terminé</option>
                        </select>
                        {errorsNouvelle.statutTIF && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.statutTIF}</span>}
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
                          const sommeAvancements = Array.from({ length: total }, (_, i) => Number((sprints[i] || {}).avancement) || 0).reduce((a, b) => a + b, 0);
                          const pct = total > 0 ? Math.round(sommeAvancements / total) : 0;
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
                                const prevSprintData = i > 0 ? ((nouvelleDemandeFormData.sprintsData || [])[i - 1] || {}) : null;
                                const prevTermine = i === 0 || prevSprintData?.statutSprint === "terminé";
                                const isBloque = !prevTermine;
                                const isEnCours = sprintData.statutSprint === "en cours";
                                const isTermine = sprintData.statutSprint === "terminé";
                                return (
                                  <tr key={i} style={{ backgroundColor: isBloque ? "#f9fafb" : isEnCours ? "#eff6ff" : isTermine ? "#f0fdf4" : i % 2 === 0 ? "#fff" : "#fafafa", opacity: isBloque ? 0.6 : 1 }}>
                                    <td style={{ padding: "10px 12px", border: "1px solid #e5e7eb", fontWeight: "600", color: isBloque ? "#9ca3af" : isEnCours ? "#1d4ed8" : "#374151" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        {isBloque && <i className="fa-solid fa-lock" style={{ fontSize: "10px", color: "#9ca3af" }} title={`Sprint ${i} doit être terminé d'abord`} />}
                                        {!isBloque && isEnCours && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />}
                                        Sprint {i + 1}
                                      </div>
                                    </td>
                                    <td style={{ padding: "10px 12px", border: "1px solid #e5e7eb", color: "#6b7280" }}>
                                      {sprintData.chantier || "—"}
                                    </td>
                                    <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>
                                      <select
                                        value={sprintData.statutSprint || "en attente"}
                                        onChange={(e) => {
                                          handleSprintDataChange(i, "statutSprint", e.target.value);
                                          if (e.target.value === "terminé") handleSprintDataChange(i, "avancement", 100);
                                        }}
                                        disabled={isBloque}
                                        title={isBloque ? `Terminez le Sprint ${i} avant de modifier ce sprint` : undefined}
                                        style={{ fontSize: "13px", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", background: isBloque ? "#f3f4f6" : "white", cursor: isBloque ? "not-allowed" : "default" }}
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
                                          onChange={(e) => handleSprintDataChange(i, "avancement", Math.min(100, Math.max(0, Number(e.target.value))))}
                                          min="0"
                                          max="100"
                                          placeholder="0"
                                          disabled={isBloque}
                                          title={isBloque ? `Terminez le Sprint ${i} avant de saisir l'avancement` : undefined}
                                          style={{ width: "60px", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px", background: isBloque ? "#f3f4f6" : "white", cursor: isBloque ? "not-allowed" : "default" }}
                                        />
                                        <span style={{ color: "#6b7280" }}>%</span>
                                        {!isBloque && sprintData.avancement > 0 && (
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
                          Présentation de kickoff - Lien INGRID <span className="required">*</span>
                        </label>
                        <input
                          type="url"
                          name="lienIngridKickoff"
                          value={nouvelleDemandeFormData.lienIngridKickoff}
                          onChange={handleNouvelleDemandeInputChange}
                          placeholder="https://ingrid.example.com/..."
                          data-field-error={errorsNouvelle.lienIngridKickoff ? "true" : undefined}
                          style={{ borderColor: errorsNouvelle.lienIngridKickoff ? "#EF4444" : undefined }}
                          required
                        />
                        {errorsNouvelle.lienIngridKickoff && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.lienIngridKickoff}</span>}
                      </div>
                      <div className="form-group">
                        <label>
                          Rédaction des points de contrôles (TIF) - Lien INGRID <span className="required">*</span>
                        </label>
                        <input
                          type="url"
                          name="lienIngridPointsControleTIF"
                          value={
                            nouvelleDemandeFormData.lienIngridPointsControleTIF
                          }
                          onChange={handleNouvelleDemandeInputChange}
                          placeholder="https://ingrid.example.com/..."
                          data-field-error={errorsNouvelle.lienIngridPointsControleTIF ? "true" : undefined}
                          style={{ borderColor: errorsNouvelle.lienIngridPointsControleTIF ? "#EF4444" : undefined }}
                          required
                        />
                        {errorsNouvelle.lienIngridPointsControleTIF && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.lienIngridPointsControleTIF}</span>}
                      </div>
                      <div className="form-group">
                        <label>
                          Rédaction du signoff document - Lien INGRID <span className="required">*</span>
                        </label>
                        <input
                          type="url"
                          name="lienIngridSignoff"
                          value={nouvelleDemandeFormData.lienIngridSignoff}
                          onChange={handleNouvelleDemandeInputChange}
                          placeholder="https://ingrid.example.com/..."
                          data-field-error={errorsNouvelle.lienIngridSignoff ? "true" : undefined}
                          style={{ borderColor: errorsNouvelle.lienIngridSignoff ? "#EF4444" : undefined }}
                          required
                        />
                        {errorsNouvelle.lienIngridSignoff && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsNouvelle.lienIngridSignoff}</span>}
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
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={nouvelleDemandeFormData.dateCommunicationPlanningClient || formatDateForInput(nouvelleDemandeFormData.dateEnregistrement) || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
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
                  {isModificationMode && nouvelleDemandeStep < 6 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: "#EF4444", borderColor: "#EF4444" }}
                      onClick={() => {
                        setIsModificationMode(false);
                        setShowNouvelleDemandeForm(false);
                        setShowSelectionCards(true);
                        setShowDemandesList(true);
                        setNouvelleDemandeStep(1);
                        setDemandeMessage({ type: "", text: "" });
                      }}
                    >
                      Annuler
                    </button>
                  )}
                  {nouvelleDemandeStep < 6 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => sauvegarderNouvelleDemandeBrouillon()}
                  >
                    Enregistrer le brouillon
                  </button>
                  )}
                  {nouvelleDemandeStep < 6 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleNouvelleDemandeNext}
                    >
                      {nouvelleDemandeStep === 5 ? "Livraison →" : "Suivant →"}
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
              {demandeMessage.text && demandeMessage.type !== "error" && (
                <div
                  className="info-box success-box"
                  style={{
                    marginBottom: "24px",
                    padding: "12px",
                    borderRadius: "6px",
                    backgroundColor: demandeMessage.type === "info" ? "#dbeafe" : "#d1fae5",
                    border: `1px solid ${demandeMessage.type === "info" ? "#bfdbfe" : "#a7f3d0"}`,
                    color: demandeMessage.type === "info" ? "#1e40af" : "#065f46",
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
                      type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min="2000-01-01" max={new Date().toISOString().split("T")[0]}
                      name="dateEnregistrement"
                      value={formatDateForInput(prospecteFormData.dateEnregistrement)}
                      onChange={handleProspecteInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Date de réception <span className="required">*</span>
                    </label>
                    <input
                      type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min="2000-01-01" max={formatDateForInput(prospecteFormData.dateEnregistrement) || `${new Date().getFullYear() + 15}-12-31`}
                      name="dateReception"
                      value={formatDateForInput(prospecteFormData.dateReception)}
                      onChange={handleProspecteInputChange}
                      data-field-error={errorsProspecte.dateReception ? "true" : undefined}
                      style={{ borderColor: errorsProspecte.dateReception ? "#EF4444" : undefined }}
                    />
                    {errorsProspecte.dateReception && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsProspecte.dateReception}</span>}
                  </div>
                  <div className="form-group">
                    <label>
                      Société demandeur <span className="required">*</span>
                    </label>
                    <select
                      name="societesDemandeurs"
                      value={prospecteFormData.societesDemandeurs?.[0] || ""}
                      data-field-error={errorsProspecte.societesDemandeurs ? "true" : undefined}
                      style={{ borderColor: errorsProspecte.societesDemandeurs ? "#EF4444" : undefined }}
                      onChange={(e) => {
                        setProspecteFormData((prev) => ({
                          ...prev,
                          societesDemandeurs: e.target.value ? [e.target.value] : [],
                        }));
                        if (errorsProspecte.societesDemandeurs) setErrorsProspecte((prev) => ({ ...prev, societesDemandeurs: "" }));
                        if (demandeMessage.text) setDemandeMessage({ type: "", text: "" });
                      }}
                    >
                      <option value="">-- Sélectionner une société --</option>
                      {societes.length === 0 && (
                        <option value="" disabled>
                          Aucune société disponible (ajoutez-en dans
                          Paramétrage)
                        </option>
                      )}
                      {societesSelectOptions.map((societe) => (
                        <option key={societe.id} value={societe.id.toString()}>
                          {societe.code || societe.nom}
                        </option>
                      ))}
                    </select>
                    {errorsProspecte.societesDemandeurs && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsProspecte.societesDemandeurs}</span>}
                  </div>
                  <div className="form-group">
                    <label>
                      Interlocuteur <span className="required">*</span>
                    </label>
                    <select
                      name="interlocuteur"
                      value={prospecteFormData.interlocuteur}
                      onChange={handleProspecteInputChange}
                      data-field-error={errorsProspecte.interlocuteur ? "true" : undefined}
                      style={{ borderColor: errorsProspecte.interlocuteur ? "#EF4444" : undefined }}
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
                    {errorsProspecte.interlocuteur && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsProspecte.interlocuteur}</span>}
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label>
                      Nom du projet <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="nomProjet"
                      value={prospecteFormData.nomProjet}
                      data-field-error={errorsProspecte.nomProjet ? "true" : undefined}
                      style={{ borderColor: errorsProspecte.nomProjet ? "#EF4444" : undefined }}
                      onChange={handleProspecteInputChange}
                      placeholder="Nom du projet"
                    />
                    {errorsProspecte.nomProjet && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsProspecte.nomProjet}</span>}
                  </div>
                  <div className="form-group">
                    <label>
                      Périmètre
                    </label>
                    <input
                      type="text"
                      name="descriptionPerimetre"
                      value={prospecteFormData.descriptionPerimetre}
                      onChange={handleProspecteInputChange}
                      placeholder="Décrivez le périmètre..."
                    />
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
                <div style={{ display: "flex", gap: "12px" }}>
                  {isModificationMode && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: "#EF4444", borderColor: "#EF4444" }}
                      onClick={() => {
                        localStorage.removeItem(PROSPECTE_STORAGE_KEY);
                        setIsModificationMode(false);
                        setShowProspecteForm(false);
                        setShowSelectionCards(true);
                        setShowDemandesList(true);
                        setDemandeMessage({ type: "", text: "" });
                      }}
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      background: "linear-gradient(135deg, #FF6B35 0%, #FF6B35dd 100%)",
                      boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
                    }}
                  >
                    {isModificationMode ? "Enregistrer les modifications" : "Créer la demande prospecte"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Formulaire "Demande d'évolution" - 9 étapes */}
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
                padding: "0 10px",
                position: "relative",
              }}
            >
              {[
                { num: 1, label: "Info demande" },
                { num: 2, label: "DATFL" },
                { num: 3, label: "Planning & SLT" },
                { num: 4, label: "Enregistrement" },
                { num: 5, label: "Clarification" },
                { num: 6, label: "Planification" },
                { num: 7, label: "Réalisation" },
                { num: 8, label: "Documents" },
                { num: 9, label: "Livraison" },
              ].map((step, index) => (
                <div
                  key={step.num}
                  onClick={() => step.num <= evolutionStep && setEvolutionStep(step.num)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    zIndex: 1,
                    cursor: step.num <= evolutionStep ? "pointer" : "default",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor:
                        evolutionStep >= step.num ? "#10B981" : "#e5e7eb",
                      color: evolutionStep >= step.num ? "white" : "#6b7280",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "13px",
                      marginBottom: "6px",
                      transition: "all 0.3s ease",
                      border:
                        evolutionStep === step.num
                          ? "3px solid #059669"
                          : "none",
                      boxShadow:
                        evolutionStep === step.num
                          ? "0 0 0 3px rgba(16, 185, 129, 0.2)"
                          : "none",
                    }}
                  >
                    {step.num}
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: evolutionStep >= step.num ? "#10B981" : "#6b7280",
                      fontWeight: evolutionStep >= step.num ? "600" : "400",
                      textAlign: "center",
                    }}
                  >
                    {step.label}
                  </span>
                  {index < 8 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "18px",
                        left: "calc(50% + 18px)",
                        width: "calc(100% - 72px)",
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

            {/* Aperçu du nom du projet */}
            {evolutionFormData.nomProjet && evolutionStep > 1 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                borderRadius: "10px",
                padding: "12px 20px",
                marginBottom: "24px",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
              }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="fa-solid fa-arrow-up" style={{ fontSize: "15px", color: "white" }}></i>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "600", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>Demande d'évolution</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "white" }}>{evolutionFormData.nomProjet}</div>
                </div>
              </div>
            )}

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
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min="2000-01-01" max={new Date().toISOString().split("T")[0]}
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
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min="2000-01-01" max={formatDateForInput(evolutionFormData.dateEnregistrement) || `${new Date().getFullYear() + 15}-12-31`}
                          name="dateReception"
                          value={formatDateForInput(
                            evolutionFormData.dateReception,
                          )}
                          onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.dateReception ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.dateReception ? "#EF4444" : undefined }}
                          required
                        />
                        {errorsEvolution.dateReception && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.dateReception}</span>}
                      </div>
                      <div className="form-group">
                        <label>
                          Société demandeur <span className="required">*</span>
                        </label>
                        <select
                          name="societesDemandeurs"
                          value={
                            evolutionFormData.societesDemandeurs?.[0] || ""
                          }
                          data-field-error={errorsEvolution.societesDemandeurs ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.societesDemandeurs ? "#EF4444" : undefined }}
                          onChange={(e) => {
                            setEvolutionFormData((prev) => ({
                              ...prev,
                              societesDemandeurs: e.target.value
                                ? [e.target.value]
                                : [],
                            }));
                            if (errorsEvolution.societesDemandeurs) {
                              setErrorsEvolution((prev) => ({ ...prev, societesDemandeurs: "" }));
                            }
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
                          {societesSelectOptions.map((societe) => (
                            <option
                              key={societe.id}
                              value={societe.id.toString()}
                            >
                              {societe.code || societe.nom}
                            </option>
                          ))}
                        </select>
                        {errorsEvolution.societesDemandeurs && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.societesDemandeurs}</span>}
                      </div>
                      <div className="form-group">
                        <label>
                          Interlocuteur <span className="required">*</span>
                        </label>
                        <select
                          name="interlocuteur"
                          value={evolutionFormData.interlocuteur}
                          data-field-error={errorsEvolution.interlocuteur ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.interlocuteur ? "#EF4444" : undefined }}
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
                        {errorsEvolution.interlocuteur && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.interlocuteur}</span>}
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
                          data-field-error={errorsEvolution.nomProjet ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.nomProjet ? "#EF4444" : undefined }}
                          onChange={handleEvolutionInputChange}
                          placeholder="Nom du projet"
                          required
                        />
                        {errorsEvolution.nomProjet && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.nomProjet}</span>}
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
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateReception || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateDemandeMiseAJourDATFL"
                          value={evolutionFormData.dateDemandeMiseAJourDATFL}
                          onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.dateDemandeMiseAJourDATFL ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.dateDemandeMiseAJourDATFL ? "#EF4444" : undefined }}
                          required
                        />
                        {errorsEvolution.dateDemandeMiseAJourDATFL && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.dateDemandeMiseAJourDATFL}</span>}
                      </div>
                      <div className="form-group">
                        <label>
                          Date de réponse de la mise à jour du DATFL{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateDemandeMiseAJourDATFL || evolutionFormData.dateReception || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateReponseMiseAJourDATFL"
                          value={evolutionFormData.dateReponseMiseAJourDATFL}
                          onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.dateReponseMiseAJourDATFL ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.dateReponseMiseAJourDATFL ? "#EF4444" : undefined }}
                          required
                        />
                        {errorsEvolution.dateReponseMiseAJourDATFL && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.dateReponseMiseAJourDATFL}</span>}
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
                          data-field-error={errorsEvolution.charge ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.charge ? "#EF4444" : undefined }}
                          required
                        />
                        {errorsEvolution.charge && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.charge}</span>}
                      </div>
                      <div className="form-group">
                        <label>
                          Date de début du planning{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateReponseMiseAJourDATFL || evolutionFormData.dateReception || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="planningDateDebut"
                          value={evolutionFormData.planningDateDebut}
                          onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.planningDateDebut ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.planningDateDebut ? "#EF4444" : undefined }}
                          required
                        />
                        {errorsEvolution.planningDateDebut && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.planningDateDebut}</span>}
                      </div>
                      <div className="form-group">
                        <label>
                          Date de fin du planning{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.planningDateDebut || evolutionFormData.dateReponseMiseAJourDATFL || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="planningDateFin"
                          value={evolutionFormData.planningDateFin}
                          onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.planningDateFin ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.planningDateFin ? "#EF4444" : undefined }}
                          required
                        />
                        {errorsEvolution.planningDateFin && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.planningDateFin}</span>}
                      </div>
                      <div className="form-group">
                        <label>
                          Date de demande devolution{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateReception || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
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
                          type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateDemandeDevolution || evolutionFormData.dateReception || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
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

                {/* Étape 4: Enregistrement (= nouvelle demande étape 1) */}
                {evolutionStep === 4 && (
                  <div>
                    <h3 style={{ marginBottom: "32px", color: "#1a1a1a", fontSize: "24px", fontWeight: "600" }}>
                      4. Enregistrement de la demande
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div className="form-group">
                        <label>Date d'enregistrement</label>
                        <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min="2000-01-01" max={new Date().toISOString().split("T")[0]}
                          name="dateEnregistrement"
                          value={formatDateForInput(evolutionFormData.dateEnregistrement)}
                          onChange={handleEvolutionInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Société demandeur <span className="required">*</span></label>
                        <select
                          value={evolutionFormData.societesDemandeurs?.[0] || ""}
                          onChange={(e) => {
                            const sel = societes.find(s => s.id.toString() === e.target.value);
                            setEvolutionFormData(prev => ({
                              ...prev,
                              societesDemandeurs: e.target.value ? [e.target.value] : [],
                              societesDemandeursNames: e.target.value && sel ? [sel.nom] : [],
                            }));
                            if (errorsEvolution.societesDemandeurs) setErrorsEvolution(prev => ({ ...prev, societesDemandeurs: "" }));
                          }}
                          data-field-error={errorsEvolution.societesDemandeurs ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.societesDemandeurs ? "#EF4444" : undefined }}
                        >
                          <option value="">-- Sélectionner une société --</option>
                          {societesSelectOptions.map(s => <option key={s.id} value={s.id.toString()}>{s.code || s.nom}</option>)}
                        </select>
                        {errorsEvolution.societesDemandeurs && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.societesDemandeurs}</span>}
                      </div>
                      <div className="form-group">
                        <label>Interlocuteur client <span className="required">*</span></label>
                        <select name="interlocuteurClient" value={evolutionFormData.interlocuteurClient} onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.interlocuteurClient ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.interlocuteurClient ? "#EF4444" : undefined }}>
                          <option value="">Sélectionner un interlocuteur</option>
                          {interlocuteurs.map(i => <option key={i.id} value={i.nom}>{i.nom}</option>)}
                        </select>
                        {errorsEvolution.interlocuteurClient && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.interlocuteurClient}</span>}
                      </div>
                      <div className="form-group">
                        <label>Méthodologie <span className="required">*</span></label>
                        <select name="methodologie" value={evolutionFormData.methodologie || ""} onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.methodologie ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.methodologie ? "#EF4444" : undefined }}>
                          <option value="">-- Choisir une méthodologie --</option>
                          <option value="Agile">Agile</option>
                          <option value="Classique">Classique</option>
                        </select>
                        {errorsEvolution.methodologie && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.methodologie}</span>}
                      </div>
                      <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                        <label>Nom du projet <span className="required">*</span></label>
                        <input type="text" name="nomProjet" value={evolutionFormData.nomProjet} onChange={handleEvolutionInputChange} placeholder="Nom du projet"
                          data-field-error={errorsEvolution.nomProjet ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.nomProjet ? "#EF4444" : undefined }} />
                        {errorsEvolution.nomProjet && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.nomProjet}</span>}
                      </div>
                      <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                        <label>Description du projet</label>
                        <textarea name="descriptionProjet" value={evolutionFormData.descriptionProjet} onChange={handleEvolutionInputChange} rows={4} placeholder="Décrivez le projet..." />
                      </div>
                      <div className="form-group">
                        <label>Périmètre</label>
                        <input type="text" name="descriptionPerimetre" value={evolutionFormData.descriptionPerimetre} onChange={handleEvolutionInputChange} placeholder="Saisir le périmètre..." />
                      </div>
                      <div className="form-group">
                        <label>Statut de la demande</label>
                        <select name="statutDemande" value={evolutionFormData.statutDemande} onChange={handleEvolutionInputChange}>
                          <option value="">Sélectionnez un statut</option>
                          {statutsDisponibles.filter(s => s.actif).map(s => <option key={s.id} value={s.nom}>{s.nom}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                        <label>Lien INGRID du CDC</label>
                        <input type="url" name="lienIngridCDC" value={evolutionFormData.lienIngridCDC} onChange={handleEvolutionInputChange} placeholder="https://ingrid.example.com/..." />
                      </div>
                    </div>
                  </div>
                )}

                {/* Étape 5: Clarification (= nouvelle demande étape 2) */}
                {evolutionStep === 5 && (
                  <div>
                    <h3 style={{ marginBottom: "24px", color: "#1a1a1a", fontSize: "24px", fontWeight: "600" }}>
                      5. Clarification de la demande
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>Date de transmission du backlog <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateReception || formatDateForInput(evolutionFormData.dateEnregistrement) || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateTransmissionBacklog" value={evolutionFormData.dateTransmissionBacklog} onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.dateTransmissionBacklog ? "true" : undefined}
                          style={{ width: "100%", padding: "10px", border: `1px solid ${errorsEvolution.dateTransmissionBacklog ? "#EF4444" : "#d1d5db"}`, borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
                        {errorsEvolution.dateTransmissionBacklog && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.dateTransmissionBacklog}</span>}
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>Date de confirmation de validation <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateTransmissionBacklog || evolutionFormData.dateReception || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateConfirmationValidation" value={evolutionFormData.dateConfirmationValidation} onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.dateConfirmationValidation ? "true" : undefined}
                          style={{ width: "100%", padding: "10px", border: `1px solid ${errorsEvolution.dateConfirmationValidation ? "#EF4444" : "#d1d5db"}`, borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
                        {errorsEvolution.dateConfirmationValidation && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.dateConfirmationValidation}</span>}
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>Lien Ingrid CDC</label>
                      <input type="text" name="lienIngridCDC" value={evolutionFormData.lienIngridCDC || ""} onChange={handleEvolutionInputChange} placeholder="URL du Cahier Des Charges dans Ingrid..."
                        style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>Observations / Commentaires</label>
                      <textarea name="observations" value={evolutionFormData.observations || ""} onChange={handleEvolutionInputChange}
                        placeholder="Notez ici les observations issues de la clarification..." rows={6}
                        style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }} />
                    </div>
                  </div>
                )}

                {/* Étape 6: Planification (= nouvelle demande étape 3) */}
                {evolutionStep === 6 && (
                  <div>
                    <h3 style={{ marginBottom: "32px", color: "#1a1a1a", fontSize: "24px", fontWeight: "600" }}>
                      6. Planification du périmètre
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div className="form-group">
                        <label>Date de demande de planification DEV</label>
                        <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateConfirmationValidation || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateDemandePlanificationDev" value={evolutionFormData.dateDemandePlanificationDev} onChange={handleEvolutionInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Date de demande de planification TIF</label>
                        <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateConfirmationValidation || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateDemandePlanificationTif" value={evolutionFormData.dateDemandePlanificationTif} onChange={handleEvolutionInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Date du retour des équipes DEV</label>
                        <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateDemandePlanificationDev || evolutionFormData.dateConfirmationValidation || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateRetourEquipesDev" value={evolutionFormData.dateRetourEquipesDev} onChange={handleEvolutionInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Date du retour des équipes TIF</label>
                        <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateDemandePlanificationTif || evolutionFormData.dateConfirmationValidation || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateRetourEquipesTif" value={evolutionFormData.dateRetourEquipesTif} onChange={handleEvolutionInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Date de communication du planning au client <span className="required">*</span></label>
                        <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={[evolutionFormData.dateRetourEquipesDev, evolutionFormData.dateRetourEquipesTif, evolutionFormData.dateConfirmationValidation].filter(Boolean).sort().pop() || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateCommunicationPlanningClient" value={evolutionFormData.dateCommunicationPlanningClient} onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.dateCommunicationPlanningClient ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.dateCommunicationPlanningClient ? "#EF4444" : undefined }}
                          required />
                        {errorsEvolution.dateCommunicationPlanningClient && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.dateCommunicationPlanningClient}</span>}
                      </div>
                      <div className="form-group">
                        <label>Nombre de sprint <span className="required">*</span></label>
                        <input type="number" name="nombreSprint" value={evolutionFormData.nombreSprint} onChange={handleEvolutionInputChange} min="1" placeholder="Ex: 3"
                          data-field-error={errorsEvolution.nombreSprint ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.nombreSprint ? "#EF4444" : undefined }}
                          required />
                        {errorsEvolution.nombreSprint && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.nombreSprint}</span>}
                      </div>
                    </div>
                    {parseInt(evolutionFormData.nombreSprint) > 0 && (
                      <div style={{ marginTop: "32px" }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", marginBottom: "16px" }}>Planification par sprint</h4>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "900px" }}>
                            <thead>
                              <tr style={{ backgroundColor: "#f3f4f6" }}>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Sprint</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600" }}>Chantiers <span style={{ color: "#EF4444" }}>*</span></th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Date Prév. TIF</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Date Liv. Effect. TIF</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Date Livraison Prév.</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Date Livraison Effect.</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600" }}>Charges (j/h)</th>
                                <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap" }}>Nb Fonctionnalités</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: parseInt(evolutionFormData.nombreSprint) }, (_, i) => {
                                const sprintData = (evolutionFormData.sprintsData || [])[i] || {};
                                const prevSprintData = i > 0 ? ((evolutionFormData.sprintsData || [])[i - 1] || {}) : null;
                                const minDateSprint = prevSprintData
                                  ? (prevSprintData.dateEffClient || prevSprintData.datePrevClient || prevSprintData.dateEffTIF || prevSprintData.datePrevTIF || evolutionFormData.dateCommunicationPlanningClient || "2000-01-01")
                                  : (evolutionFormData.dateCommunicationPlanningClient || "2000-01-01");
                                const retardTIF = sprintData.datePrevTIF && sprintData.dateEffTIF && sprintData.dateEffTIF > sprintData.datePrevTIF;
                                const retardClient = sprintData.datePrevClient && sprintData.dateEffClient && sprintData.dateEffClient > sprintData.datePrevClient;
                                const today = new Date(); today.setHours(0,0,0,0);
                                const tifDepasse = sprintData.datePrevTIF && !sprintData.dateEffTIF && new Date(sprintData.datePrevTIF) < today;
                                const clientDepasse = sprintData.datePrevClient && !sprintData.dateEffClient && new Date(sprintData.datePrevClient) < today;
                                return (
                                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "8px", border: "1px solid #e5e7eb", fontWeight: "600", whiteSpace: "nowrap", color: "#374151" }}>
                                      Sprint {i + 1}
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", background: sprintData.chantier?.trim() ? "transparent" : "#FEF2F2" }}>
                                      <input
                                        type="text"
                                        value={sprintData.chantier || ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const nb = parseInt(evolutionFormData.nombreSprint) || 0;
                                          setEvolutionFormData((prev) => {
                                            const updated = [...(prev.sprintsData || [])];
                                            for (let idx = 0; idx < nb; idx++) {
                                              updated[idx] = { ...(updated[idx] || {}), chantier: val };
                                            }
                                            return { ...prev, sprintsData: updated };
                                          });
                                        }}
                                        placeholder="Chantier obligatoire..."
                                        style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: "13px" }}
                                      />
                                    </td>
                                    <td className={tifDepasse && flashRetards ? "flash-retard" : ""} style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={minDateSprint} max={`${new Date().getFullYear() + 15}-12-31`}
                                        value={sprintData.datePrevTIF || ""}
                                        onChange={(e) => handleEvolutionSprintDataChange(i, "datePrevTIF", e.target.value)}
                                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px" }} />
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", background: retardTIF ? "#fff7ed" : undefined }}>
                                      <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={minDateSprint} max={`${new Date().getFullYear() + 15}-12-31`}
                                        value={sprintData.dateEffTIF || ""}
                                        onChange={(e) => handleEvolutionSprintDataChange(i, "dateEffTIF", e.target.value)}
                                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px" }} />
                                      {retardTIF && (
                                        <div style={{ marginTop: "4px" }}>
                                          <textarea
                                            value={sprintData.motifRetardTIF || ""}
                                            onChange={(e) => handleEvolutionSprintDataChange(i, "motifRetardTIF", e.target.value)}
                                            placeholder="Motif du retard TIF..."
                                            rows={2}
                                            style={{ width: "100%", fontSize: "12px", border: "1px solid #fed7aa", borderRadius: "4px", padding: "4px", resize: "vertical", background: "#fff7ed" }}
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className={clientDepasse && flashRetards ? "flash-retard" : ""} style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={sprintData.datePrevTIF || minDateSprint} max={`${new Date().getFullYear() + 15}-12-31`}
                                        value={sprintData.datePrevClient || ""}
                                        onChange={(e) => handleEvolutionSprintDataChange(i, "datePrevClient", e.target.value)}
                                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px" }} />
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", background: retardClient ? "#fff7ed" : undefined }}>
                                      <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={sprintData.datePrevTIF || minDateSprint} max={`${new Date().getFullYear() + 15}-12-31`}
                                        value={sprintData.dateEffClient || ""}
                                        onChange={(e) => handleEvolutionSprintDataChange(i, "dateEffClient", e.target.value)}
                                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px" }} />
                                      {retardClient && (
                                        <div style={{ marginTop: "4px" }}>
                                          <textarea
                                            value={sprintData.motifRetardClient || ""}
                                            onChange={(e) => handleEvolutionSprintDataChange(i, "motifRetardClient", e.target.value)}
                                            placeholder="Motif du retard client..."
                                            rows={2}
                                            style={{ width: "100%", fontSize: "12px", border: "1px solid #fed7aa", borderRadius: "4px", padding: "4px", resize: "vertical", background: "#fff7ed" }}
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input type="number" value={sprintData.charges || ""} onChange={(e) => handleEvolutionSprintDataChange(i, "charges", e.target.value)}
                                        style={{ width: "60px", border: "none", outline: "none", background: "transparent", fontSize: "13px" }} placeholder="0" min="0" />
                                    </td>
                                    <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb" }}>
                                      <input type="number" value={sprintData.nbFonctionnalites || ""} onChange={(e) => handleEvolutionSprintDataChange(i, "nbFonctionnalites", e.target.value)}
                                        style={{ width: "60px", border: "none", outline: "none", background: "transparent", fontSize: "13px" }} placeholder="0" min="0" />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {parseInt(evolutionFormData.nombreSprint) >= 2 && (
                          <div style={{ marginTop: "16px" }}>
                            <GanttChart sprints={(evolutionFormData.sprintsData || []).slice(0, parseInt(evolutionFormData.nombreSprint))} compact />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Étape 7: Réalisation (= nouvelle demande étape 4) */}
                {evolutionStep === 7 && (
                  <div>
                    <h3 style={{ marginBottom: "32px", color: "#1a1a1a", fontSize: "24px", fontWeight: "600" }}>
                      7. Réalisation – Statut (Codage + TIF)
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "600px" }}>
                      <div className="form-group">
                        <label>Statut Codage <span className="required">*</span></label>
                        <select name="statutCodage" value={evolutionFormData.statutCodage} onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.statutCodage ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.statutCodage ? "#EF4444" : undefined }}>
                          <option value="en attente">En attente</option>
                          <option value="en cours">En cours</option>
                          <option value="terminé">Terminé</option>
                        </select>
                        {errorsEvolution.statutCodage && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.statutCodage}</span>}
                      </div>
                      <div className="form-group">
                        <label>Statut TIF <span className="required">*</span></label>
                        <select name="statutTIF" value={evolutionFormData.statutTIF} onChange={handleEvolutionInputChange}
                          data-field-error={errorsEvolution.statutTIF ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.statutTIF ? "#EF4444" : undefined }}>
                          <option value="en attente">En attente</option>
                          <option value="en cours">En cours</option>
                          <option value="terminé">Terminé</option>
                        </select>
                        {errorsEvolution.statutTIF && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.statutTIF}</span>}
                      </div>
                    </div>
                    {parseInt(evolutionFormData.nombreSprint) > 0 && (
                      <div style={{ marginTop: "32px" }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", marginBottom: "16px" }}>Suivi des sprints</h4>
                        {(() => {
                          const total = parseInt(evolutionFormData.nombreSprint) || 0;
                          const sprints = evolutionFormData.sprintsData || [];
                          const termines = sprints.filter(s => s.statutSprint === "terminé").length;
                          const enCours = sprints.findIndex(s => s.statutSprint === "en cours");
                          const somme = Array.from({ length: total }, (_, i) => Number((sprints[i] || {}).avancement) || 0).reduce((a, b) => a + b, 0);
                          const pct = total > 0 ? Math.round(somme / total) : 0;
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
                              {Array.from({ length: parseInt(evolutionFormData.nombreSprint) }, (_, i) => {
                                const sprintData = (evolutionFormData.sprintsData || [])[i] || {};
                                const prevSprintData = i > 0 ? ((evolutionFormData.sprintsData || [])[i - 1] || {}) : null;
                                const prevTermine = i === 0 || prevSprintData?.statutSprint === "terminé";
                                const isBloque = !prevTermine;
                                const isEnCours = sprintData.statutSprint === "en cours";
                                const isTermine = sprintData.statutSprint === "terminé";
                                return (
                                  <tr key={i} style={{ backgroundColor: isBloque ? "#f9fafb" : isEnCours ? "#eff6ff" : isTermine ? "#f0fdf4" : i % 2 === 0 ? "#fff" : "#fafafa", opacity: isBloque ? 0.6 : 1 }}>
                                    <td style={{ padding: "10px 12px", border: "1px solid #e5e7eb", fontWeight: "600", color: isBloque ? "#9ca3af" : isEnCours ? "#1d4ed8" : "#374151" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        {isBloque && <i className="fa-solid fa-lock" style={{ fontSize: "10px", color: "#9ca3af" }} title={`Sprint ${i} doit être terminé d'abord`} />}
                                        {!isBloque && isEnCours && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />}
                                        Sprint {i + 1}
                                      </div>
                                    </td>
                                    <td style={{ padding: "10px 12px", border: "1px solid #e5e7eb", color: "#6b7280" }}>{sprintData.chantier || "—"}</td>
                                    <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>
                                      <select
                                        value={sprintData.statutSprint || "en attente"}
                                        onChange={(e) => {
                                          handleEvolutionSprintDataChange(i, "statutSprint", e.target.value);
                                          if (e.target.value === "terminé") handleEvolutionSprintDataChange(i, "avancement", 100);
                                        }}
                                        disabled={isBloque}
                                        style={{ fontSize: "13px", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", background: isBloque ? "#f3f4f6" : "white", cursor: isBloque ? "not-allowed" : "default" }}
                                      >
                                        <option value="en attente">En attente</option>
                                        <option value="en cours">En cours</option>
                                        <option value="terminé">Terminé</option>
                                      </select>
                                    </td>
                                    <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <input type="number" value={sprintData.avancement || ""} onChange={(e) => handleEvolutionSprintDataChange(i, "avancement", Math.min(100, Math.max(0, Number(e.target.value))))}
                                          min="0" max="100" placeholder="0" disabled={isBloque}
                                          style={{ width: "60px", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px", background: isBloque ? "#f3f4f6" : "white", cursor: isBloque ? "not-allowed" : "default" }} />
                                        <span style={{ color: "#6b7280" }}>%</span>
                                        {!isBloque && sprintData.avancement > 0 && (
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

                {/* Étape 8: Documents (= nouvelle demande étape 5) */}
                {evolutionStep === 8 && (
                  <div>
                    <h3 style={{ marginBottom: "32px", color: "#1a1a1a", fontSize: "24px", fontWeight: "600" }}>
                      8. Présentation des documents
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
                      <div className="form-group">
                        <label>Présentation de kickoff - Lien INGRID <span className="required">*</span></label>
                        <input type="url" name="lienIngridKickoff" value={evolutionFormData.lienIngridKickoff} onChange={handleEvolutionInputChange} placeholder="https://ingrid.example.com/..."
                          data-field-error={errorsEvolution.lienIngridKickoff ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.lienIngridKickoff ? "#EF4444" : undefined }}
                          required />
                        {errorsEvolution.lienIngridKickoff && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.lienIngridKickoff}</span>}
                      </div>
                      <div className="form-group">
                        <label>Rédaction des points de contrôles (TIF) - Lien INGRID <span className="required">*</span></label>
                        <input type="url" name="lienIngridPointsControleTIF" value={evolutionFormData.lienIngridPointsControleTIF} onChange={handleEvolutionInputChange} placeholder="https://ingrid.example.com/..."
                          data-field-error={errorsEvolution.lienIngridPointsControleTIF ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.lienIngridPointsControleTIF ? "#EF4444" : undefined }}
                          required />
                        {errorsEvolution.lienIngridPointsControleTIF && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.lienIngridPointsControleTIF}</span>}
                      </div>
                      <div className="form-group">
                        <label>Rédaction du signoff document - Lien INGRID <span className="required">*</span></label>
                        <input type="url" name="lienIngridSignoff" value={evolutionFormData.lienIngridSignoff} onChange={handleEvolutionInputChange} placeholder="https://ingrid.example.com/..."
                          data-field-error={errorsEvolution.lienIngridSignoff ? "true" : undefined}
                          style={{ borderColor: errorsEvolution.lienIngridSignoff ? "#EF4444" : undefined }}
                          required />
                        {errorsEvolution.lienIngridSignoff && <span style={{ color: "#EF4444", fontSize: "12px", marginTop: "4px", display: "block" }}>{errorsEvolution.lienIngridSignoff}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Étape 9: Livraison (= nouvelle demande étape 6) */}
                {evolutionStep === 9 && (
                  <div>
                    <h3 style={{ marginBottom: "32px", color: "#1a1a1a", fontSize: "24px", fontWeight: "600" }}>
                      9. Livraison effective au client
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "600px" }}>
                      <div className="form-group">
                        <label>Date effective de livraison au client</label>
                        <input type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min={evolutionFormData.dateCommunicationPlanningClient || formatDateForInput(evolutionFormData.dateEnregistrement) || "2000-01-01"} max={`${new Date().getFullYear() + 15}-12-31`}
                          name="dateEffectiveLivraisonClient"
                          value={evolutionFormData.dateEffectiveLivraisonClient}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEvolutionFormData(prev => ({
                              ...prev,
                              dateEffectiveLivraisonClient: val,
                              statutLivraisonClient: val ? "livré au client" : prev.statutLivraisonClient,
                            }));
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Statut livraison</label>
                        <select name="statutLivraisonClient" value={evolutionFormData.statutLivraisonClient} onChange={handleEvolutionInputChange}>
                          <option value="en attente">En attente</option>
                          <option value="en cours">En cours</option>
                          <option value="livré au client">Livré au client</option>
                        </select>
                      </div>
                    </div>
                    {evolutionFormData.dateEffectiveLivraisonClient && (
                      <div style={{ marginTop: "16px", padding: "12px 16px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", color: "#15803d", fontSize: "14px" }}>
                        <span style={{ fontSize: "18px" }}>✓</span>
                        <span>Livraison effectuée le <strong>{formatDateForDisplay(evolutionFormData.dateEffectiveLivraisonClient)}</strong></span>
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
                  {isModificationMode && evolutionStep < 9 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: "#EF4444", borderColor: "#EF4444" }}
                      onClick={() => {
                        setIsModificationMode(false);
                        setShowEvolutionForm(false);
                        setShowSelectionCards(true);
                        setShowDemandesList(true);
                        setEvolutionStep(1);
                        setDemandeMessage({ type: "", text: "" });
                      }}
                    >
                      Annuler
                    </button>
                  )}
                  {evolutionStep < 9 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => sauvegarderEvolutionBrouillon()}
                    >
                      Enregistrer le brouillon
                    </button>
                  )}
                  {evolutionStep < 9 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleEvolutionNext}
                      style={{
                        background: "linear-gradient(135deg, #10B981 0%, #10B981dd 100%)",
                        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      {evolutionStep === 8 ? "Livraison →" : "Suivant →"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleTerminerEvolution}
                      style={{
                        background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                        padding: "12px 24px",
                        fontSize: "16px",
                        fontWeight: "600",
                      }}
                    >
                      Terminer
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Liste unifiée des demandes */}
        {!showNouvelleDemandeForm && demandeMessage.text && (
          <div style={{
            margin: "0 0 16px 0",
            padding: "12px 16px",
            borderRadius: "6px",
            backgroundColor: demandeMessage.type === "error" ? "#fee2e2" : demandeMessage.type === "success" ? "#d1fae5" : "#dbeafe",
            border: `1px solid ${demandeMessage.type === "error" ? "#fecaca" : demandeMessage.type === "success" ? "#a7f3d0" : "#93c5fd"}`,
            color: demandeMessage.type === "error" ? "#dc2626" : demandeMessage.type === "success" ? "#065f46" : "#1e40af",
            fontSize: "14px",
            fontWeight: "500",
          }}>
            {demandeMessage.text}
          </div>
        )}
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setVueLivrees(false); if (!showDemandesList) setShowDemandesList(true); }}
                  style={{
                    padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600",
                    border: "none", cursor: "pointer",
                    backgroundColor: !vueLivrees ? "#4A90E2" : "#e5e7eb",
                    color: !vueLivrees ? "#fff" : "#6b7280",
                  }}
                >
                  En cours ({demandes.filter(d => d.isDraft !== false).length})
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setVueLivrees(true); if (!showDemandesList) setShowDemandesList(true); }}
                  style={{
                    padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600",
                    border: "none", cursor: "pointer",
                    backgroundColor: vueLivrees ? "#10B981" : "#e5e7eb",
                    color: vueLivrees ? "#fff" : "#6b7280",
                  }}
                >
                  Terminées ({demandes.filter(d => d.isDraft === false).length})
                </button>
                <span style={{ color: "#6b7280", fontSize: "14px", marginLeft: "8px" }}>
                  {showDemandesList ? "Masquer" : "Afficher"}
                </span>
              </div>
            </h2>
          </button>

          {showDemandesList && !vueLivrees && (
            <div className="table-container" style={{ marginTop: "24px" }}>
              {/* ── Barre de filtres (visible si > 10 demandes) ── */}
              {(() => {
                const baseEnCours = demandes.filter(d => d.isDraft !== false);
                if (baseEnCours.length <= 10) return null;
                const societesUniques = [...new Set(baseEnCours.map(d => d.societesDemandeurs || d.societeDemandeur).filter(Boolean))].sort();
                const statutsUniques = [...new Set(baseEnCours.map(d => d.statutDemande).filter(Boolean))].sort();
                const aFiltreActif = filtreRecherche || filtreType || filtreSociete || filtreStatut || filtreDateDebut || filtreDateFin;
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px", alignItems: "center", padding: "12px 16px", background: "#F8FAFC", borderRadius: "10px", border: "1px solid #E5E7EB" }}>
                    {/* Recherche nom */}
                    <div style={{ position: "relative", flex: "1 1 180px", minWidth: "160px" }}>
                      <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "12px", pointerEvents: "none" }} />
                      <input type="text" placeholder="Rechercher un projet..." value={filtreRecherche} onChange={e => setFiltreRecherche(e.target.value)}
                        style={{ width: "100%", padding: "7px 10px 7px 28px", borderRadius: "7px", border: "1px solid #D1D5DB", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    {/* Type */}
                    <select value={filtreType} onChange={e => setFiltreType(e.target.value)}
                      style={{ padding: "7px 10px", borderRadius: "7px", border: "1px solid #D1D5DB", fontSize: "13px", outline: "none", minWidth: "150px", color: filtreType ? "#111827" : "#9CA3AF" }}>
                      <option value="">Tous les types</option>
                      <option value="nouvelle">Nouvelle demande</option>
                      <option value="evolution">Evolution</option>
                      <option value="prospecte">Prospecte</option>
                    </select>
                    {/* Société */}
                    <select value={filtreSociete} onChange={e => setFiltreSociete(e.target.value)}
                      style={{ padding: "7px 10px", borderRadius: "7px", border: "1px solid #D1D5DB", fontSize: "13px", outline: "none", minWidth: "150px", color: filtreSociete ? "#111827" : "#9CA3AF" }}>
                      <option value="">Toutes les sociétés</option>
                      {societesUniques.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {/* Statut */}
                    <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
                      style={{ padding: "7px 10px", borderRadius: "7px", border: "1px solid #D1D5DB", fontSize: "13px", outline: "none", minWidth: "140px", color: filtreStatut ? "#111827" : "#9CA3AF" }}>
                      <option value="">Tous les statuts</option>
                      {statutsUniques.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {/* Date début */}
                    <input type="date" value={filtreDateDebut} onChange={e => setFiltreDateDebut(e.target.value)}
                      title="Date d'enregistrement — à partir de"
                      style={{ padding: "7px 10px", borderRadius: "7px", border: "1px solid #D1D5DB", fontSize: "13px", outline: "none", minWidth: "140px", color: filtreDateDebut ? "#111827" : "#9CA3AF" }} />
                    {/* Date fin */}
                    <input type="date" value={filtreDateFin} onChange={e => setFiltreDateFin(e.target.value)}
                      title="Date d'enregistrement — jusqu'au"
                      style={{ padding: "7px 10px", borderRadius: "7px", border: "1px solid #D1D5DB", fontSize: "13px", outline: "none", minWidth: "140px", color: filtreDateFin ? "#111827" : "#9CA3AF" }} />
                    {/* Reset */}
                    {aFiltreActif && (
                      <button type="button" onClick={resetFiltres}
                        style={{ padding: "7px 12px", borderRadius: "7px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}>
                        <i className="fa-solid fa-xmark" style={{ marginRight: "4px" }} /> Réinitialiser
                      </button>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const baseEnCours = demandes.filter(d => d.isDraft !== false);
                const filtrees = baseEnCours.filter(d => {
                  if (filtreRecherche && !d.nomProjet?.toLowerCase().includes(filtreRecherche.toLowerCase())) return false;
                  if (filtreType) {
                    const t = normalizeTypeProjet(d.typeProjet);
                    if (filtreType === "nouvelle" && t !== "nouvelle demande" && t !== "agile" && t !== "classique" && t !== "" && t !== "brouillon") {
                      if (!["nouvelle", "agile", "classique", "brouillon", ""].includes(t)) return false;
                    }
                    if (filtreType === "evolution" && t !== "evolution") return false;
                    if (filtreType === "prospecte" && t !== "prospecte") return false;
                    if (filtreType === "nouvelle" && (t === "evolution" || t === "prospecte")) return false;
                  }
                  if (filtreSociete) {
                    const soc = d.societesDemandeurs || d.societeDemandeur || "";
                    if (!soc.toLowerCase().includes(filtreSociete.toLowerCase())) return false;
                  }
                  if (filtreStatut && d.statutDemande !== filtreStatut) return false;
                  if (filtreDateDebut) {
                    const dateEnr = (d.dateEnregistrement || "").split("T")[0];
                    if (dateEnr < filtreDateDebut) return false;
                  }
                  if (filtreDateFin) {
                    const dateEnr = (d.dateEnregistrement || "").split("T")[0];
                    if (dateEnr > filtreDateFin) return false;
                  }
                  return true;
                });
                const aFiltreActif = filtreRecherche || filtreType || filtreSociete || filtreStatut || filtreDateDebut || filtreDateFin;
                if (baseEnCours.length === 0) return <p style={{ color: "#6b7280", marginTop: "16px" }}>Aucune demande en cours pour le moment.</p>;
                if (filtrees.length === 0) return <p style={{ color: "#6b7280", marginTop: "16px", textAlign: "center" }}><i className="fa-solid fa-filter" style={{ marginRight: "6px" }} />Aucun résultat pour ces filtres. {aFiltreActif && <button type="button" onClick={resetFiltres} style={{ background: "none", border: "none", color: "#4A90E2", cursor: "pointer", textDecoration: "underline", fontSize: "13px" }}>Réinitialiser</button>}</p>;
                return (
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
                      {peutVoirActions && <th style={{ whiteSpace: "nowrap" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrees.map((demande) => (
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
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {demande.statutDemande ? (
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
                            ) : (
                              <span style={{ color: "#9ca3af", fontSize: "13px" }}>
                                {normalizeTypeProjet(demande.typeProjet) === "prospecte" ? "Aucun statut" : "—"}
                              </span>
                            )}
                            {peutModifierDemande && normalizeTypeProjet(demande.typeProjet) !== "prospecte" && (
                              <button
                                className="btn-secondary"
                                onClick={() => handleEditStatus(demande.statutInfo || { id: demande.statutId, nom: demande.statutDemande }, demande.id)}
                                style={{ padding: "4px 8px", fontSize: "11px", borderRadius: "4px", border: "1px solid #d1d5db", backgroundColor: "white", color: "#374151", cursor: "pointer", whiteSpace: "nowrap" }}
                                title="Modifier le statut"
                              >
                                Modifier statut
                              </button>
                            )}
                          </div>
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
                        {peutVoirActions && (
                          <td style={{ whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                              {peutModifierDemande && (
                                <button
                                  className="btn-secondary"
                                  onClick={() => handlePoursuivreDemande(demande)}
                                  style={{ padding: "6px 10px", fontSize: "13px", whiteSpace: "nowrap" }}
                                >
                                  Modifier
                                </button>
                              )}
                              {peutSupprimerDemande && (
                                <button
                                  className="btn-danger"
                                  onClick={() => handleDeleteDemande(demande)}
                                  style={{ padding: "6px 10px", fontSize: "13px", whiteSpace: "nowrap" }}
                                >
                                  Terminer
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                );
              })()}
            </div>
          )}

          {/* Table des demandes terminées */}
          {showDemandesList && vueLivrees && (
            <div className="table-container" style={{ marginTop: "24px" }}>
              {demandes.filter(d => d.isDraft === false).length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: "36px", marginBottom: "12px", display: "block", color: "#10B981" }}></i>
                  Aucune demande terminée pour le moment.
                </div>
              ) : (
                <table className="data-table" style={{ tableLayout: "auto" }}>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: "nowrap" }}>Date d'enre.</th>
                      <th style={{ whiteSpace: "nowrap" }}>Type de demande</th>
                      <th style={{ whiteSpace: "nowrap" }}>Nom projet</th>
                      <th style={{ whiteSpace: "nowrap" }}>Société(s)</th>
                      <th style={{ whiteSpace: "nowrap" }}>Interlocuteur</th>
                      <th style={{ whiteSpace: "nowrap" }}>Statut</th>
                      <th style={{ whiteSpace: "nowrap" }}>Date liv. client</th>
                      {isAdmin && <th style={{ whiteSpace: "nowrap" }}>Créé par</th>}
                      <th style={{ whiteSpace: "nowrap" }}>Détail</th>
                      {peutSupprimerDemande && <th style={{ whiteSpace: "nowrap" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {demandes.filter(d => d.isDraft === false).map((demande) => (
                      <tr key={demande.id}>
                        <td style={{ whiteSpace: "nowrap", color: "#6b7280", fontSize: "13px" }}>
                          {demande.dateEnregistrement ? demande.dateEnregistrement.split("T")[0] : "—"}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span style={{
                            display: "inline-block", padding: "4px 10px", borderRadius: "999px",
                            fontWeight: 600, fontSize: "12px", ...getTypeDemandeStyle(demande.typeProjet)
                          }}>
                            {getTypeDemandeLabel(demande.typeProjet)}
                          </span>
                        </td>
                        <td style={{ fontWeight: "500", color: "#111827" }}>
                          {demande.nomProjet || "—"}
                        </td>
                        <td style={{ fontSize: "13px", color: "#6b7280" }}>
                          {demande.societesDemandeurs || demande.societeDemandeur || "—"}
                        </td>
                        <td style={{ fontSize: "13px", color: "#6b7280" }}>
                          {demande.interlocuteurClient || demande.interlocuteur || "—"}
                        </td>
                        <td>
                          {demande.statutDemande ? (
                            <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", backgroundColor: "#F3F4F6", color: "#374151" }}>
                              {demande.statutDemande}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#10B981", fontWeight: "500" }}>
                          {demande.dateEffectiveLivraisonClient
                            ? new Date(demande.dateEffectiveLivraisonClient).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        {isAdmin && (
                          <td style={{ fontSize: "13px", color: "#6b7280" }}>
                            {demande.nomCreateur || "—"}
                          </td>
                        )}
                        <td>
                          <button
                            className="btn-secondary"
                            onClick={() => handleShowDetail(demande)}
                            style={{ padding: "6px 12px", fontSize: "13px" }}
                          >
                            Détail
                          </button>
                        </td>
                        {peutSupprimerDemande && (
                          <td>
                            <button
                              className="btn-danger"
                              onClick={() => handleSupprimerDemandeTerminee(demande)}
                              style={{ padding: "6px 10px", fontSize: "13px" }}
                            >
                              Supprimer
                            </button>
                          </td>
                        )}
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
        const StatusBadge = ({ value }) => {
          if (!value) return <span style={{ color: "#9CA3AF" }}>-</span>;
          const styles = {
            "en attente": { bg: "#F3F4F6", color: "#1F2937", label: "En attente" },
            "en cours":   { bg: "#DBEAFE", color: "#1E40AF", label: "En cours" },
            "terminé":    { bg: "#D1FAE5", color: "#065F46", label: "Terminé" },
            "livré au client": { bg: "#D1FAE5", color: "#065F46", label: "Livré au client" },
          };
          const s = styles[value.toLowerCase()] || { bg: "#F3F4F6", color: "#1F2937", label: value };
          return (
            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", backgroundColor: s.bg, color: s.color }}>
              {s.label}
            </span>
          );
        };

        const STATUT_FIELDS = ["statutCodage", "statutTIF", "statutPresentationDocs", "statutRecette", "statutLivraison", "statutLivraisonClient"];

        const InfoField = ({ label, value, full, fieldName }) => {
          const isStatut = fieldName && STATUT_FIELDS.includes(fieldName);
          return (
            <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontSize: "14px", color: "#1F2937", background: "#F9FAFB", borderRadius: "6px", padding: "8px 10px", border: "1px solid #E5E7EB", wordBreak: "break-all", minHeight: "36px", display: "flex", alignItems: "center" }}>
                {isStatut
                  ? <StatusBadge value={value || "en attente"} />
                  : value && isUrl(value)
                    ? <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: "#4A90E2", textDecoration: "underline" }}>{value}</a>
                    : (value || "-")}
              </div>
            </div>
          );
        };

        const Section = ({ icon, title, color, children }) => (
          <div style={{ marginBottom: "24px" }}>
            {title && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", paddingBottom: "10px", borderBottom: `2px solid ${color}20` }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={icon} style={{ color, fontSize: "13px" }}></i>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "700", color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>{children}</div>
          </div>
        );

        const telechargerDetailPDF = () => {
          const d = selectedDemandeDetail;
          const fmtD = (v) => formatDateForDisplay(v) || "—";
          const fmtI = (v) => v && d.dateEnregistrement ? formatDateForInput(v) : "";
          const row = (label, val) => val && val !== "-" && val !== "—"
            ? `<tr><td class="lbl">${label}</td><td class="val">${val}</td></tr>` : "";
          const section = (title, rows) => rows
            ? `<div class="section"><h3>${title}</h3><table>${rows}</table></div>` : "";
          const isProspecte = (d.typeProjet || "").toLowerCase() === "prospecte";
          const isEvolution = d.typeProjet === "Evolution";

          const identRows =
            row("Société demandeur", societe) +
            row("Interlocuteur", interlocuteur) +
            row("Type de projet", d.typeProjet) +
            row("Nom du projet", d.nomProjet) +
            (isProspecte ? row("Périmètre", d.descriptionPerimetre || d.perimetre) : row("Description", d.descriptionProjet));

          const evoRows = isEvolution ? (
            row("Interlocuteur interne", d.interlocuteur) +
            row("Date demande DATFL", fmtD(d.dateDemandeMiseAJourDATFL)) +
            row("Date réponse DATFL", fmtD(d.dateReponseMiseAJourDATFL)) +
            row("Charge (j/h)", d.charge) +
            row("Date début planning", fmtD(d.planningDateDebut)) +
            row("Date fin planning", fmtD(d.planningDateFin)) +
            row("Date demande dévolution", fmtD(d.dateDemandeDevolution)) +
            row("Date réponse dévolution", fmtD(d.dateReponseDevolution)) +
            row("Aléas norme par jour", d.aleasNormeParJour) +
            row("SLT", d.slt)
          ) : "";

          const clarRows = !isProspecte ? (
            row("Date transmission backlog", fmtD(d.dateTransmissionBacklog)) +
            row("Date confirmation validation", fmtD(d.dateConfirmationValidation)) +
            row("Observations", d.observations)
          ) : "";

          const planRows = !isProspecte ? (
            row("Date demande planification DEV", fmtD(d.dateDemandePlanificationDev)) +
            row("Date demande planification TIF", fmtD(d.dateDemandePlanificationTif)) +
            row("Date retour équipes DEV", fmtD(d.dateRetourEquipesDev)) +
            row("Date retour équipes TIF", fmtD(d.dateRetourEquipesTif)) +
            row("Date communication planning client", fmtD(d.dateCommunicationPlanningClient)) +
            row("Nombre de sprints", d.nombreSprint)
          ) : "";

          let sprintTable = "";
          if (!isProspecte && d.sprintsData && d.sprintsData.length > 0) {
            const sprintRows = d.sprintsData.map((s, i) =>
              `<tr>
                <td>Sprint ${i + 1}</td><td>${s.chantier || "—"}</td>
                <td>${fmtD(s.datePrevTIF)}</td><td>${fmtD(s.dateEffTIF)}</td>
                <td>${s.motifRetardTIF || "Aucun"}</td>
                <td>${fmtD(s.datePrevClient)}</td><td>${fmtD(s.dateEffClient)}</td>
                <td>${s.motifRetardClient || "Aucun"}</td>
                <td>${s.charges || "—"}</td><td>${s.nbFonctionnalites || "—"}</td>
              </tr>`
            ).join("");
            sprintTable = `<div class="section"><h3>Planification par sprint</h3>
              <table class="sprint-table">
                <thead><tr>
                  <th>Sprint</th><th>Chantier</th><th>Prév. TIF</th><th>Eff. TIF</th>
                  <th>Motif retard TIF</th><th>Prév. Client</th><th>Eff. Client</th>
                  <th>Motif retard Client</th><th>Charges</th><th>Nb Fonct.</th>
                </tr></thead>
                <tbody>${sprintRows}</tbody>
              </table></div>`;
          }

          const realRows = !isProspecte && !isEvolution ? (
            row("Statut de codage", d.statutCodage) +
            row("Statut TIF", d.statutTIF)
          ) : "";

          const docsRows = !isProspecte && !isEvolution ? (
            ""
          ) : "";

          const livrRows = !isProspecte && !isEvolution ? (
            row("Statut livraison client", d.statutLivraisonClient) +
            row("Date effective livraison client", fmtD(d.dateEffectiveLivraisonClient)) +
            row("Motifs de retard client", d.motifsRetardClient)
          ) : "";

          const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
            <title>${d.nomProjet || "Demande"}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1F2937; padding: 30px; font-size: 13px; }
              h1 { font-size: 20px; margin: 0 0 4px; }
              .meta { color: #6B7280; font-size: 12px; margin-bottom: 24px; }
              .section { margin-bottom: 20px; }
              .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: ${typeColor}; border-bottom: 2px solid ${typeColor}40; padding-bottom: 5px; margin-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; }
              .lbl { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; padding: 4px 8px 4px 0; width: 220px; vertical-align: top; }
              .val { font-size: 13px; color: #1F2937; padding: 4px 0; }
              .sprint-table th, .sprint-table td { border: 1px solid #E5E7EB; padding: 5px 8px; font-size: 11px; }
              .sprint-table th { background: #F9FAFB; font-weight: 600; color: #6B7280; }
              @media print { @page { margin: 15mm; } }
            </style></head><body>
            <h1>${d.nomProjet || "Sans nom"}</h1>
            <div class="meta">${d.typeProjet || ""} — Enregistré le ${fmtI(d.dateEnregistrement)}</div>
            ${section(isProspecte ? "" : "Identification", identRows)}
            ${isEvolution ? section("Informations Évolution", evoRows) : ""}
            ${!isProspecte ? section("Clarification", clarRows) : ""}
            ${!isProspecte ? section("Planification", planRows) : ""}
            ${sprintTable}
            ${!isProspecte && !isEvolution ? section("Réalisation", realRows) : ""}
            ${!isProspecte && !isEvolution ? section("Documents", docsRows) : ""}
            ${!isProspecte && !isEvolution ? section("Livraison", livrRows) : ""}
            <script>window.onload = function(){ window.print(); }</script>
            </body></html>`;

          const win = window.open("", "_blank");
          if (win) { win.document.write(html); win.document.close(); }
        };

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
                      {selectedDemandeDetail.isDraft && (selectedDemandeDetail.typeProjet || "").toLowerCase() !== "prospecte" && (
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
                    <InfoField label="Périmètre" value={selectedDemandeDetail.descriptionPerimetre || selectedDemandeDetail.perimetre} full />
                  )}
                </Section>

              {/* Section spécifique Évolution */}
              {selectedDemandeDetail.typeProjet === "Evolution" && (
                <Section icon="fa-solid fa-arrow-up" title="Informations Évolution" color="#10B981">
                  <InfoField label="Interlocuteur (interne)" value={selectedDemandeDetail.interlocuteur} />
                  <InfoField label="Date demande DATFL" value={formatDateForDisplay(selectedDemandeDetail.dateDemandeMiseAJourDATFL)} />
                  <InfoField label="Date réponse DATFL" value={formatDateForDisplay(selectedDemandeDetail.dateReponseMiseAJourDATFL)} />
                  <InfoField label="Charge (j/h)" value={selectedDemandeDetail.charge} />
                  <InfoField label="Date début planning" value={formatDateForDisplay(selectedDemandeDetail.planningDateDebut)} />
                  <InfoField label="Date fin planning" value={formatDateForDisplay(selectedDemandeDetail.planningDateFin)} />
                  <InfoField label="Date demande dévolution" value={formatDateForDisplay(selectedDemandeDetail.dateDemandeDevolution)} />
                  <InfoField label="Date réponse dévolution" value={formatDateForDisplay(selectedDemandeDetail.dateReponseDevolution)} />
                  {selectedDemandeDetail.aleasNormeParJour && (
                    <InfoField label="Aléas norme par jour" value={selectedDemandeDetail.aleasNormeParJour} />
                  )}
                  {selectedDemandeDetail.slt && (
                    <InfoField label="SLT" value={selectedDemandeDetail.slt} full />
                  )}
                </Section>
              )}

              {/* Clarification */}
              {selectedDemandeDetail.typeProjet !== "Prospecte" && (
                <Section icon="fa-solid fa-magnifying-glass" title="Clarification" color={typeColor}>
                  <InfoField label="Date transmission backlog" value={formatDateForDisplay(selectedDemandeDetail.dateTransmissionBacklog)} />
                  <InfoField label="Date confirmation validation" value={formatDateForDisplay(selectedDemandeDetail.dateConfirmationValidation)} />
                  <InfoField label="Lien Ingrid CDC" value={selectedDemandeDetail.lienIngridCDC} full />
                  {selectedDemandeDetail.observations && (
                    <InfoField label="Observations / Commentaires" value={selectedDemandeDetail.observations} full />
                  )}
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
                  {/* Tableau sprints */}
                  {selectedDemandeDetail.sprintsData && selectedDemandeDetail.sprintsData.length > 0 && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Planification par sprint</div>
                      <div style={{ overflowX: "auto", border: "1px solid #E5E7EB", borderRadius: "8px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "700px" }}>
                          <thead>
                            <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#6B7280", fontWeight: "600", whiteSpace: "nowrap" }}>Sprint</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#6B7280", fontWeight: "600", whiteSpace: "nowrap" }}>Chantier</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#6B7280", fontWeight: "600", whiteSpace: "nowrap" }}>Date Prév. TIF</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#6B7280", fontWeight: "600", whiteSpace: "nowrap" }}>Date Eff. TIF</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#6B7280", fontWeight: "600", whiteSpace: "nowrap" }}>Motif retard TIF</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#6B7280", fontWeight: "600", whiteSpace: "nowrap" }}>Date Prév. Client</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#6B7280", fontWeight: "600", whiteSpace: "nowrap" }}>Date Eff. Client</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#6B7280", fontWeight: "600", whiteSpace: "nowrap" }}>Motif retard Client</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#6B7280", fontWeight: "600", whiteSpace: "nowrap" }}>Charges</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#6B7280", fontWeight: "600", whiteSpace: "nowrap" }}>Nb Fonct.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDemandeDetail.sprintsData.map((s, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #F3F4F6", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                                <td style={{ padding: "7px 10px", fontWeight: "700", color: "#374151", whiteSpace: "nowrap" }}>Sprint {idx + 1}</td>
                                <td style={{ padding: "7px 10px", color: "#374151" }}>{s.chantier || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                                <td style={{ padding: "7px 10px", color: "#374151", whiteSpace: "nowrap" }}>{formatDateForDisplay(s.datePrevTIF) || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                                <td style={{ padding: "7px 10px", color: "#374151", whiteSpace: "nowrap" }}>{formatDateForDisplay(s.dateEffTIF) || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                                <td style={{ padding: "7px 10px", color: s.motifRetardTIF ? "#EF4444" : "#9CA3AF" }}>{s.motifRetardTIF || "Aucun"}</td>
                                <td style={{ padding: "7px 10px", color: "#374151", whiteSpace: "nowrap" }}>{formatDateForDisplay(s.datePrevClient) || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                                <td style={{ padding: "7px 10px", color: "#374151", whiteSpace: "nowrap" }}>{formatDateForDisplay(s.dateEffClient) || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                                <td style={{ padding: "7px 10px", color: s.motifRetardClient ? "#EF4444" : "#9CA3AF" }}>{s.motifRetardClient || "Aucun"}</td>
                                <td style={{ padding: "7px 10px", color: "#374151", textAlign: "right" }}>{s.charges || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                                <td style={{ padding: "7px 10px", color: "#374151", textAlign: "right" }}>{s.nbFonctionnalites || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {/* Bouton Roadmap */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Roadmap</div>
                    {selectedDemandeDetail.sprintsData && selectedDemandeDetail.sprintsData.length > 0 ? (
                      <button
                        onClick={() => setShowRoadmapModal(true)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "8px",
                          padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                          background: "linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)",
                          color: "white", fontSize: "13px", fontWeight: "600",
                          boxShadow: "0 2px 6px rgba(74,144,226,0.3)",
                        }}
                      >
                        <i className="fa-solid fa-chart-gantt"></i>
                        Voir la Roadmap
                      </button>
                    ) : (
                      <div style={{ fontSize: "14px", color: "#9CA3AF", background: "#F9FAFB", borderRadius: "6px", padding: "8px 10px", border: "1px solid #E5E7EB" }}>
                        Aucun sprint renseigné
                      </div>
                    )}
                  </div>
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
                  <InfoField label="Statut de codage" value={selectedDemandeDetail.statutCodage} fieldName="statutCodage" />
                  <InfoField label="Statut TIF" value={selectedDemandeDetail.statutTIF} fieldName="statutTIF" />
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
                  <InfoField label="Statut livraison client" value={selectedDemandeDetail.statutLivraisonClient} fieldName="statutLivraisonClient" />
                  <InfoField label="Date effective livraison client" value={formatDateForDisplay(selectedDemandeDetail.dateEffectiveLivraisonClient)} />
                  {selectedDemandeDetail.motifsRetardClient && (
                    <InfoField label="Motifs de retard client" value={selectedDemandeDetail.motifsRetardClient} full />
                  )}
                </Section>
              )}

              </div>

              {/* Footer */}
              <div style={{ padding: "16px 28px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "center", gap: "10px" }}>
                <button
                  onClick={telechargerDetailPDF}
                  style={{ background: typeColor, border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "600", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <i className="fa-solid fa-file-pdf"></i> Télécharger PDF
                </button>
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

      {/* Modal Roadmap / Gantt */}
      {showRoadmapModal && selectedDemandeDetail && (
        <div className="modal-overlay" onClick={() => setShowRoadmapModal(false)} style={{ zIndex: 1300 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "14px", width: "95%", maxWidth: "1100px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <i className="fa-solid fa-chart-gantt" style={{ color: "#4A90E2", fontSize: "18px" }}></i>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>Roadmap — Vue Gantt</div>
                  <div style={{ fontSize: "12px", color: "#6B7280" }}>{selectedDemandeDetail.nomProjet}</div>
                </div>
              </div>
              <button onClick={() => setShowRoadmapModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", fontSize: "22px", lineHeight: 1 }}>×</button>
            </div>

            {/* Body */}
            <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>
              <GanttChart
                sprints={(selectedDemandeDetail.sprintsData || []).map((s, i) => ({ num: i + 1, ...s }))}
              />
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 24px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
              <button onClick={() => setShowRoadmapModal(false)} style={{ background: "#F3F4F6", border: "none", borderRadius: "8px", padding: "8px 28px", fontSize: "14px", fontWeight: "600", color: "#374151", cursor: "pointer" }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal suppression définitive demande terminée */}
      {showSupprimerTermineeConfirm && demandeToSupprimer && (
        <div className="modal-overlay" onClick={() => { setShowSupprimerTermineeConfirm(false); setDemandeToSupprimer(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px", padding: "32px" }}>
            <h3 style={{ margin: "0 0 12px", color: "#DC2626", fontSize: "18px" }}>Supprimer définitivement</h3>
            <p style={{ color: "#374151", marginBottom: "8px", lineHeight: "1.6" }}>
              Êtes-vous sûr de vouloir supprimer définitivement la demande <strong>"{demandeToSupprimer.nomProjet || `#${demandeToSupprimer.id}`}"</strong> ?
            </p>
            <p style={{ color: "#DC2626", fontSize: "13px", marginBottom: "24px" }}>Cette action est irréversible.</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => { setShowSupprimerTermineeConfirm(false); setDemandeToSupprimer(null); }}>Annuler</button>
              <button className="btn-danger" onClick={confirmSupprimerDemandeTerminee}>Supprimer définitivement</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup erreur livraison non effectuée */}
      {showLivraisonErreurModal && (
        <div className="modal-overlay" onClick={() => setShowLivraisonErreurModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px", padding: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: "#dc2626", fontSize: "18px" }}></i>
              </div>
              <h3 style={{ margin: 0, color: "#dc2626", fontSize: "18px" }}>Livraison non effectuée</h3>
            </div>
            <p style={{ color: "#374151", marginBottom: "8px", lineHeight: "1.6" }}>
              La demande <strong>"{livraisonErreurNom}"</strong> ne peut pas être terminée.
            </p>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
              Le statut de livraison n'est pas encore <strong>« Livré au client »</strong>. Veuillez ouvrir la demande, aller à l'étape 6 et renseigner la date de livraison effective au client.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn-primary"
                onClick={() => setShowLivraisonErreurModal(false)}
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmation de clôture de demande */}
      {showDemandeDeleteConfirm && demandeToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteDemande}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>Confirmer la clôture</h3>
            </div>
            <div className="confirm-modal-body">
              <p>
                Êtes-vous sûr de vouloir terminer la demande <strong>"{demandeToDelete.nomProjet || `#${demandeToDelete.id}`}"</strong> ?
              </p>
              <p className="confirm-warning">Cette action est irréversible.</p>
            </div>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteDemande}
              >
                Confirmer
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
                      type="date" onKeyDown={(e) => { if (e.key !== "Tab") e.preventDefault(); }} min="2000-01-01" max={`${new Date().getFullYear() + 15}-12-31`}
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
