import { useState, useEffect, useCallback } from "react";
import "./PageStyles.css";
import {
  chargerSprints,
  creerSprint,
  mettreAJourSprint,
  supprimerSprint,
} from "../../data/gestionSprints";

const PlanningProjet = ({ activeSubPage: activeSubPageProp }) => {
  const [activeSubPage, setActiveSubPage] = useState("cadre-temporel");
  const [sprints, setSprints] = useState([]);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [sprintMessage, setSprintMessage] = useState({ type: "", text: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState(null);
  const [sprintFormData, setSprintFormData] = useState({
    nom: "",
    description: "",
    dateDebut: "",
    dateFin: "",
    dateValidationSI: "",
    dateReponseDEV: "",
    dateReponseTIV: "",
    etape: "",
    evenementImportant: "",
    pointsControle: [],
    ressources: [],
    respectPlanning: false,
  });
  const [newPointControle, setNewPointControle] = useState("");
  const [newRessource, setNewRessource] = useState({
    nom: "",
    type: "DEV",
    disponibilite: 0,
    tjm: 0,
  });

  useEffect(() => {
    if (activeSubPageProp) {
      if (activeSubPageProp.includes("cadre-temporel"))
        setActiveSubPage("cadre-temporel");
      else if (activeSubPageProp.includes("sprints"))
        setActiveSubPage("sprints");
      else if (activeSubPageProp.includes("roadmap"))
        setActiveSubPage("roadmap");
      else setActiveSubPage("cadre-temporel");
    }
  }, [activeSubPageProp]);

  const chargerLesSprints = useCallback(async () => {
    const sprintsCharges = await chargerSprints();
    setSprints(sprintsCharges);
  }, []);

  useEffect(() => {
    if (activeSubPage === "sprints") {
      chargerLesSprints();
    }
  }, [activeSubPage, chargerLesSprints]);

  const handleSprintInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSprintFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (sprintMessage.text) {
      setSprintMessage({ type: "", text: "" });
    }
  };

  const handleCreateSprint = () => {
    setEditingSprint(null);
    setSprintFormData({
      nom: "",
      description: "",
      dateDebut: "",
      dateFin: "",
      dateValidationSI: "",
      dateReponseDEV: "",
      dateReponseTIV: "",
      etape: "",
      evenementImportant: "",
      pointsControle: [],
      ressources: [],
      respectPlanning: false,
    });
    setShowSprintForm(true);
    setSprintMessage({ type: "", text: "" });
  };

  const handleEditSprint = (sprint) => {
    setEditingSprint(sprint);
    setSprintFormData({
      nom: sprint.nom || "",
      description: sprint.description || "",
      dateDebut: sprint.dateDebut || "",
      dateFin: sprint.dateFin || "",
      dateValidationSI: sprint.dateValidationSI || "",
      dateReponseDEV: sprint.dateReponseDEV || "",
      dateReponseTIV: sprint.dateReponseTIV || "",
      etape: sprint.etape || "",
      evenementImportant: sprint.evenementImportant || "",
      pointsControle: Array.isArray(sprint.pointsControle)
        ? sprint.pointsControle
        : [],
      ressources: Array.isArray(sprint.ressources) ? sprint.ressources : [],
      respectPlanning: sprint.respectPlanning || false,
    });
    setShowSprintForm(true);
    setSprintMessage({ type: "", text: "" });
  };

  const handleDeleteSprint = (sprint) => {
    setSprintToDelete(sprint);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSprint = () => {
    if (sprintToDelete) {
      const resultat = supprimerSprint(sprintToDelete.id);
      if (resultat.succes) {
        setSprintMessage({ type: "success", text: resultat.message });
        chargerLesSprints();
        setTimeout(() => setSprintMessage({ type: "", text: "" }), 3000);
      } else {
        setSprintMessage({ type: "error", text: resultat.message });
        setTimeout(() => setSprintMessage({ type: "", text: "" }), 5000);
      }
    }
    setShowDeleteConfirm(false);
    setSprintToDelete(null);
  };

  const cancelDeleteSprint = () => {
    setShowDeleteConfirm(false);
    setSprintToDelete(null);
  };

  const handleAddPointControle = () => {
    if (newPointControle.trim()) {
      setSprintFormData((prev) => ({
        ...prev,
        pointsControle: [...prev.pointsControle, newPointControle.trim()],
      }));
      setNewPointControle("");
    }
  };

  const handleRemovePointControle = (index) => {
    setSprintFormData((prev) => ({
      ...prev,
      pointsControle: prev.pointsControle.filter((_, i) => i !== index),
    }));
  };

  const handleAddRessource = () => {
    if (
      newRessource.nom.trim() &&
      (newRessource.type === "DEV" || newRessource.type === "TIV") &&
      newRessource.disponibilite >= 0 &&
      newRessource.tjm >= 0
    ) {
      setSprintFormData((prev) => ({
        ...prev,
        ressources: [...prev.ressources, { ...newRessource }],
      }));
      setNewRessource({
        nom: "",
        type: "DEV",
        disponibilite: 0,
        tjm: 0,
      });
    }
  };

  const handleRemoveRessource = (index) => {
    setSprintFormData((prev) => ({
      ...prev,
      ressources: prev.ressources.filter((_, i) => i !== index),
    }));
  };

  const handleSprintSubmit = (e) => {
    e.preventDefault();
    setSprintMessage({ type: "", text: "" });

    let resultat;
    if (editingSprint) {
      resultat = mettreAJourSprint(editingSprint.id, sprintFormData);
    } else {
      resultat = creerSprint(sprintFormData);
    }

    if (resultat.succes) {
      setSprintMessage({ type: "success", text: resultat.message });
      chargerLesSprints();
      setShowSprintForm(false);
      setSprintFormData({
        nom: "",
        description: "",
        dateDebut: "",
        dateFin: "",
        dateValidationSI: "",
        dateReponseDEV: "",
        dateReponseTIV: "",
        etape: "",
        evenementImportant: "",
        pointsControle: [],
        ressources: [],
        respectPlanning: false,
      });
      setEditingSprint(null);
      setTimeout(() => setSprintMessage({ type: "", text: "" }), 3000);
    } else {
      setSprintMessage({ type: "error", text: resultat.message });
    }
  };

  const handleCancelSprint = () => {
    setShowSprintForm(false);
    setSprintFormData({
      nom: "",
      description: "",
      dateDebut: "",
      dateFin: "",
      dateValidationSI: "",
      dateReponseDEV: "",
      dateReponseTIV: "",
      etape: "",
      evenementImportant: "",
      pointsControle: [],
      ressources: [],
      respectPlanning: false,
    });
    setEditingSprint(null);
    setSprintMessage({ type: "", text: "" });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Non définie";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR");
  };

  const subPages = {
    "cadre-temporel": {
      title: "Cadre Temporel du Projet",
      content: (
        <div>
          <div className="planning-sections">
            <div className="section-card">
              <h3>Cadre Temporel du Projet</h3>
              <p>Définissez les dates de début et de fin du projet</p>
              <button className="btn-primary">Configurer</button>
            </div>
          </div>
        </div>
      ),
    },
    sprints: {
      title: "Sprints",
      content: (
        <div>
          <div className="section-rubrique" style={{ marginBottom: "48px" }}>
            <h2
              style={{
                marginBottom: "24px",
                paddingBottom: "12px",
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              Gestion des Sprints
            </h2>

            {sprintMessage.text && (
              <div
                className={`info-box ${
                  sprintMessage.type === "error" ? "error-box" : "success-box"
                }`}
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  borderRadius: "6px",
                  backgroundColor:
                    sprintMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                  border: `1px solid ${
                    sprintMessage.type === "error" ? "#fecaca" : "#a7f3d0"
                  }`,
                  color: sprintMessage.type === "error" ? "#991b1b" : "#065f46",
                }}
              >
                <p style={{ margin: 0 }}>{sprintMessage.text}</p>
              </div>
            )}

            <div className="action-buttons">
              <button className="btn-primary" onClick={handleCreateSprint}>
                Créer un sprint
              </button>
            </div>

            {sprints.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "#6b7280",
                  marginTop: "24px",
                }}
              >
                <p>Aucun sprint créé pour le moment.</p>
              </div>
            ) : (
              <div className="table-container" style={{ marginTop: "24px" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom</th>
                      <th>Date Début</th>
                      <th>Date Fin</th>
                      <th>Étape</th>
                      <th>Date Validation SI</th>
                      <th>Date Réponse DEV</th>
                      <th>Date Réponse TIV</th>
                      <th>Ressources</th>
                      <th>Coût Total</th>
                      <th>Respect Planning</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sprints.map((sprint) => {
                      const ressources = Array.isArray(sprint.ressources)
                        ? sprint.ressources
                        : [];
                      const coutTotal = ressources.reduce(
                        (total, r) => total + r.disponibilite * r.tjm,
                        0,
                      );
                      return (
                        <tr key={sprint.id}>
                          <td>{sprint.id}</td>
                          <td>{sprint.nom}</td>
                          <td>{formatDate(sprint.dateDebut)}</td>
                          <td>{formatDate(sprint.dateFin)}</td>
                          <td>{sprint.etape || "N/A"}</td>
                          <td>{formatDate(sprint.dateValidationSI)}</td>
                          <td>{formatDate(sprint.dateReponseDEV)}</td>
                          <td>{formatDate(sprint.dateReponseTIV)}</td>
                          <td>{ressources.length} ressource(s)</td>
                          <td>{coutTotal.toFixed(2)} €</td>
                          <td>
                            {sprint.respectPlanning ? (
                              <span style={{ color: "#10b981" }}>✓ Oui</span>
                            ) : (
                              <span style={{ color: "#ef4444" }}>✗ Non</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn-secondary"
                              onClick={() => handleEditSprint(sprint)}
                              style={{ marginRight: "8px" }}
                            >
                              Modifier
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => handleDeleteSprint(sprint)}
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ),
    },
    roadmap: {
      title: "Roadmap",
      content: (
        <div>
          <div className="planning-sections">
            <div className="section-card">
              <h3>Roadmap</h3>
              <p>Visualisez la vision à long terme du projet</p>
              <button className="btn-primary">Voir la roadmap</button>
            </div>
          </div>
        </div>
      ),
    },
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{subPages[activeSubPage].title}</h1>
        <p>Gérez le planning et les sprints de vos projets</p>
      </div>

      <div className="page-content">{subPages[activeSubPage].content}</div>

      {/* Modal de formulaire Sprint */}
      {showSprintForm && (
        <div className="modal-overlay" onClick={handleCancelSprint}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <h3>
                {editingSprint
                  ? "Modifier le sprint"
                  : "Créer un nouveau sprint"}
              </h3>
            </div>
            {sprintMessage.text && (
              <div
                className={`info-box ${
                  sprintMessage.type === "error" ? "error-box" : "success-box"
                }`}
                style={{
                  margin: "16px 24px 0 24px",
                  padding: "12px",
                  borderRadius: "6px",
                  backgroundColor:
                    sprintMessage.type === "error" ? "#fee2e2" : "#d1fae5",
                  border: `1px solid ${
                    sprintMessage.type === "error" ? "#fecaca" : "#a7f3d0"
                  }`,
                  color: sprintMessage.type === "error" ? "#991b1b" : "#065f46",
                }}
              >
                <p style={{ margin: 0 }}>{sprintMessage.text}</p>
              </div>
            )}
            <form autoComplete="off" onSubmit={handleSprintSubmit}>
              <div className="form-group">
                <label htmlFor="sprintNom">
                  Nom du sprint <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  id="sprintNom"
                  name="nom"
                  value={sprintFormData.nom}
                  onChange={handleSprintInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sprintDescription">Description</label>
                <textarea
                  id="sprintDescription"
                  name="description"
                  value={sprintFormData.description}
                  onChange={handleSprintInputChange}
                  rows="3"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div className="form-group">
                  <label htmlFor="sprintDateDebut">
                    Date de début <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="date"
                    id="sprintDateDebut"
                    name="dateDebut"
                    value={sprintFormData.dateDebut}
                    onChange={handleSprintInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sprintDateFin">
                    Date de fin <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="date"
                    id="sprintDateFin"
                    name="dateFin"
                    value={sprintFormData.dateFin}
                    onChange={handleSprintInputChange}
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "16px",
                }}
              >
                <div className="form-group">
                  <label htmlFor="sprintDateValidationSI">
                    Date de validation SI
                  </label>
                  <input
                    type="date"
                    id="sprintDateValidationSI"
                    name="dateValidationSI"
                    value={sprintFormData.dateValidationSI}
                    onChange={handleSprintInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sprintDateReponseDEV">
                    Date de réponse DEV
                  </label>
                  <input
                    type="date"
                    id="sprintDateReponseDEV"
                    name="dateReponseDEV"
                    value={sprintFormData.dateReponseDEV}
                    onChange={handleSprintInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sprintDateReponseTIV">
                    Date de réponse TIV
                  </label>
                  <input
                    type="date"
                    id="sprintDateReponseTIV"
                    name="dateReponseTIV"
                    value={sprintFormData.dateReponseTIV}
                    onChange={handleSprintInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="sprintEtape">Étape correspondante</label>
                <input
                  type="text"
                  id="sprintEtape"
                  name="etape"
                  value={sprintFormData.etape}
                  onChange={handleSprintInputChange}
                  placeholder="Ex: Analyse, Développement, Tests..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="sprintEvenementImportant">
                  Événement important du projet
                </label>
                <textarea
                  id="sprintEvenementImportant"
                  name="evenementImportant"
                  value={sprintFormData.evenementImportant}
                  onChange={handleSprintInputChange}
                  rows="3"
                  placeholder="Décrivez l'événement important..."
                />
              </div>

              <div className="form-group">
                <label>Points de contrôle</label>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <input
                    type="text"
                    value={newPointControle}
                    onChange={(e) => setNewPointControle(e.target.value)}
                    placeholder="Ajouter un point de contrôle"
                    style={{ flex: 1 }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPointControle();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleAddPointControle}
                  >
                    Ajouter
                  </button>
                </div>
                {sprintFormData.pointsControle.length > 0 && (
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "8px 0 0 0",
                    }}
                  >
                    {sprintFormData.pointsControle.map((point, index) => (
                      <li
                        key={index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px",
                          backgroundColor: "#f3f4f6",
                          marginBottom: "4px",
                          borderRadius: "4px",
                        }}
                      >
                        <span>{point}</span>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleRemovePointControle(index)}
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                        >
                          Supprimer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group">
                <label>Ressources</label>
                <div
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Nom de la ressource"
                      value={newRessource.nom}
                      onChange={(e) =>
                        setNewRessource({
                          ...newRessource,
                          nom: e.target.value,
                        })
                      }
                    />
                    <select
                      value={newRessource.type}
                      onChange={(e) =>
                        setNewRessource({
                          ...newRessource,
                          type: e.target.value,
                        })
                      }
                    >
                      <option value="DEV">DEV</option>
                      <option value="TIV">TIV</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Disponibilité (H/J)"
                      min="0"
                      step="0.5"
                      value={newRessource.disponibilite}
                      onChange={(e) =>
                        setNewRessource({
                          ...newRessource,
                          disponibilite: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <input
                      type="number"
                      placeholder="TJM (€)"
                      min="0"
                      step="0.01"
                      value={newRessource.tjm}
                      onChange={(e) =>
                        setNewRessource({
                          ...newRessource,
                          tjm: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleAddRessource}
                    >
                      Ajouter
                    </button>
                  </div>
                  {sprintFormData.ressources.length > 0 && (
                    <div style={{ marginTop: "16px" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "14px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              backgroundColor: "#f3f4f6",
                              borderBottom: "2px solid #d1d5db",
                            }}
                          >
                            <th style={{ padding: "8px", textAlign: "left" }}>
                              Nom
                            </th>
                            <th style={{ padding: "8px", textAlign: "left" }}>
                              Type
                            </th>
                            <th style={{ padding: "8px", textAlign: "left" }}>
                              Disponibilité (H/J)
                            </th>
                            <th style={{ padding: "8px", textAlign: "left" }}>
                              TJM (€)
                            </th>
                            <th style={{ padding: "8px", textAlign: "left" }}>
                              Coût
                            </th>
                            <th style={{ padding: "8px", textAlign: "left" }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(sprintFormData.ressources) &&
                            sprintFormData.ressources.map(
                              (ressource, index) => {
                                const cout =
                                  ressource.disponibilite * ressource.tjm;
                                return (
                                  <tr
                                    key={index}
                                    style={{
                                      borderBottom: "1px solid #e5e7eb",
                                    }}
                                  >
                                    <td style={{ padding: "8px" }}>
                                      {ressource.nom}
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                      {ressource.type}
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                      {ressource.disponibilite}
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                      {ressource.tjm.toFixed(2)}
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                      {cout.toFixed(2)} €
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                      <button
                                        type="button"
                                        className="btn-danger"
                                        onClick={() =>
                                          handleRemoveRessource(index)
                                        }
                                        style={{
                                          padding: "4px 8px",
                                          fontSize: "12px",
                                        }}
                                      >
                                        Supprimer
                                      </button>
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                        </tbody>
                      </table>
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "8px",
                          backgroundColor: "#eff6ff",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        Coût total des ressources:{" "}
                        {(Array.isArray(sprintFormData.ressources)
                          ? sprintFormData.ressources
                          : []
                        )
                          .reduce(
                            (total, r) => total + r.disponibilite * r.tjm,
                            0,
                          )
                          .toFixed(2)}{" "}
                        €
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    name="respectPlanning"
                    checked={sprintFormData.respectPlanning}
                    onChange={handleSprintInputChange}
                  />
                  Respect du planning
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingSprint ? "Mettre à jour" : "Créer"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancelSprint}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDeleteSprint}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "400px" }}
          >
            <div className="modal-header">
              <h3>Confirmer la suppression</h3>
            </div>
            <div style={{ padding: "24px" }}>
              <p>
                Êtes-vous sûr de vouloir supprimer le sprint "
                {sprintToDelete?.nom}" ?
              </p>
              <p style={{ color: "#ef4444", fontSize: "14px" }}>
                Cette action est irréversible.
              </p>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteSprint}
              >
                Supprimer
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDeleteSprint}
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

export default PlanningProjet;
