import React, { useState } from "react";
import GanttChart from "./GanttChart";

const MONTH_NAMES = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];

const genColonnes = (mode, start, end) => {
  const cols = [];
  const cur = new Date(start);
  if (mode === "mois") {
    while (cur < end) {
      cols.push({ label: MONTH_NAMES[cur.getMonth()], sub: cur.getFullYear(), ts: cur.getTime() });
      cur.setMonth(cur.getMonth() + 1);
    }
  } else if (mode === "semaine") {
    const j = cur.getDay();
    cur.setDate(cur.getDate() - (j === 0 ? 6 : j - 1));
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
  const map = {}; const ordre = [];
  cols.forEach(c => {
    const d = new Date(c.ts);
    let key;
    if (mode === "mois") key = String(d.getFullYear());
    else if (mode === "semaine") key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    else { const lun = new Date(d); const j = lun.getDay(); lun.setDate(lun.getDate() - (j===0?6:j-1)); key = `Sem. ${lun.getDate()}/${lun.getMonth()+1}`; }
    if (!map[key]) { map[key] = 0; ordre.push(key); }
    map[key]++;
  });
  return ordre.map(k => ({ label: k, count: map[k] }));
};

const RoadmapDashboard = ({ projets }) => {
  const [mode, setMode] = useState("mois");
  const [projetSelectionne, setProjetSelectionne] = useState(null);

  if (projetSelectionne) {
    const projet = projets.find(p => p.id === projetSelectionne);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <button
            type="button"
            onClick={() => setProjetSelectionne(null)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 14px", borderRadius: "6px", border: "1px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            <i className="fa-solid fa-arrow-left" style={{ fontSize: "11px" }} />
            Retour
          </button>
          <span style={{ fontSize: "13px", color: "#6B7280" }}>Nom projet :</span>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>{projet?.nom}</span>
        </div>
        <GanttChart sprints={projet?.sprints || []} />
      </div>
    );
  }

  // Toutes les dates de tous les projets pour la timeline commune
  const toutesLesDates = projets.flatMap(p =>
    p.sprints.flatMap(s => [s.datePrevTIF, s.dateEffTIF, s.datePrevClient, s.dateEffClient].filter(Boolean))
  );

  if (toutesLesDates.length < 2) return (
    <div style={{ padding: "24px", background: "#f9fafb", borderRadius: "8px", color: "#9ca3af", textAlign: "center", border: "1px dashed #d1d5db" }}>
      Renseignez des dates dans les sprints pour afficher la Roadmap
    </div>
  );

  const allTs = toutesLesDates.map(d => new Date(d).getTime());
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
  const toP = d => d ? Math.max(0, Math.min(100, ((new Date(d) - timelineStart) / totalMs) * 100)) : null;

  const LABEL_W  = 180;
  const COL_W    = mode === "jour" ? 28 : mode === "semaine" ? 52 : 70;
  const gridCols = `${LABEL_W}px repeat(${cols.length}, minmax(${COL_W}px, 1fr))`;

  const cellBorder = { borderRight: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB" };

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
              background: mode === v ? "#4A90E2" : disabled ? "#F9FAFB" : "#fff",
              color: mode === v ? "#fff" : disabled ? "#D1D5DB" : "#374151",
              fontWeight: mode === v ? "600" : "400",
              fontSize: "12px", cursor: disabled ? "not-allowed" : "pointer",
            }}>{v === "jour" ? "Jour" : v === "semaine" ? "Semaine" : "Mois"}</button>
          );
        })}
      </div>

      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", overflowX: "auto" }}>
        <div style={{ minWidth: `${LABEL_W + cols.length * COL_W}px`, display: "grid", gridTemplateColumns: gridCols }}>

          {/* Ligne groupes */}
          <div style={{ background: "#F3F4F6", ...cellBorder }} />
          {groupes.map((g, i) => (
            <div key={i} style={{ gridColumn: `span ${g.count}`, background: "#F3F4F6", padding: "4px 6px", fontSize: "11px", fontWeight: "700", color: "#374151", textAlign: "center", ...cellBorder, whiteSpace: "nowrap", overflow: "hidden" }}>{g.label}</div>
          ))}

          {/* Ligne en-têtes colonnes */}
          <div style={{ background: "#F9FAFB", borderRight: "1px solid #D1D5DB", borderBottom: "2px solid #D1D5DB", padding: "4px 10px", fontSize: "11px", color: "#6B7280", fontWeight: "600" }}>Projet</div>
          {cols.map((c, i) => (
            <div key={i} style={{ background: "#F9FAFB", padding: "2px", fontSize: "10px", color: "#6B7280", textAlign: "center", borderRight: "1px solid #E5E7EB", borderBottom: "2px solid #D1D5DB", overflow: "hidden" }}>
              <div>{c.label}</div>
              {c.sub && <div style={{ fontSize: "9px", color: "#9ca3af" }}>{c.sub}</div>}
            </div>
          ))}

          {/* Lignes projets */}
          {projets.map((projet) => {
            const datesDuProjet = projet.sprints.flatMap(s =>
              [s.datePrevTIF, s.dateEffTIF, s.datePrevClient, s.dateEffClient].filter(Boolean)
            );
            const pMin = datesDuProjet.length ? toP(datesDuProjet.reduce((a,b) => new Date(a) < new Date(b) ? a : b)) : null;
            const pMax = datesDuProjet.length ? toP(datesDuProjet.reduce((a,b) => new Date(a) > new Date(b) ? a : b)) : null;

            return (
              <React.Fragment key={projet.id}>
                <div
                  onClick={() => setProjetSelectionne(projet.id)}
                  style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "#EFF6FF", borderRight: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB", fontWeight: "600", fontSize: "12px", color: "#111827" }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projet.nom}</span>
                </div>
                <div
                  onClick={() => setProjetSelectionne(projet.id)}
                  style={{ gridColumn: `span ${cols.length}`, position: "relative", height: "36px", cursor: "pointer", background: "#fff", borderBottom: "1px solid #E5E7EB" }}
                >
                  {cols.map((_, mi) => <div key={mi} style={{ position: "absolute", left: `${((mi+1)/cols.length)*100}%`, top: 0, bottom: 0, width: "1px", background: "#F3F4F6" }} />)}
                  {pMin !== null && pMax !== null && (() => {
                    const avancementMoyen = projet.sprints.length
                      ? Math.round(projet.sprints.reduce((s, sp) => s + (sp.avancement ?? 0), 0) / projet.sprints.length)
                      : 0;
                    return (
                      <div style={{ position: "absolute", left: `${pMin}%`, width: `${Math.max(1, pMax - pMin)}%`, top: "8px", bottom: "8px", background: "#DBEAFE", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ width: `${avancementMoyen}%`, height: "100%", background: "#4A90E2", display: "flex", alignItems: "center", paddingLeft: "6px", transition: "width 0.4s ease" }}>
                          {avancementMoyen > 15 && <span style={{ fontSize: "10px", color: "white", fontWeight: "600", whiteSpace: "nowrap" }}>{avancementMoyen}%</span>}
                        </div>
                        {avancementMoyen <= 15 && (
                          <span style={{ position: "absolute", left: `${avancementMoyen + 2}%`, top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: "#1D4ED8", fontWeight: "600", whiteSpace: "nowrap" }}>{avancementMoyen}%</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </React.Fragment>
            );
          })}

          {/* Légende */}
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "16px", padding: "8px 12px", fontSize: "12px", color: "#6B7280", borderTop: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "36px", height: "8px", background: "#DBEAFE", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: "60%", height: "100%", background: "#4A90E2", borderRadius: "2px" }} />
              </div>
              <span>Réalisation (progression moyenne)</span>
            </div>
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "#9CA3AF" }}>Cliquez sur un projet pour afficher son Gantt détaillé</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapDashboard;
