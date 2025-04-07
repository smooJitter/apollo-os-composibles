/**
 * Immersion module constants
 * Defines immersion types, engagement metrics, and other enumerations
 */

// Define immersion types
export const IMMERSION_TYPES = {
  VISUALIZATION: 'Visualization',  // Guided visualization experiences
  STORY: 'Story',                  // Interactive narratives
  EXERCISE: 'Exercise',            // Tailored exercises or practices
  MEDITATION: 'Meditation',        // Guided meditations
  SIMULATION: 'Simulation',        // Interactive simulations
  JOURNEY: 'Journey'               // Multi-step immersive journey
};

// Define immersion types metadata
export const IMMERSION_TYPE_META = {
  Visualization: {
    label: 'Visualization',
    description: 'Guided visualization to help manifest specific outcomes',
    icon: 'visibility',
    recommendedDuration: '10-15 minutes'
  },
  Story: {
    label: 'Story',
    description: 'Interactive narrative to engage the imagination',
    icon: 'book',
    recommendedDuration: '15-30 minutes'
  },
  Exercise: {
    label: 'Exercise',
    description: 'Tailored activity or practice to help manifest specific outcomes',
    icon: 'fitness_center',
    recommendedDuration: '5-20 minutes'
  },
  Meditation: {
    label: 'Meditation',
    description: 'Guided meditation for mindfulness and manifestation',
    icon: 'self_improvement',
    recommendedDuration: '10-30 minutes'
  },
  Simulation: {
    label: 'Simulation',
    description: 'Interactive scenario to practice skills or visualize outcomes',
    icon: 'insights',
    recommendedDuration: '15-45 minutes'
  },
  Journey: {
    label: 'Journey',
    description: 'Multi-step immersive experience with progressive outcomes',
    icon: 'explore',
    recommendedDuration: '30-60 minutes'
  }
};

// Define AI modules that can be used
export const AI_MODULES = {
  TEXT_GEN: 'text_generation',
  IMAGE_GEN: 'image_generation',
  AUDIO_GEN: 'audio_generation',
  INTERACTIVE: 'interactive_narrative',
  MEDITATION_GEN: 'meditation_generation',
  CUSTOM: 'custom'
};

// Define target audiences
export const TARGET_AUDIENCES = [
  'Beginners',
  'Intermediate',
  'Advanced',
  'All Levels',
  'Children',
  'Teens',
  'Adults',
  'Seniors',
  'Professionals',
  'Spiritual Seekers'
];

// Define engagement metric types
export const ENGAGEMENT_METRICS = {
  COMPLETION_RATE: 'completion_rate',
  AVG_SESSION_TIME: 'average_session_time',
  USER_RATINGS: 'user_ratings',
  REVISIT_RATE: 'revisit_rate',
  SHARE_COUNT: 'share_count',
  EFFECTIVENESS_SCORE: 'effectiveness_score'
};

// Define life areas for tagging immersions
export const LIFE_AREAS = [
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

// Export enums for schema use
export const TYPE_ENUMS = Object.values(IMMERSION_TYPES);
export const AI_MODULE_ENUMS = Object.values(AI_MODULES);

export default {
  IMMERSION_TYPES,
  IMMERSION_TYPE_META,
  AI_MODULES,
  TARGET_AUDIENCES,
  ENGAGEMENT_METRICS,
  LIFE_AREAS,
  TYPE_ENUMS,
  AI_MODULE_ENUMS
}; 