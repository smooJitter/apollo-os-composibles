import * as R from 'ramda';
import Joi from 'joi';

/**
 * Validate login credentials
 * @param {Object} credentials - User credentials
 * @returns {Promise<Object>} - Validated credentials
 */
export const validateLogin = async (credentials) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).required()
      .messages({
        'string.empty': 'Username is required',
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username must be at most 50 characters',
        'any.required': 'Username is required'
      }),
    password: Joi.string().min(6).required()
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
      })
  });

  try {
    return await schema.validateAsync(credentials);
  } catch (error) {
    throw new Error(error.details[0].message);
  }
};

/**
 * Validate user registration data
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Validated user data
 */
export const validateRegistration = async (userData) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).required()
      .messages({
        'string.empty': 'Username is required',
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username must be at most 50 characters',
        'any.required': 'Username is required'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string().min(6).required()
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
      }),
    firstName: Joi.string().allow('', null),
    lastName: Joi.string().allow('', null),
    role: Joi.string().valid('user', 'admin').default('user')
  });

  try {
    return await schema.validateAsync(userData);
  } catch (error) {
    throw new Error(error.details[0].message);
  }
}; 