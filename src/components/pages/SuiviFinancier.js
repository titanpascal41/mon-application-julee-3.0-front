import "./PageStyles.css";

const SuiviFinancier = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Suivi Financier</h1>
        <p>Suivez les finances de vos projets</p>
      </div>
      
      <div className="page-content">
        <div className="financial-overview">
          <div className="financial-card">
            <h3>Budget total</h3>
            <p className="financial-value">FCFA500,000</p>
          </div>
          <div className="financial-card">
            <h3>Dépenses</h3>
            <p className="financial-value">FCFA125,000</p>
          </div>
          <div className="financial-card">
            <h3>Reste</h3>
            <p className="financial-value">FCFA375,000</p>
          </div>
        </div>
        
        <div className="table-container">
          <h3>Détails des dépenses</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Montant</th>
                <th>Projet</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2024-01-15</td>
                <td>Développement</td>
                <td>FCFA15,000</td>
                <td>Projet A</td>
              </tr>
              <tr>
                <td>2024-01-14</td>
                <td>Infrastructure</td>
                <td>FCFA8,000</td>
                <td>Projet B</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuiviFinancier;

