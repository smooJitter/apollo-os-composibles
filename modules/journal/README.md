# Apollo OS Journal Module

The Journal Module is a core component of the Apollo OS Framework that enables users to create and maintain personal journals with entries. This module provides a comprehensive solution for journaling with rich functionality for personal development and reflection.

## Features

- Create and manage multiple journals with customizable properties
- Add entries to journals with different types (Reflection, Dream, Vision, etc.)
- Track mood and emotional states across journal entries
- Organize journals by categories (personal, work, health, finance)
- Private/public visibility settings for journals and entries
- Attach files, images, and links to journal entries
- Archive journals when no longer in active use
- Comprehensive querying capabilities for journals and entries

## Module Structure

```
modules/journal/
├── actions/          # Business logic and action handlers
├── hooks/            # Event hooks and lifecycle handlers
├── relations/        # Schema relations with other modules
├── validators/       # Validation rules and functions
├── index.js          # Main module definition
├── registry.js       # Type composers registry
├── resolvers.js      # GraphQL resolvers
└── schemas.js        # MongoDB schemas definition

modules/journal-entry/
├── actions/          # Entry-specific business logic
├── hooks/            # Entry-specific event hooks
├── relations/        # Entry relation definitions
├── validators/       # Entry validation rules
├── index.js          # Entry module definition
├── registry.js       # Entry type composers
├── resolvers.js      # Entry GraphQL resolvers
└── schemas.js        # Entry MongoDB schema
```

## Data Models

### Journal Schema

- **Basic Properties**: title, description, coverImage
- **Organization**: category, tags
- **Visibility**: isPrivate, isArchived
- **Ownership**: userId (reference to User)
- **Metadata**: for extensibility

### Journal Entry Schema

- **References**: journalId, userId
- **Content**: title, content, entryType
- **Metadata**: mood, entryDate, location
- **Attachments**: images, documents, links
- **Visibility**: isPrivate
- **Extended Data**: metadata for flexibility

## API Reference

### Journal Queries

- `journalById(id: ID!)`: Get a journal by ID
- `journalOne(filter: JournalFilterInput)`: Find one journal by criteria
- `journalMany(filter: JournalFilterInput)`: Get multiple journals with filtering and pagination
- `journalCount(filter: JournalFilterInput)`: Count journals matching criteria
- `userJournals(userId: ID!, limit: Int, sortBy: String, sortOrder: String)`: Get all journals for a specific user

### Journal Mutations

- `journalCreate(userId: ID!, input: JournalInput!)`: Create a new journal
- `journalUpdate(id: ID!, input: JournalInput!)`: Update an existing journal
- `journalDelete(id: ID!)`: Delete a journal

### Journal Entry Queries

- `journalEntryById(id: ID!)`: Get a journal entry by ID
- `journalEntryOne(filter: JournalEntryFilterInput)`: Find one entry by criteria
- `journalEntryMany(filter: JournalEntryFilterInput)`: Get multiple entries with filtering and pagination
- `journalEntryCount(filter: JournalEntryFilterInput)`: Count entries matching criteria
- `journalEntries(journalId: ID!, limit: Int, sortBy: String, sortOrder: String)`: Get entries for a specific journal
- `recentEntries(userId: ID!, limit: Int)`: Get recent entries across all journals for a user

### Journal Entry Mutations

- `journalEntryCreate(journalId: ID!, userId: ID!, input: JournalEntryInput!)`: Create a new journal entry
- `journalEntryUpdate(id: ID!, input: JournalEntryInput!)`: Update an existing entry
- `journalEntryDelete(id: ID!)`: Delete an entry
- `addEntryAttachment(entryId: ID!, attachment: AttachmentInput!)`: Add an attachment to an entry

## Integration

The Journal module depends on the User module and integrates with other Apollo OS modules like:

- User module for ownership and permissions
- Affirmation module for emotional insights
- Habit module for tracking personal development

## Usage Examples

### Creating a Journal

```graphql
mutation {
  journalCreate(
    userId: "user123",
    input: {
      title: "Personal Growth Journal",
      description: "Tracking my personal development journey",
      category: "personal",
      isPrivate: true
    }
  ) {
    _id
    title
    category
  }
}
```

### Adding a Journal Entry

```graphql
mutation {
  journalEntryCreate(
    journalId: "journal123",
    userId: "user123",
    input: {
      title: "Morning Reflection",
      content: "Today I'm feeling grateful for...",
      entryType: "Reflection",
      mood: "happy",
      entryDate: "2023-04-06T08:00:00Z"
    }
  ) {
    _id
    title
    entryType
    mood
  }
}
```

### Getting Journal Entries

```graphql
query {
  journalEntries(
    journalId: "journal123",
    limit: 10,
    sortBy: "entryDate",
    sortOrder: "desc"
  ) {
    _id
    title
    content
    entryType
    mood
    entryDate
  }
}
```

## Advanced Features

### Entry Types

The module supports various types of journal entries:
- **Reflection**: Standard journal entries for daily thoughts
- **Dream**: For recording and analyzing dreams
- **Vision**: For documenting future aspirations and goals
- **Imagination**: For creative writing and exploration
- **Memory**: For recording significant memories

### Mood Tracking

Journal entries can track emotional states to help users understand patterns:
- happy, sad, anxious, excited, neutral, productive, tired

### Attachments

Entries support multiple types of attachments:
- Images for visual journaling
- Documents for in-depth reflections
- Links to external resources
- Other types for flexibility

## Contributing

When extending this module, please follow the established patterns for:
- Adding new resolvers
- Extending the schemas
- Creating new action handlers
- Maintaining backward compatibility

## Related Modules

The Journal module works closely with the Journal Entry module, which handles individual journal entries. While they are separate modules for code organization, they should be used together to provide a complete journaling experience. 