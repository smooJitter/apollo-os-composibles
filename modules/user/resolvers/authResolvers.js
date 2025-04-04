import { schemaComposer } from 'graphql-compose';
import { registerUser, loginUser } from '@modules/user/actions'; // Use alias
import { UserTC } from '@modules/user/typeComposer'; // Assuming UserTC is exported if needed for payload

// Ensure UserTC is loaded into the main schemaComposer if we reference it directly
// This might happen implicitly if the module loads its TCs, but good practice to check.
const LoadedUserTC = schemaComposer.getOTC('User'); // Get UserTC from global composer

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
        user: LoadedUserTC // Reference the User TypeComposer for the user object
    }
});

// 3. Define Mutations
export const authMutations = {
    register: {
        type: AuthPayloadTC, // Use the payload type
        args: {
            input: RegisterInputTC.NonNull // Use the input type, make it required
        },
        resolve: async (_, args, ctx) => {
            // Call the registerUser action
            return registerUser(args.input, ctx);
        },
        description: 'Register a new user account.'
    },
    login: {
        type: AuthPayloadTC,
        args: {
            input: LoginInputTC.NonNull
        },
        resolve: async (_, args, ctx) => {
            // Call the loginUser action
            return loginUser(args.input, ctx);
        },
        description: 'Log in a user and receive an authentication token.'
    },
    // Add other auth-related mutations here (e.g., forgotPassword, resetPassword, logout?)
};

// Optional: Add to global schema composer directly if needed, although module system should handle this
// schemaComposer.Mutation.addFields(authMutations); 