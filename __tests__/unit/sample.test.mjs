/**
 * A basic test file to verify Jest setup
 */

// For ES modules compatibility
import { describe, it, expect } from '@jest/globals';

describe('Sample test', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('async result');
    expect(result).toBe('async result');
  });
}); 