# Manifestation Module

The Manifestation module is designed to facilitate personal and spiritual growth by enabling users to articulate and track their intentions, visions, and desired outcomes. This module forms a key component of the Apollo OS Framework's personal development ecosystem, working in tandem with the Milestone and Habit modules to create a comprehensive approach to intention-setting and manifestation.

## Core Concepts

- **Manifestations**: These are the desired outcomes or states of being that a user wishes to manifest in their life. Unlike habits (regular actions) or milestones (concrete achievements), manifestations focus on the end result or state that one wishes to experience.

- **Intentions**: Clear statements of what one wishes to manifest, often phrased in present tense as if already realized.

- **Affirmations**: Positive statements that reinforce the belief in the manifestation, supporting the mindset needed to achieve the desired outcome.

- **Evidence**: Proof or signs that the manifestation is materializing, helping users recognize progress and maintain motivation.

- **State Workflow**: Manifestations move through various states from initial visioning to fully manifested, tracking the journey of bringing an intention into reality.

## Features

- Create and manage manifestations with customizable types and timeframes
- Track manifestation progress through a defined state workflow
- Add and manage affirmations to reinforce manifestation goals
- Collect evidence of manifestation to track progress
- Link manifestations to supporting milestones and habits
- Filter and sort manifestations by various criteria
- Feature important manifestations for daily focus

## Integration

The Manifestation module is designed to work seamlessly with other modules:

- **Habit Module**: Links habits as regular actions that support manifestations
- **Milestone Module**: Connects milestones as concrete achievements toward manifestations
- **Vision Board Module**: Provides visual representations of manifestations

## Technical Implementation

The module follows the Apollo OS Framework architecture with a modular approach:

- **MongoDB Schemas**: Defined in `schemas.js` using Mongoose
- **GraphQL Integration**: Set up through `registry.js` and `resolvers.js`
- **Business Logic**: Implemented in `actions/index.js`
- **Data Relationships**: Managed in `relations/index.js`

## State Management

Manifestations follow a state workflow:

1. `visioning`: Initial conceptualization
2. `intending`: Setting clear intention
3. `believing`: Building belief and conviction
4. `allowing`: Being open to receiving
5. `partial`: Beginning to see evidence
6. `manifesting`: Actively materializing
7. `manifested`: Fully realized
8. `evolving`: Expanding beyond initial vision
9. `released`: No longer actively pursuing

## Usage Examples

### Creating a Manifestation

```javascript
// Example using the createManifestation action
const result = await createManifestation(ctx, {
  userId: 'user123',
  title: 'Dream Home by the Ocean',
  description: 'A peaceful home with ocean views where I can work and relax',
  manifestationType: 'acquisition',
  timeframe: 'long_term',
  intention: {
    statement: 'I am living in my perfect oceanside home',
    presentTense: true,
    emotionalContext: 'peace, gratitude, fulfillment'
  },
  targetDate: new Date('2025-12-31')
});
```

### Adding an Affirmation

```javascript
// Example using the addManifestationAffirmation action
await addManifestationAffirmation(ctx, {
  userId: 'user123',
  manifestationId: 'manifest456',
  text: 'I am worthy of my dream home and it is coming to me with ease',
  isPrimary: true
});
```

### Tracking Evidence

```javascript
// Example using the addManifestationEvidence action
await addManifestationEvidence(ctx, {
  userId: 'user123',
  manifestationId: 'manifest456',
  title: 'Found the perfect location',
  description: 'Discovered an ideal area with available properties matching my criteria',
  mediaUrl: 'https://example.com/images/dreamlocation.jpg',
  mediaType: 'image'
});
```

## GraphQL API

The module exposes both queries and mutations:

### Queries
- `manifestationById`: Get a specific manifestation
- `myManifestations`: List user's manifestations with filtering
- `manifestationStats`: Get statistics about user's manifestations
- `featuredManifestations`: Get user's featured manifestations
- `dailyAffirmations`: Get daily affirmations from all manifestations

### Mutations
- `createManifestation`: Create a new manifestation
- `updateManifestation`: Update an existing manifestation
- `updateManifestationState`: Update a manifestation's state
- `addManifestationEvidence`: Add evidence to a manifestation
- `addManifestationAffirmation`: Add an affirmation to a manifestation
- `linkMilestonesToManifestation`: Connect milestones to a manifestation
- `linkHabitsToManifestation`: Connect habits to a manifestation
- `toggleManifestationFeatured`: Toggle featured status
- `deleteManifestation`: Delete a manifestation

## Events

The module emits various events that can be subscribed to:

- `manifestation:created`
- `manifestation:updated`
- `manifestation:stateChanged`
- `manifestation:evidenceAdded`
- `manifestation:affirmationAdded`
- `manifestation:milestonesLinked`
- `manifestation:habitsLinked`
- `manifestation:stateChangeSuggested`
- `manifestation:deleted`

These events allow other modules to react to changes in manifestations and implement features like notifications, analytics, and synchronization with external services. 