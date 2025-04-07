import mongoose from 'mongoose'; // Use import for ES Modules

export function flaggablePlugin(schema, options = {}) {
  const {
    field = 'flags',
    allowedFlags = null, // e.g. ['featured', 'pinned', 'archived']
    trackTimestamps = false,
  } = options;

  // Define the structure for each flag entry
  const flagFieldDefinition = trackTimestamps
    ? {
        value: { type: Boolean, default: false },
        changedAt: { type: Date },
      }
    : { type: Boolean, default: false };

  // Add the flags field to the schema using mongoose.Schema.Types.Map
  schema.add({
    [field]: { type: Map, of: new mongoose.Schema(flagFieldDefinition, { _id: false }) }, // Embed schema for complex types
  });

  // Method to set a flag
  schema.methods.setFlag = function (flagName, value = true) {
    if (allowedFlags && !allowedFlags.includes(flagName)) {
      throw new Error(`Invalid flag "${flagName}". Allowed: ${allowedFlags.join(', ')}`);
    }

    if (!this[field]) {
      this[field] = new Map(); // Initialize if it doesn't exist
    }

    let flagData;
    if (trackTimestamps) {
      flagData = {
        value: !!value, // Ensure boolean
        changedAt: new Date(),
      };
    } else {
      flagData = !!value; // Ensure boolean
    }

    this[field].set(flagName, flagData);
    this.markModified(field); // Important for Map types
    return this;
  };

  // Check if a flag is active
  schema.methods.isFlagged = function (flagName) {
    const flagData = this[field]?.get(flagName);
    if (!flagData) return false;
    return trackTimestamps ? flagData.value === true : flagData === true;
  };

  // Remove a flag
  schema.methods.clearFlag = function (flagName) {
    if (this[field]?.has(flagName)) {
      this[field].delete(flagName);
      this.markModified(field); // Mark modified when deleting from Map
    }
    return this;
  };

  // Return all active flags
  schema.methods.getActiveFlags = function () {
    const active = {};
    if (this[field]) {
      this[field].forEach((flagData, flagName) => {
        const isFlagActive = trackTimestamps ? flagData?.value === true : flagData === true;
        if (isFlagActive) {
          active[flagName] = flagData;
        }
      });
    }
    return active;
  };

  // Static method to get allowed flags (if defined)
  schema.statics.getAllowedFlags = function () {
    return allowedFlags;
  };
}
