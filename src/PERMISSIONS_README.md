# 📋 Système de Gestion des Permissions

## 🎯 Objectif

Ce système permet de gérer finement les accès des utilisateurs dans l'application en stockant les permissions dans la base de données et en les appliquant dynamiquement dans l'interface.

## 🏗️ Architecture

### Composants Principaux

1. **`PermissionService`** (`src/services/permissionService.js`)
   - Service singleton pour gérer les permissions
   - Cache local pour un accès rapide
   - Interface avec l'API backend

2. **`AuthProvider`** (`src/components/AuthProvider.jsx`)
   - Contexte React pour l'authentification
   - Initialise le service de permissions
   - Gère l'état utilisateur

3. **`PermissionGuard`** (`src/components/PermissionGuard.jsx`)
   - Composant pour conditionner l'affichage
   - Hook `usePermissions` pour les permissions
   - `MenuPermissionGuard` pour les menus

4. **`UserPermissions`** (`src/components/UserPermissions.jsx`)
   - Interface pour visualiser ses permissions
   - Affichage détaillé par module/sous-module
   - Résumé des accès

## 🚀 Utilisation

### 1. Initialisation

L'initialisation se fait automatiquement lors de la connexion :

```javascript
// Dans AuthProvider
await permissionService.initialize(userData.id);
```

### 2. Vérification des Permissions

#### Dans les composants (React)

```jsx
import { PermissionGuard } from './components/PermissionGuard';

// Protection d'un composant
<PermissionGuard module="administration" submodule="profils" action="create">
  <button>Créer un profil</button>
</PermissionGuard>

// Protection avec fallback
<PermissionGuard
  module="parametrage"
  submodule="societes"
  fallback={<div>Accès refusé</div>}
>
  <GestionSocietes />
</PermissionGuard>
```

#### Avec le hook

```jsx
import { usePermissions } from "./components/PermissionGuard";

function MonComposant() {
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission("administration", "profils", "create");

  return <div>{canCreate && <button>Créer</button>}</div>;
}
```

#### Dans le code JavaScript/TypeScript

```javascript
import permissionService from "./services/permissionService";

// Vérification synchrone (cache local)
if (permissionService.hasPermission("administration", "profils", "read")) {
  // Afficher les profils
}

// Vérification asynchrone (API)
const authorized = await permissionService.verifyPermission(
  "administration",
  "profils",
  "update",
);
```

### 3. Structure des Permissions

Chaque permission contient :

```javascript
{
  module: "administration",        // Module principal
  submodule: "profils",           // Sous-module
  access: true,                   // Accès général au module
  create: false,                  // Droit de création
  read: true,                     // Droit de lecture
  update: false,                  // Droit de modification
  delete: false                   // Droit de suppression
}
```

### 4. Modules Disponibles

- **`administration`** : Gestion des profils et utilisateurs
- **`parametrage`** : Sociétés, UO, statuts, interlocuteurs
- **`demandes`** : Gestion des demandes
- **`rapports`** : Rapports et statistiques

## 🔧 Configuration

### Variables d'Environnement

Dans `.env` du frontend :

```bash
REACT_APP_API_URL=http://localhost:3001
```

Dans `.env` du backend :

```bash
DATABASE_URL="mysql://root:@localhost:3306/julee"
PORT=3001
JWT_SECRET=your-super-secret-jwt-key
```

### Base de Données

Le schéma Prisma inclut les tables nécessaires :

- `User` : Utilisateurs
- `Profil` : Profils/groupes
- `Permission` : Permissions par profil

## 🧪 Tests

### Page de Test

Accédez à `/permission-test` pour tester le système :

1. **Vérifier le Backend** : Test de connexion
2. **Créer Utilisateur de Test** : Setup complet avec permissions
3. **Se Connecter** : Test d'authentification
4. **Rafraîchir Permissions** : Rechargement des droits

### Utilisateur de Test

```javascript
// Identifiants de test
Email: test@example.com
Mot de passe: Test123!
```

### Permissions par Défaut

L'utilisateur de test obtient :

- ✅ Lecture de tous les modules
- ✅ Accès complet à Paramétrage
- ✅ Gestion des demandes (sauf suppression)
- ❌ Administration (limité)

## 🔄 Workflow Complet

### 1. Création d'un Profil

```javascript
// Dans Administration.js
const resultat = await creerProfil("Nouveau Profil");

// Création automatique des permissions par défaut
await creerPermissionsDefaut(resultat.profil.id);

// Affichage du formulaire de permissions
setShowPermissionsInMainForm(true);
```

### 2. Configuration des Permissions

```javascript
// Mise à jour des permissions
await mettreAJourPermissions(profilId, permissionsData);
```

### 3. Vérification en Temps Réel

```javascript
// Rafraîchissement des permissions
await permissionService.refresh();
```

## 🎨 Interface Utilisateur

### Menu Navigation

Le menu s'adapte automatiquement aux permissions :

- Modules sans accès : masqués
- Sous-modules sans accès : masqués
- Actions non autorisées : désactivées

### Messages d'Erreur

- **Base de données inaccessible** : Message jaune d'avertissement
- **Permissions non chargées** : Message d'information
- **Erreur réseau** : Message d'erreur technique

## 🔒 Sécurité

### Contrôles

- ✅ Vérification côté client (UI)
- ✅ Vérification côté serveur (API)
- ✅ Tokens JWT pour l'authentification
- ✅ Validation des permissions à chaque action

### Bonnes Pratiques

1. **Toujours vérifier** les permissions côté serveur
2. **Utiliser le cache** pour les vérifications fréquentes
3. **Rafraîchir** les permissions après modification
4. **Logger** les tentatives d'accès non autorisées

## 🐛 Débogage

### Logs Importants

```javascript
// Activation des logs de débogage
console.log("Permissions utilisateur:", permissionService.getAllPermissions());
console.log(
  "Accès module:",
  permissionService.hasPermission("module", "submodule"),
);
```

### Problèmes Courants

1. **Backend inaccessible** : Vérifier le port 3001
2. **Base de données** : Vérifier MySQL et schéma Prisma
3. **Permissions vides** : Créer les permissions par défaut
4. **Cache obsolète** : Utiliser `refreshPermissions()`

## 📈 Évolutions Possibles

1. **Permissions temporelles** : Validité par date
2. **Hiérarchie** : Héritage de permissions
3. **Rôles multiples** : Combinaison de profils
4. **Audit** : Historique des modifications
5. **API GraphQL** : Optimisation des requêtes

---

## 📞 Support

Pour toute question ou problème :

1. Consulter la page de test : `/permission-test`
2. Vérifier les logs dans la console
3. Tester avec l'utilisateur de test
4. Contacter l'équipe de développement
