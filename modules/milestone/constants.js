/**
 * Milestone module constants
 */

// Define milestone status values
export const MILESTONE_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked', 
  AT_RISK: 'at_risk',
  NEARLY_COMPLETE: 'nearly_complete',
  ACHIEVED: 'achieved',
  ABANDONED: 'abandoned'
};

// Define milestone status metadata
export const MILESTONE_STATUS_META = {
  planned: {
    label: 'Planned',
    description: 'Milestone has been defined but work hasn\'t started',
    color: '#3498db',
    transitionsTo: ['in_progress', 'abandoned']
  },
  in_progress: {
    label: 'In Progress',
    description: 'Work toward the milestone is underway',
    color: '#2ecc71',
    transitionsTo: ['blocked', 'at_risk', 'nearly_complete', 'achieved', 'abandoned']
  },
  blocked: {
    label: 'Blocked',
    description: 'Progress is blocked by external factors',
    color: '#e74c3c',
    transitionsTo: ['in_progress', 'abandoned']
  },
  at_risk: {
    label: 'At Risk',
    description: 'Milestone is in danger of not being achieved on time',
    color: '#f39c12',
    transitionsTo: ['in_progress', 'blocked', 'nearly_complete', 'abandoned']
  },
  nearly_complete: {
    label: 'Nearly Complete',
    description: 'Milestone is close to being achieved',
    color: '#9b59b6',
    transitionsTo: ['achieved', 'at_risk', 'in_progress']
  },
  achieved: {
    label: 'Achieved',
    description: 'Milestone has been successfully completed',
    color: '#27ae60',
    transitionsTo: []  // Terminal state
  },
  abandoned: {
    label: 'Abandoned',
    description: 'Milestone has been abandoned or is no longer relevant',
    color: '#7f8c8d',
    transitionsTo: ['planned']  // Can be reactivated
  }
};

// Define milestone types
export const MILESTONE_TYPES = {
  ACHIEVEMENT: 'achievement',
  THRESHOLD: 'threshold',
  CAPABILITY: 'capability',
  ACQUISITION: 'acquisition',
  HABIT_BASED: 'habit_based',
  EXPERIENCE: 'experience',
  RECOGNITION: 'recognition',
  CONTRIBUTION: 'contribution',
  RELATIONSHIP: 'relationship',
  CUSTOM: 'custom'
};

// Define milestone type metadata
export const MILESTONE_TYPE_META = {
  achievement: {
    label: 'Achievement',
    description: 'A significant one-time accomplishment',
    icon: 'trophy'
  },
  threshold: {
    label: 'Threshold',
    description: 'Reaching a specific numeric goal',
    icon: 'trending_up'
  },
  capability: {
    label: 'Capability',
    description: 'Learning to do something new',
    icon: 'school'
  },
  acquisition: {
    label: 'Acquisition',
    description: 'Obtaining something important',
    icon: 'shopping_bag'
  },
  habit_based: {
    label: 'Habit-Based',
    description: 'Completing a streak or frequency of a habit',
    icon: 'repeat'
  },
  experience: {
    label: 'Experience',
    description: 'Having a significant experience',
    icon: 'explore'
  },
  recognition: {
    label: 'Recognition',
    description: 'Receiving external validation or award',
    icon: 'emoji_events'
  },
  contribution: {
    label: 'Contribution',
    description: 'Making an impact or helping others',
    icon: 'volunteer_activism'
  },
  relationship: {
    label: 'Relationship',
    description: 'A connection or relationship milestone',
    icon: 'people'
  },
  custom: {
    label: 'Custom',
    description: 'User-defined milestone type',
    icon: 'create'
  }
};

// Export list of status and types for enums
export const STATUS_ENUMS = Object.values(MILESTONE_STATUS);
export const TYPE_ENUMS = Object.values(MILESTONE_TYPES);

// Combine all for convenience access
export default {
  MILESTONE_STATUS,
  MILESTONE_STATUS_META,
  MILESTONE_TYPES,
  MILESTONE_TYPE_META,
  STATUS_ENUMS,
  TYPE_ENUMS
}; 