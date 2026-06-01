import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";
import { useAuth } from "./AuthProvider";

const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const { user, permissions } = useAuth();

  const isAdmin = () => {
    if (!user) return false;
    return user.profilId === 1 || user.profilId === "1";
  };

  const aAccesModule = (moduleKey) => {
    if (!user) return false;
    if (isAdmin()) return true;
    if (!permissions.userPermissions || permissions.userPermissions.length === 0) return false;
    const modulePermissions = permissions.getModulePermissions(moduleKey);
    // Compatibilité : si aucune permission configurée pour tableau, autoriser par défaut
    if (moduleKey === "tableau" && modulePermissions.length === 0) return true;
    return modulePermissions.some((perm) => perm.access);
  };

  const verifierPermissionSousModule = (module, submodule) => {
    if (!user) return false;
    if (isAdmin()) return true;
    if (!permissions.userPermissions || permissions.userPermissions.length === 0) return false;
    return permissions.hasPermission(module, submodule, "access");
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
  const [expandedMenus, setExpandedMenus] = useState({
    administration: false,
    parametrage: false,
    demandes: false,
  });
  const [clickedMainMenu, setClickedMainMenu] = useState(null);

  // Ouvrir automatiquement le menu parent si une sous-page est active
  useEffect(() => {
    const menuKeys = {
      administration: ["administration-profils", "administration-utilisateurs"],
      parametrage: [
        "parametrage-societes",
        "parametrage-uo",
        "parametrage-statuts",
        "parametrage-interlocuteurs",
      ],
      demandes: ["demandes-gestion"],
    };

    const currentPath = location.pathname.substring(1); // Enlever le "/" initial

    Object.keys(menuKeys).forEach((menuKey) => {
      if (menuKeys[menuKey].includes(currentPath)) {
        setExpandedMenus((prev) => ({
          ...prev,
          [menuKey]: true,
        }));
      }
    });
  }, [location.pathname]);

  const toggleMenu = (menuKey) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
    // Marquer ce menu comme cliqué pour enlever le contraste des sous-modules
    // Le contraste ne reviendra que si on clique directement sur un sous-module
    setClickedMainMenu(menuKey);
  };

  const menuItems = [
    {
      key: "tableau-de-bord",
      label: "Tableau de Bord",
      icon: "fa-solid fa-gauge",
      iconColor: "#4A90E2",
      path: "tableau-de-bord",
      module: "tableau",
    },
    {
      key: "administration",
      label: "Administration",
      icon: "fa-solid fa-user-gear",
      iconColor: "#8B5CF6", // Violet
      submenus: [
        {
          key: "gestion-profils",
          label: "Gestion des Profils",
          path: "administration-profils",
          icon: "fa-solid fa-id-card",
        },
        {
          key: "gestion-utilisateurs",
          label: "Gestion des Utilisateurs",
          path: "administration-utilisateurs",
          icon: "fa-solid fa-user-shield",
        },
      ],
    },
    {
      key: "parametrage",
      label: "Paramétrage",
      icon: "fa-solid fa-sliders",
      iconColor: "#64748B", // Gris ardoise
      submenus: [
        {
          key: "gestion-societes",
          label: "Gestion des Sociétés",
          path: "parametrage-societes",
          icon: "fa-solid fa-building",
        },
        {
          key: "gestion-uo",
          label: "Gestion des Unités Organisationnelles",
          path: "parametrage-uo",
          icon: "fa-solid fa-sitemap",
        },
        {
          key: "gestion-statuts",
          label: "Gestion des Statuts",
          path: "parametrage-statuts",
          icon: "fa-solid fa-tags",
        },
        {
          key: "gestion-collaborateurs",
          label: "Gestion des interlocuteurs",
          path: "parametrage-interlocuteurs",
          icon: "fa-solid fa-users",
        },
      ],
    },
    {
      key: "demandes",
      label: "Demandes",
      icon: "fa-solid fa-file-circle-plus",
      iconColor: "#10B981", // Vert émeraude
      submenus: [
        {
          key: "gestion-demandes",
          label: "Gestion des Demandes",
          path: "demandes-gestion",
          icon: "fa-solid fa-clipboard-list",
        },
      ],
    },
    {
      key: "audit",
      label: "Piste d'Audit",
      icon: "fa-solid fa-clock-rotate-left",
      iconColor: "#F97316",
      path: "audit",
      module: "audit",
    },
    // {
    //   key: "plan-charge",
    //   label: "Plan de Charge Équipes",
    //   icon: "fa-solid fa-people-group",
    //   iconColor: "#F97316", // Orange
    //   submenus: [
    //     {
    //       key: "saisie-ressources",
    //       label: "Saisie des Ressources",
    //       path: "plan-charge-saisie-ressources",
    //     },
    //     {
    //       key: "delai-plan-charge",
    //       label: "Délai Plan de Charge",
    //       path: "plan-charge-delai-plan-charge",
    //     },
    //     {
    //       key: "cout-produit",
    //       label: "Coût du Produit",
    //       path: "plan-charge-cout-produit",
    //     },
    //   ],
    // },
    // {
    //   key: "planning",
    //   label: "Planning Projet",
    //   icon: "fa-solid fa-calendar-days",
    //   iconColor: "#06B6D4", // Cyan
    //   submenus: [
    //     {
    //       key: "cadre-temporel",
    //       label: "Cadre Temporel du Projet",
    //       path: "planning-cadre-temporel",
    //     },
    //     { key: "sprints", label: "Sprints", path: "planning-sprints" },
    //     {
    //       key: "roadmap",
    //       label: "Roadmap (Vision à long terme)",
    //       path: "planning-roadmap",
    //     },
    //   ],
    // },
    // {
    //   key: "recette-livraison",
    //   label: "Recette et Livraison",
    //   icon: "fa-solid fa-rocket",
    //   iconColor: "#6366F1", // Indigo
    //   submenus: [
    //     {
    //       key: "suivi-recette",
    //       label: "Suivi Recette",
    //       path: "recette-livraison-suivi-recette",
    //     },
    //     {
    //       key: "recette-utilisateur",
    //       label: "Recette Utilisateur (UAT)",
    //       path: "recette-livraison-recette-utilisateur",
    //     },
    //     {
    //       key: "livraison",
    //       label: "Livraison et Mise en Production",
    //       path: "recette-livraison-livraison",
    //     },
    //   ],
    // },
  ];

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header"></div>

      <nav className="sidebar-nav">
        {menuItems
          .filter((item) => item.noPermissionRequired || aAccesModule(item.module || item.key))
          .map((item) => (
            <div key={item.key} className="nav-item-wrapper">
              {item.submenus ? (
                <>
                  <div
                    className={`nav-item ${
                      expandedMenus[item.key] ? "expanded" : ""
                    }`}
                    onClick={() => toggleMenu(item.key)}
                  >
                    <span className="nav-icon">
                      <i
                        className={item.icon}
                        style={{ color: item.iconColor }}
                        aria-hidden="true"
                      ></i>
                    </span>
                    <span className="nav-label">{item.label}</span>
                    {!collapsed && (
                      <span className="nav-arrow">
                        {expandedMenus[item.key] ? "▼" : "▶"}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <div
                      className={`submenu ${
                        expandedMenus[item.key] ? "expanded" : ""
                      }`}
                    >
                      {item.submenus
                        .filter((submenu) => {
                          // Mapper les clés de sous-menu vers les permissions
                          const permissionMap = {
                            "gestion-profils": {
                              module: "administration",
                              submodule: "profils",
                            },
                            "gestion-utilisateurs": {
                              module: "administration",
                              submodule: "utilisateurs",
                            },
                            "gestion-societes": {
                              module: "parametrage",
                              submodule: "societes",
                            },
                            "gestion-uo": {
                              module: "parametrage",
                              submodule: "uo",
                            },
                            "gestion-statuts": {
                              module: "parametrage",
                              submodule: "statuts",
                            },
                            "gestion-collaborateurs": {
                              module: "parametrage",
                              submodule: "interlocuteurs",
                            },
                            "gestion-demandes": {
                              module: "demandes",
                              submodule: "gestion",
                            },
                          };

                          const permission = permissionMap[submenu.key];
                          return permission
                            ? verifierPermissionSousModule(
                                permission.module,
                                permission.submodule,
                              )
                            : false;
                        })
                        .map((submenu) => (
                          <Link
                            key={submenu.key}
                            to={`/${submenu.path}`}
                            className={`submenu-item ${
                              activePage === submenu.path &&
                              clickedMainMenu !== item.key
                                ? "active"
                                : ""
                            }`}
                            onClick={() => {
                              setClickedMainMenu(null);
                            }}
                          >
                            {submenu.icon && (
                              <i
                                className={submenu.icon}
                                style={{
                                  marginRight: "14px",
                                  fontSize: "16px",
                                  color: "#6B7280",
                                  flexShrink: 0,
                                  alignSelf: "center",
                                }}
                                aria-hidden="true"
                              ></i>
                            )}
                            {submenu.label}
                          </Link>
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={`/${item.path}`}
                  className={`nav-item ${
                    activePage === item.path ? "active" : ""
                  }`}
                >
                  <span className="nav-icon">
                    <i
                      className={item.icon}
                      style={{ color: item.iconColor }}
                      aria-hidden="true"
                    ></i>
                  </span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              )}
            </div>
          ))}
      </nav>
    </div>
  );
};

export default Sidebar;
