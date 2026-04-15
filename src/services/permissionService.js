// Service de gestion des permissions
import {
  verifierPermission as verifierPermissionAPI,
  chargerPermissionsProfil,
} from "../data/gestionPermissions";

class PermissionService {
  constructor() {
    this.permissionsCache = new Map();
    this.userPermissions = null;
    this.currentUserId = null;
    this.currentUser = null; // Ajouter pour stocker les infos utilisateur
  }

  // Initialiser le service avec l'utilisateur courant
  async initialize(userId, userInfo = null) {
    this.currentUserId = userId;
    this.currentUser = userInfo; // Stocker les infos utilisateur
    await this.loadUserPermissions();
  }

  // Charger les permissions de l'utilisateur depuis l'API (via son profil)
  async loadUserPermissions() {
    if (!this.currentUserId || !this.currentUser?.profilId) {
      console.warn(
        "Impossible de charger les permissions: userId ou profilId manquant",
        {
          userId: this.currentUserId,
          profilId: this.currentUser?.profilId,
        },
      );
      return;
    }

    try {
      console.log(
        "Chargement des permissions pour le profil:",
        this.currentUser.profilId,
      );

      // Charger les permissions du profil de l'utilisateur
      const permissions = await chargerPermissionsProfil(
        this.currentUser.profilId,
      );

      console.log("Permissions reçues depuis l'API:", permissions);

      this.userPermissions = permissions;

      // Mettre en cache les permissions pour un accès rapide
      permissions.forEach((perm) => {
        const key = `${perm.module}_${perm.submodule}`;
        this.permissionsCache.set(key, perm);
      });

      console.log("Permissions utilisateur chargées avec succès:", {
        profilId: this.currentUser.profilId,
        nombrePermissions: permissions.length,
        permissions: permissions,
      });
    } catch (error) {
      console.error("Erreur chargement permissions utilisateur:", error);
      this.userPermissions = [];
    }
  }

  // Vérifier si l'utilisateur a une permission spécifique
  hasPermission(module, submodule, action = null) {
    if (!this.userPermissions) {
      console.warn("Permissions non chargées, appel à loadUserPermissions");
      this.loadUserPermissions();
      return false;
    }

    // Vérifier si l'utilisateur est admin (accès total inconditionnel)
    if (this.isAdmin()) {
      return true;
    }

    const key = `${module}_${submodule}`;
    const permission = this.permissionsCache.get(key);

    if (!permission) {
      console.log(`Permission non trouvée pour: ${key}`);
      return false;
    }

    // Si aucune action spécifique demandée, vérifier juste l'accès
    if (!action) {
      return permission.access;
    }

    // Vérifier l'action spécifique
    switch (action) {
      case "create":
        return permission.create;
      case "read":
        return permission.read;
      case "update":
        return permission.update;
      case "delete":
        return permission.delete;
      default:
        return permission.access;
    }
  }

  // Vérifier si l'utilisateur courant est admin
  isAdmin() {
    if (!this.currentUser) return false;
    // Admin reconnu par le nom du profil "admin" OU par profilId: 1
    const profilNom = this.currentUser.profil?.nom?.toLowerCase();
    if (profilNom === "admin") return true;
    return this.currentUser.profilId === 1 || this.currentUser.profilId === "1";
  }

  // Vérifier si l'utilisateur a accès à un module (admin a toujours accès)
  hasAccess(module) {
    // Pour l'admin (profilId: 1), donner accès à tout
    if (this.isAdmin()) {
      return true;
    }

    if (!this.userPermissions) return false;

    return this.userPermissions.some(
      (perm) => perm.module === module && perm.access,
    );
  }

  // Vérifier asynchrone (pour vérification côté serveur si nécessaire)
  async verifyPermission(module, submodule, action = null) {
    // Pour l'admin (profilId: 1), donner tous les droits
    if (this.isAdmin()) {
      return true;
    }

    if (!this.currentUserId) return false;

    try {
      const authorized = await verifierPermissionAPI(
        this.currentUserId,
        module,
        submodule,
        action,
      );
      return authorized;
    } catch (error) {
      console.error("Erreur vérification permission:", error);
      return false;
    }
  }

  // Obtenir toutes les permissions d'un module
  getModulePermissions(module) {
    // Pour l'admin (profilId: 1), retourner toutes les permissions possibles
    if (this.isAdmin()) {
      return [
        {
          id: 1,
          module: module,
          submodule: null,
          access: true,
          create: true,
          read: true,
          update: true,
          delete: true,
        },
      ];
    }

    if (!this.userPermissions) {
      console.warn(
        "Aucune permission utilisateur chargée pour le module:",
        module,
      );
      return [];
    }

    const modulePerms = this.userPermissions.filter(
      (perm) => perm.module === module,
    );
    console.log(`Permissions pour le module ${module}:`, modulePerms);
    return modulePerms;
  }

  // Obtenir toutes les permissions de l'utilisateur
  getAllPermissions() {
    // Pour l'admin (profilId: 1), retourner toutes les permissions possibles
    if (this.isAdmin()) {
      const allPermissions = [];
      const modules = [
        "administration",
        "parametrage",
        "demandes",
        "dashboard",
        "reporting",
        "analytics",
        "settings",
      ];
      const submodules = {
        administration: ["profils", "utilisateurs"],
        parametrage: ["societes", "uo", "statuts", "interlocuteurs"],
        demandes: ["nouvelle", "evolution", "prospecte"],
        dashboard: [],
        reporting: [],
        analytics: [],
        settings: [],
      };

      modules.forEach((module) => {
        // Permission module principal
        allPermissions.push({
          id: Math.random(),
          module: module,
          submodule: null,
          access: true,
          create: true,
          read: true,
          update: true,
          delete: true,
        });

        // Permissions sous-modules
        submodules[module].forEach((submodule) => {
          allPermissions.push({
            id: Math.random(),
            module: module,
            submodule: submodule,
            access: true,
            create: true,
            read: true,
            update: true,
            delete: true,
          });
        });
      });

      return allPermissions;
    }

    return this.userPermissions || [];
  }

  // Rafraîchir les permissions (après modification par exemple)
  async refresh() {
    this.permissionsCache.clear();
    await this.loadUserPermissions();
  }

  // Vider le cache (déconnexion)
  clear() {
    this.permissionsCache.clear();
    this.userPermissions = null;
    this.currentUserId = null;
  }

  // Obtenir les modules accessibles par l'utilisateur
  getAccessibleModules() {
    // Pour l'admin (profilId: 1), donner accès à tous les modules
    if (this.isAdmin()) {
      return [
        "administration",
        "parametrage",
        "demandes",
        "dashboard",
        "reporting",
        "analytics",
        "settings",
      ];
    }

    if (!this.userPermissions) return [];

    const modules = new Set();
    this.userPermissions.forEach((perm) => {
      if (perm.access) {
        modules.add(perm.module);
      }
    });

    return Array.from(modules);
  }

  // Obtenir les sous-modules accessibles pour un module
  getAccessibleSubmodules(module) {
    // Pour l'admin (profilId: 1), donner accès à tous les sous-modules
    if (this.isAdmin()) {
      const allSubmodules = {
        administration: ["profils", "utilisateurs"],
        parametrage: ["societes", "uo", "statuts", "interlocuteurs"],
        demandes: ["nouvelle", "evolution", "prospecte"],
        dashboard: [],
        reporting: [],
        analytics: [],
        settings: [],
      };
      return allSubmodules[module] || [];
    }

    if (!this.userPermissions) return [];

    const submodules = [];
    this.userPermissions.forEach((perm) => {
      if (perm.module === module && perm.access) {
        submodules.push(perm.submodule);
      }
    });

    return submodules;
  }

  // Obtenir la première route complète accessible (module-sousmodule)
  getFirstAccessibleRoute() {
    // Pour l'admin, toujours retourner une route par défaut
    if (this.isAdmin()) {
      return "administration-profils";
    }

    if (!this.userPermissions) return null;

    // Parcourir les permissions dans l'ordre pour trouver la première route complète
    for (const perm of this.userPermissions) {
      if (perm.access && perm.submodule) {
        return `${perm.module}-${perm.submodule}`;
      }
    }

    // Si aucun sous-module trouvé, chercher un module principal
    for (const perm of this.userPermissions) {
      if (perm.access && !perm.submodule) {
        return perm.module;
      }
    }

    return null;
  }
}

// Exporter une instance singleton
const permissionService = new PermissionService();
export default permissionService;
