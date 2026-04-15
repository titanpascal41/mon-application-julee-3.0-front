import { useState, useEffect, useCallback } from "react";
import "./PageStyles.css";
import {
  chargerRecettes,
  creerRecette,
  mettreAJourRecette,
  supprimerRecette,
  STATUTS_RECETTE,
} from "../../data/gestionRecettes";
import {
  chargerUAT,
  creerUAT,
  mettreAJourUAT,
  supprimerUAT,
  STATUTS_UAT,
  recetteInterneEstOK,
} from "../../data/gestionUAT";
import {
  chargerLivraisons,
  creerLivraison,
  mettreAJourLivraison,
  supprimerLivraison,
  STATUTS_LIVRAISON,
  comiteGONOGOValide,
} from "../../data/gestionLivraisons";

const RecetteLivraison = ({ activeSubPage: activeSubPageProp }) => {
  const [activeSubPage, setActiveSubPage] = useState("suivi-recette");

  // États pour la gestion des recettes
  const [recettes, setRecettes] = useState([]);
  const [showRecetteForm, setShowRecetteForm] = useState(false);
  const [editingRecette, setEditingRecette] = useState(null);
  const [recetteFormData, setRecetteFormData] = useState({
    dateDebut: "",
    dateFin: "",
    anomaliesBloquantes: 0,
    anomaliesMajeures: 0,
    anomaliesMineures: 0,
    statutGlobal: "En cours",
    commentairesGP: "",
  });
  const [recetteMessage, setRecetteMessage] = useState({ type: "", text: "" });
  const [showRecetteDeleteConfirm, setShowRecetteDeleteConfirm] =
    useState(false);
  const [recetteToDelete, setRecetteToDelete] = useState(null);

  // États pour la gestion des UAT
  const [uatList, setUATList] = useState([]);
  const [showUATForm, setShowUATForm] = useState(false);
  const [editingUAT, setEditingUAT] = useState(null);
  const [uatFormData, setUATFormData] = useState({
    dateDebutUAT: "",
    dateFinUAT: "",
    statutUAT: "",
    nombreRetoursUAT: 0,
    reservesMetier: "",
    commentaireUAT: "",
    signatureValidationClient: "",
    planAction: "",
  });
  const [uatMessage, setUATMessage] = useState({ type: "", text: "" });
  const [showUATDeleteConfirm, setShowUATDeleteConfirm] = useState(false);
  const [uatToDelete, setUATToDelete] = useState(null);
  const [validationRecette, setValidationRecette] = useState(null);

  // États pour la gestion des livraisons
  const [livraisons, setLivraisons] = useState([]);
  const [showLivraisonForm, setShowLivraisonForm] = useState(false);
  const [editingLivraison, setEditingLivraison] = useState(null);
  const [livraisonFormData, setLivraisonFormData] = useState({
    numeroVersion: "",
    releaseNotes: "",
    dateLivraisonPrevue: "",
    dateLivraisonEffective: "",
    dateDeploiement: "",
    responsableDevOps: "",
    statutLivraison: "Prévue",
    commentairesGP: "",
    validationGONOGO: false,
  });
  const [livraisonMessage, setLivraisonMessage] = useState({
    type: "",
    text: "",
  });
  const [showLivraisonDeleteConfirm, setShowLivraisonDeleteConfirm] =
    useState(false);
  const [livraisonToDelete, setLivraisonToDelete] = useState(null);
  const [validationComite, setValidationComite] = useState(null);

  useEffect(() => {
    if (activeSubPageProp) {
      if (
        activeSubPageProp.includes("recette-livraison-livraison") ||
        (activeSubPageProp.includes("livraison") &&
          !activeSubPageProp.includes("suivi-recette") &&
          !activeSubPageProp.includes("recette-utilisateur"))
      ) {
        setActiveSubPage("livraison");
      } else if (
        activeSubPageProp.includes("recette-livraison-recette-utilisateur") ||
        activeSubPageProp.includes("recette-utilisateur") ||
        activeSubPageProp.includes("uat")
      ) {
        setActiveSubPage("recette-utilisateur");
      } else if (
        activeSubPageProp.includes("recette-livraison-suivi-recette") ||
        activeSubPageProp.includes("suivi-recette")
      ) {
        setActiveSubPage("suivi-recette");
      }
    }
  }, [activeSubPageProp]);

  const chargerLesRecettes = useCallback(async () => {
    const recettesChargees = await chargerRecettes();
    setRecettes(recettesChargees);
  }, []);

  const chargerLesUAT = useCallback(async () => {
    const uatChargees = await chargerUAT();
    setUATList(uatChargees);
    // Vérifier l'état de la recette interne
    const validation = await recetteInterneEstOK();
    setValidationRecette(validation);
  }, []);

  const chargerLesLivraisons = useCallback(async () => {
    const livraisonsChargees = await chargerLivraisons();
    setLivraisons(livraisonsChargees);
    // Vérifier l'état du comité GO/NO GO
    const validation = await comiteGONOGOValide();
    setValidationComite(validation);
  }, []);

  useEffect(() => {
    if (activeSubPage === "suivi-recette") {
      chargerLesRecettes();
    } else if (activeSubPage === "recette-utilisateur") {
      chargerLesRecettes(); // Besoin des recettes pour vérifier si OK
      chargerLesUAT();
    } else if (activeSubPage === "livraison") {
      chargerLesLivraisons();
    }
  }, [activeSubPage, chargerLesRecettes, chargerLesUAT, chargerLesLivraisons]);

  // Charger aussi au montage initial
  useEffect(() => {
    chargerLesRecettes();
  }, [chargerLesRecettes]);

  // Fonctions pour la gestion des recettes
  const handleRecetteInputChange = (e) => {
    const { name, value } = e.target;
    setRecetteFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (recetteMessage.text) {
      setRecetteMessage({ type: "", text: "" });
    }
  };

  const handleCreateRecette = () => {
    setEditingRecette(null);
    setRecetteFormData({
      dateDebut: "",
      dateFin: "",
      anomaliesBloquantes: 0,
      anomaliesMajeures: 0,
      anomaliesMineures: 0,
      statutGlobal: "En cours",
      commentairesGP: "",
    });
    setShowRecetteForm(true);
    setRecetteMessage({ type: "", text: "" });
  };

  const handleEditRecette = (recette) => {
    setEditingRecette(recette);
    setRecetteFormData({
      dateDebut: recette.dateDebut,
      dateFin: recette.dateFin || "",
      anomaliesBloquantes: recette.anomaliesBloquantes,
      anomaliesMajeures: recette.anomaliesMajeures,
      anomaliesMineures: recette.anomaliesMineures,
      statutGlobal: recette.statutGlobal,
      commentairesGP: recette.commentairesGP || "",
    });
    setShowRecetteForm(true);
    setRecetteMessage({ type: "", text: "" });
  };

  const handleDeleteRecette = (recette) => {
    setRecetteToDelete(recette);
    setShowRecetteDeleteConfirm(true);
  };

  const confirmDeleteRecette = () => {
    if (recetteToDelete) {
      const resultat = supprimerRecette(recetteToDelete.id);
      if (resultat.succes) {
        setRecetteMessage({ type: "success", text: resultat.message });
        chargerLesRecettes();
        setTimeout(() => setRecetteMessage({ type: "", text: "" }), 3000);
      } else {
        setRecetteMessage({ type: "error", text: resultat.message });
        setTimeout(() => setRecetteMessage({ type: "", text: "" }), 5000);
      }
    }
    setShowRecetteDeleteConfirm(false);
    setRecetteToDelete(null);
  };

  const cancelDeleteRecette = () => {
    setShowRecetteDeleteConfirm(false);
    setRecetteToDelete(null);
  };

  const handleRecetteSubmit = (e) => {
    e.preventDefault();
    setRecetteMessage({ type: "", text: "" });

    let resultat;
    if (editingRecette) {
      resultat = mettreAJourRecette(editingRecette.id, recetteFormData);
    } else {
      resultat = creerRecette(recetteFormData);
    }

    if (resultat.succes) {
      setRecetteMessage({ type: "success", text: resultat.message });
      chargerLesRecettes();
      setShowRecetteForm(false);
      setRecetteFormData({
        dateDebut: "",
        dateFin: "",
        anomaliesBloquantes: 0,
        anomaliesMajeures: 0,
        anomaliesMineures: 0,
        statutGlobal: "En cours",
        commentairesGP: "",
      });
      setEditingRecette(null);
      setTimeout(() => setRecetteMessage({ type: "", text: "" }), 3000);
    } else {
      setRecetteMessage({ type: "error", text: resultat.message });
    }
  };

  const handleCancelRecette = () => {
    setShowRecetteForm(false);
    setRecetteFormData({
      dateDebut: "",
      dateFin: "",
      anomaliesBloquantes: 0,
      anomaliesMajeures: 0,
      anomaliesMineures: 0,
      statutGlobal: "En cours",
      commentairesGP: "",
    });
    setEditingRecette(null);
    setRecetteMessage({ type: "", text: "" });
  };

  // Fonction pour obtenir le badge de statut
  const getStatutBadge = (statut) => {
    const badges = {
      "En cours": "badge-warning",
      OK: "badge-success",
      KO: "badge-danger",
      Bloquée: "badge-danger",
    };
    return badges[statut] || "badge-secondary";
  };

  // Fonctions pour la gestion des UAT
  const handleUATInputChange = (e) => {
    const { name, value } = e.target;
    setUATFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (uatMessage.text) {
      setUATMessage({ type: "", text: "" });
    }
  };

  const handleCreateUAT = () => {
    // Vérifier que la recette interne est OK avant de permettre la création
    const validation = recetteInterneEstOK();
    if (!validation.estOK) {
      setUATMessage({
        type: "error",
        text: validation.message,
      });
      return;
    }

    setEditingUAT(null);
    setUATFormData({
      dateDebutUAT: "",
      dateFinUAT: "",
      statutUAT: "",
      nombreRetoursUAT: 0,
      reservesMetier: "",
      commentaireUAT: "",
      signatureValidationClient: "",
      planAction: "",
    });
    setShowUATForm(true);
    setUATMessage({ type: "", text: "" });
  };

  const handleEditUAT = (uat) => {
    setEditingUAT(uat);
    setUATFormData({
      dateDebutUAT: uat.dateDebutUAT,
      dateFinUAT: uat.dateFinUAT,
      statutUAT: uat.statutUAT,
      nombreRetoursUAT: uat.nombreRetoursUAT,
      reservesMetier: uat.reservesMetier || "",
      commentaireUAT: uat.commentaireUAT || "",
      signatureValidationClient: uat.signatureValidationClient || "",
      planAction: uat.planAction || "",
    });
    setShowUATForm(true);
    setUATMessage({ type: "", text: "" });
  };

  const handleDeleteUAT = (uat) => {
    setUATToDelete(uat);
    setShowUATDeleteConfirm(true);
  };

  const confirmDeleteUAT = () => {
    if (uatToDelete) {
      const resultat = supprimerUAT(uatToDelete.id);
      if (resultat.succes) {
        setUATMessage({ type: "success", text: resultat.message });
        chargerLesUAT();
        setTimeout(() => setUATMessage({ type: "", text: "" }), 3000);
      } else {
        setUATMessage({ type: "error", text: resultat.message });
        setTimeout(() => setUATMessage({ type: "", text: "" }), 5000);
      }
    }
    setShowUATDeleteConfirm(false);
    setUATToDelete(null);
  };

  const cancelDeleteUAT = () => {
    setShowUATDeleteConfirm(false);
    setUATToDelete(null);
  };

  const handleUATSubmit = (e) => {
    e.preventDefault();
    setUATMessage({ type: "", text: "" });

    let resultat;
    if (editingUAT) {
      resultat = mettreAJourUAT(editingUAT.id, uatFormData);
    } else {
      resultat = creerUAT(uatFormData);
    }

    if (resultat.succes) {
      setUATMessage({ type: "success", text: resultat.message });
      chargerLesUAT();
      setShowUATForm(false);
      setUATFormData({
        dateDebutUAT: "",
        dateFinUAT: "",
        statutUAT: "",
        nombreRetoursUAT: 0,
        reservesMetier: "",
        commentaireUAT: "",
        signatureValidationClient: "",
        planAction: "",
      });
      setEditingUAT(null);
      setTimeout(() => setUATMessage({ type: "", text: "" }), 3000);
    } else {
      setUATMessage({ type: "error", text: resultat.message });
    }
  };

  const handleCancelUAT = () => {
    setShowUATForm(false);
    setUATFormData({
      dateDebutUAT: "",
      dateFinUAT: "",
      statutUAT: "",
      nombreRetoursUAT: 0,
      reservesMetier: "",
      commentaireUAT: "",
      signatureValidationClient: "",
      planAction: "",
    });
    setEditingUAT(null);
    setUATMessage({ type: "", text: "" });
  };

  // Fonction pour obtenir le badge de statut UAT
  const getStatutUATBadge = (statut) => {
    const badges = {
      Accepté: "badge-success",
      "Accepté avec réserve": "badge-warning",
      Refusé: "badge-danger",
    };
    return badges[statut] || "badge-secondary";
  };

  // Fonctions pour la gestion des livraisons
  const handleLivraisonInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLivraisonFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (livraisonMessage.text) {
      setLivraisonMessage({ type: "", text: "" });
    }
  };

  const handleCreateLivraison = () => {
    // Vérifier que le comité GO/NO GO a validé avant de permettre la création
    const validation = comiteGONOGOValide();
    if (!validation.estValide) {
      setLivraisonMessage({
        type: "error",
        text: validation.message,
      });
      return;
    }

    setEditingLivraison(null);
    setLivraisonFormData({
      numeroVersion: "",
      releaseNotes: "",
      dateLivraisonPrevue: "",
      dateLivraisonEffective: "",
      dateDeploiement: "",
      responsableDevOps: "",
      statutLivraison: "Prévue",
      commentairesGP: "",
      validationGONOGO: false,
    });
    setShowLivraisonForm(true);
    setLivraisonMessage({ type: "", text: "" });
  };

  const handleEditLivraison = (livraison) => {
    setEditingLivraison(livraison);
    setLivraisonFormData({
      numeroVersion: livraison.numeroVersion,
      releaseNotes: livraison.releaseNotes || "",
      dateLivraisonPrevue: livraison.dateLivraisonPrevue,
      dateLivraisonEffective: livraison.dateLivraisonEffective || "",
      dateDeploiement: livraison.dateDeploiement || "",
      responsableDevOps: livraison.responsableDevOps || "",
      statutLivraison: livraison.statutLivraison,
      commentairesGP: livraison.commentairesGP || "",
      validationGONOGO: livraison.validationGONOGO || false,
    });
    setShowLivraisonForm(true);
    setLivraisonMessage({ type: "", text: "" });
  };

  const handleDeleteLivraison = (livraison) => {
    setLivraisonToDelete(livraison);
    setShowLivraisonDeleteConfirm(true);
  };

  const confirmDeleteLivraison = () => {
    if (livraisonToDelete) {
      const resultat = supprimerLivraison(livraisonToDelete.id);
      if (resultat.succes) {
        setLivraisonMessage({ type: "success", text: resultat.message });
        chargerLesLivraisons();
        setTimeout(() => setLivraisonMessage({ type: "", text: "" }), 3000);
      } else {
        setLivraisonMessage({ type: "error", text: resultat.message });
        setTimeout(() => setLivraisonMessage({ type: "", text: "" }), 5000);
      }
    }
    setShowLivraisonDeleteConfirm(false);
    setLivraisonToDelete(null);
  };

  const cancelDeleteLivraison = () => {
    setShowLivraisonDeleteConfirm(false);
    setLivraisonToDelete(null);
  };

  const handleLivraisonSubmit = (e) => {
    e.preventDefault();
    setLivraisonMessage({ type: "", text: "" });

    let resultat;
    if (editingLivraison) {
      resultat = mettreAJourLivraison(editingLivraison.id, livraisonFormData);
    } else {
      resultat = creerLivraison(livraisonFormData);
    }

    if (resultat.succes) {
      setLivraisonMessage({ type: "success", text: resultat.message });
      chargerLesLivraisons();
      setShowLivraisonForm(false);
      setLivraisonFormData({
        numeroVersion: "",
        releaseNotes: "",
        dateLivraisonPrevue: "",
        dateLivraisonEffective: "",
        dateDeploiement: "",
        responsableDevOps: "",
        statutLivraison: "Prévue",
        commentairesGP: "",
        validationGONOGO: false,
      });
      setEditingLivraison(null);
      setTimeout(() => setLivraisonMessage({ type: "", text: "" }), 3000);
    } else {
      setLivraisonMessage({ type: "error", text: resultat.message });
    }
  };

  const handleCancelLivraison = () => {
    setShowLivraisonForm(false);
    setLivraisonFormData({
      numeroVersion: "",
      releaseNotes: "",
      dateLivraisonPrevue: "",
      dateLivraisonEffective: "",
      dateDeploiement: "",
      responsableDevOps: "",
      statutLivraison: "Prévue",
      commentairesGP: "",
      validationGONOGO: false,
    });
    setEditingLivraison(null);
    setLivraisonMessage({ type: "", text: "" });
  };

  // Fonction pour obtenir le badge de statut livraison
  const getStatutLivraisonBadge = (statut) => {
    const badges = {
      Prévue: "badge-secondary",
      "En cours": "badge-warning",
      OK: "badge-success",
      KO: "badge-danger",
    };
    return badges[statut] || "badge-secondary";
  };

  const subPages = {
    "suivi-recette": {
      title: "Suivi Recette",
      content: (
        <div>
          <div className="action-buttons">
            <button className="btn-primary" onClick={handleCreateRecette}>
              Ajouter un suivi de recette
            </button>
          </div>

          {recetteMessage.text && (
            <div
              className={`info-box ${
                recetteMessage.type === "error" ? "error-box" : "success-box"
              }`}
              style={{
                marginTop: "16px",
                backgroundColor:
                  recetteMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                borderColor:
                  recetteMessage.type === "error" ? "#fecaca" : "#a7f3d0",
                color: recetteMessage.type === "error" ? "#991b1b" : "#065f46",
              }}
            >
              <p>{recetteMessage.text}</p>
            </div>
          )}

          {/* Résumé des anomalies */}
          {recettes.length > 0 && (
            <div className="delivery-status" style={{ marginTop: "24px" }}>
              <div className="status-card">
                <h3>Anomalies bloquantes</h3>
                <p className="status-value" style={{ color: "#dc2626" }}>
                  {recettes.reduce((sum, r) => sum + r.anomaliesBloquantes, 0)}
                </p>
              </div>
              <div className="status-card">
                <h3>Anomalies majeures</h3>
                <p className="status-value" style={{ color: "#f59e0b" }}>
                  {recettes.reduce((sum, r) => sum + r.anomaliesMajeures, 0)}
                </p>
              </div>
              <div className="status-card">
                <h3>Anomalies mineures</h3>
                <p className="status-value" style={{ color: "#3b82f6" }}>
                  {recettes.reduce((sum, r) => sum + r.anomaliesMineures, 0)}
                </p>
              </div>
              <div className="status-card">
                <h3>Recettes en cours</h3>
                <p className="status-value">
                  {recettes.filter((r) => r.statutGlobal === "En cours").length}
                </p>
              </div>
            </div>
          )}

          {showRecetteForm && (
            <div className="modal-overlay" onClick={handleCancelRecette}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "700px" }}
              >
                <div className="modal-header">
                  <h3>
                    {editingRecette
                      ? "Modifier le suivi de recette"
                      : "Ajouter un suivi de recette"}
                  </h3>
                </div>
                {recetteMessage.text && (
                  <div
                    className={`info-box ${
                      recetteMessage.type === "error"
                        ? "error-box"
                        : "success-box"
                    }`}
                    style={{
                      margin: "16px 24px 0 24px",
                      padding: "12px",
                      borderRadius: "6px",
                      backgroundColor:
                        recetteMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                      border: `1px solid ${
                        recetteMessage.type === "error" ? "#fecaca" : "#a7f3d0"
                      }`,
                      color:
                        recetteMessage.type === "error" ? "#991b1b" : "#065f46",
                    }}
                  >
                    <p style={{ margin: 0 }}>{recetteMessage.text}</p>
                  </div>
                )}
                <form autoComplete="off" onSubmit={handleRecetteSubmit}>
                  <div className="form-group">
                    <label htmlFor="dateDebut">
                      Date effective de début{" "}
                      <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      id="dateDebut"
                      name="dateDebut"
                      value={recetteFormData.dateDebut}
                      onChange={handleRecetteInputChange}
                      required
                    />
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#6b7280",
                      }}
                    >
                      Le GP doit valider la date effective de début
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="dateFin">Date effective de fin</label>
                    <input
                      type="date"
                      id="dateFin"
                      name="dateFin"
                      value={recetteFormData.dateFin}
                      onChange={handleRecetteInputChange}
                      min={recetteFormData.dateDebut}
                    />
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#6b7280",
                      }}
                    >
                      Le GP doit valider la date effective de fin
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="anomaliesBloquantes">
                      Nombre d'anomalies bloquantes{" "}
                      <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="anomaliesBloquantes"
                      name="anomaliesBloquantes"
                      value={recetteFormData.anomaliesBloquantes}
                      onChange={handleRecetteInputChange}
                      min="0"
                      required
                    />
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#dc2626",
                      }}
                    >
                      ⚠️ Une anomalie bloquante bloque automatiquement la
                      recette
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="anomaliesMajeures">
                      Nombre d'anomalies majeures{" "}
                      <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="anomaliesMajeures"
                      name="anomaliesMajeures"
                      value={recetteFormData.anomaliesMajeures}
                      onChange={handleRecetteInputChange}
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="anomaliesMineures">
                      Nombre d'anomalies mineures{" "}
                      <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="anomaliesMineures"
                      name="anomaliesMineures"
                      value={recetteFormData.anomaliesMineures}
                      onChange={handleRecetteInputChange}
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="statutGlobal">
                      Statut global de la recette{" "}
                      <span className="required">*</span>
                    </label>
                    <select
                      id="statutGlobal"
                      name="statutGlobal"
                      value={recetteFormData.statutGlobal}
                      onChange={handleRecetteInputChange}
                      required
                      disabled={recetteFormData.anomaliesBloquantes > 0}
                    >
                      {STATUTS_RECETTE.map((statut) => (
                        <option key={statut} value={statut}>
                          {statut}
                        </option>
                      ))}
                    </select>
                    {recetteFormData.anomaliesBloquantes > 0 && (
                      <small
                        style={{
                          display: "block",
                          marginTop: "4px",
                          color: "#dc2626",
                        }}
                      >
                        Le statut est automatiquement défini sur "Bloquée" à
                        cause des anomalies bloquantes
                      </small>
                    )}
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#6b7280",
                      }}
                    >
                      Le GP met à jour le statut global de la recette
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="commentairesGP">Commentaires GP</label>
                    <textarea
                      id="commentairesGP"
                      name="commentairesGP"
                      value={recetteFormData.commentairesGP}
                      onChange={handleRecetteInputChange}
                      rows="4"
                      placeholder="Ajoutez vos commentaires sur l'avancement de la recette..."
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="submit" className="btn-primary">
                      {editingRecette ? "Mettre à jour" : "Créer"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCancelRecette}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-container" style={{ marginTop: "24px" }}>
            <h3>Liste des suivis de recette</h3>
            {recettes.length === 0 ? (
              <p style={{ color: "#6b7280", marginTop: "16px" }}>
                Aucun suivi de recette créé pour le moment.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date début</th>
                    <th>Date fin</th>
                    <th>Anomalies bloquantes</th>
                    <th>Anomalies majeures</th>
                    <th>Anomalies mineures</th>
                    <th>Statut global</th>
                    <th>Commentaires GP</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recettes.map((recette) => (
                    <tr key={recette.id}>
                      <td>{recette.id}</td>
                      <td>{recette.dateDebut}</td>
                      <td>{recette.dateFin || "-"}</td>
                      <td>
                        <span style={{ color: "#dc2626", fontWeight: "bold" }}>
                          {recette.anomaliesBloquantes}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "#f59e0b" }}>
                          {recette.anomaliesMajeures}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "#3b82f6" }}>
                          {recette.anomaliesMineures}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${getStatutBadge(
                            recette.statutGlobal
                          )}`}
                        >
                          {recette.statutGlobal}
                        </span>
                      </td>
                      <td
                        style={{
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {recette.commentairesGP || "-"}
                      </td>
                      <td>
                        <button
                          className="btn-secondary"
                          onClick={() => handleEditRecette(recette)}
                          style={{ marginRight: "5px" }}
                        >
                          Modifier
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleDeleteRecette(recette)}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ),
    },
    "recette-utilisateur": {
      title: "Recette Utilisateur (UAT)",
      content: (
        <div>
          <div className="action-buttons">
            <button className="btn-primary" onClick={handleCreateUAT}>
              Créer une session UAT
            </button>
          </div>

          {/* Afficher l'état de la recette interne */}
          {validationRecette && !validationRecette.estOK && (
            <div
              className="info-box error-box"
              style={{
                marginTop: "16px",
                backgroundColor: "#fee2e2",
                borderColor: "#fecaca",
                color: "#991b1b",
                padding: "16px",
                borderRadius: "6px",
              }}
            >
              <p style={{ margin: 0, fontWeight: "bold" }}>
                ⚠️ {validationRecette.message}
              </p>
            </div>
          )}

          {validationRecette && validationRecette.estOK && (
            <div
              className="info-box success-box"
              style={{
                marginTop: "16px",
                backgroundColor: "#d1fae5",
                borderColor: "#a7f3d0",
                color: "#065f46",
                padding: "16px",
                borderRadius: "6px",
              }}
            >
              <p style={{ margin: 0 }}>✓ {validationRecette.message}</p>
            </div>
          )}

          {uatMessage.text && (
            <div
              className={`info-box ${
                uatMessage.type === "error" ? "error-box" : "success-box"
              }`}
              style={{
                marginTop: "16px",
                backgroundColor:
                  uatMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                borderColor:
                  uatMessage.type === "error" ? "#fecaca" : "#a7f3d0",
                color: uatMessage.type === "error" ? "#991b1b" : "#065f46",
              }}
            >
              <p>{uatMessage.text}</p>
            </div>
          )}

          {/* Résumé des UAT */}
          {uatList.length > 0 && (
            <div className="delivery-status" style={{ marginTop: "24px" }}>
              <div className="status-card">
                <h3>UAT acceptées</h3>
                <p className="status-value" style={{ color: "#10b981" }}>
                  {uatList.filter((u) => u.statutUAT === "Accepté").length}
                </p>
              </div>
              <div className="status-card">
                <h3>UAT avec réserve</h3>
                <p className="status-value" style={{ color: "#f59e0b" }}>
                  {
                    uatList.filter(
                      (u) => u.statutUAT === "Accepté avec réserve"
                    ).length
                  }
                </p>
              </div>
              <div className="status-card">
                <h3>UAT refusées</h3>
                <p className="status-value" style={{ color: "#dc2626" }}>
                  {uatList.filter((u) => u.statutUAT === "Refusé").length}
                </p>
              </div>
              <div className="status-card">
                <h3>Total UAT</h3>
                <p className="status-value">{uatList.length}</p>
              </div>
            </div>
          )}

          {showUATForm && (
            <div className="modal-overlay" onClick={handleCancelUAT}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "700px" }}
              >
                <div className="modal-header">
                  <h3>
                    {editingUAT
                      ? "Modifier la session UAT"
                      : "Créer une session UAT"}
                  </h3>
                </div>
                {uatMessage.text && (
                  <div
                    className={`info-box ${
                      uatMessage.type === "error" ? "error-box" : "success-box"
                    }`}
                    style={{
                      margin: "16px 24px 0 24px",
                      padding: "12px",
                      borderRadius: "6px",
                      backgroundColor:
                        uatMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                      border: `1px solid ${
                        uatMessage.type === "error" ? "#fecaca" : "#a7f3d0"
                      }`,
                      color:
                        uatMessage.type === "error" ? "#991b1b" : "#065f46",
                    }}
                  >
                    <p style={{ margin: 0 }}>{uatMessage.text}</p>
                  </div>
                )}
                <form autoComplete="off" onSubmit={handleUATSubmit}>
                  <div className="form-group">
                    <label htmlFor="dateDebutUAT">
                      Date début UAT <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      id="dateDebutUAT"
                      name="dateDebutUAT"
                      value={uatFormData.dateDebutUAT}
                      onChange={handleUATInputChange}
                      required
                    />
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#6b7280",
                      }}
                    >
                      Le GP doit planifier les dates UAT avec le métier
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="dateFinUAT">
                      Date fin UAT <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      id="dateFinUAT"
                      name="dateFinUAT"
                      value={uatFormData.dateFinUAT}
                      onChange={handleUATInputChange}
                      min={uatFormData.dateDebutUAT}
                      required
                    />
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#6b7280",
                      }}
                    >
                      Le GP doit planifier les dates UAT avec le métier
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="statutUAT">
                      Statut UAT <span className="required">*</span>
                    </label>
                    <select
                      id="statutUAT"
                      name="statutUAT"
                      value={uatFormData.statutUAT}
                      onChange={handleUATInputChange}
                      required
                    >
                      {STATUTS_UAT.map((statut) => (
                        <option key={statut} value={statut}>
                          {statut}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="nombreRetoursUAT">
                      Nombre de retours UAT <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="nombreRetoursUAT"
                      name="nombreRetoursUAT"
                      value={uatFormData.nombreRetoursUAT}
                      onChange={handleUATInputChange}
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reservesMetier">Réserves métier</label>
                    <textarea
                      id="reservesMetier"
                      name="reservesMetier"
                      value={uatFormData.reservesMetier}
                      onChange={handleUATInputChange}
                      rows="3"
                      placeholder="Indiquez les réserves métier..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="commentaireUAT">Commentaire UAT</label>
                    <textarea
                      id="commentaireUAT"
                      name="commentaireUAT"
                      value={uatFormData.commentaireUAT}
                      onChange={handleUATInputChange}
                      rows="4"
                      placeholder="Ajoutez vos commentaires sur l'UAT..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="signatureValidationClient">
                      Signature / Validation client
                    </label>
                    <input
                      type="text"
                      id="signatureValidationClient"
                      name="signatureValidationClient"
                      value={uatFormData.signatureValidationClient}
                      onChange={handleUATInputChange}
                      placeholder="Nom du client validant..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="planAction">
                      Plan d'action{" "}
                      {uatFormData.statutUAT === "Refusé" && (
                        <span className="required">*</span>
                      )}
                    </label>
                    <textarea
                      id="planAction"
                      name="planAction"
                      value={uatFormData.planAction}
                      onChange={handleUATInputChange}
                      rows="4"
                      placeholder="Si refus → un plan d'action doit être créé par le GP"
                      required={uatFormData.statutUAT === "Refusé"}
                    />
                    {uatFormData.statutUAT === "Refusé" && (
                      <small
                        style={{
                          display: "block",
                          marginTop: "4px",
                          color: "#dc2626",
                        }}
                      >
                        ⚠️ Un plan d'action est obligatoire lorsque le statut
                        UAT est "Refusé"
                      </small>
                    )}
                  </div>
                  <div className="modal-actions">
                    <button type="submit" className="btn-primary">
                      {editingUAT ? "Mettre à jour" : "Créer"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCancelUAT}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-container" style={{ marginTop: "24px" }}>
            <h3>Sessions UAT</h3>
            {uatList.length === 0 ? (
              <p style={{ color: "#6b7280", marginTop: "16px" }}>
                Aucune session UAT créée pour le moment.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date début</th>
                    <th>Date fin</th>
                    <th>Statut UAT</th>
                    <th>Retours UAT</th>
                    <th>Réserves métier</th>
                    <th>Validation client</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uatList.map((uat) => (
                    <tr key={uat.id}>
                      <td>{uat.id}</td>
                      <td>{uat.dateDebutUAT}</td>
                      <td>{uat.dateFinUAT}</td>
                      <td>
                        <span
                          className={`badge ${getStatutUATBadge(
                            uat.statutUAT
                          )}`}
                        >
                          {uat.statutUAT}
                        </span>
                      </td>
                      <td>{uat.nombreRetoursUAT}</td>
                      <td
                        style={{
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {uat.reservesMetier || "-"}
                      </td>
                      <td>{uat.signatureValidationClient || "-"}</td>
                      <td>
                        <button
                          className="btn-secondary"
                          onClick={() => handleEditUAT(uat)}
                          style={{ marginRight: "5px" }}
                        >
                          Modifier
                        </button>
                        <button
                          className="btn-link"
                          onClick={() => {
                            // Afficher les détails complets dans une modal
                            alert(
                              `Détails UAT #${uat.id}\n\nCommentaire: ${
                                uat.commentaireUAT || "Aucun"
                              }\nPlan d'action: ${uat.planAction || "Aucun"}`
                            );
                          }}
                          style={{ marginRight: "5px" }}
                        >
                          Détails
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleDeleteUAT(uat)}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ),
    },
    livraison: {
      title: "Livraison et Mise en Production",
      content: (
        <div>
          <div className="action-buttons">
            <button className="btn-primary" onClick={handleCreateLivraison}>
              Créer une livraison
            </button>
          </div>

          {/* Afficher l'état du comité GO/NO GO */}
          {validationComite && !validationComite.estValide && (
            <div
              className="info-box error-box"
              style={{
                marginTop: "16px",
                backgroundColor: "#fee2e2",
                borderColor: "#fecaca",
                color: "#991b1b",
                padding: "16px",
                borderRadius: "6px",
              }}
            >
              <p style={{ margin: 0, fontWeight: "bold" }}>
                ⚠️ {validationComite.message}
              </p>
            </div>
          )}

          {livraisonMessage.text && (
            <div
              className={`info-box ${
                livraisonMessage.type === "error" ? "error-box" : "success-box"
              }`}
              style={{
                marginTop: "16px",
                backgroundColor:
                  livraisonMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                borderColor:
                  livraisonMessage.type === "error" ? "#fecaca" : "#a7f3d0",
                color:
                  livraisonMessage.type === "error" ? "#991b1b" : "#065f46",
              }}
            >
              <p>{livraisonMessage.text}</p>
            </div>
          )}

          {/* Résumé des livraisons */}
          {livraisons.length > 0 && (
            <div className="delivery-status" style={{ marginTop: "24px" }}>
              <div className="status-card">
                <h3>Livraisons prévues</h3>
                <p className="status-value">
                  {
                    livraisons.filter((l) => l.statutLivraison === "Prévue")
                      .length
                  }
                </p>
              </div>
              <div className="status-card">
                <h3>Livraisons en cours</h3>
                <p className="status-value" style={{ color: "#f59e0b" }}>
                  {
                    livraisons.filter((l) => l.statutLivraison === "En cours")
                      .length
                  }
                </p>
              </div>
              <div className="status-card">
                <h3>Livraisons OK</h3>
                <p className="status-value" style={{ color: "#10b981" }}>
                  {livraisons.filter((l) => l.statutLivraison === "OK").length}
                </p>
              </div>
              <div className="status-card">
                <h3>Livraisons KO</h3>
                <p className="status-value" style={{ color: "#dc2626" }}>
                  {livraisons.filter((l) => l.statutLivraison === "KO").length}
                </p>
              </div>
            </div>
          )}

          {showLivraisonForm && (
            <div className="modal-overlay" onClick={handleCancelLivraison}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "700px" }}
              >
                <div className="modal-header">
                  <h3>
                    {editingLivraison
                      ? "Modifier la livraison"
                      : "Créer une livraison"}
                  </h3>
                </div>
                {livraisonMessage.text && (
                  <div
                    className={`info-box ${
                      livraisonMessage.type === "error"
                        ? "error-box"
                        : "success-box"
                    }`}
                    style={{
                      margin: "16px 24px 0 24px",
                      padding: "12px",
                      borderRadius: "6px",
                      backgroundColor:
                        livraisonMessage.type === "error"
                          ? "#fee2e2"
                          : "#d1fae5",
                      border: `1px solid ${
                        livraisonMessage.type === "error"
                          ? "#fecaca"
                          : "#a7f3d0"
                      }`,
                      color:
                        livraisonMessage.type === "error"
                          ? "#991b1b"
                          : "#065f46",
                    }}
                  >
                    <p style={{ margin: 0 }}>{livraisonMessage.text}</p>
                  </div>
                )}
                <form autoComplete="off" onSubmit={handleLivraisonSubmit}>
                  <div className="form-group">
                    <label htmlFor="numeroVersion">
                      Numéro de version <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="numeroVersion"
                      name="numeroVersion"
                      value={livraisonFormData.numeroVersion}
                      onChange={handleLivraisonInputChange}
                      placeholder="ex: v1.2.0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="releaseNotes">
                      Release notes <span className="required">*</span>
                    </label>
                    <textarea
                      id="releaseNotes"
                      name="releaseNotes"
                      value={livraisonFormData.releaseNotes}
                      onChange={handleLivraisonInputChange}
                      rows="5"
                      placeholder="Le GP valide le contenu de la release (release notes)..."
                      required
                    />
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#6b7280",
                      }}
                    >
                      Le GP valide le contenu de la release (release notes)
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="dateLivraisonPrevue">
                      Date de livraison prévue{" "}
                      <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      id="dateLivraisonPrevue"
                      name="dateLivraisonPrevue"
                      value={livraisonFormData.dateLivraisonPrevue}
                      onChange={handleLivraisonInputChange}
                      required
                    />
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#6b7280",
                      }}
                    >
                      Le GP doit définir la date prévue de livraison
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="dateLivraisonEffective">
                      Date de livraison effective
                    </label>
                    <input
                      type="date"
                      id="dateLivraisonEffective"
                      name="dateLivraisonEffective"
                      value={livraisonFormData.dateLivraisonEffective}
                      onChange={handleLivraisonInputChange}
                      min={livraisonFormData.dateLivraisonPrevue}
                    />
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#6b7280",
                      }}
                    >
                      Le GP doit confirmer la date de livraison effective
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="dateDeploiement">
                      Date de déploiement (production)
                    </label>
                    <input
                      type="date"
                      id="dateDeploiement"
                      name="dateDeploiement"
                      value={livraisonFormData.dateDeploiement}
                      onChange={handleLivraisonInputChange}
                      min={
                        livraisonFormData.dateLivraisonEffective ||
                        livraisonFormData.dateLivraisonPrevue
                      }
                    />
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#6b7280",
                      }}
                    >
                      Le GP doit confirmer la date de déploiement
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="responsableDevOps">
                      Responsable DevOps
                    </label>
                    <input
                      type="text"
                      id="responsableDevOps"
                      name="responsableDevOps"
                      value={livraisonFormData.responsableDevOps}
                      onChange={handleLivraisonInputChange}
                      placeholder="Nom du responsable DevOps..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="statutLivraison">
                      Statut livraison <span className="required">*</span>
                    </label>
                    <select
                      id="statutLivraison"
                      name="statutLivraison"
                      value={livraisonFormData.statutLivraison}
                      onChange={handleLivraisonInputChange}
                      required
                    >
                      {STATUTS_LIVRAISON.map((statut) => (
                        <option key={statut} value={statut}>
                          {statut}
                        </option>
                      ))}
                    </select>
                    {livraisonFormData.statutLivraison === "KO" && (
                      <small
                        style={{
                          display: "block",
                          marginTop: "4px",
                          color: "#dc2626",
                        }}
                      >
                        ⚠️ En cas d'échec de déploiement → rollback automatique
                        prévu
                      </small>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="validationGONOGO"
                        checked={livraisonFormData.validationGONOGO}
                        onChange={handleLivraisonInputChange}
                      />
                      <span>Validation comité GO/NO GO</span>
                    </label>
                    <small
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "#6b7280",
                      }}
                    >
                      La livraison ne peut être faite que si le comité GO/NO GO
                      a validé la version
                    </small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="commentairesGP">Commentaires GP</label>
                    <textarea
                      id="commentairesGP"
                      name="commentairesGP"
                      value={livraisonFormData.commentairesGP}
                      onChange={handleLivraisonInputChange}
                      rows="4"
                      placeholder="Ajoutez vos commentaires sur la livraison..."
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="submit" className="btn-primary">
                      {editingLivraison ? "Mettre à jour" : "Créer"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCancelLivraison}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-container" style={{ marginTop: "24px" }}>
            <h3>Historique des livraisons</h3>
            {livraisons.length === 0 ? (
              <p style={{ color: "#6b7280", marginTop: "16px" }}>
                Aucune livraison créée pour le moment.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Version</th>
                    <th>Date livraison prévue</th>
                    <th>Date livraison effective</th>
                    <th>Date déploiement</th>
                    <th>Responsable DevOps</th>
                    <th>Statut</th>
                    <th>GO/NO GO</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {livraisons.map((livraison) => (
                    <tr key={livraison.id}>
                      <td>{livraison.id}</td>
                      <td>
                        <strong>{livraison.numeroVersion}</strong>
                      </td>
                      <td>{livraison.dateLivraisonPrevue}</td>
                      <td>{livraison.dateLivraisonEffective || "-"}</td>
                      <td>{livraison.dateDeploiement || "-"}</td>
                      <td>{livraison.responsableDevOps || "-"}</td>
                      <td>
                        <span
                          className={`badge ${getStatutLivraisonBadge(
                            livraison.statutLivraison
                          )}`}
                        >
                          {livraison.statutLivraison}
                        </span>
                        {livraison.rollbackAutomatique && (
                          <span
                            style={{
                              marginLeft: "8px",
                              color: "#dc2626",
                              fontSize: "12px",
                            }}
                          >
                            (Rollback prévu)
                          </span>
                        )}
                      </td>
                      <td>
                        {livraison.validationGONOGO ? (
                          <span className="badge badge-success">✓ Validé</span>
                        ) : (
                          <span className="badge badge-warning">
                            En attente
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-secondary"
                          onClick={() => handleEditLivraison(livraison)}
                          style={{ marginRight: "5px" }}
                        >
                          Modifier
                        </button>
                        <button
                          className="btn-link"
                          onClick={() => {
                            alert(
                              `Détails livraison #${livraison.id}\n\nVersion: ${
                                livraison.numeroVersion
                              }\n\nRelease notes:\n${
                                livraison.releaseNotes || "Aucun"
                              }\n\nCommentaires GP:\n${
                                livraison.commentairesGP || "Aucun"
                              }`
                            );
                          }}
                          style={{ marginRight: "5px" }}
                        >
                          Détails
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleDeleteLivraison(livraison)}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ),
    },
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{subPages[activeSubPage].title}</h1>
        <p>Gérez la recette et la livraison des projets</p>
      </div>

      <div className="page-content">{subPages[activeSubPage].content}</div>

      {/* Popup de confirmation de suppression UAT */}
      {showUATDeleteConfirm && uatToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteUAT}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>Confirmer la suppression</h3>
            </div>
            <div className="confirm-modal-body">
              <p>
                Êtes-vous sûr de vouloir supprimer la session UAT{" "}
                <strong>#{uatToDelete.id}</strong> ?
              </p>
              <p className="confirm-warning">Cette action est irréversible.</p>
            </div>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteUAT}
              >
                Supprimer
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDeleteUAT}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmation de suppression recette */}
      {showRecetteDeleteConfirm && recetteToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteRecette}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>Confirmer la suppression</h3>
            </div>
            <div className="confirm-modal-body">
              <p>
                Êtes-vous sûr de vouloir supprimer le suivi de recette{" "}
                <strong>#{recetteToDelete.id}</strong> ?
              </p>
              <p className="confirm-warning">Cette action est irréversible.</p>
            </div>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteRecette}
              >
                Supprimer
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDeleteRecette}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de confirmation de suppression livraison */}
      {showLivraisonDeleteConfirm && livraisonToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteLivraison}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>Confirmer la suppression</h3>
            </div>
            <div className="confirm-modal-body">
              <p>
                Êtes-vous sûr de vouloir supprimer la livraison{" "}
                <strong>
                  #{livraisonToDelete.id} - {livraisonToDelete.numeroVersion}
                </strong>{" "}
                ?
              </p>
              <p className="confirm-warning">Cette action est irréversible.</p>
            </div>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteLivraison}
              >
                Supprimer
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDeleteLivraison}
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

export default RecetteLivraison;
