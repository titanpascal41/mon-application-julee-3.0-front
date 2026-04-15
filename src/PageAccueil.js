import Dashboard from "./components/Dashboard";

// Page d'accueil affichée après la connexion
const PageAccueil = ({ utilisateur, deconnecter }) => {
  return <Dashboard utilisateur={utilisateur} deconnecter={deconnecter} />;
};

export default PageAccueil;
