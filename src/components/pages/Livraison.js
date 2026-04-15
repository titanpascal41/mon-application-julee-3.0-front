import "./PageStyles.css";

const Livraison = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Livraison et Mise en Production</h1>
        <p>Gérez les livraisons et déploiements</p>
      </div>
      
      <div className="page-content">
        <div className="delivery-status">
          <div className="status-card">
            <h3>Livraisons en cours</h3>
            <p className="status-value">3</p>
          </div>
          <div className="status-card">
            <h3>Livraisons terminées</h3>
            <p className="status-value">15</p>
          </div>
          <div className="status-card">
            <h3>En attente de déploiement</h3>
            <p className="status-value">2</p>
          </div>
        </div>
        
        <div className="table-container">
          <h3>Historique des livraisons</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Environnement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>v1.2.0</td>
                <td>2024-01-15</td>
                <td><span className="badge badge-success">Déployé</span></td>
                <td>Production</td>
                <td>
                  <button className="btn-link">Détails</button>
                </td>
              </tr>
              <tr>
                <td>v1.1.5</td>
                <td>2024-01-10</td>
                <td><span className="badge badge-pending">En attente</span></td>
                <td>Staging</td>
                <td>
                  <button className="btn-link">Détails</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Livraison;

