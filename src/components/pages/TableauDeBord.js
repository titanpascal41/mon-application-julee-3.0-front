import { useState, useEffect, useCallback } from "react";
import "./PageStyles.css";
import "./TableauDeBord.css";
import { chargerDemandes } from "../../data/gestionDemandes";
import RoadmapDashboard from "../RoadmapDashboard";
import { useAuth } from "../AuthProvider";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";


const CardChart = ({ title, icon, children }) => (
  <div className="tdb-card" style={{ marginBottom: "0" }}>
    <div className="tdb-card-header" style={{ marginBottom: "16px" }}>
      <i className={`fa-solid ${icon}`} style={{ color: "#4A90E2" }}></i>
      <h3 style={{ fontSize: "14px" }}>{title}</h3>
    </div>
    {children}
  </div>
);

const TableauDeBord = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voirTousRetards, setVoirTousRetards] = useState(false);
  const [retardsLus, setRetardsLus] = useState(() => {
    try {
      const saved = localStorage.getItem("julee_retards_lus");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const marquerRetard = (id, vu) => {
    setRetardsLus(prev => {
      const s = new Set(prev);
      vu ? s.add(id) : s.delete(id);
      localStorage.setItem("julee_retards_lus", JSON.stringify([...s]));
      return s;
    });
  };

  const chargerDonnees = useCallback(async () => {
    setLoading(true);
    try {
      const dem = await chargerDemandes();
      setDemandes(dem || []);
      // Nettoyer retardsLus : supprimer les demandes désormais livrées
      const livreesIds = new Set((dem || []).filter(d => d.isDraft === false).map(d => d.id));
      setRetardsLus(prev => {
        const filtered = new Set([...prev].filter(id => !livreesIds.has(id)));
        localStorage.setItem("julee_retards_lus", JSON.stringify([...filtered]));
        return filtered;
      });
    } catch (err) {
      console.error("Erreur chargement tableau de bord:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { chargerDonnees(); }, [chargerDonnees]);

  // ── KPI ──────────────────────────────────────────────────────────
  const demandesEnCours  = demandes.filter(d => d.isDraft !== false);
  const demandesTerminees = demandes.filter(d => d.isDraft === false);
  const demandesSuspendues = demandesEnCours.filter(d =>
    (d.statut?.nom || d.statutDemande || "").toUpperCase() === "SUSPENDU"
  );

  // Calcul basé sur nombreSprint (total réel) + sprintsData (statuts réels)
  const getSprints = (d) => {
    const nb = parseInt(d.nombreSprint) || 0;
    let data = [];
    try { data = typeof d.sprintsData === "string" ? JSON.parse(d.sprintsData) : (d.sprintsData || []); } catch {}
    return Array.from({ length: nb }, (_, i) => data[i] || { statutSprint: "en attente" });
  };

  const totalSprints = demandesEnCours.reduce((acc, d) => acc + (parseInt(d.nombreSprint) || 0), 0);

  // ── Données graphiques ────────────────────────────────────────────

  // 1. Répartition par type
  const TYPE_COLORS = {
    "Nouvelle demande": "#4A90E2",
    "Evolution":        "#10B981",
    "Prospecte":        "#FF6B35",
  };
  const normalizeType = (t) => {
    const s = (t || "").toLowerCase().trim();
    if (s === "evolution") return "Evolution";
    if (s === "prospecte") return "Prospecte";
    if (!s || s === "brouillon") return null; // ignorer
    return "Nouvelle demande"; // agile, classique, tout le reste
  };
  const typeMap = {};
  demandes.forEach(d => {
    const key = normalizeType(d.typeProjet);
    if (!key) return;
    typeMap[key] = (typeMap[key] || 0) + 1;
  });
  const dataType = Object.entries(typeMap).map(([name, value]) => ({
    name,
    value,
    color: TYPE_COLORS[name] || "#6B7280",
  }));

  // 2. Demandes par société (top 6)
  const socMap = {};
  demandes.forEach(d => {
    const s = d.societe?.code || d.societesDemandeurs || "Autre";
    socMap[s] = (socMap[s] || 0) + 1;
  });
  const dataSociete = Object.entries(socMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, total]) => ({ name, total }));

  // 3. Statut des sprints (basé sur nombreSprint + sprintsData)
  const sprintStatMap = { "en attente": 0, "en cours": 0, "terminé": 0 };
  demandesEnCours.forEach(d => {
    getSprints(d).forEach(sp => {
      const k = sp.statutSprint || "en attente";
      sprintStatMap[k] = (sprintStatMap[k] || 0) + 1;
    });
  });
  const dataSprints = [
    { name: "En attente", value: sprintStatMap["en attente"], color: "#94A3B8" },
    { name: "En cours",   value: sprintStatMap["en cours"],   color: "#F97316" },
    { name: "Terminé",    value: sprintStatMap["terminé"],    color: "#10B981" },
  ].filter(d => d.value > 0);

  // 4. Évolution mensuelle des demandes créées
  const moisMap = {};
  demandes.forEach(d => {
    const date = new Date(d.dateEnregistrement || d.dateCreation);
    if (isNaN(date)) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    moisMap[key] = (moisMap[key] || 0) + 1;
  });
  const dataMensuel = Object.entries(moisMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([mois, total]) => ({
      name: new Date(mois + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      total,
    }));

  // 5. Taux livraison
  const dataLivraison = [
    { name: "En cours",   value: demandesEnCours.length - demandesSuspendues.length, color: "#4A90E2" },
    { name: "Terminées",  value: demandesTerminees.length,  color: "#10B981" },
    { name: "Suspendues", value: demandesSuspendues.length, color: "#F87171" },
  ].filter(d => d.value > 0);

  // 6. Demandes en retard + projets à risque
  const now = new Date();
  const projetsEnRetard = demandesEnCours.filter(d => {
    // Retard livraison client globale
    if (d.dateCommunicationPlanningClient && d.statutLivraisonClient !== "livré au client") {
      if (new Date(d.dateCommunicationPlanningClient) < now) return true;
    }
    // Retard sur un sprint (date TIF ou client dépassée sans effective)
    if (d.sprintsData) {
      try {
        const sprints = typeof d.sprintsData === "string" ? JSON.parse(d.sprintsData) : d.sprintsData;
        if (Array.isArray(sprints)) {
          return sprints.some(s =>
            s.statutSprint !== "terminé" && (
              (s.datePrevTIF    && !s.dateEffTIF    && new Date(s.datePrevTIF)    < now) ||
              (s.datePrevClient && !s.dateEffClient && new Date(s.datePrevClient) < now)
            )
          );
        }
      } catch {}
    }
    return false;
  });

  // Calcul du nombre de jours de retard par projet (pour le tri)
  const getJoursRetard = (d) => {
    let maxRetard = 0;
    if (d.dateCommunicationPlanningClient && d.statutLivraisonClient !== "livré au client") {
      const j = Math.floor((now - new Date(d.dateCommunicationPlanningClient)) / 86400000);
      if (j > maxRetard) maxRetard = j;
    }
    if (d.sprintsData) {
      try {
        const sprints = typeof d.sprintsData === "string" ? JSON.parse(d.sprintsData) : d.sprintsData;
        if (Array.isArray(sprints)) {
          sprints.forEach(s => {
            if (s.statutSprint === "terminé") return;
            if (s.datePrevTIF && !s.dateEffTIF) {
              const j = Math.floor((now - new Date(s.datePrevTIF)) / 86400000);
              if (j > maxRetard) maxRetard = j;
            }
            if (s.datePrevClient && !s.dateEffClient) {
              const j = Math.floor((now - new Date(s.datePrevClient)) / 86400000);
              if (j > maxRetard) maxRetard = j;
            }
          });
        }
      } catch {}
    }
    return maxRetard;
  };

  const getRaisonsRetard = (d) => {
    const raisons = [];
    if (d.dateCommunicationPlanningClient && d.statutLivraisonClient !== "livré au client") {
      const j = Math.floor((now - new Date(d.dateCommunicationPlanningClient)) / 86400000);
      if (j > 0) raisons.push({ label: `Livraison client dépassée de ${j}j`, type: "client" });
    }
    if (d.sprintsData) {
      try {
        const sprints = typeof d.sprintsData === "string" ? JSON.parse(d.sprintsData) : d.sprintsData;
        if (Array.isArray(sprints)) {
          sprints.forEach((s, i) => {
            if (s.statutSprint === "terminé") return;
            if (s.datePrevTIF && !s.dateEffTIF) {
              const j = Math.floor((now - new Date(s.datePrevTIF)) / 86400000);
              if (j > 0) raisons.push({ label: `Sprint ${i + 1} — Date TIF dépassée de ${j}j`, type: "tif" });
            }
            if (s.datePrevClient && !s.dateEffClient) {
              const j = Math.floor((now - new Date(s.datePrevClient)) / 86400000);
              if (j > 0) raisons.push({ label: `Sprint ${i + 1} — Livraison client dépassée de ${j}j`, type: "client" });
            }
          });
        }
      } catch {}
    }
    return raisons;
  };

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
        <p>Bienvenue {user?.prenom} {user?.nom}</p>
      </div>

      {/* KPI Cards */}
      <div className="tdb-kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: "24px" }}>
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
        <div className="tdb-kpi-card tdb-kpi-red">
          <div className="tdb-kpi-icon"><i className="fa-solid fa-triangle-exclamation"></i></div>
          <div className="tdb-kpi-content">
            <div className="tdb-kpi-value">{projetsEnRetard.length}</div>
            <div className="tdb-kpi-label">En retard</div>
          </div>
        </div>
      </div>

      {/* Ligne 1 graphiques : Donut type + Barres sociétés */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", marginBottom: "20px" }}>

        <CardChart title="Répartition par type de projet" icon="fa-chart-pie">
          {dataType.length === 0 ? <p className="tdb-empty">Aucune donnée</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataType} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {dataType.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardChart>

        <CardChart title="Demandes par société" icon="fa-building">
          {dataSociete.length === 0 ? <p className="tdb-empty">Aucune donnée</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataSociete} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="total" name="Demandes" radius={[0, 4, 4, 0]}>
                  {dataSociete.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? "#4A90E2" : "#7BB3F0"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardChart>
      </div>

      {/* Ligne 2 graphiques : Sprints + Courbe mensuelle + Taux livraison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "20px", marginBottom: "24px" }}>

        <CardChart title="Statut des sprints" icon="fa-layer-group">
          {dataSprints.length === 0 ? <p className="tdb-empty">Aucun sprint</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataSprints} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {dataSprints.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardChart>

        <CardChart title="Évolution mensuelle des demandes" icon="fa-chart-line">
          {dataMensuel.length === 0 ? <p className="tdb-empty">Aucune donnée</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dataMensuel} margin={{ left: 0, right: 20, top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" name="Demandes" stroke="#4A90E2" strokeWidth={2} dot={{ r: 4, fill: "#4A90E2" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardChart>

        <CardChart title="Taux de livraison" icon="fa-truck-fast">
          {dataLivraison.length === 0 ? <p className="tdb-empty">Aucune donnée</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={dataLivraison} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {dataLivraison.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardChart>
      </div>

      {/* Projets à risque */}
      <div className="tdb-card" style={{ marginBottom: "24px" }}>
        <div className="tdb-card-header" style={{ marginBottom: "4px" }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: "#F87171" }}></i>
          <h3>Projets à risque</h3>
          {projetsEnRetard.length > 0 && (
            <span style={{ marginLeft: "auto", background: "#FEE2E2", color: "#F87171", borderRadius: "12px", padding: "2px 10px", fontSize: "12px", fontWeight: "600" }}>
              {projetsEnRetard.length} en retard
            </span>
          )}
        </div>
        <p style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "14px", marginTop: "2px" }}>
          Projets dont une date planifiée est dépassée sans réalisation effective
        </p>
        {projetsEnRetard.length === 0 ? (
          <p className="tdb-empty">Aucun projet en retard</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {projetsEnRetard
              .sort((a, b) => {
                // Non lus d'abord, puis triés par jours de retard
                const aLu = retardsLus.has(a.id);
                const bLu = retardsLus.has(b.id);
                if (aLu !== bLu) return aLu ? 1 : -1;
                return getJoursRetard(b) - getJoursRetard(a);
              })
              .slice(0, voirTousRetards ? projetsEnRetard.length : 3)
              .map(d => {
                const jours = getJoursRetard(d);
                const raisons = getRaisonsRetard(d);
                const lu = retardsLus.has(d.id);
                return (
                  <div key={d.id} style={{
                    padding: "12px 14px", borderRadius: "8px", border: `1px solid ${lu ? "#E5E7EB" : "#FECACA"}`,
                    background: lu ? "#F9FAFB" : "#FEF2F2",
                    opacity: lu ? 0.65 : 1,
                    transition: "all 0.3s ease",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <i className={`fa-solid ${lu ? "fa-circle-check" : "fa-circle-exclamation"}`}
                        style={{ color: lu ? "#10B981" : "#F87171", flexShrink: 0 }}></i>
                      <div
                        style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                        onClick={() => navigate("/demandes-gestion", { state: { openDemandeId: d.id, highlightRetards: true } })}
                      >
                        <div style={{ fontWeight: "600", fontSize: "13px", color: lu ? "#6B7280" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.nomProjet || `Demande #${d.id}`}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>
                          {d.societe?.code || d.societesDemandeurs || "—"} · Étape {d.draftStepLabel || d.draftStep}
                          {lu && <span style={{ marginLeft: "8px", color: "#10B981", fontWeight: "600" }}>· Vu</span>}
                        </div>
                      </div>
                      <span style={{
                        background: lu ? "#E5E7EB" : "#F87171",
                        color: lu ? "#9CA3AF" : "white",
                        borderRadius: "8px", padding: "3px 10px", fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", flexShrink: 0
                      }}>
                        +{jours}j
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); marquerRetard(d.id, !lu); }}
                        title={lu ? "Marquer comme non lu" : "Marquer comme vu"}
                        style={{
                          background: lu ? "#F3F4F6" : "#10B981",
                          border: `1px solid ${lu ? "#D1D5DB" : "#10B981"}`,
                          borderRadius: "6px", color: lu ? "#6B7280" : "white",
                          fontSize: "11px", fontWeight: "700", padding: "4px 10px",
                          cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap"
                        }}
                      >
                        {lu ? "Annuler" : "OK"}
                      </button>
                    </div>
                    {!lu && raisons.length > 0 && (
                      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "3px", paddingLeft: "26px" }}>
                        {raisons.map((r, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#B91C1C" }}>
                            <i className={`fa-solid ${r.type === "tif" ? "fa-flask" : "fa-truck-fast"}`} style={{ fontSize: "10px", flexShrink: 0 }}></i>
                            {r.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            {projetsEnRetard.length > 3 && (
              <button
                onClick={() => setVoirTousRetards(!voirTousRetards)}
                style={{ marginTop: "8px", background: "none", border: "none", color: "#4A90E2", fontSize: "13px", fontWeight: "600", cursor: "pointer", padding: "4px 0" }}
              >
                {voirTousRetards
                  ? "Voir moins ▲"
                  : `Voir les ${projetsEnRetard.length - 3} autres ▼`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Roadmap — Vue Gantt */}
      {(() => {
        const projets = demandes
          .filter(d => {
            if (!d.sprintsData) return false;
            try {
              const s = typeof d.sprintsData === "string" ? JSON.parse(d.sprintsData) : d.sprintsData;
              return Array.isArray(s) && s.some(sp => sp.datePrevTIF || sp.datePrevClient);
            } catch { return false; }
          })
          .map(d => {
            try {
              const s = typeof d.sprintsData === "string" ? JSON.parse(d.sprintsData) : d.sprintsData;
              return { id: d.id, nom: d.nomProjet || `Demande #${d.id}`, sprints: s.map((sp, i) => ({ ...sp, num: i + 1 })) };
            } catch { return null; }
          })
          .filter(Boolean);

        if (projets.length === 0) return null;

        return (
          <div className="tdb-card" style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <i className="fa-solid fa-chart-gantt" style={{ color: "#4A90E2" }}></i>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Roadmap — Vue Gantt</h3>
            </div>
            <RoadmapDashboard projets={projets} />
          </div>
        );
      })()}

      {/* Actions rapides */}
      <div className="tdb-quick-actions">
        <button className="btn-primary" onClick={() => navigate("/demandes-gestion")} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <i className="fa-solid fa-plus"></i> Nouvelle demande
        </button>
        <button className="btn-secondary" onClick={chargerDonnees} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <i className="fa-solid fa-rotate-right"></i> Actualiser
        </button>
      </div>
    </div>
  );
};

export default TableauDeBord;
