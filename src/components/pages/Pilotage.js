import { useState, useEffect } from "react";
import "./PageStyles.css";

const Pilotage = ({ activeSubPage: activeSubPageProp }) => {
  const [activeSubPage, setActiveSubPage] = useState("dashboard");

  useEffect(() => {
    if (activeSubPageProp) {
      if (activeSubPageProp.includes("dashboard")) setActiveSubPage("dashboard");
      else if (activeSubPageProp.includes("indicateurs")) setActiveSubPage("indicateurs");
    }
  }, [activeSubPageProp]);

  const subPages = {
    dashboard: {
      title: "Tableau de Bord Pilotage",
      content: (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Projets actifs</h3>
              <p className="stat-value">12</p>
            </div>
            <div className="stat-card">
              <h3>Taux de réussite</h3>
              <p className="stat-value">85%</p>
            </div>
            <div className="stat-card">
              <h3>Budget utilisé</h3>
              <p className="stat-value">FCFA125,000</p>
            </div>
          </div>
          
          <div className="chart-placeholder">
            <h3>Graphiques de pilotage</h3>
            <p>Les graphiques seront affichés ici</p>
          </div>
        </div>
      ),
    },
    indicateurs: {
      title: "Indicateurs Pilotage",
      content: (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Indicateurs de performance</h3>
              <p className="stat-value">En cours de calcul</p>
            </div>
            <div className="stat-card">
              <h3>Métriques clés</h3>
              <p className="stat-value">Analysées</p>
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
        <p>Tableau de bord de pilotage des projets</p>
      </div>

      <div className="page-content">
        {subPages[activeSubPage].content}
      </div>
    </div>
  );
};

export default Pilotage;
