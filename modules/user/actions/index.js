// modules/user/actions/index.js
import { registerUser } from './register.js';
import { loginUser } from './login.js';

// Export actions for use within the module or potentially by other modules
export { registerUser, loginUser };

// Optionally create a default export object for easier access if preferred
// export default {
//     registerUser,
//     loginUser
// };
