# Apollo OS Journal Entry Module

The Journal Entry Module is a companion module to the Journal module in the Apollo OS Framework. It provides functionality for creating, managing, and retrieving individual entries within journals, offering users a rich journaling experience with diverse entry types and metadata.

## Features

- Create detailed journal entries with customizable content
- Support for multiple entry types (Reflection, Dream, Vision, etc.)
- Track mood and emotional states for personal insights
- Record location data for contextual journaling
- Add attachments including images, documents, and links
- Apply privacy settings at the entry level
- Organize entries with metadata and tagging
- Rich querying capabilities for entry retrieval and analysis

## Module Structure

```
modules/journal-entry/
├── actions/          # Business logic and action handlers
│   └── index.js      # Core actions for entry manipulation
├── hooks/            # Event hooks and lifecycle handlers
├── relations/        # Entry relation definitions
├── validators/       # Entry validation rules
├── index.js          # Entry module definition
├── registry.js       # Entry type composers
├── resolvers.js      # Entry GraphQL resolvers
└── schemas.js        # Entry MongoDB schema
```

## Data Model

The Journal Entry schema includes:

- **References**: 
  - `journalId` - Link to parent journal
  - `userId` - Owner reference
- **Content**: 
  - `title` - Optional entry title
  - `content` - Main entry text
- **Metadata**:
  - `entryType` - Type classification (Dream, Reflection, Vision, etc.)
  - `mood` - Emotional state tracking
  - `entryDate` - When the entry was created or refers to
  - `location` - Where the entry was written
- **Media**:
  - `attachments` - Array of related media (images, documents, links)
- **Settings**:
  - `isPrivate` - Visibility control
- **Extension**:
  - `metadata` - Flexible object for additional properties

## API Reference

### Queries

- `journalEntryById(id: ID!)`: Get a journal entry by ID
- `journalEntryOne(filter: JournalEntryFilterInput)`: Find one entry by criteria
- `journalEntryMany(filter: JournalEntryFilterInput)`: Get multiple entries with filtering and pagination
- `journalEntryCount(filter: JournalEntryFilterInput)`: Count entries matching criteria
- `journalEntries(journalId: ID!, limit: Int, sortBy: String, sortOrder: String)`: Get entries for a specific journal
- `recentEntries(userId: ID!, limit: Int)`: Get recent entries across all journals for a user
- `entriesByMood(userId: ID!, mood: String!, limit: Int)`: Get entries with specific mood
- `entriesByDateRange(userId: ID!, startDate: Date!, endDate: Date!)`: Get entries within a date range

### Mutations

- `journalEntryCreate(journalId: ID!, userId: ID!, input: JournalEntryInput!)`: Create a new journal entry
- `journalEntryUpdate(id: ID!, input: JournalEntryInput!)`: Update an existing entry
- `journalEntryDelete(id: ID!)`: Delete an entry
- `addEntryAttachment(entryId: ID!, attachment: AttachmentInput!)`: Add an attachment to an entry
- `removeEntryAttachment(entryId: ID!, attachmentId: ID!)`: Remove an attachment from an entry
- `updateEntryPrivacy(entryId: ID!, isPrivate: Boolean!)`: Update entry privacy setting

## Integration

The Journal Entry module integrates with:

- **Journal module** - Parent container for entries
- **User module** - Ownership and permissions
- **Affirmation module** - For extracting affirmations from journal content
- **Habit module** - For tracking habit-related journaling
- **Vision Board module** - For visualizing journal content

## Usage Examples

### Creating a Journal Entry

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

### Adding an Attachment to an Entry

```graphql
mutation {
  addEntryAttachment(
    entryId: "entry123",
    attachment: {
      type: "image",
      url: "https://example.com/images/morning-sky.jpg",
      name: "Morning Sky"
    }
  ) {
    _id
    title
    attachments {
      type
      url
      name
    }
  }
}
```

### Retrieving Entries by Mood

```graphql
query {
  entriesByMood(
    userId: "user123",
    mood: "happy",
    limit: 5
  ) {
    _id
    title
    content
    entryDate
    mood
  }
}
```

## Advanced Features

### Entry Types

Journal entries can be categorized with specific types to enable different kinds of journaling:

- **Reflection**: Standard journal entries for daily thoughts and reflections
- **Dream**: For recording and analyzing dreams and sleep experiences
- **Vision**: For documenting future aspirations, goals, and visualizations
- **Imagination**: For creative writing, fiction, and exploratory thought
- **Memory**: For recording significant past events and memories

### Mood Analysis

The module supports tracking emotional states across entries, enabling:
- Mood pattern recognition over time
- Correlation between activities and emotional states
- Sentiment analysis for personal growth insights

### Attachment Management

Journal entries support rich media attachments:
- **Images**: Photos, drawings, and visual elements
- **Documents**: PDFs, text files, and documents
- **Links**: Web resources and references
- **Other**: Custom attachment types for extensibility

## Implementation Notes

### MongoDB Indexing

The Journal Entry schema includes indexes on:
- `journalId` - For fast retrieval of entries by journal
- `userId` - For user-based queries and security
- `entryDate` - For chronological sorting and filtering

### Validation

Entry validation ensures:
- Required fields (content, journalId, userId) are present
- Date formats are valid
- Entry types and moods match allowed enum values
- Attachment URLs are properly formatted

## Related Modules

The Journal Entry module is designed to work in tandem with the Journal module. While Journal handles the containers or notebooks, Journal Entry manages the individual content pieces within those containers. 