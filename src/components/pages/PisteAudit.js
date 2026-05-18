import { useState, useEffect } from "react";
import "./PageStyles.css";
import { apiFetch } from "../../utils/apiFetch";
import { usePermissions } from "../PermissionGuard";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const ACTION_STYLE = {
  CREATION:     { bg: "#D1FAE5", color: "#065F46", label: "Création" },
  MODIFICATION: { bg: "#DBEAFE", color: "#1E40AF", label: "Modification" },
  SUPPRESSION:  { bg: "#FEE2E2", color: "#991B1B", label: "Suppression" },
  DESACTIVATION:{ bg: "#FEF3C7", color: "#92400E", label: "Désactivation" },
  REACTIVATION: { bg: "#D1FAE5", color: "#065F46", label: "Réactivation" },
  CLOTURE:      { bg: "#EDE9FE", color: "#5B21B6", label: "Clôture" },
};

const ENTITE_ICON = {
  "Demande":                  "fa-solid fa-file-circle-plus",
  "Société":                  "fa-solid fa-building",
  "Unité Organisationnelle":  "fa-solid fa-sitemap",
  "Statut":                   "fa-solid fa-tags",
  "Interlocuteur":            "fa-solid fa-user-tie",
  "Profil":                   "fa-solid fa-id-card",
  "Utilisateur":              "fa-solid fa-user-shield",
};

const PisteAudit = () => {
  const { hasPermission } = usePermissions();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filtreEntite, setFiltreEntite] = useState("");
  const [filtreAction, setFiltreAction] = useState("");
  const [filtreDateDebut, setFiltreDateDebut] = useState("");
  const [filtreDateFin, setFiltreDateFin] = useState("");
  const [pageAudit, setPageAudit] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const charger = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(`/audit`);
        if (!response.ok) throw new Error("Erreur chargement");
        const data = await response.json();
        setLogs(data);
      } catch (err) {
        console.error("Erreur chargement piste d'audit:", err);
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, []);

  const entitesUniques = [...new Set(logs.map((l) => l.entite))].sort();

  const logsFiltres = logs.filter((l) => {
    if (filtreEntite && l.entite !== filtreEntite) return false;
    if (filtreAction && l.action !== filtreAction) return false;
    if (filtreDateDebut && new Date(l.date) < new Date(filtreDateDebut)) return false;
    if (filtreDateFin && new Date(l.date) > new Date(filtreDateFin + "T23:59:59")) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(logsFiltres.length / ITEMS_PER_PAGE));
  useEffect(() => {
    if (pageAudit > totalPages) setPageAudit(totalPages);
  }, [logsFiltres.length, pageAudit, totalPages]);
  const logsPage = logsFiltres.slice((pageAudit - 1) * ITEMS_PER_PAGE, pageAudit * ITEMS_PER_PAGE);

  const handleFiltreEntite = (val) => { setFiltreEntite(val); setPageAudit(1); };
  const handleFiltreAction = (val) => { setFiltreAction(val); setPageAudit(1); };
  const handleResetFiltres = () => { setFiltreEntite(""); setFiltreAction(""); setFiltreDateDebut(""); setFiltreDateFin(""); setPageAudit(1); };

  if (!hasPermission("audit", null)) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Piste d'Audit</h1>
        </div>
        <div style={{ padding: "40px", textAlign: "center", color: "#9CA3AF" }}>
          <i className="fa-solid fa-lock" style={{ fontSize: "36px", marginBottom: "12px", display: "block" }}></i>
          Vous n'avez pas la permission d'accéder à la piste d'audit.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Piste d'Audit</h1>
          <p className="page-subtitle">Historique de toutes les actions effectuées dans l'application</p>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <select
          value={filtreEntite}
          onChange={(e) => handleFiltreEntite(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: "8px", border: "1px solid #D1D5DB",
            fontSize: "14px", color: "#374151", backgroundColor: "#fff", cursor: "pointer",
          }}
        >
          <option value="">Tous les modules</option>
          {entitesUniques.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <select
          value={filtreAction}
          onChange={(e) => handleFiltreAction(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: "8px", border: "1px solid #D1D5DB",
            fontSize: "14px", color: "#374151", backgroundColor: "#fff", cursor: "pointer",
          }}
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_STYLE).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        <input
          type="date"
          value={filtreDateDebut}
          onChange={(e) => { setFiltreDateDebut(e.target.value); setPageAudit(1); }}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", color: "#374151", backgroundColor: "#fff", cursor: "pointer" }}
          title="Date début"
        />
        <input
          type="date"
          value={filtreDateFin}
          onChange={(e) => { setFiltreDateFin(e.target.value); setPageAudit(1); }}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "13px", color: "#374151", backgroundColor: "#fff", cursor: "pointer" }}
          title="Date fin"
        />

        {(filtreEntite || filtreAction || filtreDateDebut || filtreDateFin) && (
          <button
            onClick={handleResetFiltres}
            style={{
              padding: "8px 14px", borderRadius: "8px", border: "1px solid #D1D5DB",
              fontSize: "13px", color: "#6B7280", backgroundColor: "#F9FAFB", cursor: "pointer",
            }}
          >
            Réinitialiser
          </button>
        )}

      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6B7280" }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "32px", color: "#4A90E2" }}></i>
          </div>
        ) : logsFiltres.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF", fontSize: "15px" }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: "40px", marginBottom: "16px", display: "block", color: "#D1D5DB" }}></i>
            Aucun événement enregistré.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date &amp; Heure</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Élément</th>
                  <th>Effectué par</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {logsPage.map((log) => {
                  const actionStyle = ACTION_STYLE[log.action] || { bg: "#F3F4F6", color: "#374151", label: log.action };
                  const icon = ENTITE_ICON[log.entite] || "fa-solid fa-circle-dot";
                  return (
                    <tr key={log.id}>
                      <td style={{ color: "#6B7280", fontSize: "13px", whiteSpace: "nowrap" }}>
                        {formatDate(log.date)}
                      </td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151", fontWeight: "500" }}>
                          <i className={icon} style={{ color: "#4A90E2", fontSize: "14px", flexShrink: 0 }}></i>
                          {log.entite}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          backgroundColor: actionStyle.bg,
                          color: actionStyle.color,
                        }}>
                          {actionStyle.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: "500", color: "#111827", fontSize: "14px" }}>
                        {log.entiteNom || <span style={{ color: "#9CA3AF" }}>—</span>}
                      </td>
                      <td style={{ fontSize: "13px", color: "#374151" }}>
                        {log.utilisateurNom || <span style={{ color: "#9CA3AF" }}>—</span>}
                      </td>
                      <td>
                        {log.details ? (
                          <button
                            className="btn-secondary"
                            style={{ padding: "4px 12px", fontSize: "12px" }}
                            onClick={() => setSelectedLog(log)}
                          >
                            Voir
                          </button>
                        ) : (
                          <span style={{ color: "#D1D5DB", fontSize: "13px" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "16px" }}>
                {[
                  { label: "«", action: () => setPageAudit(1), disabled: pageAudit === 1 },
                  { label: "‹", action: () => setPageAudit(p => p - 1), disabled: pageAudit === 1 },
                  { label: "›", action: () => setPageAudit(p => p + 1), disabled: pageAudit === totalPages },
                  { label: "»", action: () => setPageAudit(totalPages), disabled: pageAudit === totalPages },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.action} disabled={btn.disabled} style={{
                    padding: "5px 10px", borderRadius: "6px", border: "1px solid #D1D5DB",
                    backgroundColor: btn.disabled ? "#F3F4F6" : "#fff",
                    color: btn.disabled ? "#9CA3AF" : "#374151",
                    cursor: btn.disabled ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "500",
                  }}>{btn.label}</button>
                ))}
                <span style={{ fontSize: "13px", color: "#6B7280", padding: "0 8px" }}>
                  Page {pageAudit} / {totalPages}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal détails */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "500px", width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>
                Détails — {ACTION_STYLE[selectedLog.action]?.label || selectedLog.action} de {selectedLog.entite}
              </h3>
            </div>
            <div style={{ padding: "24px 32px" }}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Élément</div>
                  <div style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>{selectedLog.entiteNom || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Date</div>
                  <div style={{ fontSize: "14px", color: "#111827" }}>{formatDate(selectedLog.date)}</div>
                </div>
                {selectedLog.utilisateurNom && (
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Effectué par</div>
                    <div style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>{selectedLog.utilisateurNom}</div>
                  </div>
                )}
                {selectedLog.details && (
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Informations</div>
                    <div style={{ backgroundColor: "#F9FAFB", borderRadius: "8px", padding: "12px 16px", border: "1px solid #E5E7EB" }}>
                      {Object.entries(selectedLog.details).map(([key, val]) => (
                        <div key={key} style={{ display: "flex", gap: "12px", marginBottom: "6px", fontSize: "13px" }}>
                          <span style={{ fontWeight: "600", color: "#6B7280", minWidth: "80px" }}>{key} :</span>
                          <span style={{ color: "#111827" }}>{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 32px 24px", borderTop: "1px solid #e5e7eb" }}>
              <button className="btn-secondary" onClick={() => setSelectedLog(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PisteAudit;
