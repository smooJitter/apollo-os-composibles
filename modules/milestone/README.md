# Milestone Module

The Milestone module provides functionality for tracking and managing trackable achievements and progress points in a user's journey. Milestones represent concrete achievements that mark significant progress, with medium-term objectives and specific completion criteria.

## Overview

Milestones serve as the middle layer between daily habits and long-term manifestations. They provide a structured way to:
- Track concrete achievements 
- Break down larger goals into manageable steps
- Celebrate progress along the user's journey
- Connect daily habits to meaningful outcomes

## Features

- **Rich Status Workflow**: Milestones can transition through various statuses (planned, in-progress, blocked, at-risk, nearly complete, achieved, abandoned) with validation rules.
- **Multiple Milestone Types**: Support for different types of milestones:
  - Achievement (default) - General accomplishments
  - Threshold - Milestones with numeric targets (e.g., "Run 100 miles")
  - Capability - Skill-based milestones
  - Acquisition - Obtaining something tangible
  - Habit-based - Milestones tied to habit streaks/consistency
  - Experience - Experiential milestones
  - And more...
- **Sub-Milestones**: Break down milestones into smaller steps with individual completion tracking.
- **Progress Calculation**: Automatic progress calculation based on completed sub-milestones or threshold values.
- **Habit Integration**: Connect milestones to daily habits for a cohesive tracking experience.
- **Timeline Tracking**: Track when status changes and other significant events occur.

## Data Model

The core Milestone schema includes:

- **userId**: Owner of the milestone
- **title**: Name of the milestone
- **description**: Detailed description
- **milestoneType**: Type of milestone (achievement, threshold, etc.)
- **parentGoalId**: Optional reference to a parent goal/manifestation
- **status**: Current status in the workflow
- **startDate**: When work on the milestone began
- **targetDate**: When the milestone should be completed
- **completedDate**: When the milestone was achieved
- **progressPercentage**: Overall completion percentage
- **thresholdValue**: Target value for threshold-type milestones
- **currentValue**: Current progress toward threshold
- **unit**: Unit of measurement for threshold values
- **habitStreak**: For habit-based milestones, the streak count
- **relatedHabits**: Linked habits that contribute to this milestone
- **subMilestones**: Array of smaller steps with completion status
- **metadata**: Flexible metadata including color, icon, priority, etc.

## API

### GraphQL Queries

- **milestoneById**: Get milestone by ID
- **myMilestones**: Get current user's milestones with filtering options
- **milestoneStats**: Get statistics about user's milestones

### GraphQL Mutations

- **createMilestone**: Create a new milestone
- **updateMilestone**: Update milestone details
- **updateMilestoneStatus**: Change milestone status with notes
- **addSubMilestone**: Add a step to a milestone
- **updateSubMilestone**: Update a sub-milestone
- **deleteMilestone**: Remove a milestone

### Actions

- **createMilestone**: Create a new milestone
- **updateMilestoneStatus**: Change milestone status with validation
- **addSubMilestone**: Add a step to a milestone
- **toggleSubMilestoneCompletion**: Toggle completion of a sub-milestone
- **updateMilestoneProgress**: Update progress of a milestone
- **linkHabitsToMilestone**: Connect habits to a milestone

## Events

The module emits and listens for various events:

- **milestone:created**: When a new milestone is created
- **milestone:statusChanged**: When milestone status changes
- **milestone:achieved**: When a milestone is completed
- **milestone:dueSoon**: When a milestone is approaching its target date
- **habit:streakMilestoneReached**: Listens for this event to create automatic milestones

## Integration

Milestones integrate with:

- **Habits**: Connect daily habits to meaningful outcomes
- **User**: Track user's achievements
- **Manifestations**: (Future) Serve as steps toward larger goals

## Usage Examples

### Creating a Milestone

```javascript
const milestone = await createMilestone(ctx, {
  userId: "user123",
  title: "Complete First Marathon",
  description: "Run a full marathon for the first time",
  milestoneType: "achievement",
  targetDate: new Date("2023-11-15"),
  subMilestones: [
    { title: "Run 10 miles without stopping", completed: true },
    { title: "Run a half marathon", completed: false },
    { title: "Practice proper nutrition", completed: false }
  ],
  metadata: {
    priority: "high",
    color: "#ff5722",
    icon: "directions_run"
  }
});
```

### Updating Progress

```javascript
const updatedMilestone = await updateMilestoneProgress(ctx, {
  milestoneId: "milestone123",
  userId: "user123",
  progressPercentage: 75
});
```

## Development

The module uses:

- **MongoDB/Mongoose**: For data storage
- **GraphQL/GraphQL Compose**: For API access
- **Plugins**: statusTrackableWithMeta, timetrackable, taggableFlexWeighted

## Future Enhancements

- **Milestone Templates**: Pre-defined milestone templates
- **Timeline Visualization**: Visual timeline of milestone achievements
- **AI-suggested Milestones**: Suggest milestones based on user behavior
- **Social Sharing**: Allow sharing milestone achievements 