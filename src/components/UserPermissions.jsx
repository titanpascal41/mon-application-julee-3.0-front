import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { usePermission } from './PermissionGuard';
import './UserPermissions.css';

const UserPermissions = () => {
  const { user } = useAuth();
  const { permissions, loading, refresh } = usePermission();
  const [expandedModules, setExpandedModules] = useState({});

  if (!user) {
    return (
      <div className="user-permissions-container">
        <p>Veuillez vous connecter pour voir vos permissions.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="user-permissions-container">
        <p>Chargement des permissions...</p>
      </div>
    );
  }

  // Grouper les permissions par module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  // Labels des modules et sous-modules
  const MODULE_LABELS = {
    administration: 'Administration',
    parametrage: 'Paramétrage',
    demandes: 'Demandes',
    rapports: 'Rapports'
  };

  const SUBMODULE_LABELS = {
    profils: 'Profils',
    utilisateurs: 'Utilisateurs',
    societes: 'Sociétés',
    uo: 'Unités Organisationnelles',
    statuts: 'Statuts',
    interlocuteurs: 'Interlocuteurs',
    gestion: 'Gestion des demandes',
    creation: 'Création de demandes',
    validation: 'Validation des demandes'
  };

  const toggleModule = (module) => {
    setExpandedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  const getActionIcon = (hasAccess) => {
    return hasAccess ? '✅' : '❌';
  };

  const getActionClass = (hasAccess) => {
    return hasAccess ? 'permission-granted' : 'permission-denied';
  };

  return (
    <div className="user-permissions-container">
      <div className="user-permissions-header">
        <h2>Mes Permissions</h2>
        <div className="user-info">
          <span className="user-name">{user.nom} {user.prenom}</span>
          <span className="user-profile">Profil: {user.profil?.nom || 'Non défini'}</span>
        </div>
        <button className="refresh-btn" onClick={refresh}>
          🔄 Rafraîchir
        </button>
      </div>

      {permissions.length === 0 ? (
        <div className="no-permissions">
          <p>Vous n'avez aucune permission configurée.</p>
        </div>
      ) : (
        <div className="permissions-list">
          {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
            <div key={module} className="permission-module">
              <div 
                className="module-header"
                onClick={() => toggleModule(module)}
              >
                <h3>
                  {MODULE_LABELS[module] || module}
                  <span className="toggle-icon">
                    {expandedModules[module] ? '▼' : '▶'}
                  </span>
                </h3>
                <div className="module-access">
                  {modulePermissions.some(p => p.access) ? (
                    <span className="access-badge granted">Accès autorisé</span>
                  ) : (
                    <span className="access-badge denied">Accès refusé</span>
                  )}
                </div>
              </div>

              {expandedModules[module] && (
                <div className="module-content">
                  {modulePermissions.map((permission) => (
                    <div key={`${permission.module}_${permission.submodule}`} className="permission-item">
                      <div className="permission-header">
                        <h4>
                          {SUBMODULE_LABELS[permission.submodule] || permission.submodule}
                        </h4>
                        <div className="access-status">
                          {permission.access ? (
                            <span className="status-indicator granted">✓ Accès</span>
                          ) : (
                            <span className="status-indicator denied">✗ Accès</span>
                          )}
                        </div>
                      </div>

                      {permission.access && (
                        <div className="actions-grid">
                          <div className={`action-item ${getActionClass(permission.read)}`}>
                            <span className="action-icon">{getActionIcon(permission.read)}</span>
                            <span className="action-label">Lire</span>
                          </div>
                          <div className={`action-item ${getActionClass(permission.create)}`}>
                            <span className="action-icon">{getActionIcon(permission.create)}</span>
                            <span className="action-label">Créer</span>
                          </div>
                          <div className={`action-item ${getActionClass(permission.update)}`}>
                            <span className="action-icon">{getActionIcon(permission.update)}</span>
                            <span className="action-label">Modifier</span>
                          </div>
                          <div className={`action-item ${getActionClass(permission.delete)}`}>
                            <span className="action-icon">{getActionIcon(permission.delete)}</span>
                            <span className="action-label">Supprimer</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="permissions-summary">
        <h3>Résumé des accès</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Modules accessibles:</span>
            <span className="summary-value">
              {Object.keys(groupedPermissions).filter(module => 
                groupedPermissions[module].some(p => p.access)
              ).length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total des permissions:</span>
            <span className="summary-value">{permissions.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Permissions actives:</span>
            <span className="summary-value">
              {permissions.filter(p => p.access).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPermissions;
