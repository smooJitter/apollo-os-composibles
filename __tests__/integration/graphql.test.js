/**
 * Integration tests for GraphQL API
 * 
 * These tests verify the API works as expected when serving GraphQL queries
 */

import request from 'supertest';

describe('GraphQL API', () => {
  // We'll define the app URL instead of importing it directly
  // This allows us to use different URLs for testing (like a test server)
  const APP_URL = process.env.TEST_APP_URL || 'http://localhost:4000';

  it('should respond to a basic introspection query', async () => {
    const response = await request(APP_URL)
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .send({
        query: `
          {
            __schema {
              queryType {
                name
              }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.__schema.queryType.name).toBe('Query');
  });

  it('should return mock user data when in mock mode', async () => {
    // This test assumes we're running with USE_MOCK_DB=true
    const response = await request(APP_URL)
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .send({
        query: `
          {
            me
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.me).toBeDefined();
    expect(response.body.data.me._id).toBeDefined();
  });
}); 