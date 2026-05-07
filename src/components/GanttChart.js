import React from "react";
import "./pages/PageStyles.css";

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

  const labelW  = compact ? 130 : 160;
  const colMinW = mode === "jour" ? 28 : mode === "semaine" ? 52 : 70;

  return (
    <div>
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
          <div style={{ background: "#F3F4F6", borderRight: "1px solid #D1D5DB", borderBottom: "1px solid #D1D5DB" }} />
          {groupes.map((g, i) => (
            <div key={i} style={{ gridColumn: `span ${g.count}`, background: "#F3F4F6", padding: "4px 6px", fontSize: "11px", fontWeight: "700", color: "#374151", textAlign: "center", borderRight: "1px solid #D1D5DB", borderBottom: "1px solid #D1D5DB", whiteSpace: "nowrap", overflow: "hidden" }}>{g.label}</div>
          ))}
          <div style={{ background: "#F9FAFB", borderRight: "1px solid #D1D5DB", borderBottom: "2px solid #D1D5DB", padding: "4px 8px", fontSize: "11px", color: "#6B7280", fontWeight: "600" }}>Sprint</div>
          {cols.map((c, i) => (
            <div key={i} style={{ background: "#F9FAFB", padding: "2px 2px", fontSize: "10px", color: "#6B7280", fontWeight: "500", borderRight: "1px solid #E5E7EB", borderBottom: "2px solid #D1D5DB", textAlign: "center", overflow: "hidden" }}>
              <div>{c.label}</div>
              {c.sub && <div style={{ fontSize: "9px", color: "#9ca3af" }}>{c.sub}</div>}
            </div>
          ))}
          {sprints.map((sprint, i) => {
            const pTIF = toP(sprint.datePrevTIF), pCli = toP(sprint.datePrevClient);
            const eTIF = toP(sprint.dateEffTIF),  eCli = toP(sprint.dateEffClient);
            const hasPlan = pTIF !== null && pCli !== null;
            const hasReal = eTIF !== null && eCli !== null;
            const barLeft  = hasPlan ? Math.min(pTIF, pCli) : (hasReal ? Math.min(eTIF, eCli) : null);
            const barWidth = hasPlan ? Math.abs(pCli - pTIF) : (hasReal ? Math.abs(eCli - eTIF) : null);
            const avancement = sprint.avancement ?? 0;
            return (
              <React.Fragment key={i}>
                {/* Ligne unique : sprint + chantier + barre de progression */}
                <div style={{ background: "#6B7280", padding: "5px 10px", display: "flex", alignItems: "center", borderBottom: "1px solid #4B5563", borderRight: "1px solid #E5E7EB" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Sprint {sprint.num}</span>
                </div>
                <div style={{ gridColumn: `span ${cols.length}`, position: "relative", height: barLeft !== null ? "36px" : "36px", borderBottom: "1px solid #E5E7EB", background: "#FAFAFA" }}>
                  {cols.map((_, mi) => <div key={mi} style={{ position: "absolute", left: `${((mi+1)/cols.length)*100}%`, top: 0, bottom: 0, width: "1px", background: "#E5E7EB" }} />)}
                  {barLeft !== null && (
                    <div style={{ position: "absolute", left: `${barLeft}%`, width: `${Math.max(1, barWidth)}%`, top: "8px", bottom: "8px", background: "#DBEAFE", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${avancement}%`, height: "100%", background: "#4A90E2", display: "flex", alignItems: "center", paddingLeft: "6px", transition: "width 0.4s ease" }}>
                        {avancement > 12 && <span style={{ fontSize: "10px", color: "white", fontWeight: "600", whiteSpace: "nowrap" }}>{avancement}%</span>}
                      </div>
                      {avancement <= 12 && avancement > 0 && (
                        <span style={{ position: "absolute", left: `${avancement + 2}%`, top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: "#1D4ED8", fontWeight: "600", whiteSpace: "nowrap" }}>{avancement}%</span>
                      )}
                      {avancement === 0 && (
                        <span style={{ position: "absolute", left: "4px", top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: "#93C5FD", fontWeight: "600", whiteSpace: "nowrap" }}>0%</span>
                      )}
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

export default GanttChart;
