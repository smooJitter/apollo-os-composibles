// plugins/timetrackable.js
import mongoose from 'mongoose';

export function timetrackablePlugin(schema, options = {}) {
  const {
    field = 'timeline',
    userField = 'actor',
    eventField = 'event',
    noteField = 'note',
    enableEventTypes = true, // validate against enum
    allowedEvents = ['created', 'updated', 'deleted', 'archived', 'reviewed', 'published'],
  } = options;

  // Schema Additions
  schema.add({
    [field]: [
      {
        [eventField]: enableEventTypes
          ? {
              type: String,
              enum: allowedEvents,
              required: true,
            }
          : { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        [userField]: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        [noteField]: { type: String },
      },
    ],
  });

  // Method: logEvent()
  schema.methods.logEvent = function (eventKey, actorId = null, note = null) {
    if (enableEventTypes && !allowedEvents.includes(eventKey)) {
      throw new Error(
        `Invalid timeline event: "${eventKey}". Must be one of: ${allowedEvents.join(', ')}`
      );
    }

    this[field].push({
      [eventField]: eventKey,
      [userField]: actorId,
      [noteField]: note,
      timestamp: new Date(),
    });

    return this;
  };

  // Method: getTimeline()
  schema.methods.getTimeline = function () {
    return this[field] || [];
  };

  // Method: filterEvents()
  schema.methods.getEventsByType = function (type) {
    return this[field].filter((entry) => entry[eventField] === type);
  };

  // Static access to valid event types
  schema.statics.getAllowedEvents = function () {
    return allowedEvents;
  };
}
