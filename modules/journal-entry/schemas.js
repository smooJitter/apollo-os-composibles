// modules/journal-entry/schemas.js
import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';
// taggableSchema is available via ctx when the module is initialized

const { Schema } = mongoose;

/**
 * Journal Entry Schema
 * Represents an individual entry in a user's journal
 */
const journalEntrySchema = new Schema({
  journalId: {
    type: Schema.Types.ObjectId,
    ref: 'Journal',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  entryType: {
    type: String,
    enum: ['Dream', 'Reflection', 'Vision', 'Imagination', 'Memory'],
    default: 'Reflection'
  },
  mood: {
    type: String,
    enum: ['happy', 'sad', 'anxious', 'excited', 'neutral', 'productive', 'tired', 'other'],
    default: 'neutral'
  },
  entryDate: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    trim: true
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'link', 'other'],
      default: 'other'
    },
    url: String,
    name: String
  }],
  isPrivate: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Apply plugins
journalEntrySchema.plugin(timestampsPlugin);
// Apply taggable plugin when schema is initialized with context

// Create Model
export const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);

// Export a function that will apply plugins that require context
export const applyContextPlugins = (ctx) => {
  if (ctx && ctx.plugins && ctx.plugins.taggableSchema) {
    journalEntrySchema.plugin(ctx.plugins.taggableSchema, { path: 'tags' });
  }
  return { JournalEntry };
};

export default {
  JournalEntry,
  applyContextPlugins
}; 