/**
 * Jest configuration file
 * 
 * This file configures Jest to work with ES modules
 */

export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '**/__tests__/**/*.mjs',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).[mj]s'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/core/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@packages/(.*)$': '<rootDir>/packages/$1',
    '^@graphql/(.*)$': '<rootDir>/graphql/$1',
  }
}; 