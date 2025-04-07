import mongoose from 'mongoose';

export function scoreablePlugin(schema, options = {}) {
  const {
    field = 'scores',
    allowedTypes = ['general', 'quality', 'helpfulness', 'difficulty'], // Extended example
    preventDuplicates = true,
    trackUser = true,
  } = options;

  const scoreSchemaDefinition = {
    type: { type: String, enum: allowedTypes, default: 'general', required: true },
    value: { type: Number, min: 0, max: 5, required: true },
    weight: { type: Number, default: 1 },
  };

  if (trackUser) {
    scoreSchemaDefinition.user = { type: mongoose.Schema.Types.ObjectId, ref: 'User' };
  }

  // Using Schema constructor for the subdocument array
  const ScoreSchema = new mongoose.Schema(scoreSchemaDefinition, { _id: false });

  schema.add({
    [field]: [ScoreSchema], // Embed the schema definition
  });

  // Add a score (upsert-style)
  schema.methods.addScore = function (type, value, user = null, weight = 1) {
    if (!allowedTypes.includes(type)) {
      throw new Error(`Score type "${type}" is not allowed.`);
    }

    if (value < 0 || value > 5) {
      throw new Error(`Score value must be between 0 and 5.`);
    }

    const scores = this[field];
    let updated = false;

    if (trackUser && preventDuplicates && user) {
      const userIdString = user._id ? user._id.toString() : user.toString();
      const existingIndex = scores.findIndex(
        (s) => s.type === type && s.user?.toString() === userIdString
      );

      if (existingIndex !== -1) {
        // Update score
        scores[existingIndex].value = value;
        scores[existingIndex].weight = weight;
        updated = true;
      }
    }

    // Add new score if not updated
    if (!updated) {
      const newScore = { type, value, weight };
      if (trackUser && user) {
        newScore.user = user._id || user; // Store ObjectId
      }
      scores.push(newScore);
    }

    this.markModified(field); // Important for embedded arrays
    return this;
  };

  // Get score average for a specific type
  schema.methods.getScoreAvg = function (type = 'general') {
    const scores = this[field].filter((s) => s.type === type);
    if (scores.length === 0) return 0;
    const totalWeight = scores.reduce((acc, s) => acc + (s.weight || 1), 0);
    const weightedSum = scores.reduce((acc, s) => acc + s.value * (s.weight || 1), 0);
    return totalWeight === 0 ? 0 : +(weightedSum / totalWeight).toFixed(2);
  };

  // Count scores by type
  schema.methods.getScoreCount = function (type = 'general') {
    return this[field].filter((s) => s.type === type).length;
  };

  // Score summary breakdown
  schema.methods.getScoreSummary = function () {
    const summary = {};
    for (const type of allowedTypes) {
      summary[type] = {
        count: this.getScoreCount(type),
        average: this.getScoreAvg(type),
      };
    }
    return summary;
  };
}
