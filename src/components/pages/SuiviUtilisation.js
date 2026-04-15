import { useState, useEffect } from "react";
import "./PageStyles.css";

const SuiviUtilisation = ({ activeSubPage: activeSubPageProp }) => {
  const [activeSubPage, setActiveSubPage] = useState("recette");

  useEffect(() => {
    if (activeSubPageProp) {
      if (activeSubPageProp.includes("suivi-recette") || activeSubPageProp.includes("recette")) {
        setActiveSubPage("recette");
      } else if (activeSubPageProp.includes("uat")) {
        setActiveSubPage("uat");
      }
    }
  }, [activeSubPageProp]);

  const subPages = {
    recette: {
      title: "Suivi Recette",
      content: (
        <div>
          <div className="uat-sections">
            <div className="section-card">
              <h3>Suivi Recette</h3>
              <p>Suivez les tests et anomalies</p>
              <div className="info-box">
                <p><strong>Anomalies bloquantes:</strong> 3</p>
                <p><strong>Anomalies mineures:</strong> 12</p>
              </div>
              <button className="btn-primary">Voir le détail</button>
            </div>
          </div>
        </div>
      ),
    },
    uat: {
      title: "Recette Utilisateur (UAT)",
      content: (
        <div>
          <div className="uat-sections">
            <div className="section-card">
              <h3>Recette Utilisateur (UAT)</h3>
              <p>Organisation et validation UAT</p>
              <div className="info-box">
                <p><strong>Date début UAT:</strong> 2024-01-20</p>
                <p><strong>Retours UAT:</strong> 5</p>
              </div>
              <button className="btn-primary">Gérer l'UAT</button>
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
        <p>Suivez les tests et la recette utilisateur</p>
      </div>

      <div className="page-content">
        {subPages[activeSubPage].content}
      </div>
    </div>
  );
};

export default SuiviUtilisation;
