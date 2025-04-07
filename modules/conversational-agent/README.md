# Conversational Agent Module

The Conversational Agent module provides a framework for creating, managing, and interacting with AI agents that can converse with users, perform actions, maintain memory, and assist with various tasks within the Apollo OS Framework.

## Overview

This module enables the creation of specialized AI agents that can:

- Engage in natural language conversations with users
- Maintain persistent memory and context across sessions
- Execute actions based on user requests and agent goals
- Track progress toward specific goals
- Link to other entities in the system (manifestations, habits, immersions)
- Adapt to user preferences over time
- Perform autonomous actions based on configured permissions

## Features

- **Agent Types**: Support for multiple agent types (Personal Assistant, Knowledge Expert, Coach, etc.)
- **Memory System**: Persistent memory storage for tracking user preferences and conversation context
- **Goal Management**: Define, track, and complete goals for agents
- **Action Framework**: Execute and track the status of agent actions
- **Relationship Management**: Link agents to other entities in the system
- **Performance Metrics**: Track success rates and response times
- **Customizable Configuration**: Adjust personality traits, capabilities, and permissions

## Directory Structure

```
modules/conversational-agent/
├── actions/               # Business logic for agent operations
├── constants.js           # Constants, enums, and default configurations
├── hooks/                 # Event handlers and hooks
├── index.js               # Module entry point
├── README.md              # Documentation
├── registry.js            # GraphQL type composers
├── relations/             # Relationship management between agents and entities
├── resolvers.js           # GraphQL resolvers
└── schemas.js             # Mongoose schemas
```

## Schemas

The module defines several Mongoose schemas:

- **ConversationalAgent**: The main agent schema
- **AgentConfig**: Configuration settings for the agent
- **AgentGoal**: Goals the agent is working towards
- **AgentAction**: Actions performed by the agent
- **AgentMemory**: Persistent memory items for the agent
- **AgentPerformance**: Metrics tracking agent effectiveness

## GraphQL API

### Queries

- `conversationalAgentById`: Get an agent by ID
- `myConversationalAgents`: Get all agents for the current user
- `conversationalAgentByConversation`: Get agent by conversation ID
- `defaultConversationalAgent`: Get the user's default agent
- `conversationalAgentStats`: Get statistics about the user's agents

### Mutations

- `createConversationalAgent`: Create a new agent
- `updateConversationalAgent`: Update an existing agent
- `deleteConversationalAgent`: Delete an agent
- `addGoalToAgent`: Add a goal to an agent
- `completeAgentGoal`: Mark a goal as completed
- `addMemoryToAgent`: Add a memory to an agent
- `createAgentAction`: Create an action for an agent
- `updateAgentAction`: Update an action's status and result
- `processAgentMessage`: Process a message with an agent

## Agent Types

The module supports various agent types, each with default configurations:

| Type | Description |
|------|-------------|
| Personal Assistant | Helps with daily tasks, scheduling, and reminders |
| Knowledge Expert | Provides information and answers questions |
| Creative Partner | Assists with creative tasks and brainstorming |
| Coach | Helps achieve goals and maintain motivation |
| Mentor | Provides guidance and wisdom for personal growth |
| Task Manager | Focuses on task execution and project management |
| Learning Guide | Assists with learning new skills and knowledge |
| Accountability Partner | Helps maintain consistency with habits and goals |

## Usage Examples

### Create a new agent

```javascript
const agent = await actions.createAgent({
  userId,
  agent: {
    name: "My Personal Assistant",
    description: "Helps me stay organized and on track",
    type: "Personal Assistant",
    isDefault: true,
    configuration: {
      prompt: "You are a helpful personal assistant",
      systemInstructions: "Help the user stay organized and productive",
      capabilities: ["TaskAutomation", "ScheduleManagement"],
      permissions: ["SendMessages", "AccessTasks"],
      personalityTraits: ["Friendly", "Efficient"],
      autonomyLevel: 2
    }
  }
});
```

### Process a message with an agent

```javascript
const response = await actions.processMessage({
  userId,
  agentId,
  message: "Can you help me organize my tasks for today?",
  conversationId
});
```

### Link an agent to a manifestation

```javascript
const updatedAgent = await relations.linkAgentToManifestation({
  userId,
  agentId,
  manifestationId,
  relationship: "assist"
});
```

## Integration with Other Modules

The Conversational Agent module integrates with several other modules in the Apollo OS Framework:

- **Manifestation**: Agents can be linked to manifestations to assist with progress
- **Habit**: Agents can monitor habits and provide accountability
- **Immersion**: Agents can guide users through immersive experiences
- **Milestone**: Agents can track milestone progress
- **Unified Recommendations**: Agents can trigger notifications and recommendations

## Events

The module emits and listens for various events:

- `agent:created`: When a new agent is created
- `agent:updated`: When an agent is updated
- `agent:deleted`: When an agent is deleted
- `agent:goal:added`: When a goal is added to an agent
- `agent:goal:completed`: When a goal is completed
- `agent:memory:added`: When a memory is added to an agent
- `agent:action:created`: When an action is created
- `agent:action:updated`: When an action status is updated
- `agent:message:processed`: When a message is processed by an agent

## Future Enhancements

Planned improvements for this module include:

1. Advanced memory management with vector embeddings
2. Enhanced reasoning capabilities
3. Multi-agent collaboration
4. Tool integration for expanded capabilities
5. Learning from feedback to improve agent performance
6. Better natural language understanding and generation

## Configuration Options

Agents can be configured with various options:

- **Prompt**: The initial prompt for the agent
- **System Instructions**: Detailed instructions for agent behavior
- **Capabilities**: What the agent can do
- **Permissions**: What the agent is allowed to access
- **Personality Traits**: How the agent should behave
- **Autonomy Level**: How much freedom the agent has to act
- **Model**: The AI model to use for this agent
- **Model Parameters**: Specific settings for the AI model
- **Context Window**: How much context to maintain
- **Max Actions Per Day**: Limit on daily actions
- **Allowed Action Types**: Types of actions the agent can perform 