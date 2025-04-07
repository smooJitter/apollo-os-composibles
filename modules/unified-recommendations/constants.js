/**
 * Unified Recommendations and Notifications module constants
 */

// Define content types
export const CONTENT_TYPES = {
  IMMERSION: 'Immersion',
  MANIFESTATION: 'Manifestation',
  MILESTONE: 'Milestone',
  HABIT: 'Habit',
  AFFIRMATION: 'Affirmation',
  JOURNAL_ENTRY: 'JournalEntry',
  SYSTEM: 'System'
};

// Define entry types
export const ENTRY_TYPES = {
  RECOMMENDATION: 'Recommendation',
  NOTIFICATION: 'Notification'
};

// Define status types
export const STATUS_TYPES = {
  SENT: 'Sent',
  SEEN: 'Seen',
  ACTED_UPON: 'Acted Upon',
  DISMISSED: 'Dismissed'
};

// Define recommendation reasons
export const RECOMMENDATION_REASONS = {
  SIMILAR_CONTENT: 'Similar to content you engaged with',
  BASED_ON_GOALS: 'Based on your goals',
  TRENDING: 'Popular with other users',
  NEW_CONTENT: 'Recently added content',
  RELATED_TO_PROGRESS: 'Related to your current progress',
  AI_SUGGESTED: 'AI personalized suggestion',
  USER_INTEREST: 'Matches your interests',
  COMPLETION_PATTERN: 'Based on your completion patterns'
};

// Define notification reasons
export const NOTIFICATION_REASONS = {
  MILESTONE_REMINDER: 'Milestone approaching deadline',
  HABIT_REMINDER: 'Habit needs attention',
  STREAK_ALERT: 'Maintain your streak',
  ACHIEVEMENT_UNLOCKED: 'Achievement unlocked',
  PROGRESS_UPDATE: 'Progress update available',
  SYSTEM_NOTIFICATION: 'System notification',
  CONTENT_UPDATED: 'Content you follow was updated',
  SCHEDULED_REMINDER: 'Scheduled reminder'
};

// Define priority levels
export const PRIORITY_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent'
};

// Define delivery channels
export const DELIVERY_CHANNELS = {
  IN_APP: 'In-App',
  EMAIL: 'Email',
  PUSH: 'Push Notification',
  SMS: 'SMS'
};

// Define categorization tags
export const CATEGORIZATION_TAGS = [
  'Personal Growth',
  'Career',
  'Health',
  'Relationships',
  'Finances',
  'Spirituality',
  'Recreation',
  'Learning',
  'Productivity',
  'Mindfulness'
];

// Define enums for schema use
export const TYPE_ENUMS = Object.values(ENTRY_TYPES);
export const STATUS_ENUMS = Object.values(STATUS_TYPES);
export const CONTENT_TYPE_ENUMS = Object.values(CONTENT_TYPES);
export const PRIORITY_ENUMS = Object.values(PRIORITY_LEVELS);
export const CHANNEL_ENUMS = Object.values(DELIVERY_CHANNELS);

export default {
  CONTENT_TYPES,
  ENTRY_TYPES,
  STATUS_TYPES,
  RECOMMENDATION_REASONS,
  NOTIFICATION_REASONS,
  PRIORITY_LEVELS,
  DELIVERY_CHANNELS,
  CATEGORIZATION_TAGS,
  TYPE_ENUMS,
  STATUS_ENUMS,
  CONTENT_TYPE_ENUMS,
  PRIORITY_ENUMS,
  CHANNEL_ENUMS
}; 