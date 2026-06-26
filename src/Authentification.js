import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./components/AuthProvider";
import permissionService from "./services/permissionService";
import imageBleu from "./image/abstrait-bleu-degrade-bleu-fonce-lisse-vignette-noire-studio_1258-53689.avif";

const Authentification = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // États pour le formulaire de connexion
  const [emailConnexion, changerEmailConnexion] = useState("");
  const [motDePasseConnexion, changerMotDePasseConnexion] = useState("");
  const [messageConnexion, changerMessageConnexion] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Fonction pour gérer la connexion
  const gererConnexion = async () => {
    if (!emailConnexion || !motDePasseConnexion) {
      changerMessageConnexion("Veuillez remplir tous les champs");
      return;
    }

    try {
      // Utiliser la fonction login du AuthProvider
      await login({
        email: emailConnexion,
        motDePasse: motDePasseConnexion,
      });

      // Attendre que les permissions soient réellement chargées puis rediriger
      const attendreEtRediriger = async () => {
        const maxTentatives = 60; // 6 secondes max (60 × 100ms)
        let tentatives = 0;
        while (!permissionService.userPermissions && tentatives < maxTentatives) {
          await new Promise((r) => setTimeout(r, 100));
          tentatives++;
        }
        const firstRoute = permissionService.getFirstAccessibleRoute();
        if (firstRoute) {
          navigate(`/${firstRoute}`, { replace: true });
        } else {
          navigate(permissionService.isAdmin() ? "/tableau-de-bord" : "/no-access", { replace: true });
        }
      };
      attendreEtRediriger();
    } catch (error) {
      console.error("Erreur de connexion:", error);
      changerMessageConnexion(error.message || "Erreur de connexion. Veuillez réessayer.");
    }
  };

  // Afficher uniquement le formulaire de connexion
  return (
    <div className="Authentification">
      {/* section de la gauche  */}
      <div className="image">
        <img src={imageBleu} alt="Abstrait bleu dégradé" loading="lazy" />
        <div className="nomlogo">
          <div className="nomlogotitre">JULEE</div>
          <div className="nomlogosoustitre">
            Votre gestionnaire de demande de projet{" "}
          </div>
        </div>
      </div>
      {/* section de la droite */}

      <div className="backsectionauth">
        <div className="sectionAuth">
          <br />
          <div className="contener">
            {/* Formulaire de connexion uniquement */}
            <div className="connecterzvous">
              {" "}
              BIENVENUE <br />
              connectez-vous à JULLEE
            </div>
            <br />
            {messageConnexion && (
              <div
                className={`message ${
                  messageConnexion.includes("réussie")
                    ? "message-succes"
                    : "message-erreur"
                }`}
              >
                {messageConnexion}
              </div>
            )}
            <label htmlFor="email">
              Email <span className="required">*</span>
            </label>

            <input
              id="email"
              type="email"
              placeholder="exemple@mail.fr"
              value={emailConnexion}
              onChange={(e) => changerEmailConnexion(e.target.value.toLowerCase())}
              required
              autoComplete="off"
            />
            <br />
            <label htmlFor="password">
              Mot de passe <span className="required">*</span>
            </label>

            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={motDePasseConnexion}
                onChange={(e) => changerMotDePasseConnexion(e.target.value)}
                required
                placeholder="entrez votre mot de passe"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  paddingRight: "40px",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                  fontSize: "16px",
                  padding: "5px",
                }}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                <i
                  className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}
                ></i>
              </button>
            </div>
            <br />
            <div className="lebouton" onClick={gererConnexion}>
              Se connecter
            </div>
            <br />
            <div
              className="creationcompte"
              style={{ textAlign: "justify", color: "#666", fontSize: "0.9em" }}
            >
              Seuls les administrateurs peuvent créer des comptes.<br />
              Contactez votre administrateur pour obtenir un accès.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Authentification;
