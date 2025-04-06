import { z } from 'zod';

export const LoginInputSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email({ message: 'Invalid email address format' })
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, { message: 'Password cannot be empty' }), // Basic check for non-empty
});

/**
 * Validates the login input data against the schema.
 * @param {object} data - The input data to validate.
 * @returns {{success: boolean, data?: object, error?: ZodError}} - Zod parse result.
 */
export function validateLoginInput(data) {
  return LoginInputSchema.safeParse(data);
}
