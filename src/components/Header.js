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

    // 1. Livraison client globale imminente (≤ 3 jours) — retards dans le dashboard
    if (d.dateCommunicationPlanningClient && d.statutLivraisonClient !== "livré au client") {
      const j = diffJours(d.dateCommunicationPlanningClient);
      if (j !== null && j >= 0 && j <= 3) {
        notifs.push({
          id: `livraison-${d.id}`,
          type: j === 0 ? "urgent" : "warning",
          title: j === 0 ? "Livraison client aujourd'hui !" : `Livraison client dans ${j} jour${j > 1 ? "s" : ""}`,
          details: nom,
          lien: "demandes-gestion",
        });
      }
    }

    // 2. Retour équipe Dev imminente (≤ 3j) — retards dans le dashboard
    if (d.dateRetourEquipesDev && !d.dateEffectiveLivraisonTIF) {
      const j = diffJours(d.dateRetourEquipesDev);
      if (j !== null && j >= 0 && j <= 3) {
        notifs.push({
          id: `dev-proche-${d.id}`,
          type: j === 0 ? "urgent" : "info",
          title: j === 0 ? "Retour équipe Dev aujourd'hui !" : `Retour équipe Dev dans ${j} jour${j > 1 ? "s" : ""}`,
          details: nom,
          lien: "demandes-gestion",
        });
      }
    }

    // 3. Retour équipe TIF imminente (≤ 3j) — retards dans le dashboard
    if (d.dateRetourEquipesTif && !d.dateEffectiveLivraisonTIF) {
      const j = diffJours(d.dateRetourEquipesTif);
      if (j !== null && j >= 0 && j <= 3) {
        notifs.push({
          id: `tif-proche-global-${d.id}`,
          type: j === 0 ? "urgent" : "info",
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

            // Date TIF sprint imminente (≤ 3j) — retards dans le dashboard
            if (s.datePrevTIF && !s.dateEffTIF) {
              const j = diffJours(s.datePrevTIF);
              if (j !== null && j >= 0 && j <= 3) {
                notifs.push({
                  id: `tif-proche-${d.id}-${i}`,
                  type: j === 0 ? "urgent" : "warning",
                  title: j === 0 ? `Sprint ${num} — Date TIF aujourd'hui !` : `Sprint ${num} — Date TIF dans ${j} jour${j > 1 ? "s" : ""}`,
                  details: nom,
                  lien: "demandes-gestion",
                });
              }
            }

            // Date livraison client sprint imminente (≤ 3j) — retards dans le dashboard
            if (s.datePrevClient && !s.dateEffClient) {
              const j = diffJours(s.datePrevClient);
              if (j !== null && j >= 0 && j <= 3) {
                notifs.push({
                  id: `client-proche-${d.id}-${i}`,
                  type: j === 0 ? "urgent" : "warning",
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

    // 7. Livraison client dépassée (date passée, pas encore livré)
    if (d.sprintsData) {
      try {
        const sprints = typeof d.sprintsData === "string" ? JSON.parse(d.sprintsData) : d.sprintsData;
        if (Array.isArray(sprints)) {
          sprints.forEach((s, i) => {
            if (s.statutSprint === "terminé") return;
            const num = i + 1;

            // Date TIF sprint dépassée
            if (s.datePrevTIF && !s.dateEffTIF) {
              const j = diffJours(s.datePrevTIF);
              if (j !== null && j < 0) {
                notifs.push({
                  id: `tif-depasse-${d.id}-${i}`,
                  type: "urgent",
                  title: `Sprint ${num} — Date TIF dépassée de ${Math.abs(j)} jour${Math.abs(j) > 1 ? "s" : ""}`,
                  details: nom,
                  lien: "demandes-gestion",
                });
              }
            }

            // Livraison client sprint dépassée
            if (s.datePrevClient && !s.dateEffClient) {
              const j = diffJours(s.datePrevClient);
              if (j !== null && j < 0) {
                notifs.push({
                  id: `client-depasse-${d.id}-${i}`,
                  type: "urgent",
                  title: `Sprint ${num} — Livraison client dépassée de ${Math.abs(j)} jour${Math.abs(j) > 1 ? "s" : ""}`,
                  details: nom,
                  lien: "demandes-gestion",
                });
              }
            }

            // Sprint bloqué à 0% depuis > 3 jours
            if (s.statutSprint === "en cours" && parseInt(s.avancement || 0) === 0 && s.datePrevTIF) {
              const j = diffJours(s.datePrevTIF);
              if (j !== null && j <= -3) {
                notifs.push({
                  id: `sprint-zero-${d.id}-${i}`,
                  type: "warning",
                  title: `Sprint ${num} — Aucun avancement enregistré`,
                  details: nom,
                  lien: "demandes-gestion",
                });
              }
            }
          });
        }
      } catch {}
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

    // 9. Brouillon abandonné depuis > 7 jours
    if (d.isDraft && d.dateEnregistrement) {
      const j = diffJours(d.dateEnregistrement);
      if (j !== null && j <= -7) {
        notifs.push({
          id: `brouillon-${d.id}`,
          type: "warning",
          title: `Brouillon non finalisé depuis ${Math.abs(j)} jours`,
          details: nom,
          lien: "demandes-gestion",
        });
      }
    }

    // 10. Validation en attente dépassée
    if (d.dateConfirmationValidation && !d.dateTransmissionBacklog) {
      const j = diffJours(d.dateConfirmationValidation);
      if (j !== null && j < 0) {
        notifs.push({
          id: `validation-${d.id}`,
          type: "warning",
          title: `Confirmation validation dépassée de ${Math.abs(j)} jour${Math.abs(j) > 1 ? "s" : ""}`,
          details: nom,
          lien: "demandes-gestion",
        });
      }
    }

    // 11. Demande sans UO assignée (non brouillon, non prospecte)
    if (!d.isDraft && !d.uniteOrganisationnelleId &&
        (d.typeProjet || "").toLowerCase() !== "prospecte" &&
        !d.archived) {
      notifs.push({
        id: `sans-uo-${d.id}`,
        type: "info",
        title: "Aucune unité organisationnelle assignée",
        details: nom,
        lien: "demandes-gestion",
      });
    }
  });

  const ordre = { urgent: 0, warning: 1, info: 2 };
  return notifs.sort((a, b) => ordre[a.type] - ordre[b.type]);
};

const Header = ({ user, deconnecter }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [vues, setVues] = useState(new Set());
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const chargerNotifications = useCallback(async () => {
    try {
      const url = user?.id ? `/demandes?utilisateurId=${user.id}` : `/demandes`;
      const res = await apiFetch(url);
      if (!res.ok) return;
      const demandes = await res.json();
      setNotifications(genererNotifications(demandes));
    } catch {}
  }, [user?.id]);

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
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              width: "360px", background: "#fff", borderRadius: "14px",
              zIndex: 1000,
              overflow: "hidden", border: "1px solid #E5E7EB",
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <i className="fa-solid fa-bell" style={{ color: "#4A90E2", fontSize: "14px" }}></i>
                  <span style={{ fontWeight: "700", fontSize: "15px", color: "#111827" }}>Notifications</span>
                  {nonVues.length > 0 && (
                    <span style={{ background: "#4A90E2", color: "#fff", borderRadius: "20px", padding: "2px 8px", fontSize: "11px", fontWeight: "700" }}>
                      {nonVues.length}
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button onClick={marquerToutesVues} style={{ background: "none", border: "none", fontSize: "12px", color: "#6B7280", cursor: "pointer", fontWeight: "500" }}>
                    Tout lire
                  </button>
                )}
              </div>

              {/* Liste */}
              <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 20px", gap: "10px", color: "#9CA3AF" }}>
                    <i className="fa-regular fa-bell-slash" style={{ fontSize: "28px" }}></i>
                    <span style={{ fontSize: "13px" }}>Aucune notification pour le moment</span>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isVue = vues.has(notif.id);
                    const iconMap = { urgent: "fa-circle-exclamation", warning: "fa-triangle-exclamation", info: "fa-circle-info" };
                    const icon = iconMap[notif.type] || "fa-circle-info";
                    const color = couleurType(notif.type);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => { setVues((prev) => new Set([...prev, notif.id])); setShowNotifications(false); navigate(`/${notif.lien}`); }}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: "12px",
                          padding: "12px 18px", cursor: "pointer", transition: "background 0.15s",
                          background: isVue ? "#fff" : "#F8FAFF",
                          borderBottom: "1px solid #F3F4F6",
                          opacity: isVue ? 0.6 : 1,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"}
                        onMouseLeave={e => e.currentTarget.style.background = isVue ? "#fff" : "#F8FAFF"}
                      >
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                          <i className={`fa-solid ${icon}`} style={{ color, fontSize: "13px" }}></i>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: "600", fontSize: "13px", color: "#111827", marginBottom: "2px" }}>{notif.title}</div>
                          <div style={{ fontSize: "12px", color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notif.details}</div>
                        </div>
                        {!isVue && (
                          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0, marginTop: "6px" }}></div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: "10px 18px", borderTop: "1px solid #F3F4F6", textAlign: "center" }}>
                <button onClick={() => { setShowNotifications(false); navigate("/demandes-gestion"); }}
                  style={{ background: "none", border: "none", fontSize: "12px", color: "#4A90E2", cursor: "pointer", fontWeight: "600" }}>
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
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "none",
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
              <div className="dropdown-item" onClick={() => { setShowUserMenu(false); navigate("/profile"); }}>
                <i className="fa-solid fa-user" style={{ color: "#4A90E2" }}></i> Profil
              </div>
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
