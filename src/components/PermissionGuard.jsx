import React from 'react';
import permissionService from '../services/permissionService';

// Composant de protection basé sur les permissions
const PermissionGuard = ({ 
  module, 
  submodule, 
  action = null, 
  children, 
  fallback = null,
  requireAll = false 
}) => {
  const [hasPermission, setHasPermission] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkPermission = () => {
      try {
        const permitted = permissionService.hasPermission(module, submodule, action);
        setHasPermission(permitted);
      } catch (error) {
        console.error('Erreur vérification permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    // Vérifier immédiatement si les permissions sont déjà chargées
    if (permissionService.userPermissions) {
      checkPermission();
    } else {
      // Attendre que les permissions soient chargées
      const interval = setInterval(() => {
        if (permissionService.userPermissions) {
          clearInterval(interval);
          checkPermission();
        }
      }, 100);

      // Timeout au cas où les permissions ne se chargent jamais
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setLoading(false);
        setHasPermission(false);
      }, 5000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [module, submodule, action]);

  if (loading) {
    return fallback || null;
  }

  if (!hasPermission) {
    return fallback || null;
  }

  return typeof children === 'function' ? children() : children;
};

// Hook personnalisé pour utiliser les permissions
export const usePermissions = () => {
  const [permissions, setPermissions] = React.useState(permissionService.getAllPermissions());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const updatePermissions = () => {
      setPermissions(permissionService.getAllPermissions());
      setLoading(false);
    };

    if (permissionService.userPermissions) {
      updatePermissions();
    } else {
      const interval = setInterval(() => {
        if (permissionService.userPermissions) {
          clearInterval(interval);
          updatePermissions();
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    await permissionService.refresh();
    setPermissions(permissionService.getAllPermissions());
    setLoading(false);
  }, []);

  const hasPermission = React.useCallback((module, submodule, action = null) => {
    return permissionService.hasPermission(module, submodule, action);
  }, []);

  const getAccessibleModules = React.useCallback(() => {
    return permissionService.getAccessibleModules();
  }, []);

  const getAccessibleSubmodules = React.useCallback((module) => {
    return permissionService.getAccessibleSubmodules(module);
  }, []);

  return {
    permissions,
    loading,
    refresh,
    hasPermission,
    getAccessibleModules,
    getAccessibleSubmodules
  };
};

// Alias pour compatibilité
export const usePermission = usePermissions;

// Composant pour conditionner l'affichage du menu
export const MenuPermissionGuard = ({ 
  module, 
  submodule, 
  children, 
  showDisabled = false 
}) => {
  const { hasPermission } = usePermissions();
  const permitted = hasPermission(module, submodule);

  if (!permitted && !showDisabled) {
    return null;
  }

  if (!permitted && showDisabled) {
    return (
      <span style={{ 
        opacity: 0.5, 
        cursor: 'not-allowed',
        pointerEvents: 'none'
      }}>
        {children}
      </span>
    );
  }

  return children;
};

export default PermissionGuard;
export { PermissionGuard };
