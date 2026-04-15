import { useState } from "react";
import { useAuth } from "../AuthProvider";
import "./PageStyles.css";

const Profil = () => {
  // Récupérer l'utilisateur depuis le contexte d'authentification
  const { user: userInitial, updateUser } = useAuth();

  const [user, setUser] = useState({
    prenom: userInitial?.prenom || "",
    nom: userInitial?.nom || "",
    email: userInitial?.email || "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  // Plus de localStorage - tout vient de la base de données

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    setMessage({ type: "", text: "" });
  };

  
  const handleSaveProfile = () => {
    // Valider les champs
    if (
      !user.prenom.trim() ||
      !user.nom.trim() ||
      !user.email.trim()
    ) {
      setMessage({
        type: "error",
        text: "Veuillez remplir tous les champs.",
      });
      return;
    }

    // Valider l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      setMessage({
        type: "error",
        text: "Veuillez entrer une adresse email valide.",
      });
      return;
    }

    // Mettre à jour l'utilisateur dans le contexte d'authentification
    updateUser({
      prenom: user.prenom.trim(),
      nom: user.nom.trim(),
      email: user.email.trim(),
    });

    setMessage({ type: "success", text: "Profil mis à jour avec succès" });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Mon Profil</h1>
        <p>Gérez vos informations personnelles</p>
      </div>

      {message.text && (
        <div
          className={`info-box ${
            message.type === "error" ? "error-box" : "success-box"
          }`}
          style={{
            marginBottom: "24px",
            padding: "12px",
            borderRadius: "6px",
            backgroundColor: message.type === "error" ? "#fee2e2" : "#d1fae5",
            border: `1px solid ${
              message.type === "error" ? "#fecaca" : "#a7f3d0"
            }`,
            color: message.type === "error" ? "#991b1b" : "#065f46",
          }}
        >
          <p style={{ margin: 0 }}>{message.text}</p>
        </div>
      )}

      <div className="page-content">
        {/* Section Photo de profil */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "48px",
            paddingBottom: "32px",
            borderBottom: "2px solid #e5e7eb",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "120px",
              height: "120px",
              flexShrink: 0,
            }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt="profil"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "4px solid #4A90E2",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "48px",
                  fontWeight: 600,
                  border: "4px solid #4A90E2",
                }}
              >
                {user.prenom.charAt(0)}
                {user.nom.charAt(0)}
              </div>
            )}
          </div>
                  </div>

        {/* Formulaire d'informations */}
        <div style={{ maxWidth: "600px" }}>
          <h2 style={{ marginBottom: "24px", color: "#1a1a1a" }}>
            Informations personnelles
          </h2>

          <div className="form-group">
            <label htmlFor="prenom">
              Prénom <span className="required">*</span>
            </label>
            <input
              type="text"
              id="prenom"
              name="prenom"
              value={user.prenom}
              onChange={handleInputChange}
              placeholder="Votre prénom"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nom">
              Nom <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nom"
              name="nom"
              value={user.nom}
              onChange={handleInputChange}
              placeholder="Votre nom"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={user.email}
              onChange={handleInputChange}
              placeholder="votre.email@exemple.com"
              required
            />
          </div>

          <div className="action-buttons" style={{ marginTop: "32px" }}>
            <button className="btn-primary" onClick={handleSaveProfile}>
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </div>

          </div>
  );
};

export default Profil;
