import type { ResourcesConfig } from 'aws-amplify';
import Constants from 'expo-constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Amplify } = require('aws-amplify/dist/cjs/index.js') as Pick<typeof import('aws-amplify'), 'Amplify'>;

// Web has Web Crypto already. Native uses react-native-get-random-values in
// amplify.ts before the Amplify client initializes.
const outputs = (Constants.expoConfig?.extra?.amplifyOutputs ?? {}) as ResourcesConfig;

export const isAmplifyConfigured = Boolean(outputs.Auth);

Amplify.configure(outputs);
