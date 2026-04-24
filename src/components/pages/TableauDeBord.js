import { useState, useEffect, useCallback } from "react";
import "./PageStyles.css";
import "./TableauDeBord.css";
import { chargerDemandes } from "../../data/gestionDemandes";
import { useAuth } from "../AuthProvider";
import { useNavigate } from "react-router-dom";


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
  const demandesEnCours = demandes.filter(d => d.isDraft !== false);
  const demandesTerminees = demandes.filter(d => d.isDraft === false);

  const totalSprints = demandesEnCours.reduce((acc, d) => {
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

  // --- Sprints en cours (uniquement sur les demandes en cours) ---
  const sprintsEnCours = demandesEnCours
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
            <div className="tdb-kpi-value">{demandes.length}</div>
            <div className="tdb-kpi-label">Total demandes</div>
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
            <div className="tdb-kpi-value">{demandesTerminees.length}</div>
            <div className="tdb-kpi-label">Terminées</div>
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

      {/* Sprints en cours */}
      <div className="tdb-card tdb-sprints" style={{ marginBottom: "24px" }}>
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
