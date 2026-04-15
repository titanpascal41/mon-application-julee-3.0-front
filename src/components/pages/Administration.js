import { useState, useEffect, useCallback } from "react";

import {

  chargerProfils,

  creerProfil,

  mettreAJourProfil,

  supprimerProfil,

  profilEstUtilise,

  toggleActivationProfil,

} from "../../data/gestionProfils";
import { useAuth } from "../AuthProvider";

import {

  chargerUtilisateurs,

  creerUtilisateur,

  mettreAJourUtilisateur,

  supprimerUtilisateur,

} from "../../data/baseDeDonnees";

import {

  chargerPermissionsProfil,

  creerPermissionsDefaut,

  mettreAJourPermissions,

  MODULES_STRUCTURE,

  genererPermissionsStructure,

} from "../../data/gestionPermissions";

import permissionService from "../../services/permissionService";



const Administration = ({ activeSubPage: activeSubPageProp }) => {

  const [activeSubPage, setActiveSubPage] = useState("profils");
  const { user } = useAuth();



  // États pour la gestion des profils

  const [profils, setProfils] = useState([]);

  const [showForm, setShowForm] = useState(false);

  const [editingProfil, setEditingProfil] = useState(null);

  const [formData, setFormData] = useState({

    code: "",

    nom: "",

  });

  const [message, setMessage] = useState({ type: "", text: "" });

        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

        const [profilToDelete, setProfilToDelete] = useState(null);

        const [deleteError, setDeleteError] = useState("");

        // États pour désactivation/réactivation
        const [showDeactivateModal, setShowDeactivateModal] = useState(false);
        const [profilToToggle, setProfilToToggle] = useState(null);
        const [motifDesactivation, setMotifDesactivation] = useState("");

  // État pour popup info profil avec utilisateurs
  const [showProfilOccupeModal, setShowProfilOccupeModal] = useState(false);
  const [profilOccupeName, setProfilOccupeName] = useState("");



  // États pour la modal de détail des utilisateurs

  const [showUsersModal, setShowUsersModal] = useState(false);

  const [selectedProfilUsers, setSelectedProfilUsers] = useState([]);

  const [selectedProfilName, setSelectedProfilName] = useState("");



  // États pour la modal de consultation des permissions

  const [showViewPermissionsModal, setShowViewPermissionsModal] =

    useState(false);

  const [viewPermissionsData, setViewPermissionsData] = useState([]);

  const [viewProfilName, setViewProfilName] = useState("");



  // États pour la gestion des permissions

  const [permissionsData, setPermissionsData] = useState([]);

  const [currentProfilForPermissions, setCurrentProfilForPermissions] =

    useState(null);

  const [showPermissionsInMainForm, setShowPermissionsInMainForm] =

    useState(false);



  // États pour la gestion des utilisateurs

  const [utilisateurs, setUtilisateurs] = useState([]);

  const [showUserForm, setShowUserForm] = useState(false);

  const [editingUser, setEditingUser] = useState(null);

  const [showUserPassword, setShowUserPassword] = useState(false);

  const [userFormData, setUserFormData] = useState({

    nom: "",

    prenom: "",

    email: "",

    motDePasse: "",

    profilId: "",

  });

  const [userMessage, setUserMessage] = useState({ type: "", text: "" });

  const [showUserDeleteConfirm, setShowUserDeleteConfirm] = useState(false);

  const [userToDelete, setUserToDelete] = useState(null);



  useEffect(() => {

    if (activeSubPageProp) {

      if (activeSubPageProp.includes("profils")) setActiveSubPage("profils");

      else if (activeSubPageProp.includes("utilisateurs"))

        setActiveSubPage("utilisateurs");

    } else {

      // Si aucune sous-page spécifiée, rediriger vers le premier module accessible

      const accessibleModules = permissionService.getAccessibleModules();

      if (accessibleModules.length > 0) {

        // Rediriger vers le premier module accessible

        window.location.href = `/${accessibleModules[0]}`;

      } else {

        // Si aucun module accessible, rester sur profils par défaut

        setActiveSubPage("profils");

      }

    }

  }, [activeSubPageProp]);



  const chargerLesProfils = useCallback(async () => {

    const profilsCharges = await chargerProfils();

    setProfils(profilsCharges);

  }, []);



  const chargerLesUtilisateurs = useCallback(async () => {

    const utilisateursCharges = await chargerUtilisateurs();

    setUtilisateurs(utilisateursCharges);

  }, []);



  useEffect(() => {

    if (activeSubPage === "profils") {

      chargerLesProfils();

      chargerLesUtilisateurs();

    } else if (activeSubPage === "utilisateurs") {

      chargerLesProfils();

      chargerLesUtilisateurs();

    }

  }, [activeSubPage, chargerLesProfils, chargerLesUtilisateurs]);



  const handleInputChange = (e) => {

    const { name, value } = e.target;

    setFormData((prev) => ({

      ...prev,

      [name]: value,

    }));

    if (message.text) {

      setMessage({ type: "", text: "" });

    }

  };



  const handleCreate = () => {

    setEditingProfil(null);

    setFormData({ nom: "", abreviation: "" });

    setShowForm(true);

    setShowPermissionsInMainForm(false);

    setMessage({ type: "", text: "" });

  };



  const handleEdit = (profil) => {
    // Bloquer si le profil a des utilisateurs
    if (utilisateurs.some((u) => u.profilId === profil.id)) {
      setProfilOccupeName(profil.nom);
      setShowProfilOccupeModal(true);
      return;
    }

    setEditingProfil(profil);

    setFormData({

      code: profil.code || "",

      nom: profil.nom,

    });

    setShowForm(true);

    setMessage({ type: "", text: "" });

  };



  const handleDelete = async (profil) => {
    // Vérifier d'abord si le profil est utilisé
    const estUtilise = await profilEstUtilise(profil.id);
    
    if (estUtilise) {
      // Afficher directement le message d'erreur sans confirmation
      setDeleteError("Ce profil ne peut pas être supprimé car il est assigné à un ou plusieurs utilisateurs");
      setProfilToDelete(profil);
      setShowDeleteConfirm(true);
    } else {
      // Afficher la confirmation normale
      setProfilToDelete(profil);
      setShowDeleteConfirm(true);
    }
  };



  const confirmDelete = async () => {

    if (profilToDelete) {

      const resultat = await supprimerProfil(profilToDelete.id);

      if (resultat.succes) {

        setMessage({

          type: "success",

          text: `Profil "${profilToDelete.nom}" supprimé avec succès`,

        });

        await chargerLesProfils();

        setTimeout(() => setMessage({ type: "", text: "" }), 3000);

        setShowDeleteConfirm(false);

        setProfilToDelete(null);

        setDeleteError("");

      } else {

        setDeleteError(resultat.message);

      }

    }

  };



  const cancelDelete = () => {

    setShowDeleteConfirm(false);

    setProfilToDelete(null);

    setDeleteError("");

  };

  // Désactivation / réactivation
  const handleToggleActivation = (profil) => {
    if (profil.actif !== false) {
      setProfilToToggle(profil);
      setMotifDesactivation("");
      setShowDeactivateModal(true);
    } else {
      confirmReactivation(profil);
    }
  };

  const confirmDeactivation = async () => {
    if (!motifDesactivation.trim()) return;
    const resultat = await toggleActivationProfil(profilToToggle.id, false, motifDesactivation.trim(), user?.id);
    if (resultat.succes) {
      setMessage({ type: "success", text: `Profil "${profilToToggle.nom}" désactivé.` });
      await chargerLesProfils();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } else {
      setMessage({ type: "error", text: resultat.message || "Erreur lors de la désactivation" });
    }
    setShowDeactivateModal(false);
    setProfilToToggle(null);
    setMotifDesactivation("");
  };

  const confirmReactivation = async (profil) => {
    const resultat = await toggleActivationProfil(profil.id, true, null, user?.id);
    if (resultat.succes) {
      setMessage({ type: "success", text: `Profil "${profil.nom}" réactivé.` });
      await chargerLesProfils();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } else {
      setMessage({ type: "error", text: resultat.message || "Erreur lors de la réactivation" });
    }
  };



  const validateProfilForm = () => {

    if (!formData.nom.trim()) {

      setMessage({ type: "error", text: "Le nom du profil est obligatoire." });

      return false;

    }

    return true;

  };



  const handleSubmit = async (e) => {

    e.preventDefault();

    setMessage({ type: "", text: "" });



    if (!validateProfilForm()) return;



    let resultat;

    if (editingProfil) {

      resultat = await mettreAJourProfil(editingProfil.id, formData.nom, formData.code);

    } else {

      resultat = await creerProfil(formData.nom, formData.code);

    }



    if (resultat.succes) {

      const action = editingProfil ? "modifié" : "créé";

      setMessage({

        type: "success",

        text: `Profil "${formData.nom}" ${action} avec succès`,

      });

      await chargerLesProfils();

      setShowForm(false);

      setFormData({ nom: "" });

      setEditingProfil(null);

      setTimeout(() => setMessage({ type: "", text: "" }), 3000);

    } else {

      setMessage({ type: "error", text: resultat.message });

    }

  };



  const handleCancel = () => {

    setShowForm(false);

    setFormData({ nom: "" });

    setEditingProfil(null);

    setMessage({ type: "", text: "" });

  };



  // Fonctions pour la gestion des permissions

  const handleShowUsers = (profil) => {

    const usersForProfil = utilisateurs.filter(

      (user) => user.profilId === profil.id,

    );

    setSelectedProfilUsers(usersForProfil);

    setSelectedProfilName(profil.nom);

    setShowUsersModal(true);

  };



  const handleCloseUsersModal = () => {

    setShowUsersModal(false);

    setSelectedProfilUsers([]);

    setSelectedProfilName("");

  };



  // Fonction pour consulter les permissions d'un profil

  const handleViewPermissions = async (profil) => {

    try {

      const permissions = await chargerPermissionsProfil(profil.id);

      setViewProfilName(profil.nom);

      setViewPermissionsData(permissions);

      setShowViewPermissionsModal(true);

    } catch (error) {

      console.error("Erreur lors de la consultation des permissions:", error);

      setMessage({

        type: "error",

        text: "Erreur lors du chargement des permissions",

      });

      setTimeout(() => setMessage({ type: "", text: "" }), 3000);

    }

  };



  const handleCloseViewPermissionsModal = () => {

    setShowViewPermissionsModal(false);

    setViewPermissionsData([]);

    setViewProfilName("");

  };



  const handleManagePermissions = async (profil) => {

    try {

      const permissions = await chargerPermissionsProfil(profil.id);

      setCurrentProfilForPermissions(profil);



      // Toujours générer la structure complète

      const completeStructure = genererPermissionsStructure();



      // Fusionner avec les permissions existantes

      if (permissions.length > 0) {

        const mergedPermissions = completeStructure.map((defaultPerm) => {

          const existingPerm = permissions.find(

            (p) =>

              p.module === defaultPerm.module &&

              p.submodule === defaultPerm.submodule,

          );



          if (existingPerm) {

            // Utiliser les permissions existantes avec les labels

            return {

              ...existingPerm,

              moduleLabel:

                MODULES_STRUCTURE[existingPerm.module]?.label ||

                existingPerm.module,

              submoduleLabel:

                MODULES_STRUCTURE[existingPerm.module]?.submodules[

                  existingPerm.submodule

                ] || existingPerm.submodule,

            };

          } else {

            // Utiliser les permissions par défaut

            return defaultPerm;

          }

        });

        setPermissionsData(mergedPermissions);

      } else {

        // Si pas de permissions, créer les permissions par défaut

        await creerPermissionsDefaut(profil.id);

        setPermissionsData(completeStructure);

      }



      // Ouvrir le popup principal en mode permissions pour un profil existant

      setEditingProfil(profil);

      setFormData({ code: profil.code || "", nom: profil.nom });

      setShowPermissionsInMainForm(true);

      setShowForm(true);

    } catch (error) {

      console.error("Erreur lors de la gestion des permissions:", error);

      setMessage({

        type: "error",

        text: "Erreur lors de la gestion des permissions",

      });

    }

  };



  const handlePermissionsSubmit = async (e) => {

    e.preventDefault();

    console.log("handlePermissionsSubmit appelé"); // Debug

    setMessage({ type: "", text: "" });



    try {

      console.log("Envoi des permissions:", permissionsData); // Debug

      const resultat = await mettreAJourPermissions(

        currentProfilForPermissions.id,

        permissionsData,

      );



      console.log("Résultat de la mise à jour:", resultat); // Debug



      // Fermer le formulaire dans tous les cas (succès ou erreur)

      if (resultat.succes || resultat.success || resultat.warning) {

        setMessage({

          type: resultat.warning ? "warning" : "success",

          text: resultat.warning || "Permissions mises à jour avec succès",

        });



        // Forcer le rafraîchissement du service de permissions

        try {

          await permissionService.refreshPermissions();

        } catch (refreshError) {

          console.warn(

            "Erreur lors du rafraîchissement des permissions:",

            refreshError,

          );

        }

      } else {

        setMessage({

          type: "error",

          text: resultat.message || "Erreur lors de la mise à jour",

        });

      }



      // Fermer le formulaire dans tous les cas

      console.log("Fermeture du formulaire"); // Debug

      setShowForm(false);

      setShowPermissionsInMainForm(false);

      setEditingProfil(null);

      setCurrentProfilForPermissions(null);

      setPermissionsData([]);



      setTimeout(() => setMessage({ type: "", text: "" }), 3000);

    } catch (error) {

      console.error("Erreur lors de la mise à jour des permissions:", error);

      setMessage({

        type: "error",

        text: "Erreur lors de la mise à jour des permissions",

      });



      // Fermer le formulaire même en cas d'erreur

      console.log("Fermeture du formulaire (erreur)"); // Debug

      setShowForm(false);

      setShowPermissionsInMainForm(false);

      setEditingProfil(null);

      setCurrentProfilForPermissions(null);

      setPermissionsData([]);



      setTimeout(() => setMessage({ type: "", text: "" }), 3000);

    }

  };



  const handlePermissionChange = (module, submodule, field, value) => {

    setPermissionsData((prev) =>

      prev.map((perm) =>

        perm.module === module && perm.submodule === submodule

          ? { ...perm, [field]: value }

          : perm,

      ),

    );

  };

  const handleSelectAllPermissions = (checked) => {
    setPermissionsData((prev) =>
      prev.map((perm) => ({
        ...perm,
        access: checked,
        créer: checked,
        lire: checked,
        modifier: checked,
        supprimer: checked,
      }))
    );
  };

  const allPermissionsChecked =
    permissionsData.length > 0 &&
    permissionsData.every((p) => p.access && p.créer && p.lire && p.modifier && p.supprimer);



  // Fonctions pour la gestion des permissions utilisateur

  /*

  const handleManageUserPermissions = async (user) => {

    try {

      // Vérifier si l'utilisateur a des permissions personnalisées

      const customCheck = await verifierPermissionsPersonnalisees(user.id);

      setHasCustomPermissions(customCheck.hasCustomPermissions);

      

      // Charger les permissions de l'utilisateur

      const permissions = await chargerPermissionsUtilisateurIndividuelles(user.id);

      setCurrentUserForPermissions(user);

      

      // Toujours générer la structure complète

      const completeStructure = genererPermissionsStructure();

      

      // Fusionner avec les permissions existantes

      if (permissions.length > 0) {

        const mergedPermissions = completeStructure.map((defaultPerm) => {

          const existingPerm = permissions.find(

            (p) => p.module === defaultPerm.module && p.submodule === defaultPerm.submodule

          );

          

          if (existingPerm) {

            // Utiliser les permissions existantes avec les labels

            return {

              ...existingPerm,

              moduleLabel: USER_MODULES_STRUCTURE[existingPerm.module]?.label || existingPerm.module,

              submoduleLabel:

                USER_MODULES_STRUCTURE[existingPerm.module]?.submodules[existingPerm.submodule] ||

                existingPerm.submodule,

            };

          } else {

            // Utiliser les permissions par défaut

            return defaultPerm;

          }

        });

        setUserPermissionsData(mergedPermissions);

      } else {

        // Si pas de permissions, créer les permissions par défaut

        setUserPermissionsData(completeStructure);

      }



      // Ouvrir le popup principal en mode permissions pour un utilisateur existant

      setEditingUser(user);

      setUserFormData({

        nom: user.nom,

        prenom: user.prenom,

        email: user.email,

        motDePasse: "",

        profilId: user.profilId || "",

      });

      setShowUserPermissionsForm(true);

      setShowUserForm(true);

    } catch (error) {

      console.error("Erreur lors de la gestion des permissions utilisateur:", error);

      setUserMessage({

        type: "error",

        text: "Erreur lors de la gestion des permissions",

      });

    }

  };



  const handleUserPermissionsSubmit = async (e) => {

    e.preventDefault();

    setUserMessage({ type: "", text: "" });



    try {

      const resultat = await mettreAJourPermissionsUtilisateur(

        currentUserForPermissions.id,

        userPermissionsData

      );



      if (resultat.succes) {

        setUserMessage({

          type: "success",

          text: "Permissions utilisateur mises à jour avec succès",

        });

        

        // Forcer le rafraîchissement du service de permissions

        await permissionService.refreshPermissions();

        

        // Fermer le formulaire

        setShowUserForm(false);

        setShowUserPermissionsForm(false);

        setEditingUser(null);

        setCurrentUserForPermissions(null);

        setUserPermissionsData([]);

        

        setTimeout(() => setUserMessage({ type: "", text: "" }), 3000);

      } else {

        setUserMessage({ type: "error", text: resultat.message });

      }

    } catch (error) {

      console.error("Erreur lors de la mise à jour des permissions utilisateur:", error);

      setUserMessage({ type: "error", text: "Erreur lors de la mise à jour des permissions utilisateur" });

    }

  };



  const handleUserPermissionChange = (module, submodule, field, value) => {

    setUserPermissionsData((prev) =>

      prev.map((perm) =>

        perm.module === module && perm.submodule === submodule

          ? { ...perm, [field]: value }

          : perm

      )

    );

  };



  const handleResetUserPermissions = async (user) => {

    try {

      const resultat = await reinitialiserPermissionsUtilisateur(user.id);

      

      if (resultat.succes) {

        setUserMessage({

          type: "success",

          text: resultat.message,

        });

        

        // Recharger les permissions depuis le profil

        await chargerLesUtilisateurs();

        setHasCustomPermissions(false);

        

        setTimeout(() => setUserMessage({ type: "", text: "" }), 3000);

      } else {

        setUserMessage({ type: "error", text: resultat.message });

      }

    } catch (error) {

      console.error("Erreur lors de la réinitialisation des permissions utilisateur:", error);

      setUserMessage({ type: "error", text: "Erreur lors de la réinitialisation des permissions" });

    }

  };

  */



  // Fonctions pour la gestion des utilisateurs

  const handleUserInputChange = (e) => {

    const { name, value } = e.target;

    setUserFormData((prev) => ({

      ...prev,

      [name]: value,

    }));

    if (userMessage.text) {

      setUserMessage({ type: "", text: "" });

    }

  };



  const handleCreateUser = () => {

    setEditingUser(null);

    setUserFormData({

      nom: "",

      prenom: "",

      email: "",

      motDePasse: "",

      profilId: profils.length > 0 ? profils[0].id.toString() : "",

    });

    setShowUserForm(true);

    setUserMessage({ type: "", text: "" });

  };



  const handleEditUser = (user) => {

    setEditingUser(user);

    setUserFormData({

      nom: user.nom,

      prenom: user.prenom,

      email: user.email,

      motDePasse: "",

      profilId: user.profilId || "",

    });

    setShowUserForm(true);

    setUserMessage({ type: "", text: "" });

  };



  const handleDeleteUser = (user) => {

    setUserToDelete(user);

    setShowUserDeleteConfirm(true);

  };



  const confirmDeleteUser = async () => {

    if (userToDelete) {

      const resultat = await supprimerUtilisateur(userToDelete.id);

      if (resultat.succes) {

        const userName = `${userToDelete.prenom} ${userToDelete.nom}`.trim();

        setUserMessage({

          type: "success",

          text: `Utilisateur "${userName}" supprimé avec succès`,

        });

        await chargerLesUtilisateurs();

        setTimeout(() => setUserMessage({ type: "", text: "" }), 3000);

        setShowUserDeleteConfirm(false);

        setUserToDelete(null);

      } else {

        setUserMessage({ type: "error", text: resultat.message });

      }

    }

  };



  const cancelDeleteUser = () => {

    setShowUserDeleteConfirm(false);

    setUserToDelete(null);

  };



  const validatePassword = (mdp) => {
    if (mdp.length < 8) return { valide: false, message: "Le mot de passe doit contenir au moins 8 caractères." };
    if (!/[A-Z]/.test(mdp)) return { valide: false, message: "Le mot de passe doit contenir au moins une majuscule." };
    if (!/[0-9]/.test(mdp)) return { valide: false, message: "Le mot de passe doit contenir au moins un chiffre." };
    if (!/[@!#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(mdp)) return { valide: false, message: "Le mot de passe doit contenir au moins un caractère spécial (@!#$%^&*...)." };
    return { valide: true };
  };

  const getPasswordStrength = (mdp) => {
    if (!mdp) return null;
    let score = 0;
    if (mdp.length >= 8) score++;
    if (/[A-Z]/.test(mdp)) score++;
    if (/[0-9]/.test(mdp)) score++;
    if (/[@!#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(mdp)) score++;
    if (mdp.length >= 12) score++;
    if (score <= 2) return { niveau: "Faible", couleur: "#ef4444", largeur: "33%" };
    if (score <= 3) return { niveau: "Moyen", couleur: "#f59e0b", largeur: "66%" };
    return { niveau: "Fort", couleur: "#22c55e", largeur: "100%" };
  };

  const validateUserForm = () => {

    if (!userFormData.nom.trim()) {

      setUserMessage({ type: "error", text: "Le nom est obligatoire." });

      return false;

    }

    if (!userFormData.prenom.trim()) {

      setUserMessage({ type: "error", text: "Le prénom est obligatoire." });

      return false;

    }

    if (!userFormData.email.trim()) {

      setUserMessage({ type: "error", text: "L'email est obligatoire." });

      return false;

    }

    if (!editingUser && !userFormData.motDePasse) {

      setUserMessage({ type: "error", text: "Le mot de passe est obligatoire." });

      return false;

    }

    if (userFormData.motDePasse) {

      const check = validatePassword(userFormData.motDePasse);

      if (!check.valide) {

        setUserMessage({ type: "error", text: check.message });

        return false;

      }

    }

    return true;

  };



  const handleUserSubmit = async (e) => {

    e.preventDefault();

    setUserMessage({ type: "", text: "" });



    if (!validateUserForm()) return;



    let resultat;

    if (editingUser) {

      resultat = await mettreAJourUtilisateur(

        editingUser.id,

        userFormData.prenom,

        userFormData.nom,

        userFormData.email,

        userFormData.motDePasse,

        parseInt(userFormData.profilId),

        "",

      );

    } else {

      resultat = await creerUtilisateur(

        userFormData.prenom,

        userFormData.nom,

        userFormData.email,

        userFormData.motDePasse,

        parseInt(userFormData.profilId),

        "",

      );

    }



    if (resultat.succes) {

      const action = editingUser ? "modifié" : "créé";

      const userName = `${userFormData.prenom} ${userFormData.nom}`.trim();

      setUserMessage({

        type: "success",

        text: `Utilisateur "${userName}" ${action} avec succès`,

      });

      // Forcer le rafraîchissement des utilisateurs ET des profils

      await chargerLesUtilisateurs();

      await chargerLesProfils();

      setShowUserForm(false);

      setUserFormData({

        nom: "",

        prenom: "",

        email: "",

        motDePasse: "",

        profilId: "",

      });

      setEditingUser(null);

      setTimeout(() => setUserMessage({ type: "", text: "" }), 3000);

    } else {

      setUserMessage({ type: "error", text: resultat.message });

    }

  };



  const handleCancelUser = () => {

    setShowUserForm(false);

    setUserFormData({

      nom: "",

      prenom: "",

      email: "",

      motDePasse: "",

      profilId: "",

    });

    setEditingUser(null);

    setUserMessage({ type: "", text: "" });

  };



  const getProfilName = (profilId) => {

    const profil = profils.find((p) => p.id === profilId);

    return profil ? profil.nom : "Profil introuvable";

  };



  const subPages = {

    profils: {

      title: "Gestion des Profils",

      content: (

        <div>

          <div className="action-buttons">

            <button className="btn-primary" onClick={handleCreate}>

              Ajouter un profil

            </button>

          </div>



          {showForm && (

            <div className="modal-overlay" onClick={handleCancel}>

              <div

                className="modal-content"

                onClick={(e) => e.stopPropagation()}

                style={{

                  padding: "24px",

                  maxWidth: "800px",

                  width: "90%",

                  maxHeight: "85vh",

                  overflow: "hidden",

                  display: "flex",

                  flexDirection: "column",

                }}

              >

                <div

                  className="modal-header"

                  style={{ marginBottom: "20px", flexShrink: 0 }}

                >

                  <h3

                    style={{

                      margin: "0",

                      fontSize: "18px",

                      fontWeight: "600",

                      color: "#1a1a1a",

                    }}

                  >

                    {showPermissionsInMainForm

                      ? `Configuration des permissions - ${currentProfilForPermissions?.nom}`

                      : editingProfil

                        ? "Modifier le profil"

                        : "Créer un nouveau profil"}

                  </h3>


                </div>

                {message.text && (

                  <div

                    className={`info-box ${

                      message.type === "error" ? "error-box" : "success-box"

                    }`}

                    style={{ marginBottom: "16px", flexShrink: 0 }}

                  >

                    <p>{message.text}</p>

                  </div>

                )}

                <form

                  onSubmit={

                    showPermissionsInMainForm

                      ? handlePermissionsSubmit

                      : handleSubmit

                  }

                  style={{

                    flex: 1,

                    overflow: "hidden",

                    display: "flex",

                    flexDirection: "column",

                  }}

                >

                  {!showPermissionsInMainForm ? (

                    // Formulaire de profil normal

                    <>

                      <div

                        className="form-group"

                        style={{ flex: 1, overflow: "auto" }}

                      >

                        <label htmlFor="code">

                          Code (acronyme)

                        </label>

                        <input

                          type="text"

                          id="code"

                          name="code"

                          value={formData.code}

                          onChange={handleInputChange}

                          placeholder="Ex: GP, PMO, DEV..."

                          maxLength={20}

                          style={{ textTransform: "uppercase" }}

                        />

                        <label htmlFor="nom" style={{ marginTop: "12px" }}>

                          Libelle<span className="required">*</span>

                        </label>

                        <input

                          type="text"

                          id="nom"

                          name="nom"

                          value={formData.nom}

                          onChange={handleInputChange}

                          required

                        />

                      </div>

                      <div

                        className="modal-actions"

                        style={{ flexShrink: 0, marginTop: "20px" }}

                      >

                        <button type="submit" className="btn-primary">

                          {editingProfil ? "Mettre à jour" : "Créer"}

                        </button>

                        <button

                          type="button"

                          className="btn-secondary"

                          onClick={handleCancel}

                        >

                          Annuler

                        </button>

                      </div>

                    </>

                  ) : (

                    // Formulaire de permissions

                    <>

                      {/* Case "Tout cocher" */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        marginBottom: "12px",
                        backgroundColor: "rgba(74, 144, 226, 0.06)",
                        borderRadius: "8px",
                        border: "1px solid rgba(74, 144, 226, 0.2)",
                      }}>
                        <input
                          type="checkbox"
                          id="select-all-permissions"
                          checked={allPermissionsChecked}
                          onChange={(e) => handleSelectAllPermissions(e.target.checked)}
                          style={{ width: "16px", height: "16px", accentColor: "#4A90E2", cursor: "pointer" }}
                        />
                        <label htmlFor="select-all-permissions" style={{ fontSize: "13px", fontWeight: "600", color: "#4A90E2", cursor: "pointer" }}>
                          Tout cocher — attribuer toutes les permissions
                        </label>
                      </div>

                      <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>

                        {Object.entries(
                          permissionsData.reduce((acc, perm) => {
                            if (!acc[perm.module]) acc[perm.module] = [];
                            acc[perm.module].push(perm);
                            return acc;
                          }, {})
                        ).map(([module, submodules]) => (
                          <div key={module} style={{ marginBottom: "16px" }}>

                            <div style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#4A90E2",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              marginBottom: "8px",
                              paddingLeft: "2px",
                            }}>
                              {MODULES_STRUCTURE[module]?.label || module}
                            </div>

                            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                              {submodules.map((perm, idx) => (
                                <div
                                  key={`${module}_${perm.submodule}`}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "10px 14px",
                                    backgroundColor: idx % 2 === 0 ? "white" : "#fafafa",
                                    borderTop: idx > 0 ? "1px solid #f3f4f6" : "none",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", minWidth: "200px", flex: 1 }}>
                                    <input
                                      type="checkbox"
                                      checked={perm.access}
                                      onChange={(e) => handlePermissionChange(perm.module, perm.submodule, "access", e.target.checked)}
                                      style={{ width: "15px", height: "15px", accentColor: "#4A90E2" }}
                                    />
                                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                                      {MODULES_STRUCTURE[module]?.submodules[perm.submodule] || perm.submodule}
                                    </span>
                                  </label>

                                  {perm.access && (
                                    <div style={{ display: "flex", gap: "16px" }}>
                                      {["créer", "lire", "modifier", "supprimer"].map((action) => (
                                        <label key={action} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                                          <input
                                            type="checkbox"
                                            checked={perm[action]}
                                            onChange={(e) => handlePermissionChange(perm.module, perm.submodule, action, e.target.checked)}
                                            style={{ width: "14px", height: "14px", accentColor: "#4A90E2" }}
                                          />
                                          <span style={{ fontSize: "12px", color: "#6b7280", textTransform: "capitalize" }}>{action}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                          </div>
                        ))}

                      </div>

                      <div style={{ flexShrink: 0, marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px" }}>

                        <button type="submit" className="btn-primary">
                          Appliquer les permissions
                        </button>

                        <button type="button" className="btn-secondary" onClick={handleCancel}>
                          Annuler
                        </button>

                      </div>

                    </>

                  )}

                </form>

              </div>

            </div>

          )}



          <div className="table-container" style={{ marginTop: "24px" }}>

            <h3>Liste des profils</h3>

            {profils.length === 0 ? (

              <p style={{ color: "#6b7280", marginTop: "16px" }}>

                Aucun profil créé pour le moment.

              </p>

            ) : (

              <table className="data-table">

                <thead>

                  <tr>

                    <th>Code</th>

                    <th>Libelle</th>

                    <th>Nombre d'utilisateurs</th>

                    <th>Accès</th>

                    <th>Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {profils

                    .filter((profil) => profil.id !== 1)

                    .map((profil) => (

                      <tr key={profil.id} style={{ opacity: profil.actif === false ? 0.6 : 1, backgroundColor: profil.actif === false ? "#F3F4F6" : "inherit" }}>

                        <td>

                          {profil.code ? (

                            <span style={{

                              backgroundColor: "#e0e7ff",

                              color: "#3730a3",

                              padding: "2px 8px",

                              borderRadius: "6px",

                              fontWeight: "600",

                              fontSize: "13px",

                            }}>

                              {profil.code}

                            </span>

                          ) : (

                            <span style={{ color: "#9ca3af", fontSize: "13px" }}>—</span>

                          )}

                        </td>

                        <td>{profil.nom}</td>

                        <td>

                          <button

                            style={{

                              padding: "6px 14px",

                              borderRadius: "12px",

                              backgroundColor: "#dbeafe",

                              color: "#1e40af",

                              fontWeight: "500",

                              fontSize: "14px",

                              border: "1px solid #bfdbfe",

                              cursor: "pointer",

                              transition: "all 0.2s ease",

                              textDecoration: "none",

                              display: "inline-block",

                            }}

                            onClick={() => handleShowUsers(profil)}

                            onMouseOver={(e) => {

                              e.target.style.backgroundColor = "#bfdbfe";

                              e.target.style.transform = "scale(1.05)";

                              e.target.style.textDecoration = "underline";

                            }}

                            onMouseOut={(e) => {

                              e.target.style.backgroundColor = "#dbeafe";

                              e.target.style.transform = "scale(1)";

                              e.target.style.textDecoration = "none";

                            }}

                          >

                            {

                              utilisateurs.filter(

                                (user) => user.profilId === profil.id,

                              ).length

                            }{" "}

                            utilisateur(s)

                          </button>

                        </td>

                        <td>

                          <button

                            style={{

                              padding: "6px 14px",

                              borderRadius: "12px",

                              backgroundColor: "#dcfce7",

                              color: "#166534",

                              fontWeight: "500",

                              fontSize: "14px",

                              border: "1px solid #bbf7d0",

                              cursor: "pointer",

                              transition: "all 0.2s ease",

                            }}

                            onClick={() => handleViewPermissions(profil)}

                            onMouseOver={(e) => {

                              e.target.style.backgroundColor = "#bbf7d0";

                              e.target.style.transform = "scale(1.05)";

                            }}

                            onMouseOut={(e) => {

                              e.target.style.backgroundColor = "#dcfce7";

                              e.target.style.transform = "scale(1)";

                            }}

                          >

                            Voir les accès

                          </button>

                        </td>

                        <td>

                          <button
                            className="btn-secondary"
                            onClick={() => handleEdit(profil)}
                            disabled={profil.actif === false}
                            style={{
                              marginRight: "5px",
                              opacity: profil.actif === false ? 0.4 : 1,
                              cursor: profil.actif === false ? "not-allowed" : "pointer",
                            }}
                          >
                            Modifier
                          </button>

                          <button
                            className="btn-primary"
                            onClick={() => handleManagePermissions(profil)}
                            disabled={profil.actif === false}
                            style={{
                              marginRight: "5px",
                              opacity: profil.actif === false ? 0.4 : 1,
                              cursor: profil.actif === false ? "not-allowed" : "pointer",
                            }}
                          >
                            Attribuer des permissions
                          </button>

                          <button
                            className="btn-secondary"
                            onClick={() => handleToggleActivation(profil)}
                            style={{
                              width: "100px",
                              display: "inline-flex",
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: profil.actif !== false ? "#FEF3C7" : "#D1FAE5",
                              color: profil.actif !== false ? "#92400E" : "#065F46",
                              borderColor: profil.actif !== false ? "#FEF3C7" : "#D1FAE5",
                              transition: "background-color 0.15s, border-color 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = profil.actif !== false ? "#FDE68A" : "#A7F3D0";
                              e.currentTarget.style.borderColor = profil.actif !== false ? "#FDE68A" : "#A7F3D0";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = profil.actif !== false ? "#FEF3C7" : "#D1FAE5";
                              e.currentTarget.style.borderColor = profil.actif !== false ? "#FEF3C7" : "#D1FAE5";
                            }}
                          >
                            {profil.actif !== false ? "Désactiver" : "Activer"}
                          </button>

                        </td>

                      </tr>

                    ))}

                </tbody>

              </table>

            )}

          </div>



          {showDeleteConfirm && (

            <div className="modal-overlay" onClick={cancelDelete}>

              <div

                className="modal-content"

                onClick={(e) => e.stopPropagation()}

                style={{ padding: "24px" }}

              >

                <div className="modal-header" style={{ marginBottom: "20px" }}>

                  <h3 style={{ margin: "0" }}>
                    {deleteError ? "Information" : "Confirmer la suppression"}
                  </h3>


                </div>

                {deleteError ? (
                  <div className="error-box" style={{ margin: "16px 0" }}>
                    <p>{deleteError}</p>
                  </div>
                ) : (
                  <p
                    style={{
                      marginBottom: "24px",
                      fontSize: "14px",
                      lineHeight: "1.5",
                    }}
                  >
                    Êtes-vous sûr de vouloir supprimer le profil "
                    {profilToDelete?.nom}" ? Cette action est irréversible.
                  </p>
                )}

                <div className="modal-actions" style={{ marginTop: "16px" }}>
                  {!deleteError && (
                    <button className="btn-danger" onClick={confirmDelete}>
                      Supprimer
                    </button>
                  )}
                  <button className="btn-secondary" onClick={cancelDelete}>
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* Modal profil avec utilisateurs — non modifiable */}
          {showProfilOccupeModal && (
            <div className="modal-overlay" onClick={() => setShowProfilOccupeModal(false)}>
              <div
                className="modal-content"
                style={{ maxWidth: "420px", width: "90%" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 style={{ margin: 0 }}>Modification impossible</h3>
                </div>
                <div style={{ padding: "24px 32px" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    backgroundColor: "#FEF3C7",
                    border: "1px solid #FCD34D",
                    borderRadius: "10px",
                    padding: "16px",
                  }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ color: "#F59E0B", fontSize: "20px", flexShrink: 0, marginTop: "2px" }}></i>
                    <p style={{ margin: 0, fontSize: "14px", color: "#92400E", lineHeight: "1.6" }}>
                      Le profil <strong>"{profilOccupeName}"</strong> est actuellement assigné à un ou plusieurs utilisateurs.<br />
                      Il ne peut pas être modifié tant que des utilisateurs lui sont rattachés.
                    </p>
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "16px 32px 24px 32px",
                  borderTop: "1px solid #e5e7eb",
                }}>
                  <button className="btn-secondary" onClick={() => setShowProfilOccupeModal(false)}>
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal désactivation profil */}
          {showDeactivateModal && (
            <div className="modal-overlay" onClick={() => setShowDeactivateModal(false)}>
              <div
                className="modal-content"
                style={{ maxWidth: "460px", width: "90%" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 style={{ margin: 0 }}>Désactiver le profil</h3>
                </div>
                <div style={{ padding: "24px 32px" }}>
                  <p style={{ fontSize: "14px", color: "#4B5563", marginBottom: "20px" }}>
                    Vous allez désactiver le profil <strong>"{profilToToggle?.nom}"</strong>.<br />
                    Veuillez indiquer le motif de désactivation.
                  </p>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "8px" }}>
                    Motif de désactivation <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <textarea
                    value={motifDesactivation}
                    onChange={(e) => setMotifDesactivation(e.target.value)}
                    placeholder="Entrez le motif de désactivation..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D1D5DB",
                      borderRadius: "8px",
                      fontSize: "14px",
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    autoFocus
                  />
                  {!motifDesactivation.trim() && (
                    <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "6px" }}>
                      Le motif est obligatoire
                    </p>
                  )}
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  padding: "16px 32px 24px 32px",
                  borderTop: "1px solid #e5e7eb",
                }}>
                  <button className="btn-secondary" onClick={() => setShowDeactivateModal(false)}>
                    Annuler
                  </button>
                  <button
                    onClick={confirmDeactivation}
                    disabled={!motifDesactivation.trim()}
                    style={{
                      padding: "8px 20px",
                      backgroundColor: motifDesactivation.trim() ? "#F59E0B" : "#D1D5DB",
                      color: motifDesactivation.trim() ? "#fff" : "#9CA3AF",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: motifDesactivation.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    Confirmer la désactivation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal pour afficher les utilisateurs du profil */}

          {showUsersModal && (

            <div className="modal-overlay" onClick={handleCloseUsersModal}>

              <div

                className="modal-content"

                onClick={(e) => e.stopPropagation()}

                style={{

                  padding: "32px",

                  maxWidth: "600px",

                  width: "90%",

                }}

              >

                <div className="modal-header" style={{ marginBottom: "20px" }}>

                  <h3

                    style={{ margin: "0", fontSize: "18px", fontWeight: "600" }}

                  >

                    Utilisateurs du profil "{selectedProfilName}"

                  </h3>


                </div>

                <div style={{ marginBottom: "20px" }}>

                  {selectedProfilUsers.length === 0 ? (

                    <div

                      style={{

                        textAlign: "center",

                        padding: "40px 20px",

                        backgroundColor: "#f9fafb",

                        borderRadius: "8px",

                        border: "1px solid #e5e7eb",

                      }}

                    >

                      <div style={{ fontSize: "16px", color: "#6b7280" }}>

                        Aucun utilisateur n'est associé à ce profil.

                      </div>

                    </div>

                  ) : (

                    <div

                      style={{

                        maxHeight: "400px",

                        overflowY: "auto",

                        paddingRight: "8px",

                      }}

                    >

                      {selectedProfilUsers.map((user) => (

                        <div

                          key={user.id}

                          style={{

                            padding: "16px",

                            marginBottom: "12px",

                            backgroundColor: "#f9fafb",

                            borderRadius: "8px",

                            border: "1px solid #e5e7eb",

                          }}

                        >

                          <div

                            style={{

                              fontWeight: "600",

                              color: "#1a1a1a",

                              fontSize: "16px",

                              marginBottom: "8px",

                            }}

                          >

                            {user.prenom} {user.nom}

                          </div>

                          <div

                            style={{

                              fontSize: "14px",

                              color: "#6b7280",

                              marginBottom: "8px",

                            }}

                          >

                            {user.email}

                          </div>

                          <div

                            // style={{

                            //   fontSize: "12px",

                            //   color: "#9ca3af",

                            //   backgroundColor: "#e5e7eb",

                            //   padding: "4px 8px",

                            //   borderRadius: "12px",

                            //   display: "inline-block",

                            // }}

                          >

                            {/* ID: {user.id} */}

                          </div>

                        </div>

                      ))}

                    </div>

                  )}

                </div>

                <div

                  className="modal-actions"

                  style={{

                    marginTop: "20px",

                    paddingTop: "16px",

                    borderTop: "1px solid #e5e7eb",

                  }}

                >

                  <div

                    style={{

                      display: "flex",

                      justifyContent: "flex-end",

                      alignItems: "center",

                    }}

                  >

                    <button

                      className="btn-secondary"

                      onClick={handleCloseUsersModal}

                    >

                      Fermer

                    </button>

                  </div>

                </div>

              </div>

            </div>

          )}

        </div>

      ),

    },

    utilisateurs: {

      title: "Gestion des Utilisateurs",

      content: (

        <div>

          <div className="action-buttons">

            <button className="btn-primary" onClick={handleCreateUser}>

              Ajouter un utilisateur

            </button>

          </div>



          {showUserForm && (

            <div className="modal-overlay" onClick={handleCancelUser}>

              <div

                className="modal-content"

                onClick={(e) => e.stopPropagation()}

              >

                <div className="modal-header">

                  <h3>

                    {editingUser

                      ? "Modifier l'utilisateur"

                      : "Ajouter un utilisateur"}

                  </h3>


                </div>

                {userMessage.text && (

                  <div

                    className={`info-box ${

                      userMessage.type === "error" ? "error-box" : "success-box"

                    }`}

                  >

                    <p>{userMessage.text}</p>

                  </div>

                )}

                <form autoComplete="off" onSubmit={handleUserSubmit}>

                  <div className="form-group">

                    <label htmlFor="prenom">

                      Prénom <span className="required">*</span>

                    </label>

                    <input

                      type="text"

                      id="prenom"

                      name="prenom"

                      value={userFormData.prenom}

                      onChange={handleUserInputChange}

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

                      value={userFormData.nom}

                      onChange={handleUserInputChange}

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

                      value={userFormData.email}

                      onChange={handleUserInputChange}

                      required

                    />

                  </div>

                  <div className="form-group">

                    <label htmlFor="motDePasse">

                      Mot de passe{" "}

                      {!editingUser && <span className="required">*</span>}

                    </label>

                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <input

                        type={showUserPassword ? "text" : "password"}

                        id="motDePasse"

                        name="motDePasse"

                        value={userFormData.motDePasse}

                        onChange={handleUserInputChange}

                        placeholder={

                          editingUser ? "Laisser vide pour ne pas modifier" : ""

                        }

                        required={!editingUser}
                        style={{
                          width: "100%",
                          paddingRight: "40px",
                          boxSizing: "border-box",
                        }}

                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPassword(!showUserPassword)}
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
                          showUserPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        <i
                          className={showUserPassword ? "fas fa-eye-slash" : "fas fa-eye"}
                        ></i>
                      </button>
                    </div>

                    {userFormData.motDePasse && (() => {
                      const force = getPasswordStrength(userFormData.motDePasse);
                      return force ? (
                        <div style={{ marginTop: "6px" }}>
                          <div style={{ height: "4px", backgroundColor: "#e5e7eb", borderRadius: "2px" }}>
                            <div style={{ height: "100%", width: force.largeur, backgroundColor: force.couleur, borderRadius: "2px", transition: "width 0.3s" }} />
                          </div>
                          <span style={{ fontSize: "12px", color: force.couleur, fontWeight: "500" }}>{force.niveau}</span>
                          <span style={{ fontSize: "11px", color: "#6b7280", marginLeft: "6px" }}>
                            — 8 car. min · 1 majuscule · 1 chiffre · 1 caractère spécial
                          </span>
                        </div>
                      ) : null;
                    })()}

                  </div>

                  <div className="form-group">

                    <label htmlFor="profilId">

                      Profil <span className="required">*</span>

                    </label>

                    <select

                      id="profilId"

                      name="profilId"

                      value={userFormData.profilId}

                      onChange={handleUserInputChange}

                      required

                    >

                      {profils.map((profil) => (

                        <option key={profil.id} value={profil.id}>

                          {profil.nom}

                        </option>

                      ))}

                    </select>

                  </div>

                  <div className="modal-actions">

                    <button type="submit" className="btn-primary">

                      {editingUser ? "Mettre à jour" : "Créer"}

                    </button>

                    <button

                      type="button"

                      className="btn-secondary"

                      onClick={handleCancelUser}

                    >

                      Annuler

                    </button>

                  </div>

                </form>

              </div>

            </div>

          )}



          <div className="table-container" style={{ marginTop: "24px" }}>

            <h3>Liste des utilisateurs</h3>

            {utilisateurs.length === 0 ? (

              <p style={{ color: "#6b7280", marginTop: "16px" }}>

                Aucun utilisateur créé pour le moment.

              </p>

            ) : (

              <table className="data-table">

                <thead>

                  <tr>

                    <th>Nom</th>

                    <th>Prénom</th>

                    <th>Email</th>

                    <th>Profil</th>

                    <th>Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {utilisateurs.map((user) => (

                    <tr key={user.id}>

                      <td>{user.nom}</td>

                      <td>{user.prenom}</td>

                      <td>{user.email}</td>

                      <td>{getProfilName(user.profilId)}</td>

                      <td>

                        <button

                          className="btn-secondary"

                          onClick={() => handleEditUser(user)}

                          style={{ marginRight: "5px" }}

                        >

                          Modifier

                        </button>

                        {/* <button

                          className="btn-primary"

                          onClick={() => handleManageUserPermissions(user)}

                          style={{ marginRight: "5px" }}

                        >

                          Permissions

                        </button> */}

                        <button

                          className="btn-danger"

                          onClick={() => handleDeleteUser(user)}

                        >

                          Supprimer

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            )}

          </div>



          {showUserDeleteConfirm && (

            <div className="modal-overlay" onClick={cancelDeleteUser}>

              <div

                className="modal-content"

                onClick={(e) => e.stopPropagation()}

                style={{ padding: "24px" }}

              >

                <div className="modal-header" style={{ marginBottom: "20px" }}>

                  <h3 style={{ margin: "0" }}>Confirmer la suppression</h3>


                </div>

                <p

                  style={{

                    marginBottom: "24px",

                    fontSize: "14px",

                    lineHeight: "1.5",

                  }}

                >

                  Êtes-vous sûr de vouloir supprimer l'utilisateur "

                  {userToDelete?.prenom} {userToDelete?.nom}" ? Cette action est

                  irréversible.

                </p>

                <div className="modal-actions" style={{ marginTop: "16px" }}>

                  <button className="btn-danger" onClick={confirmDeleteUser}>

                    Supprimer

                  </button>

                  <button className="btn-secondary" onClick={cancelDeleteUser}>

                    Annuler

                  </button>

                </div>

              </div>

            </div>

          )}

        </div>

      ),

    },

  };



  return (

    <div className="page-container">

      <div className="page-header">

        <h1>{subPages[activeSubPage].title}</h1>

      </div>

      {subPages[activeSubPage].content}



      {/* Modal pour consulter les permissions du profil */}

      {showViewPermissionsModal && (
        <div className="modal-overlay" onClick={handleCloseViewPermissionsModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "580px", padding: "0" }}
          >
            {/* Header */}
            <div className="modal-header">
              <h3>Accès du profil : {viewProfilName}</h3>
            </div>

            {/* Body */}
            <div style={{ padding: "28px 32px", maxHeight: "60vh", overflowY: "auto"  }}>
              {viewPermissionsData.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center", margin: 0 }}>
                  Aucun accès configuré pour ce profil.
                </p>
              ) : (() => {
                const grouped = {};
                viewPermissionsData.forEach((perm) => {
                  const key = perm.moduleLabel || perm.module;
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(perm);
                });

                const badgeStyle = (active) => ({
                  padding: "3px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "500",
                  backgroundColor: active ? "#dbeafe" : "#f3f4f6",
                  color: active ? "#1e40af" : "#9ca3af",
                  border: `1px solid ${active ? "#bfdbfe" : "#e5e7eb"}`,
                });

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {Object.entries(grouped).map(([moduleLabel, perms]) => (
                      <div key={moduleLabel} style={{
                        backgroundColor: "#f9fafb",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                      }}>
                        {/* En-tête module */}
                        <div style={{
                          padding: "10px 16px",
                          backgroundColor: "rgba(74, 144, 226, 0.08)",
                          borderBottom: "1px solid #e5e7eb",
                        }}>
                          <span style={{ fontSize: "13px", fontWeight: "600", color: "#4A90E2", textTransform: "capitalize" }}>
                            {moduleLabel}
                          </span>
                        </div>

                        {/* Lignes de permissions */}
                        <div>
                          {perms.map((perm, i) => (
                            <div key={i} style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 16px",
                              gap: "12px",
                              backgroundColor: "#fff",
                              borderBottom: i < perms.length - 1 ? "1px solid #f3f4f6" : "none",
                            }}>
                              <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>
                                {perm.submodule ? perm.submodule : "Accès général"}
                              </span>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <span style={badgeStyle(perm.lire)}>Lire</span>
                                <span style={badgeStyle(perm.créer)}>Créer</span>
                                <span style={badgeStyle(perm.modifier)}>Modifier</span>
                                <span style={badgeStyle(perm.supprimer)}>Supprimer</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{ flexShrink: 0, marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px", justifyContent: "flex-end", padding: "16px 32px 24px 32px" }}>
              <button className="btn-secondary" onClick={handleCloseViewPermissionsModal}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );

};



export default Administration;

