import mongoose from 'mongoose';

export function scoreableFlexPlugin(schema, options = {}) {
  const ObjectId = mongoose.Schema.Types.ObjectId;

  const {
    field = 'scores',
    scoreModel = 'Score', // The referenced model name
    allowedTypes = ['general', 'helpfulness', 'quality', 'relevance'], // Extended example
    preventDuplicates = true,
    trackUser = true,
  } = options;

  schema.add({
    [field]: [
      {
        type: ObjectId,
        ref: scoreModel,
      },
    ],
  });

  // Add score via ref (upsert behavior)
  schema.methods.addScoreByRef = async function (type, value, userId = null, weight = 1) {
    if (!allowedTypes.includes(type)) {
      throw new Error(`Invalid score type "${type}". Allowed: ${allowedTypes.join(', ')}`);
    }
    if (value < 0 || value > 5) {
      // Assuming 0-5 scale
      throw new Error(`Score value must be between 0 and 5.`);
    }

    // Ensure the Score model is registered
    let Score;
    try {
      Score = mongoose.model(scoreModel);
    } catch (error) {
      throw new Error(
        `Mongoose model "${scoreModel}" not found. Ensure it is defined and registered before applying this plugin.`
      );
    }

    const userIdString = userId?._id ? userId._id.toString() : userId?.toString();
    let existingScoreId = null;

    // Prevent duplicate vote
    if (preventDuplicates && trackUser && userIdString) {
      // Find if this document already references a score of this type by this user
      const populated = await this.populate({
        path: field,
        match: { type: type, user: userIdString },
      });
      const existingScore = populated[field]?.[0]; // Should only find one if duplicates are prevented

      if (existingScore) {
        // Update existing score document directly
        existingScore.value = value;
        existingScore.weight = weight;
        await existingScore.save();
        return this; // No need to modify the parent document's array
      }
    }

    // Create new score document
    const scoreData = {
      type,
      value,
      weight,
      // Add a field linking back to the parent document if needed in Score schema, e.g., parentId: this._id
    };
    if (trackUser && userId) {
      scoreData.user = userId._id || userId;
    }

    const scoreDoc = new Score(scoreData);
    await scoreDoc.save();

    // Add reference to the parent document
    this[field].push(scoreDoc._id);
    return this;
  };

  // Get all populated scores (optionally filtered)
  schema.methods.getScoresByType = async function (type = null) {
    // Check if already populated or populate if needed
    if (!this.populated(field)) {
      await this.populate(field);
    }
    return this[field].filter((score) => score && (type ? score.type === type : true));
  };

  // Get average score
  schema.methods.getScoreAvg = async function (type = 'general') {
    const scores = await this.getScoresByType(type);
    if (scores.length === 0) return 0;
    const totalWeight = scores.reduce((acc, s) => acc + (s.weight || 1), 0);
    const weightedSum = scores.reduce((acc, s) => acc + s.value * (s.weight || 1), 0);
    return totalWeight === 0 ? 0 : +(weightedSum / totalWeight).toFixed(2);
  };

  // Get score summary
  schema.methods.getScoreSummary = async function () {
    const summary = {};
    for (const type of allowedTypes) {
      const scoresOfType = await this.getScoresByType(type);
      summary[type] = {
        count: scoresOfType.length,
        average: await this.getScoreAvg(type), // Recalculates, could optimize by passing scoresOfType
      };
    }
    return summary;
  };
}
