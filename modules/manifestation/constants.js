/**
 * Manifestation module constants
 * Defines states, types, categories and other enumerations
 */

// Define manifestation states
export const MANIFESTATION_STATES = {
  VISIONING: 'visioning',          // Initial idea formation
  INTENTION_SET: 'intention_set',  // Formally set as an intention
  IN_PROGRESS: 'in_progress',      // Actively working toward
  MANIFESTING: 'manifesting',      // Starting to see evidence
  MANIFESTED: 'manifested',        // Has come into reality
  EVOLVING: 'evolving',            // Has manifested but is evolving further
  RELEASED: 'released'             // No longer pursuing
};

// Define manifestation states metadata
export const MANIFESTATION_STATE_META = {
  visioning: {
    label: 'Visioning',
    description: 'Forming and clarifying your vision',
    color: '#9c27b0',
    transitionsTo: ['intention_set', 'released']
  },
  intention_set: {
    label: 'Intention Set',
    description: 'Clear intention has been set',
    color: '#3f51b5',
    transitionsTo: ['in_progress', 'released']
  },
  in_progress: {
    label: 'In Progress',
    description: 'Actively working toward manifestation',
    color: '#2196f3',
    transitionsTo: ['manifesting', 'released']
  },
  manifesting: {
    label: 'Manifesting',
    description: 'Beginning to see evidence of manifestation',
    color: '#00bcd4',
    transitionsTo: ['manifested', 'in_progress', 'released']
  },
  manifested: {
    label: 'Manifested',
    description: 'Has fully come into reality',
    color: '#4caf50', 
    transitionsTo: ['evolving', 'released']
  },
  evolving: {
    label: 'Evolving',
    description: 'Continuing to develop and expand',
    color: '#8bc34a',
    transitionsTo: ['manifested', 'released']
  },
  released: {
    label: 'Released',
    description: 'No longer actively pursuing',
    color: '#9e9e9e',
    transitionsTo: ['visioning'] // Can be re-activated
  }
};

// Define manifestation types
export const MANIFESTATION_TYPES = {
  GOAL: 'goal',                  // Traditional goal
  LIFE_STATE: 'life_state',      // Desired state of being
  IDENTITY: 'identity',          // Identity transformation
  MATERIAL: 'material',          // Material acquisition
  SPIRITUAL: 'spiritual',        // Spiritual development
  RELATIONSHIP: 'relationship',  // Relationship manifestation
  HEALTH: 'health',              // Health and wellness
  WEALTH: 'wealth',              // Financial abundance
  EXPERIENCE: 'experience',      // Desired experience
  CREATIVE: 'creative',          // Creative expression
  SERVICE: 'service',            // Contribution/service
  CUSTOM: 'custom'               // User-defined
};

// Define manifestation type metadata
export const MANIFESTATION_TYPE_META = {
  goal: {
    label: 'Goal',
    description: 'Traditional goal or objective',
    icon: 'flag'
  },
  life_state: {
    label: 'Life State',
    description: 'A way of being or living',
    icon: 'self_improvement'
  },
  identity: {
    label: 'Identity',
    description: 'Who you want to become',
    icon: 'person'
  },
  material: {
    label: 'Material',
    description: 'Physical objects or possessions',
    icon: 'diamond'
  },
  spiritual: {
    label: 'Spiritual',
    description: 'Spiritual growth or awakening',
    icon: 'whatshot'
  },
  relationship: {
    label: 'Relationship',
    description: 'Relationships with others',
    icon: 'favorite'
  },
  health: {
    label: 'Health',
    description: 'Physical and mental wellbeing',
    icon: 'healing'
  },
  wealth: {
    label: 'Wealth',
    description: 'Financial abundance',
    icon: 'attach_money'
  },
  experience: {
    label: 'Experience',
    description: 'Something to experience',
    icon: 'travel_explore'
  },
  creative: {
    label: 'Creative',
    description: 'Artistic or creative expression',
    icon: 'palette'
  },
  service: {
    label: 'Service',
    description: 'Contribution to others',
    icon: 'volunteer_activism'
  },
  custom: {
    label: 'Custom',
    description: 'User-defined manifestation type',
    icon: 'create'
  }
};

// Define manifestation categories (life areas)
export const MANIFESTATION_CATEGORIES = [
  'Career',
  'Finance',
  'Health',
  'Relationships',
  'Personal Growth',
  'Recreation',
  'Environment',
  'Spirituality',
  'Contribution'
];

// Define manifestation timeframes
export const MANIFESTATION_TIMEFRAMES = {
  SHORT_TERM: 'short_term',     // Less than 1 year
  MEDIUM_TERM: 'medium_term',   // 1-3 years
  LONG_TERM: 'long_term',       // 3-10 years
  LIFE_VISION: 'life_vision'    // Lifetime
};

// Export list of states and types for enums
export const STATE_ENUMS = Object.values(MANIFESTATION_STATES);
export const TYPE_ENUMS = Object.values(MANIFESTATION_TYPES);
export const TIMEFRAME_ENUMS = Object.values(MANIFESTATION_TIMEFRAMES);

// Combine all for convenience access
export default {
  MANIFESTATION_STATES,
  MANIFESTATION_STATE_META,
  MANIFESTATION_TYPES,
  MANIFESTATION_TYPE_META,
  MANIFESTATION_CATEGORIES,
  MANIFESTATION_TIMEFRAMES,
  STATE_ENUMS,
  TYPE_ENUMS,
  TIMEFRAME_ENUMS
}; 