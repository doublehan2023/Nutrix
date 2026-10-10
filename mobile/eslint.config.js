const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // Session restoration is intentionally asynchronous and must update the
      // provider when the Cognito read completes.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
