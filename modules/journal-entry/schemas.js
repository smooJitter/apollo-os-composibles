// modules/journal-entry/schemas.js
import mongoose from 'mongoose';
import { timestamps } from '../../config/shared-mongoose/plugins/timestamps.js';
import { taggableSchema } from '../../config/shared-mongoose/plugins/taggable.js';

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
journalEntrySchema.plugin(timestamps);
journalEntrySchema.plugin(taggableSchema, { path: 'tags' });

// Create Model
export const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);

export default {
  JournalEntry
}; 