const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Amplify's ESM export condition currently resolves tslib incompatibly during
// Expo Router's server-side web render. Use its CommonJS React Native entry,
// which is the entry documented for Expo/React Native clients.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./src/global.css" });
