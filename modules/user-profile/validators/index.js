import Joi from 'joi';

/**
 * Validation schema for profile updates
 */
export const profileUpdateSchema = Joi.object({
  bio: Joi.string().allow('').max(500),
  avatarUrl: Joi.string().allow('').uri().max(2000),
  socialLinks: Joi.array().items(
    Joi.object({
      platform: Joi.string().required().max(50),
      url: Joi.string().required().uri().max(2000)
    })
  ),
  preferences: Joi.object()
});

/**
 * Validate profile data for updates
 * @param {Object} profileData - The profile data to validate
 * @returns {Object} - Validation result with error property if validation fails
 */
export const validateProfileUpdate = (profileData) => {
  const { error, value } = profileUpdateSchema.validate(profileData, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const formattedError = error.details.map(detail => ({
      message: detail.message,
      path: detail.path
    }));
    
    return {
      valid: false,
      errors: formattedError
    };
  }
  
  return {
    valid: true,
    data: value
  };
}; 