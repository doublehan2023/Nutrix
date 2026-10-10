import 'react-native-get-random-values';

import type { ResourcesConfig } from 'aws-amplify';
import Constants from 'expo-constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Amplify } = require('aws-amplify/dist/cjs/index.js') as Pick<typeof import('aws-amplify'), 'Amplify'>;

// `amplify_outputs.json` is generated locally by `npx ampx sandbox` and is
// intentionally gitignored. app.config.js injects it only when present so a
// fresh clone still bundles and presents a clear setup state.
const outputs = (Constants.expoConfig?.extra?.amplifyOutputs ?? {}) as ResourcesConfig;

export const isAmplifyConfigured = Boolean(outputs.Auth);

Amplify.configure(outputs);
