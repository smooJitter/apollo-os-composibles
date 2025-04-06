/**
 * Get a user profile by user ID
 * @param {String} userId - User ID to find profile for
 * @param {Object} ctx - Application context
 * @returns {Promise<Object>} - The user profile
 */
export const getUserProfile = async (userId, ctx) => {
  try {
    const { models } = ctx;
    return await models.UserProfile.findOne({ userId });
  } catch (error) {
    ctx.logger?.error(`[UserProfile Action] getUserProfile error: ${error.message}`);
    throw new Error('Failed to get user profile');
  }
};

/**
 * Create or update a user profile
 * @param {String} userId - User ID to update profile for
 * @param {Object} profileData - Profile data to update
 * @param {Object} ctx - Application context
 * @returns {Promise<Object>} - The updated user profile
 */
export const updateUserProfile = async (userId, profileData, ctx) => {
  try {
    const { models } = ctx;
    const { UserProfile } = models;
    
    // Find or create profile
    let profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      profile = new UserProfile({ userId });
    }
    
    // Update fields
    Object.keys(profileData).forEach(key => {
      if (profileData[key] !== undefined && key !== 'userId') {
        profile[key] = profileData[key];
      }
    });
    
    // Save and return updated profile
    await profile.save();
    return profile;
  } catch (error) {
    ctx.logger?.error(`[UserProfile Action] updateUserProfile error: ${error.message}`);
    throw new Error('Failed to update user profile');
  }
};

/**
 * Delete a user profile
 * @param {String} userId - User ID to delete profile for
 * @param {Object} ctx - Application context
 * @returns {Promise<Boolean>} - Success status
 */
export const deleteUserProfile = async (userId, ctx) => {
  try {
    const { models } = ctx;
    const result = await models.UserProfile.deleteOne({ userId });
    return result.deletedCount > 0;
  } catch (error) {
    ctx.logger?.error(`[UserProfile Action] deleteUserProfile error: ${error.message}`);
    throw new Error('Failed to delete user profile');
  }
}; 