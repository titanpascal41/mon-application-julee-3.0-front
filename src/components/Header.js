import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";
import { apiFetch } from "../utils/apiFetch";

const diffJours = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const genererNotifications = (demandes) => {
  const notifs = [];
  const demandesActives = demandes.filter((d) => d.isDraft !== false);

  demandesActives.forEach((d) => {
    const nom = d.nomProjet || `Demande #${d.id}`;

    // 1. Livraison client globale imminente (≤ 7 jours)
    if (d.dateCommunicationPlanningClient) {
      const j = diffJours(d.dateCommunicationPlanningClient);
      if (j !== null && j >= 0 && j <= 7) {
        notifs.push({
          id: `livraison-${d.id}`,
          type: j <= 2 ? "urgent" : "warning",
          title: j === 0 ? "Livraison client aujourd'hui !" : `Livraison client dans ${j} jour${j > 1 ? "s" : ""}`,
          details: nom,
          lien: "demandes-gestion",
        });
      }
    }

    // 2. Livraison client globale en retard
    if (d.dateCommunicationPlanningClient && d.statutLivraisonClient !== "livré au client") {
      const j = diffJours(d.dateCommunicationPlanningClient);
      if (j !== null && j < 0) {
        notifs.push({
          id: `retard-${d.id}`,
          type: "urgent",
          title: `Livraison client en retard de ${Math.abs(j)} jour${Math.abs(j) > 1 ? "s" : ""}`,
          details: nom,
          lien: "demandes-gestion",
        });
      }
    }

    // 3. Retour équipe Dev — date dépassée ou imminente (≤ 3j)
    if (d.dateRetourEquipesDev && !d.dateEffectiveLivraisonTIF) {
      const j = diffJours(d.dateRetourEquipesDev);
      if (j !== null && j < 0) {
        notifs.push({
          id: `dev-retard-${d.id}`,
          type: "warning",
          title: `Retour équipe Dev dépassé de ${Math.abs(j)} jour${Math.abs(j) > 1 ? "s" : ""}`,
          details: nom,
          lien: "demandes-gestion",
        });
      } else if (j !== null && j >= 0 && j <= 3) {
        notifs.push({
          id: `dev-proche-${d.id}`,
          type: "info",
          title: j === 0 ? "Retour équipe Dev aujourd'hui !" : `Retour équipe Dev dans ${j} jour${j > 1 ? "s" : ""}`,
          details: nom,
          lien: "demandes-gestion",
        });
      }
    }

    // 4. Retour équipe TIF — date dépassée ou imminente (≤ 3j)
    if (d.dateRetourEquipesTif && !d.dateEffectiveLivraisonTIF) {
      const j = diffJours(d.dateRetourEquipesTif);
      if (j !== null && j < 0) {
        notifs.push({
          id: `tif-retard-global-${d.id}`,
          type: "warning",
          title: `Retour équipe TIF dépassé de ${Math.abs(j)} jour${Math.abs(j) > 1 ? "s" : ""}`,
          details: nom,
          lien: "demandes-gestion",
        });
      } else if (j !== null && j >= 0 && j <= 3) {
        notifs.push({
          id: `tif-proche-global-${d.id}`,
          type: "info",
          title: j === 0 ? "Retour équipe TIF aujourd'hui !" : `Retour équipe TIF dans ${j} jour${j > 1 ? "s" : ""}`,
          details: nom,
          lien: "demandes-gestion",
        });
      }
    }

    // 5. Sprints — dates TIF et livraison client par sprint
    if (d.sprintsData) {
      try {
        const sprints = typeof d.sprintsData === "string"
          ? JSON.parse(d.sprintsData)
          : d.sprintsData;
        if (Array.isArray(sprints)) {
          sprints.forEach((s, i) => {
            if (s.statutSprint === "terminé") return;
            const num = i + 1;

            // Avancement faible sur sprint en cours
            if (s.statutSprint === "en cours" && parseInt(s.avancement || 0) < 30) {
              notifs.push({
                id: `sprint-faible-${d.id}-${i}`,
                type: "info",
                title: `Sprint ${num} — avancement faible (${s.avancement || 0}%)`,
                details: nom,
                lien: "demandes-gestion",
              });
            }

            // Date TIF sprint dépassée ou imminente (≤ 3j)
            if (s.datePrevTIF && !s.dateEffTIF) {
              const j = diffJours(s.datePrevTIF);
              if (j !== null && j < 0) {
                notifs.push({
                  id: `tif-retard-${d.id}-${i}`,
                  type: "urgent",
                  title: `Sprint ${num} — Date TIF dépassée de ${Math.abs(j)}j`,
                  details: nom,
                  lien: "demandes-gestion",
                });
              } else if (j !== null && j >= 0 && j <= 3) {
                notifs.push({
                  id: `tif-proche-${d.id}-${i}`,
                  type: "warning",
                  title: j === 0 ? `Sprint ${num} — Date TIF aujourd'hui !` : `Sprint ${num} — Date TIF dans ${j} jour${j > 1 ? "s" : ""}`,
                  details: nom,
                  lien: "demandes-gestion",
                });
              }
            }

            // Date livraison client sprint dépassée ou imminente (≤ 5j)
            if (s.datePrevClient && !s.dateEffClient) {
              const j = diffJours(s.datePrevClient);
              if (j !== null && j < 0) {
                notifs.push({
                  id: `client-retard-${d.id}-${i}`,
                  type: "urgent",
                  title: `Sprint ${num} — Livraison client dépassée de ${Math.abs(j)}j`,
                  details: nom,
                  lien: "demandes-gestion",
                });
              } else if (j !== null && j >= 0 && j <= 5) {
                notifs.push({
                  id: `client-proche-${d.id}-${i}`,
                  type: "warning",
                  title: j === 0 ? `Sprint ${num} — Livraison client aujourd'hui !` : `Sprint ${num} — Livraison client dans ${j} jour${j > 1 ? "s" : ""}`,
                  details: nom,
                  lien: "demandes-gestion",
                });
              }
            }
          });
        }
      } catch {}
    }

    // 6. Demande suspendue
    if ((d.statut?.nom || d.statutDemande || "").toUpperCase() === "SUSPENDU") {
      notifs.push({
        id: `suspendu-${d.id}`,
        type: "warning",
        title: "Demande suspendue",
        details: nom,
        lien: "demandes-gestion",
      });
    }

    // 7. Demande sans statut assigné depuis plus de 2 jours
    if (!d.statutId) {
      const j = diffJours(d.dateEnregistrement);
      if (j !== null && j <= -2) {
        notifs.push({
          id: `sans-statut-${d.id}`,
          type: "info",
          title: "Aucun statut assigné",
          details: nom,
          lien: "demandes-gestion",
        });
      }
    }

    // 8. Planification non faite depuis plus de 5 jours
    if (!d.nombreSprint) {
      const j = diffJours(d.dateEnregistrement);
      if (j !== null && j <= -5) {
        notifs.push({
          id: `planif-${d.id}`,
          type: "info",
          title: "Planification non renseignée",
          details: `${nom} — enregistrée depuis ${Math.abs(j)} jours`,
          lien: "demandes-gestion",
        });
      }
    }
  });

  const ordre = { urgent: 0, warning: 1, info: 2 };
  return notifs.sort((a, b) => ordre[a.type] - ordre[b.type]);
};

const Header = ({ user, deconnecter, onNotificationClick }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [vues, setVues] = useState(new Set());
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const chargerNotifications = useCallback(async () => {
    try {
      const res = await apiFetch(`/demandes`);
      if (!res.ok) return;
      const demandes = await res.json();
      setNotifications(genererNotifications(demandes));
    } catch {}
  }, []);

  useEffect(() => {
    chargerNotifications();
    const interval = setInterval(chargerNotifications, 60000);
    return () => clearInterval(interval);
  }, [chargerNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const nonVues = notifications.filter((n) => !vues.has(n.id));
  const isAdmin = user?.profil?.nom === "Administrateur";

  const ouvrirNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const marquerToutesVues = () => {
    setVues(new Set(notifications.map((n) => n.id)));
  };

  const couleurType = (type) => {
    if (type === "urgent") return "#dc2626";
    if (type === "warning") return "#FF6B35";
    return "#4A90E2";
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <span className="header-logo">JULEE</span>
      </div>
      <div className="header-right">

        {/* Cloche notifications */}
        <div className="notification-wrapper" ref={notifRef}>
          <button
            className="header-icon-btn notification-btn"
            onClick={ouvrirNotifications}
            title="Boîte de réception"
          >
            <i className="fa-solid fa-bell" style={{ color: "#4A90E2", fontSize: "16px" }}></i>
            {nonVues.length > 0 && (
              <span className="notification-badge">
                {nonVues.length > 9 ? "9+" : nonVues.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h4>Boîte de réception</h4>
                <div className="notification-header-right">
                  {nonVues.length > 0 && (
                    <span className="notification-count">{nonVues.length} nouvelle{nonVues.length > 1 ? "s" : ""}</span>
                  )}
                  {notifications.length > 0 && (
                    <button className="btn-link" style={{ fontSize: "12px", whiteSpace: "nowrap" }} onClick={marquerToutesVues}>
                      Tout marquer lu
                    </button>
                  )}
                </div>
              </div>

              <div className="notification-content">
                {notifications.length === 0 ? (
                  <div className="notification-item empty">
                    <i style={{ color: "#000000", marginRight: "8px" }}></i>
                    aucune notification   
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item clickable ${notif.type === "urgent" ? "urgent" : ""}`}
                      style={{
                        borderLeft: `4px solid ${couleurType(notif.type)}`,
                        opacity: vues.has(notif.id) ? 0.5 : 1,
                      }}
                      onClick={() => {
                        setVues((prev) => new Set([...prev, notif.id]));
                        setShowNotifications(false);
                        navigate(`/${notif.lien}`);
                      }}
                    >
                      <div className="notification-text">
                        <p className="notification-title">{notif.title}</p>
                        <p className="notification-details">{notif.details}</p>
                      </div>
                      <span className="notification-arrow">›</span>
                    </div>
                  ))
                )}
              </div>

              <div className="notification-footer">
                <button
                  className="btn-link"
                  onClick={() => { setShowNotifications(false); navigate("/demandes-gestion"); }}
                >
                  Voir toutes les demandes →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Menu utilisateur */}
        <div className="user-menu-wrapper">
          <div className="user-profile" onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}>
            <div className="user-avatar">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="profil"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #4A90E2",
                    display: "block",
                  }}
                />
              ) : (
                <div className="avatar-placeholder">
                  {user?.prenom?.[0]}{user?.nom?.[0]}
                </div>
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.prenom} {user?.nom}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <span className="user-arrow">▼</span>
          </div>
          {showUserMenu && (
            <div className="user-dropdown" ref={dropdownRef}>
              {isAdmin && (
                <div className="dropdown-item" onClick={() => { setShowUserMenu(false); navigate("/profile"); }}>
                  <i className="fa-solid fa-user" style={{ color: "#4A90E2" }}></i> Profil
                </div>
              )}
              <div className="dropdown-divider"></div>
              <div className="dropdown-item logout" onClick={deconnecter}>
                <i className="fa-solid fa-right-from-bracket"></i> Se déconnecter
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
