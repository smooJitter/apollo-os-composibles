# Apollo OS Affirmation Module

The Affirmation Module is a core component of the Apollo OS Framework that enables users to create and manage daily positive affirmations. It provides a comprehensive solution for scheduling and delivering motivational statements to support personal growth and mindfulness.

## Features

- Create and manage personalized affirmations
- Categorize affirmations (health, career, relationships, etc.)
- Schedule affirmations with customizable delivery times
- Configure frequency patterns (daily, weekdays, weekends, weekly, monthly)
- Toggle active status for individual affirmations
- Get affirmations scheduled for the current day
- Integrate with other personal development modules

## Module Structure

```
modules/affirmation/
├── actions/          # Business logic and action handlers
│   └── index.js      # Core actions for affirmation operations
├── hooks/            # Event hooks and lifecycle handlers
├── relations/        # Schema relations with other modules
├── index.js          # Main module definition
├── init.js           # Module initialization
├── registry.js       # Type composers registry
├── resolvers.js      # GraphQL resolvers
└── schemas.js        # MongoDB schemas definition
```

## Data Model

The Affirmation schema includes:

- **Basic Properties**:
  - `text` - The affirmation statement
  - `scheduledTime` - Time of day to deliver the affirmation (HH:MM format)
- **Organization**:
  - `category` - Type of affirmation (health, career, relationships, personal, other)
  - `reminderFrequency` - When to show the affirmation (daily, weekdays, weekends, weekly, monthly)
- **Status**:
  - `isActive` - Whether the affirmation is currently active
- **Ownership**:
  - `userId` - Reference to the User who created the affirmation
- **Extension**:
  - `metadata` - Flexible object for additional properties

## API Reference

### Queries

- `affirmationById(id: ID!)`: Get an affirmation by ID
- `affirmationOne(filter: AffirmationFilterInput)`: Find one affirmation by criteria
- `affirmationMany(filter: AffirmationFilterInput)`: Get multiple affirmations with filtering and pagination
- `affirmationCount(filter: AffirmationFilterInput)`: Count affirmations matching criteria
- `userAffirmations(userId: ID!, isActive: Boolean, category: String)`: Get all affirmations for a specific user
- `todaysAffirmations(userId: ID!)`: Get affirmations scheduled for today based on frequency settings

### Mutations

- `affirmationCreate(userId: ID!, input: AffirmationInput!)`: Create a new affirmation
- `affirmationUpdate(id: ID!, input: AffirmationInput!)`: Update an existing affirmation
- `affirmationDelete(id: ID!)`: Delete an affirmation
- `affirmationToggleActive(id: ID!)`: Toggle an affirmation's active status

## Integration

The Affirmation module depends on the User module and integrates with other Apollo OS modules like:

- User module for ownership and permissions
- Journal module for reflection on affirmations
- Habit module for reinforcing positive behaviors
- Vision Board module for visualizing affirmation outcomes

## Usage Examples

### Creating an Affirmation

```graphql
mutation {
  affirmationCreate(
    userId: "user123",
    input: {
      text: "I am confident and capable of achieving my goals",
      category: "CAREER",
      scheduledTime: "08:00",
      reminderFrequency: "weekdays"
    }
  ) {
    _id
    text
    category
    isActive
  }
}
```

### Retrieving Today's Affirmations

```graphql
query {
  todaysAffirmations(userId: "user123") {
    _id
    text
    category
    scheduledTime
  }
}
```

### Updating an Affirmation

```graphql
mutation {
  affirmationUpdate(
    id: "affirmation123",
    input: {
      text: "I embrace challenges as opportunities for growth",
      category: "PERSONAL"
    }
  ) {
    _id
    text
    category
    updatedAt
  }
}
```

### Toggling Affirmation Status

```graphql
mutation {
  affirmationToggleActive(id: "affirmation123") {
    _id
    text
    isActive
  }
}
```

## Advanced Features

### Frequency Patterns

The module supports various frequency patterns for affirmation delivery:

- **Daily**: Shown every day
- **Weekdays**: Shown Monday through Friday
- **Weekends**: Shown Saturday and Sunday
- **Weekly**: Shown once a week (on Monday)
- **Monthly**: Shown once a month (on the 1st)

### Categorization

Affirmations can be categorized to focus on different life areas:

- **Health**: Physical and mental well-being
- **Career**: Professional development and work
- **Relationships**: Personal connections and social interactions
- **Personal**: Self-improvement and growth
- **Other**: Miscellaneous affirmations

## Implementation Notes

### Scheduling Logic

The module includes intelligent scheduling logic that:
- Determines which affirmations to show based on the current day
- Filters by active status and appropriate frequency pattern
- Returns affirmations relevant to the user's current context

### Best Practices

For optimal use of the Affirmation module:
- Keep affirmations positive and present-tense
- Create affirmations for different areas of life
- Schedule affirmations at times when users are most receptive
- Rotate and refresh affirmations periodically

## Contributing

When extending this module, please follow the established patterns for:
- Adding new resolvers
- Extending the schema
- Creating new action handlers
- Maintaining backward compatibility 