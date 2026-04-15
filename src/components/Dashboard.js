import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Administration from "./pages/Administration";
import Parametrage from "./pages/Parametrage";
import Demandes from "./pages/Demandes";
import Pilotage from "./pages/Pilotage";
import PlanningProjet from "./pages/PlanningProjet";
import SuiviFinancier from "./pages/SuiviFinancier";
import RecetteLivraison from "./pages/RecetteLivraison";
import PlanChargeEquipes from "./pages/PlanChargeEquipes";
import Profil from "./pages/Profil";
import TableauDeBord from "./pages/TableauDeBord";
import PisteAudit from "./pages/PisteAudit";
import { useAuth } from "./AuthProvider";
import "./Dashboard.css";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { user, logout, permissions } = useAuth();

  // Rediriger vers le premier sous-module accessible dès le montage et au changement de permissions
  useEffect(() => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") {
      console.log("Dashboard: Vérification des sous-modules accessibles...");
      setIsRedirecting(true);

      // Attendre un peu que les permissions soient chargées
      const checkPermissions = () => {
        const firstRoute = permissions.getFirstAccessibleRoute();
        console.log("Première route accessible:", firstRoute);

        if (firstRoute) {
          console.log("Redirection vers le sous-module:", firstRoute);
          navigate(`/${firstRoute}`, { replace: true });
        } else {
          // Fallback pour l'admin : si aucune route trouvée mais c'est un admin, rediriger vers administration-profils
          if (permissions.isAdmin()) {
            navigate("/administration-profils", { replace: true });
            console.log(
              "🔧 Admin détecté, redirection vers /administration-profils",
            );
          } else {
            console.log(
              "⚠️ Aucun sous-module accessible, redirection vers /no-access",
            );
            navigate("/no-access", { replace: true });
          }
        }
        setIsRedirecting(false);
      };

      // Vérifier immédiatement, puis attendre un peu si nécessaire
      checkPermissions();
      const timeout = setTimeout(checkPermissions, 1000); // Attendre 1 seconde au cas où
      return () => {
        clearTimeout(timeout);
        setIsRedirecting(false);
      };
    }
  }, [location.pathname, navigate, permissions]);

  // Écouter les changements de permissions pour rediriger si nécessaire
  useEffect(() => {
    const handlePermissionsChange = () => {
      const path = location.pathname;
      if (path === "/" || path === "/dashboard") {
        const firstRoute = permissions.getFirstAccessibleRoute();
        if (firstRoute) {
          navigate(`/${firstRoute}`, { replace: true });
        } else if (permissions.isAdmin()) {
          navigate("/administration-profils", { replace: true });
        }
      }
    };

    // Écouter l'événement de changement de permissions
    window.addEventListener("permissionsChanged", handlePermissionsChange);
    return () =>
      window.removeEventListener("permissionsChanged", handlePermissionsChange);
  }, [location.pathname, navigate, permissions]);

  // Fonction de déconnexion
  const deconnecter = () => {
    logout();
    navigate("/login");
  };

  // Déterminer la page active depuis l'URL
  const getActivePage = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") {
      return "dashboard";
    }
    return path.substring(1); // Enlever le "/" initial
  };

  const activePage = getActivePage();
  const selectedDelaiId = searchParams.get("delaiId");

  // Gestionnaire pour les clics sur les notifications
  const handleNotificationClick = (page, delaiId) => {
    if (delaiId) {
      navigate(`/${page}?delaiId=${delaiId}`);
    } else {
      navigate(`/${page}`);
    }
  };

  const renderContent = () => {
    // Vérifier si l'utilisateur a accès au module demandé
    const moduleKey = activePage.split("-")[0]; // Extraire le module principal

    if (
      moduleKey &&
      moduleKey !== "dashboard" &&
      moduleKey !== "tableau" &&
      moduleKey !== "profile" &&
      moduleKey !== "audit" &&
      moduleKey !== "no-access"
    ) {
      const modulePermissions = permissions.getModulePermissions(moduleKey);
      if (!modulePermissions.some((perm) => perm.access)) {
        // Rediriger vers la page d'accès refusé si l'utilisateur n'a pas accès à ce module
        navigate("/no-access", { replace: true });
        return null;
      }
    }

    // Gestion des pages principales et sous-pages
    // if (activePage === "dashboard") {
    //   return (
    //     <div className="dashboard-content">
    //       <h1>Tableau de bord</h1>
    //       <p>
    //         Bienvenue {user.prenom} {user.nom} !
    //       </p>
    //       <div className="dashboard-stats">
    //         <div className="stat-card">
    //           <h3>Projets actifs</h3>
    //           <p className="stat-value">12</p>
    //         </div>
    //         <div className="stat-card">
    //           <h3>Utilisateurs</h3>
    //           <p className="stat-value">8</p>
    //         </div>
    //         <div className="stat-card">
    //           <h3>Demandes en cours</h3>
    //           <p className="stat-value">5</p>
    //         </div>
    //       </div>
    //     </div>
    //   );
    // }

    // Tableau de bord
    if (activePage === "tableau-de-bord") {
      return <TableauDeBord />;
    }

    // Pages Administration
    if (activePage.startsWith("administration")) {
      return <Administration activeSubPage={activePage} />;
    }

    // Pages Paramétrage
    if (activePage.startsWith("parametrage")) {
      return <Parametrage activeSubPage={activePage} />;
    }

    // Pages Demandes
    if (activePage.startsWith("demandes")) {
      return <Demandes activeSubPage={activePage} />;
    }

    // Pages Plan de Charge des Équipes
    if (activePage.startsWith("plan-charge")) {
      return (
        <PlanChargeEquipes
          activeSubPage={activePage}
          selectedDelaiId={selectedDelaiId}
        />
      );
    }

    // Pages Pilotage
    if (activePage.startsWith("pilotage")) {
      return <Pilotage activeSubPage={activePage} />;
    }

    // Pages Planning Projet
    if (activePage.startsWith("planning")) {
      return <PlanningProjet activeSubPage={activePage} />;
    }

    // Pages Recette et Livraison
    if (activePage.startsWith("recette-livraison")) {
      return <RecetteLivraison activeSubPage={activePage} />;
    }

    // Pages Suivi Financier
    if (activePage === "suivi-financier") {
      return <SuiviFinancier />;
    }

    // Page Profil
    if (activePage === "profile") {
      return <Profil />;
    }

    // Piste d'Audit
    if (activePage === "audit") {
      return <PisteAudit />;
    }

    return <div className="page-container">Page non trouvée</div>;
  };

  return (
    <div className="dashboard-container">
      {isRedirecting ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            flexDirection: "column",
            backgroundColor: "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              color: "#3b82f6",
              marginBottom: "16px",
            }}
          >
            🔄
          </div>
          <div
            style={{
              fontSize: "16px",
              color: "#6b7280",
              fontWeight: "500",
            }}
          >
            Chargement de vos permissions...
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#9ca3af",
              marginTop: "8px",
            }}
          >
            Redirection vers votre premier sous-module
          </div>
        </div>
      ) : (
        <>
          <Sidebar
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
          />
          <div
            className={`main-content ${
              sidebarCollapsed ? "sidebar-collapsed" : ""
            }`}
          >
            <Header
              user={user}
              deconnecter={deconnecter}
              onNotificationClick={handleNotificationClick}
            />
            <div className="content-wrapper">{renderContent()}</div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
