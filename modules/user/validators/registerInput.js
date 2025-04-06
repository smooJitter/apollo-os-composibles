import { z } from 'zod';
// Import role enums if needed for validation
// import { ROLE_VALUES } from '@config/enums/roles.js';

export const RegisterInputSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).optional(), // Name is optional
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .trim()
    .email({ message: 'Invalid email address format' })
    .toLowerCase(),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(100, { message: 'Password must be 100 characters or less' }), // Example max length
  // Optional role validation if role can be specified during registration
  // role: z.enum(ROLE_VALUES).optional()
});

/**
 * Validates the register input data against the schema.
 * @param {object} data - The input data to validate.
 * @returns {{success: boolean, data?: object, error?: ZodError}} - Zod parse result.
 */
export function validateRegisterInput(data) {
  return RegisterInputSchema.safeParse(data);
}

// Example usage within an action:
// import { validateRegisterInput } from './validators/registerInput.js';
// const validationResult = validateRegisterInput(args.input);
// if (!validationResult.success) {
//     throw createUserInputError('Validation failed', { validationErrors: validationResult.error.flatten().fieldErrors });
// }
// const validatedInput = validationResult.data;
