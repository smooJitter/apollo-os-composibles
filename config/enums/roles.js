// config/enums/roles.js
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  DEVELOPER: 'developer',
};

export const ROLE_VALUES = Object.values(ROLES);

export const hasRole = (role) => ROLE_VALUES.includes(role);
