const DEBUG = process.env.DEBUG === 'true';

export const debug = (...args) => {
  if (DEBUG) console.log('[ApolloOS Debug]:', ...args);
};
