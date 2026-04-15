import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";

const NoAccess = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleContactAdmin = () => {
    // Rediriger vers la page de connexion admin ou afficher un message
    window.location.href =
      "mailto:admin@julee.local?subject=Demande d'accès - " + user?.email;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: "64px",
            marginBottom: "20px",
          }}
        >
          🔒
        </div>

        <h1
          style={{
            color: "#1f2937",
            fontSize: "24px",
            marginBottom: "16px",
            fontWeight: "600",
          }}
        >
          Accès refusé
        </h1>

        <p
          style={{
            color: "#6b7280",
            fontSize: "16px",
            lineHeight: "1.5",
            marginBottom: "24px",
          }}
        >
          Bonjour {user?.prenom || ""} {user?.nom || ""},<br />
          <br />
          Votre compte ({user?.email}) n'a actuellement accès à aucun module de
          l'application.
          <br />
          <br />
          Veuillez contacter votre administrateur pour obtenir les permissions
          nécessaires.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleContactAdmin}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#2563eb")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#3b82f6")}
          >
            Contacter l'administrateur
          </button>

          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#4b5563")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#6b7280")}
          >
            Se déconnecter
          </button>
        </div>

        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "8px",
          }}
        >
          <p
            style={{
              color: "#92400e",
              fontSize: "14px",
              margin: "0",
            }}
          >
            <strong>Information :</strong> Si vous pensez qu'il s'agit d'une
            erreur, vérifiez que votre administrateur vous a bien assigné les
            permissions nécessaires.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NoAccess;
