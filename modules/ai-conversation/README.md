# AI Conversation Collection Module

This module manages dialogues between users and AI, storing details of each interaction within the Apollo OS Framework. It enables the persistence and analysis of conversations for improving user experiences, tracking insights, and building contextual awareness across the platform.

## Features

- **Comprehensive Conversation Tracking**: Store complete conversation history with metadata and analytics
- **Interaction Management**: Add, update, and retrieve user-AI message exchanges
- **Conversation Types**: Categorize conversations by purpose (Coaching, Manifestation, Habit Formation, etc.)
- **Entity Linking**: Connect conversations to relevant entities like Manifestations, Habits, Milestones
- **Analytics Integration**: Track user engagement, feedback, and conversation metrics
- **Context Preservation**: Maintain conversation context across sessions with sessionId
- **Sentiment Analysis**: Capture conversation tone and emotional content
- **Feedback System**: Collect and analyze user feedback on AI interactions

## Schema Structure

The core schema `AIConversation` represents the dialogue between a user and AI with fields such as:

- `userId`: Owner of the conversation
- `sessionId`: Unique identifier for the conversation session
- `title`: Descriptive name for the conversation
- `type`: Categorization of conversation purpose
- `start`: When the conversation began
- `lastInteraction`: Timestamp of most recent interaction
- `interactions`: Array of message exchanges including:
  - `message`: User input
  - `messageType`: Category of message (Question, Statement, Command, etc.)
  - `response`: AI generated response
  - `responseMetadata`: Technical details about AI response generation
  - `status`: Processing status of the interaction
  - `timestamp`: When the interaction occurred
- `summary`: AI-generated summary of the conversation
- `keyPoints`: Important takeaways from the conversation
- `model`: AI model used for responses
- `metadata`: Flexible object for additional properties including:
  - `purpose`: Goal of the conversation
  - `sentiment`: Overall emotional tone
  - `relevantEntities`: Connections to other entities in the system
  - `userFeedback`: Rating and comments from the user

## GraphQL API

### Queries

- `aiConversationById(id: ID!)`: Retrieve a specific conversation by ID
- `aiConversationBySessionId(sessionId: String!)`: Get a conversation by its session ID
- `myConversations(filter: ConversationFilterInput, limit: Int, skip: Int)`: Get current user's conversations
- `myConversationStats(timeframe: String)`: Get statistics about conversations
- `searchConversations(searchQuery: String!, limit: Int, skip: Int)`: Search across conversations

### Mutations

- `createAIConversation(input: CreateConversationInput!)`: Start a new conversation
- `updateAIConversation(id: ID!, input: UpdateConversationInput!)`: Update conversation details
- `addInteraction(conversationId: ID!, input: AddInteractionInput!)`: Add a user message
- `completeInteraction(conversationId: ID!, interactionId: ID!, input: CompleteInteractionInput!)`: Add AI response
- `addConversationFeedback(conversationId: ID!, input: ConversationFeedbackInput!)`: Add user feedback
- `archiveConversation(conversationId: ID!)`: Archive a conversation
- `generateConversationSummary(conversationId: ID!)`: Generate a summary for a conversation

## Events

The module emits and listens for the following events:

### Emitted Events
- `CONVERSATION_CREATED`: When a new conversation is created
- `CONVERSATION_UPDATED`: When conversation details are updated
- `INTERACTION_ADDED`: When a user message is added
- `CONVERSATION_COMPLETED`: When a conversation is marked as complete
- `CONVERSATION_ARCHIVED`: When a conversation is archived
- `USER_FEEDBACK_ADDED`: When user feedback is recorded

## Usage Examples

### Creating a New Conversation

```javascript
const { result, error } = await ctx.actions.aiConversation.createConversation({
  title: 'Manifestation Guidance',
  type: 'Manifestation',
  model: 'Apollo Advanced',
  initialMessage: 'I want to manifest a new career opportunity.',
  metadata: {
    purpose: 'Career planning guidance',
    tags: ['career', 'manifestation', 'opportunity']
  }
}, userId);
```

### Adding a User Message

```javascript
const { result, error } = await ctx.actions.aiConversation.addUserMessage(
  conversationId,
  'What steps should I take to manifest this opportunity?',
  userId,
  'Question'
);
```

### Adding AI Response

```javascript
const { result, error } = await ctx.actions.aiConversation.addAIResponse(
  conversationId,
  interactionId,
  'To manifest this opportunity, let me guide you through several steps...',
  userId,
  {
    model: 'Apollo Advanced',
    tokens: {
      prompt: 45,
      completion: 230,
      total: 275
    },
    processingTime: 1250 // milliseconds
  }
);
```

### Fetching User Conversations

```javascript
const { data } = await client.query({
  query: gql`
    query MyConversations($limit: Int, $filter: ConversationFilterInput) {
      myConversations(limit: $limit, filter: $filter) {
        _id
        title
        type
        lastInteraction
        interactionCount
        formattedStart
        summary
      }
    }
  `,
  variables: { 
    limit: 10,
    filter: { type: 'Manifestation' }
  }
});
```

### Adding Feedback

```javascript
const { data } = await client.mutate({
  mutation: gql`
    mutation AddFeedback($conversationId: ID!, $input: ConversationFeedbackInput!) {
      addConversationFeedback(conversationId: $conversationId, input: $input) {
        _id
        userFeedbackRating
      }
    }
  `,
  variables: { 
    conversationId: '60d5ec9f8e8f3c001f3c9a60',
    input: {
      rating: 5,
      comments: 'This guidance was incredibly helpful!'
    }
  }
});
```

## Integration with Other Modules

This module connects with:

- **Manifestation**: Links conversations about manifestation goals and provides insights
- **Habit**: Associates conversations with habit formation and maintenance
- **Milestone**: Connects conversations about milestone planning and achievements
- **Immersion**: Relates conversations to immersive experiences
- **User**: Extends the user model with conversation history and statistics
- **Unified Recommendations**: Creates recommendations based on conversation insights

## Best Practices

1. Use conversation types to properly categorize different dialogue purposes
2. Link conversations to relevant entities for better cross-module integration
3. Generate summaries for longer conversations to aid in recall and search
4. Collect user feedback to improve AI response quality
5. Use analytics data to identify patterns and improve user experience
6. Archive rather than delete conversations to maintain history while keeping active lists manageable 