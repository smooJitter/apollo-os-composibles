import { schemaComposer } from 'graphql-compose';
import { registerUser, loginUser } from '../actions/index.js'; // Use relative path

// Don't try to access UserTC directly here, as it might not be registered yet
// We'll reference it by name in the fields definition and let graphql-compose resolve it later

// 1. Define Input Types
const RegisterInputTC = schemaComposer.getOrCreateITC('RegisterInput', {
    fields: {
        name: 'String',
        email: 'String!', // Use scalar type names
        password: 'String!',
        // role: 'String' // Optional: Allow role specification during registration?
    }
});

const LoginInputTC = schemaComposer.getOrCreateITC('LoginInput', {
    fields: {
        email: 'String!',
        password: 'String!'
    }
});

// 2. Define Payload Type
const AuthPayloadTC = schemaComposer.getOrCreateOTC('AuthPayload', {
    fields: {
        token: 'String!',       // The JWT
        user: 'User' // Reference by type name instead of direct object
    }
});

// Initialize export object
export const authMutations = {};

// Check if we're in mock mode
const isMockMode = process.env.USE_MOCK_DB === 'true';

if (isMockMode) {
    console.log('[authResolvers] Using mock resolvers for auth mutations');
    
    // Add mock auth mutations
    authMutations.register = {
        type: 'JSON',
        args: {
            input: 'JSON!'
        },
        resolve: async (_, { input }) => {
            return {
                token: 'mock-jwt-token-for-testing',
                user: {
                    _id: 'mock-user-id',
                    name: input.name || 'New Mock User',
                    email: input.email,
                    role: 'user',
                    active: true
                }
            };
        },
        description: 'Register a new user account (MOCK)'
    };
    
    authMutations.login = {
        type: 'JSON',
        args: {
            input: 'JSON!'
        },
        resolve: async (_, { input }) => {
            return {
                token: 'mock-jwt-token-for-testing',
                user: {
                    _id: 'mock-user-login',
                    name: 'Existing Mock User',
                    email: input.email,
                    role: 'user',
                    active: true
                }
            };
        },
        description: 'Log in a user and receive an authentication token (MOCK)'
    };
} else {
    // 3. Define Real Mutations
    authMutations.register = {
        type: AuthPayloadTC, // Use the payload type
        args: {
            input: RegisterInputTC.NonNull // Use the input type, make it required
        },
        resolve: async (_, args, ctx) => {
            try {
                // Call the registerUser action
                return registerUser(args.input, ctx);
            } catch (error) {
                console.error('[authResolvers] Register error:', error);
                throw error;
            }
        },
        description: 'Register a new user account.'
    };
    
    authMutations.login = {
        type: AuthPayloadTC,
        args: {
            input: LoginInputTC.NonNull
        },
        resolve: async (_, args, ctx) => {
            try {
                // Call the loginUser action
                return loginUser(args.input, ctx);
            } catch (error) {
                console.error('[authResolvers] Login error:', error);
                throw error;
            }
        },
        description: 'Log in a user and receive an authentication token.'
    };
}

// Optional: Add to global schema composer directly if needed, although module system should handle this
// schemaComposer.Mutation.addFields(authMutations); 