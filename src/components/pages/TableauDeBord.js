import { useState, useEffect, useCallback } from "react";
import "./PageStyles.css";
import "./TableauDeBord.css";
import { chargerDemandes } from "../../data/gestionDemandes";
import { useAuth } from "../AuthProvider";
import { useNavigate } from "react-router-dom";

const TYPE_COLORS = {
  Evolution: "#3B82F6",
  Correction: "#EF4444",
  Prospecte: "#8B5CF6",
  Maintenance: "#F97316",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

const getStatutColor = (nomStatut) => {
  if (!nomStatut) return { bg: "#F3F4F6", color: "#6B7280" };
  const n = nomStatut.toLowerCase();
  if (n.includes("livr")) return { bg: "#D1FAE5", color: "#065F46" };
  if (n.includes("cours") || n.includes("actif")) return { bg: "#DBEAFE", color: "#1E40AF" };
  if (n.includes("suspen")) return { bg: "#FEF3C7", color: "#92400E" };
  if (n.includes("annul")) return { bg: "#FEE2E2", color: "#991B1B" };
  if (n.includes("termin")) return { bg: "#D1FAE5", color: "#065F46" };
  if (n.includes("attente") || n.includes("nouveau")) return { bg: "#FEF3C7", color: "#92400E" };
  return { bg: "#EDE9FE", color: "#4C1D95" };
};

const TableauDeBord = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);

  const chargerDonnees = useCallback(async () => {
    setLoading(true);
    try {
      const dem = await chargerDemandes();
      setDemandes(dem || []);
    } catch (err) {
      console.error("Erreur chargement tableau de bord:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  // --- Calculs KPI ---
  const demandesActives = demandes; // toutes les demandes (pas de distinction brouillon)
  const demandesLivrees = demandesActives.filter(
    (d) =>
      d.statutLivraisonClient === "livré au client" ||
      (d.statut?.nom || "").toLowerCase().includes("livr")
  );
  const demandesEnCours = demandesActives.filter((d) => {
    const s = (d.statut?.nom || "").toLowerCase();
    return (
      d.statutLivraisonClient !== "livré au client" &&
      !s.includes("livr") &&
      !s.includes("annul") &&
      !s.includes("suspen") &&
      !s.includes("non démarr") &&
      !s.startsWith("nd")
    );
  });

  const totalSprints = demandesActives.reduce((acc, d) => {
    if (d.sprintsData) {
      try {
        const sprints = typeof d.sprintsData === "string"
          ? JSON.parse(d.sprintsData)
          : d.sprintsData;
        return acc + (Array.isArray(sprints) ? sprints.length : 0);
      } catch {
        return acc;
      }
    }
    return acc;
  }, 0);

  // --- Demandes récentes (5 dernières, brouillons inclus) ---
  const demandesRecentes = [...demandes]
    .sort((a, b) => new Date(b.dateCreation || b.dateEnregistrement || 0) - new Date(a.dateCreation || a.dateEnregistrement || 0))
    .slice(0, 5);

  // --- Sprints en cours ---
  const sprintsEnCours = demandesActives
    .filter((d) => d.sprintsData)
    .map((d) => {
      let sprints = [];
      try {
        sprints = typeof d.sprintsData === "string"
          ? JSON.parse(d.sprintsData)
          : d.sprintsData;
      } catch {}
      const sprintActif = Array.isArray(sprints)
        ? sprints.find((s) => s.statutSprint === "en cours")
        : null;
      return sprintActif ? { demande: d, sprint: sprintActif, totalSprints: sprints.length } : null;
    })
    .filter(Boolean)
    .slice(0, 4);

  if (loading) {
    return (
      <div className="page-container">
        <div className="tdb-loading">
          <div className="tdb-spinner"></div>
          <p>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* En-tête */}
      <div className="page-header" style={{ marginBottom: "28px" }}>
        <h1>Tableau de Bord</h1>
        <p>
          Bienvenue {user?.prenom} {user?.nom} 
        </p>
      </div>

      {/* KPI Cards — 4 cartes */}
      <div className="tdb-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="tdb-kpi-card tdb-kpi-blue">
          <div className="tdb-kpi-icon"><i className="fa-solid fa-clipboard-list"></i></div>
          <div className="tdb-kpi-content">
            <div className="tdb-kpi-value">{demandesActives.length}</div>
            <div className="tdb-kpi-label">Demandes actives</div>
          </div>
        </div>
        <div className="tdb-kpi-card tdb-kpi-orange">
          <div className="tdb-kpi-icon"><i className="fa-solid fa-spinner"></i></div>
          <div className="tdb-kpi-content">
            <div className="tdb-kpi-value">{demandesEnCours.length}</div>
            <div className="tdb-kpi-label">En cours</div>
          </div>
        </div>
        <div className="tdb-kpi-card tdb-kpi-green">
          <div className="tdb-kpi-icon"><i className="fa-solid fa-circle-check"></i></div>
          <div className="tdb-kpi-content">
            <div className="tdb-kpi-value">{demandesLivrees.length}</div>
            <div className="tdb-kpi-label">Livrées</div>
          </div>
        </div>
        <div className="tdb-kpi-card tdb-kpi-cyan">
          <div className="tdb-kpi-icon"><i className="fa-solid fa-code-branch"></i></div>
          <div className="tdb-kpi-content">
            <div className="tdb-kpi-value">{totalSprints}</div>
            <div className="tdb-kpi-label">Sprints total</div>
          </div>
        </div>
      </div>

      {/* Ligne : Demandes récentes + Sprints en cours */}
      <div className="tdb-row-3">
        {/* Demandes récentes */}
        <div className="tdb-card tdb-recentes">
          <div className="tdb-card-header">
            <i className="fa-solid fa-clock-rotate-left" style={{ color: "#3B82F6" }}></i>
            <h3>Demandes récentes</h3>
            <button
              className="tdb-link-btn"
              onClick={() => navigate("/demandes-gestion")}
            >
              Voir tout
            </button>
          </div>
          {demandesRecentes.length === 0 ? (
            <p className="tdb-empty">Aucune demande enregistrée</p>
          ) : (
            <table className="tdb-table">
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {demandesRecentes.map((d) => {
                  const colors = getStatutColor(d.statut?.nom);
                  return (
                    <tr key={d.id}>
                      <td className="tdb-nom-projet">
                        
                        {d.isDraft && (
                          <span
                            className="tdb-badge-sm"
                            style={{ background: "#FEF3C7", color: "#92400E", marginLeft: "6px", fontSize: "10px" }}
                          >
                            Brouillon
                          </span>
                        )}
                      </td>
                      <td>
                        {d.typeProjet ? (
                          <span
                            className="tdb-badge-sm"
                            style={{
                              background: `${TYPE_COLORS[d.typeProjet] || "#9CA3AF"}20`,
                              color: TYPE_COLORS[d.typeProjet] || "#6B7280",
                            }}
                          >
                            {d.typeProjet}
                          </span>
                        ) : (
                          <span style={{ color: "#9CA3AF" }}>-</span>
                        )}
                      </td>
                      <td>
                        {d.isDraft ? (
                          <span
                            className="tdb-badge-sm"
                            style={{ background: "#FEF3C7", color: "#92400E" }}
                          >
                            {d.draftStepLabel || "Brouillon"}
                          </span>
                        ) : d.statut ? (
                          <span
                            className="tdb-badge-sm"
                            style={{ background: colors.bg, color: colors.color }}
                          >
                            {d.statut.nom}
                          </span>
                        ) : (
                          <span style={{ color: "#9CA3AF" }}>-</span>
                        )}
                      </td>
                      <td className="tdb-date">{formatDate(d.dateEnregistrement || d.dateCreation)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Sprints en cours */}
        <div className="tdb-card tdb-sprints">
          <div className="tdb-card-header">
            <i className="fa-solid fa-gauge-high" style={{ color: "#F97316" }}></i>
            <h3>Sprints en cours</h3>
          </div>
          {sprintsEnCours.length === 0 ? (
            <p className="tdb-empty">Aucun sprint actif en ce moment</p>
          ) : (
            <div className="tdb-sprints-list">
              {sprintsEnCours.map(({ demande, sprint, totalSprints: total }) => {
                const avancement = parseInt(sprint.avancement) || 0;
                return (
                  <div key={demande.id} className="tdb-sprint-item">
                    <div className="tdb-sprint-header">
                      <span className="tdb-sprint-projet">{demande.nomProjet || `Demande #${demande.id}`}</span>
                      <span className="tdb-sprint-pct">{avancement}%</span>
                    </div>
                    <div className="tdb-sprint-meta">
                      {sprint.chantier && (
                        <span className="tdb-sprint-chantier">
                          <i className="fa-solid fa-hammer" style={{ fontSize: "11px", marginRight: "4px" }}></i>
                          {sprint.chantier}
                        </span>
                      )}
                      <span className="tdb-sprint-total">{total} sprint{total > 1 ? "s" : ""}</span>
                    </div>
                    <div className="tdb-progress-track">
                      <div
                        className="tdb-progress-fill"
                        style={{ width: `${avancement}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bouton accès rapide */}
      <div className="tdb-quick-actions">
        <button
          className="btn-primary"
          onClick={() => navigate("/demandes-gestion")}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <i className="fa-solid fa-plus"></i>
          Nouvelle demande
        </button>
        <button
          className="btn-secondary"
          onClick={chargerDonnees}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <i className="fa-solid fa-rotate-right"></i>
          Actualiser
        </button>
      </div>
    </div>
  );
};

export default TableauDeBord;
