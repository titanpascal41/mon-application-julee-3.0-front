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

      // Rediriger vers le premier sous-module accessible après la connexion
      setTimeout(() => {
        const firstRoute = permissionService.getFirstAccessibleRoute();
        console.log(" Première route accessible:", firstRoute);

        if (firstRoute) {
          navigate(`/${firstRoute}`);
          console.log(` Redirection vers /${firstRoute}`);
        } else {
          // Fallback pour l'admin : si aucune route trouvée mais c'est un admin, rediriger vers administration-profils
          if (permissionService.isAdmin()) {
            navigate("/administration-profils");
            console.log(
              " Admin détecté, redirection vers /administration-profils",
            );
          } else {
            navigate("/no-access");
            console.log(
              " Aucune route accessible, redirection vers /no-access",
            );
          }
        }
      }, 1000); // Attendre que les permissions soient chargées
      console.log(
        " Connexion réussie, recherche des sous-modules accessibles...",
      );
    } catch (error) {
      console.error("Erreur de connexion:", error);
      changerMessageConnexion("Erreur de connexion. Veuillez réessayer.");
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
              onChange={(e) => changerEmailConnexion(e.target.value)}
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
