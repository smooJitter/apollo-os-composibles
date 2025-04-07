/**
 * Conversational Agent module constants
 */

// Define agent types
export const AGENT_TYPES = {
  ASSISTANT: 'Assistant',
  COACH: 'Coach',
  MANIFESTATION_GUIDE: 'Manifestation Guide',
  HABIT_COACH: 'Habit Coach',
  MEDITATION_GUIDE: 'Meditation Guide',
  PRODUCTIVITY_COACH: 'Productivity Coach',
  SPIRITUAL_GUIDE: 'Spiritual Guide',
  CAREER_COACH: 'Career Coach',
  CUSTOM: 'Custom'
};

// Define agent capabilities
export const AGENT_CAPABILITIES = {
  CONVERSATION: 'Conversation',
  GOAL_SETTING: 'Goal Setting',
  PROGRESS_TRACKING: 'Progress Tracking',
  RECOMMENDATION: 'Recommendation',
  ACCOUNTABILITY: 'Accountability',
  TASK_EXECUTION: 'Task Execution',
  PLANNING: 'Planning',
  ANALYSIS: 'Analysis',
  RESOURCE_FINDING: 'Resource Finding',
  AUTONOMOUS_ACTION: 'Autonomous Action'
};

// Define agent action types
export const AGENT_ACTION_TYPES = {
  CREATE_MANIFESTATION: 'CreateManifestation',
  CREATE_HABIT: 'CreateHabit',
  CREATE_MILESTONE: 'CreateMilestone',
  CREATE_IMMERSION: 'CreateImmersion',
  UPDATE_MANIFESTATION: 'UpdateManifestation',
  UPDATE_HABIT: 'UpdateHabit',
  UPDATE_MILESTONE: 'UpdateMilestone',
  ADD_AFFIRMATION: 'AddAffirmation',
  SCHEDULE_REMINDER: 'ScheduleReminder',
  CREATE_RECOMMENDATION: 'CreateRecommendation',
  TRACK_PROGRESS: 'TrackProgress',
  ANALYZE_PATTERN: 'AnalyzePattern',
  SEARCH_RESOURCES: 'SearchResources',
  GENERATE_PLAN: 'GeneratePlan',
  CUSTOM_ACTION: 'CustomAction'
};

// Define agent statuses
export const AGENT_STATUSES = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  INACTIVE: 'Inactive',
  CONFIGURING: 'Configuring'
};

// Define agent action statuses
export const ACTION_STATUSES = {
  PENDING: 'Pending',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
  AWAITING_APPROVAL: 'AwaitingApproval'
};

// Define agent permissions
export const AGENT_PERMISSIONS = {
  CONVERSE: 'Converse',
  SUGGEST_ACTIONS: 'SuggestActions',
  EXECUTE_ACTIONS: 'ExecuteActions',
  ACCESS_DATA: 'AccessData',
  CREATE_CONTENT: 'CreateContent',
  MODIFY_CONTENT: 'ModifyContent',
  DELETE_CONTENT: 'DeleteContent',
  SCHEDULE_TASKS: 'ScheduleTasks',
  VIEW_ANALYTICS: 'ViewAnalytics'
};

// Define agent events
export const AGENT_EVENTS = {
  AGENT_CREATED: 'conversational-agent:created',
  AGENT_UPDATED: 'conversational-agent:updated',
  AGENT_DELETED: 'conversational-agent:deleted',
  ACTION_SUGGESTED: 'conversational-agent:action_suggested',
  ACTION_APPROVED: 'conversational-agent:action_approved',
  ACTION_REJECTED: 'conversational-agent:action_rejected',
  ACTION_EXECUTED: 'conversational-agent:action_executed',
  ACTION_FAILED: 'conversational-agent:action_failed',
  GOAL_CREATED: 'conversational-agent:goal_created',
  GOAL_COMPLETED: 'conversational-agent:goal_completed'
};

// Define personality traits for agents
export const PERSONALITY_TRAITS = {
  ENCOURAGING: 'Encouraging',
  CHALLENGING: 'Challenging',
  ANALYTICAL: 'Analytical',
  EMPATHETIC: 'Empathetic',
  DIRECT: 'Direct',
  PATIENT: 'Patient',
  MOTIVATIONAL: 'Motivational',
  DETAILED: 'Detailed',
  CREATIVE: 'Creative',
  STRUCTURED: 'Structured'
};

// Define enums for schema
export const AGENT_TYPE_ENUMS = Object.values(AGENT_TYPES);
export const AGENT_STATUS_ENUMS = Object.values(AGENT_STATUSES);
export const ACTION_STATUS_ENUMS = Object.values(ACTION_STATUSES);
export const AGENT_ACTION_TYPE_ENUMS = Object.values(AGENT_ACTION_TYPES);
export const AGENT_PERMISSION_ENUMS = Object.values(AGENT_PERMISSIONS);
export const AGENT_CAPABILITY_ENUMS = Object.values(AGENT_CAPABILITIES);
export const PERSONALITY_TRAIT_ENUMS = Object.values(PERSONALITY_TRAITS);

export const DEFAULT_AGENT_CONFIGURATIONS = {
  'Personal Assistant': {
    autonomyLevel: 2, // 1-5 scale
    personalityTraits: ['Friendly', 'Helpful', 'Adaptable'],
    systemMessage: "You are a helpful personal assistant focused on productivity and organization. Help the user manage their tasks, schedule, and daily activities efficiently.",
    capabilities: [
      'NaturalLanguageProcessing',
      'TaskAutomation',
      'ScheduleManagement',
      'UserPreferenceTracking'
    ],
    // ... existing code ...
  },
  'Knowledge Expert': {
    autonomyLevel: 3,
    personalityTraits: ['Professional', 'Analytical', 'Detailed'],
    systemMessage: "You are a knowledge expert with deep expertise in your field. Provide accurate, detailed information and analysis on topics within your domain of expertise.",
    capabilities: [
      'NaturalLanguageProcessing',
      'Knowledge Retrieval',
      'StructuredReasoning'
    ],
    // ... existing code ...
  },
  'Creative Partner': {
    autonomyLevel: 4,
    personalityTraits: ['Creative', 'Encouraging', 'Adaptable'],
    systemMessage: "You are a creative partner designed to inspire and collaborate on creative projects. Help generate ideas, provide feedback, and support the creative process.",
    capabilities: [
      'NaturalLanguageProcessing',
      'CreativeGeneration',
      'ContentCreation'
    ],
    // ... existing code ...
  },
  'Coach': {
    autonomyLevel: 3,
    personalityTraits: ['Encouraging', 'Assertive', 'Empathetic'],
    systemMessage: "You are a supportive coach focused on helping the user achieve their goals. Provide motivation, accountability, and guidance for personal development.",
    capabilities: [
      'NaturalLanguageProcessing',
      'GoalTracking',
      'ProgressAnalysis',
      'HabitFormation'
    ],
    // ... existing code ...
  },
  'Task Manager': {
    autonomyLevel: 3,
    personalityTraits: ['Professional', 'Persistent', 'Straightforward'],
    systemMessage: "You are a task management specialist designed to help users organize, prioritize, and complete their tasks efficiently. Focus on clarity, efficiency, and results.",
    capabilities: [
      'NaturalLanguageProcessing',
      'TaskAutomation',
      'GoalTracking',
      'ProgressAnalysis'
    ],
    // ... existing code ...
  }
};

export default {
  AGENT_TYPES,
  AGENT_CAPABILITIES,
  AGENT_ACTION_TYPES,
  AGENT_STATUSES,
  ACTION_STATUSES,
  AGENT_PERMISSIONS,
  AGENT_EVENTS,
  PERSONALITY_TRAITS,
  AGENT_TYPE_ENUMS,
  AGENT_STATUS_ENUMS,
  ACTION_STATUS_ENUMS,
  AGENT_ACTION_TYPE_ENUMS,
  AGENT_PERMISSION_ENUMS,
  AGENT_CAPABILITY_ENUMS,
  PERSONALITY_TRAIT_ENUMS,
  DEFAULT_AGENT_CONFIGURATIONS
}; 