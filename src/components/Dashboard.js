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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("julee_sidebar_collapsed") === "true"
  );

  useEffect(() => {
    localStorage.setItem("julee_sidebar_collapsed", sidebarCollapsed);
  }, [sidebarCollapsed]);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const { user, logout, permissions } = useAuth();

  // Déclencher un re-render dès que les permissions sont chargées
  useEffect(() => {
    if (permissions.userPermissions) {
      setPermissionsReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (permissions.userPermissions) {
        clearInterval(interval);
        setPermissionsReady(true);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [permissions]);

  // Rediriger vers le premier sous-module accessible dès le montage et au changement de permissions
  useEffect(() => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") {
      setIsRedirecting(true);

      const checkPermissions = () => {
        const firstRoute = permissions.getFirstAccessibleRoute();

        if (firstRoute) {
          navigate(`/${firstRoute}`, { replace: true });
        } else {
          if (permissions.isAdmin()) {
            navigate("/tableau-de-bord", { replace: true });
          } else {
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
    // Si une demande est en cours de saisie, lui laisser une chance de se
    // sauvegarder en brouillon avant que le token ne soit supprimé par logout().
    window.dispatchEvent(new Event("julee:retour-liste-demandes"));
    logout();
    navigate("/login", { replace: true });
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

  // Mapping exact route → module/sous-module pour la vérification des permissions
  const ROUTE_PERMISSIONS = {
    "tableau-de-bord":            { module: "tableau",       submodule: null },
    "administration-profils":     { module: "administration", submodule: "profils" },
    "administration-utilisateurs":{ module: "administration", submodule: "utilisateurs" },
    "parametrage-societes":       { module: "parametrage",    submodule: "societes" },
    "parametrage-uo":             { module: "parametrage",    submodule: "uo" },
    "parametrage-statuts":        { module: "parametrage",    submodule: "statuts" },
    "parametrage-interlocuteurs": { module: "parametrage",    submodule: "interlocuteurs" },
    "demandes-gestion":           { module: "demandes",       submodule: "gestion" },
  };

  const renderContent = () => {
    const routeInfo = ROUTE_PERMISSIONS[activePage];

    if (routeInfo) {
      // Ne pas vérifier tant que les permissions ne sont pas chargées
      if (!permissionsReady) return null;

      const { module: mod, submodule: sub } = routeInfo;
      let hasAccess;

      if (sub === null) {
        // Module sans sous-module (tableau, audit)
        const modulePerms = permissions.getModulePermissions(mod);
        hasAccess = mod === "tableau" && modulePerms.length === 0
          ? true  // fallback : tableau sans config = autorisé
          : modulePerms.some((p) => p.access);
      } else {
        // Vérification au niveau du sous-module exact
        hasAccess = permissions.hasPermission(mod, sub);
      }

      if (!hasAccess) {
        const firstRoute = permissions.getFirstAccessibleRoute();
        navigate(firstRoute ? `/${firstRoute}` : "/no-access", { replace: true });
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
              color: "#4A90E2",
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
          <Header
            user={user}
            deconnecter={deconnecter}
            onNotificationClick={handleNotificationClick}
          />
          <div className="dashboard-body">
            <Sidebar
              collapsed={sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
            />
            <div
              className={`main-content ${
                sidebarCollapsed ? "sidebar-collapsed" : ""
              }`}
            >
              <div className="content-wrapper">{renderContent()}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
