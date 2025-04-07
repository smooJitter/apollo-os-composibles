// Basic status constants for the statusTrackableWithMetaPlugin

// Default status values
export const STATUS_ENUMS = ['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

// Metadata including allowed transitions
export const STATUS_META = {
  DRAFT: {
    label: 'Draft',
    description: 'Initial state, not yet published',
    color: 'gray',
    transitionsTo: ['PENDING', 'ACTIVE'],
  },
  PENDING: {
    label: 'Pending',
    description: 'Awaiting approval or review',
    color: 'yellow',
    transitionsTo: ['ACTIVE', 'INACTIVE', 'DRAFT'],
  },
  ACTIVE: {
    label: 'Active',
    description: 'Published and active',
    color: 'green',
    transitionsTo: ['INACTIVE', 'ARCHIVED'],
  },
  INACTIVE: {
    label: 'Inactive',
    description: 'Temporarily disabled',
    color: 'red',
    transitionsTo: ['ACTIVE', 'ARCHIVED'],
  },
  ARCHIVED: {
    label: 'Archived',
    description: 'Permanently disabled/archived',
    color: 'gray',
    transitionsTo: ['ACTIVE'], // Only in exceptional cases
  },
};
