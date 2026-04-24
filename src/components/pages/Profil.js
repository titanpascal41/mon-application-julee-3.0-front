import { useState, useRef } from "react";
import { useAuth } from "../AuthProvider";
import { apiFetch } from "../../utils/apiFetch";
import "./PageStyles.css";

const compresserImage = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 200;
        let w = img.width;
        let h = img.height;
        if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
        else { w = Math.round((w * MAX) / h); h = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

const Profil = () => {
  const { user: userInitial, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState({
    prenom: userInitial?.prenom || "",
    nom: userInitial?.nom || "",
    email: userInitial?.email || "",
    avatar: userInitial?.avatar || null,
  });
  const [avatarPreview, setAvatarPreview] = useState(userInitial?.avatar || null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    setMessage({ type: "", text: "" });
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Veuillez sélectionner une image (JPG, PNG, etc.)" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "L'image ne doit pas dépasser 5 Mo." });
      return;
    }
    const base64 = await compresserImage(file);
    setAvatarPreview(base64);
    setUser((prev) => ({ ...prev, avatar: base64 }));
    setMessage({ type: "", text: "" });
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setUser((prev) => ({ ...prev, avatar: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveProfile = async () => {
    if (!user.prenom.trim() || !user.nom.trim() || !user.email.trim()) {
      setMessage({ type: "error", text: "Veuillez remplir tous les champs." });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      setMessage({ type: "error", text: "Veuillez entrer une adresse email valide." });
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/users/${userInitial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: user.prenom.trim(),
          nom: user.nom.trim(),
          email: user.email.trim(),
          avatar: user.avatar,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de la sauvegarde");
      }

      const updated = await res.json();
      updateUser({ ...updated, avatar: user.avatar });
      setMessage({ type: "success", text: "Profil mis à jour avec succès" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const initiales = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Mon Profil</h1>
        <p>Gérez vos informations personnelles</p>
      </div>

      {message.text && (
        <div
          className={`info-box ${message.type === "error" ? "error-box" : "success-box"}`}
          style={{
            marginBottom: "24px",
            padding: "12px",
            borderRadius: "6px",
            backgroundColor: message.type === "error" ? "#fee2e2" : "#d1fae5",
            border: `1px solid ${message.type === "error" ? "#fecaca" : "#a7f3d0"}`,
            color: message.type === "error" ? "#991b1b" : "#065f46",
          }}
        >
          <p style={{ margin: 0 }}>{message.text}</p>
        </div>
      )}

      <div className="page-content">
        {/* Section photo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "28px",
          marginBottom: "48px",
          paddingBottom: "32px",
          borderBottom: "2px solid #e5e7eb",
          flexWrap: "wrap",
        }}>
          {/* Avatar cliquable */}
          <div
            onClick={handleAvatarClick}
            style={{
              position: "relative",
              width: "120px",
              height: "120px",
              flexShrink: 0,
              cursor: "pointer",
            }}
            title="Changer la photo"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
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
              <div style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "42px",
                fontWeight: 600,
                border: "4px solid #4A90E2",
              }}>
                {initiales}
              </div>
            )}
            {/* Overlay au survol */}
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              transition: "opacity 0.2s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
            >
              <i className="fa-solid fa-camera" style={{ color: "white", fontSize: "24px" }}></i>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <div>
            <p style={{ fontWeight: 600, fontSize: "16px", marginBottom: "8px", color: "#1a1a1a" }}>
              {user.prenom} {user.nom}
            </p>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "12px" }}>
              {user.email}
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                className="btn-secondary"
                onClick={handleAvatarClick}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
              >
                <i className="fa-solid fa-upload"></i>
                Changer la photo
              </button>
              {avatarPreview && (
                <button
                  className="btn-secondary"
                  onClick={handleRemoveAvatar}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#dc2626", borderColor: "#fecaca" }}
                >
                  <i className="fa-solid fa-trash"></i>
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Formulaire informations */}
        <div style={{ maxWidth: "600px" }}>
          <h2 style={{ marginBottom: "24px", color: "#1a1a1a" }}>
            Informations personnelles
          </h2>

          <div className="form-group">
            <label htmlFor="prenom">Prénom <span className="required">*</span></label>
            <input
              type="text"
              id="prenom"
              name="prenom"
              value={user.prenom}
              onChange={handleInputChange}
              placeholder="Votre prénom"
            />
          </div>

          <div className="form-group">
            <label htmlFor="nom">Nom <span className="required">*</span></label>
            <input
              type="text"
              id="nom"
              name="nom"
              value={user.nom}
              onChange={handleInputChange}
              placeholder="Votre nom"
            />
          </div>

          <div className="action-buttons" style={{ marginTop: "32px" }}>
            <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              {saving
                ? <><i className="fa-solid fa-spinner fa-spin"></i> Enregistrement...</>
                : <><i className="fa-solid fa-floppy-disk"></i> Enregistrer les modifications</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profil;
