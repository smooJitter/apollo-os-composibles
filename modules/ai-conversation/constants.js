/**
 * AI Conversation Collection module constants
 */

// Define conversation types
export const CONVERSATION_TYPES = {
  GENERAL: 'General',
  COACHING: 'Coaching',
  MANIFESTATION: 'Manifestation',
  HABIT_FORMATION: 'Habit Formation',
  GOAL_SETTING: 'Goal Setting',
  THERAPY: 'Therapy',
  MEDITATION: 'Meditation',
  SPIRITUAL: 'Spiritual',
  CAREER: 'Career',
  CUSTOM: 'Custom'
};

// Define interaction categories
export const INTERACTION_CATEGORIES = {
  QUESTION: 'Question',
  STATEMENT: 'Statement',
  COMMAND: 'Command',
  FEEDBACK: 'Feedback',
  REFLECTION: 'Reflection'
};

// Define AI model types
export const AI_MODELS = {
  GPT_3: 'GPT-3',
  GPT_4: 'GPT-4',
  CLAUDE: 'Claude',
  APOLLO_BASE: 'Apollo Base',
  APOLLO_ADVANCED: 'Apollo Advanced',
  CUSTOM: 'Custom'
};

// Define sentiment types
export const SENTIMENT_TYPES = {
  VERY_NEGATIVE: 'Very Negative',
  NEGATIVE: 'Negative',
  NEUTRAL: 'Neutral',
  POSITIVE: 'Positive',
  VERY_POSITIVE: 'Very Positive'
};

// Define interaction statuses
export const INTERACTION_STATUSES = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  FLAGGED: 'Flagged'
};

// Define metadata key names
export const METADATA_KEYS = {
  PURPOSE: 'purpose',
  CONTEXT: 'context',
  MODEL_SETTINGS: 'modelSettings',
  THEME: 'theme',
  SENTIMENT: 'sentiment',
  RELEVANT_ENTITIES: 'relevantEntities',
  TAGS: 'tags',
  USER_FEEDBACK: 'userFeedback',
  INTENT: 'intent'
};

// Define events
export const CONVERSATION_EVENTS = {
  CONVERSATION_CREATED: 'ai-conversation:created',
  CONVERSATION_UPDATED: 'ai-conversation:updated',
  INTERACTION_ADDED: 'ai-conversation:interaction_added',
  CONVERSATION_COMPLETED: 'ai-conversation:completed',
  CONVERSATION_ARCHIVED: 'ai-conversation:archived',
  USER_FEEDBACK_ADDED: 'ai-conversation:feedback_added'
};

// Define enums for schema
export const CONVERSATION_TYPE_ENUMS = Object.values(CONVERSATION_TYPES);
export const INTERACTION_CATEGORY_ENUMS = Object.values(INTERACTION_CATEGORIES);
export const AI_MODEL_ENUMS = Object.values(AI_MODELS);
export const SENTIMENT_TYPE_ENUMS = Object.values(SENTIMENT_TYPES);
export const INTERACTION_STATUS_ENUMS = Object.values(INTERACTION_STATUSES);

export default {
  CONVERSATION_TYPES,
  INTERACTION_CATEGORIES,
  AI_MODELS,
  SENTIMENT_TYPES,
  INTERACTION_STATUSES,
  METADATA_KEYS,
  CONVERSATION_EVENTS,
  CONVERSATION_TYPE_ENUMS,
  INTERACTION_CATEGORY_ENUMS,
  AI_MODEL_ENUMS,
  SENTIMENT_TYPE_ENUMS,
  INTERACTION_STATUS_ENUMS
}; 