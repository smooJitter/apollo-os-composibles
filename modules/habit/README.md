# Habits Module

The Habits module provides functionality for creating, tracking, and managing user habits within the Apollo OS Framework. This module helps users develop positive routines, build consistency, and achieve personal growth through habit formation.

## Overview

This module enables users to:
- Create and define habits with customizable frequency and tracking parameters
- Track habit completion and streaks
- View habit performance analytics and statistics
- Receive reminders and notifications for scheduled habits
- Connect habits to manifestations, goals, and milestones
- Analyze habit effectiveness and impact on goal achievement

## Features

- **Habit Creation**: Define habits with names, descriptions, categories, and frequency
- **Flexible Scheduling**: Configure habits for daily, weekly, monthly, or custom schedules
- **Streak Tracking**: Monitor consecutive completions and maintain momentum
- **Habit Categories**: Organize habits by life areas, themes, or custom categories
- **Performance Metrics**: Track completion rates, streaks, and consistency
- **Smart Reminders**: Receive notifications based on habit schedules and user preferences
- **Habit Strength**: Calculate and display habit formation progress
- **Integrated Analytics**: Visualize habit performance over time
- **Relational Links**: Connect habits to other modules in the Apollo OS Framework

## Directory Structure

```
modules/habit/
├── actions/               # Business logic for habit operations
├── constants.js           # Constants, enums, and default values
├── hooks/                 # Event handlers and hooks
├── index.js               # Module entry point
├── README.md              # Documentation
├── registry.js            # GraphQL type composers
├── relations/             # Relationship management between habits and entities
├── resolvers.js           # GraphQL resolvers
└── schemas.js             # Mongoose schemas
```

## Schemas

The module defines several Mongoose schemas:

- **Habit**: The main schema for habit definitions
- **HabitCompletion**: Records of completed habit instances
- **HabitStreak**: Tracks consecutive completions
- **HabitStatistics**: Performance metrics for the habit
- **HabitReminder**: Configuration for habit reminders and notifications

## GraphQL API

### Queries

- `habitById`: Get a single habit by ID
- `myHabits`: Get all habits for the current user with filtering options
- `habitsByCategory`: Get habits filtered by category
- `habitsByStatus`: Get habits filtered by active/inactive status
- `habitStats`: Get statistical information about habits
- `habitCompletions`: Get completion history for a habit
- `streakInformation`: Get streak details for a habit

### Mutations

- `createHabit`: Create a new habit
- `updateHabit`: Update an existing habit
- `deleteHabit`: Delete a habit
- `completeHabit`: Mark a habit as completed for a specific day
- `uncompleteHabit`: Remove a completion for a specific day
- `toggleHabitActive`: Activate or deactivate a habit
- `linkHabitToManifestation`: Connect a habit to a manifestation
- `createHabitReminder`: Create a reminder for a habit
- `updateHabitReminder`: Update an existing habit reminder

## Habit Types

The module supports various habit types:

| Type | Description |
|------|-------------|
| Daily | Habits performed every day |
| Weekly | Habits performed specific days of the week |
| Monthly | Habits performed on specific days of the month |
| Interval | Habits performed every X days |
| Quantified | Habits with measurable quantities (e.g., steps, pages) |
| Time-based | Habits measured in duration (e.g., meditation minutes) |
| Checklist | Multi-step habits requiring completion of all items |

## Usage Examples

### Create a new habit

```javascript
const habit = await actions.createHabit({
  userId,
  habit: {
    name: "Morning Meditation",
    description: "10 minutes of mindfulness meditation after waking up",
    frequency: {
      type: "Daily",
      specificDays: []
    },
    category: "Wellbeing",
    startDate: new Date(),
    targetCompletionCount: 66, // Target for habit formation
    reminders: [{
      time: "08:00",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    }]
  }
});
```

### Complete a habit

```javascript
const result = await actions.completeHabit({
  userId,
  habitId,
  completionData: {
    completedAt: new Date(),
    notes: "Felt more focused today",
    value: 15 // Optional: for quantified habits
  }
});
```

### Get habit statistics

```javascript
const stats = await actions.getHabitStats({
  userId,
  habitId
});
// Returns completion rates, current streak, best streak, etc.
```

## Integration with Other Modules

The Habits module integrates with several other modules in the Apollo OS Framework:

- **Manifestation**: Habits can support manifestation progress
- **Milestone**: Habits can be linked to milestones as supporting activities
- **Unified Recommendations**: Habits can generate recommendations and notifications
- **Conversational Agent**: Agents can suggest and track habits
- **Analytics**: Habit data feeds into user progress analytics

## Events

The module emits and listens for various events:

- `habit:created`: When a new habit is created
- `habit:updated`: When a habit is updated
- `habit:deleted`: When a habit is deleted
- `habit:completed`: When a habit is marked as completed
- `habit:streak:updated`: When a habit streak changes
- `habit:reminder:triggered`: When a habit reminder is due

## Future Enhancements

Planned improvements for this module include:

1. Social features for habit accountability
2. Habit templates and recommendations
3. AI-driven habit optimization
4. Enhanced visualizations and progress tracking
5. Location-based habit reminders
6. Habit difficulty progression

## Configuration Options

Habits can be configured with various options:

- **Frequency**: How often the habit should be performed
- **Reminders**: When and how to notify the user
- **Tracking Method**: How completion is measured (boolean, quantity, duration)
- **Required Effort**: Estimated time or energy required
- **Priority**: Importance of the habit relative to others
- **Cues**: Environmental triggers for the habit 