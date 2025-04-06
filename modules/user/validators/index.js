// modules/user/validators/index.js
import { RegisterInputSchema, validateRegisterInput } from './registerInput.js';
import { LoginInputSchema, validateLoginInput } from './loginInput.js';

// Export schemas and validation functions
export { RegisterInputSchema, validateRegisterInput, LoginInputSchema, validateLoginInput };

// Optionally create a default export object
// export default {
//     RegisterInputSchema,
//     validateRegisterInput,
//     LoginInputSchema,
//     validateLoginInput
// };
