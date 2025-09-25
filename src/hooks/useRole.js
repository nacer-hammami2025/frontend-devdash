import { useContext, createContext, useState, useEffect } from 'react';
import API from '../api';

const RoleContext = createContext();

export const PERMISSIONS = {
  // Projets
  PROJECT_CREATE: 'project:create',
  PROJECT_EDIT: 'project:edit',
  PROJECT_DELETE: 'project:delete',
  PROJECT_VIEW: 'project:view',
  
  // Tâches
  TASK_CREATE: 'task:create',
  TASK_EDIT: 'task:edit',
  TASK_DELETE: 'task:delete',
  TASK_ASSIGN: 'task:assign',
  
  // Équipe
  TEAM_MANAGE: 'team:manage',
  TEAM_INVITE: 'team:invite',
  TEAM_REMOVE: 'team:remove',
  
  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // Administration
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_USERS: 'admin:users',
  ADMIN_ROLES: 'admin:roles'
};

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TEAM_LEAD: 'team_lead',
  DEVELOPER: 'developer',
  VIEWER: 'viewer'
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: [
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_EDIT,
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.TEAM_INVITE,
    PERMISSIONS.ANALYTICS_VIEW
  ],
  [ROLES.TEAM_LEAD]: [
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TEAM_INVITE,
    PERMISSIONS.ANALYTICS_VIEW
  ],
  [ROLES.DEVELOPER]: [
    PERMISSIONS.PROJECT_VIEW,
    PERMISSIONS.TASK_EDIT
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.PROJECT_VIEW
  ]
};

export const RoleProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(null);
  const [customPermissions, setCustomPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const response = await API.get('/user/role');
        setUserRole(response.data.role);
        setCustomPermissions(response.data.customPermissions || []);
      } catch (error) {
        console.error('Error loading user role:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserRole();
  }, []);

  const hasPermission = (permission) => {
    if (!userRole) return false;
    
    // Vérifier les permissions personnalisées
    if (customPermissions.includes(permission)) {
      return true;
    }

    // Vérifier les permissions basées sur le rôle
    return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions) => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions) => {
    return permissions.every(permission => hasPermission(permission));
  };

  const value = {
    userRole,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    PERMISSIONS,
    ROLES
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
