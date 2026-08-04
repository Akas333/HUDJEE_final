// Extends app.json — Expo passes its contents in as `config`. Everything static
// still lives there; this file only adds what depends on the environment.

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** `123-abc.apps.googleusercontent.com` -> `com.googleusercontent.apps.123-abc` */
function reversedClientId(clientId) {
  return `com.googleusercontent.apps.${clientId.replace(/\.apps\.googleusercontent\.com$/, '')}`;
}

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];

  // The Google Sign-In config plugin exists only to register the reversed-client-ID
  // URL scheme that iOS needs; Android is handled by autolinking plus the SHA-1
  // you register in Google Cloud. The plugin throws when `iosUrlScheme` is missing,
  // so it is added only once an iOS client ID exists — an Android-only setup can
  // leave EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID unset and still build.
  //
  // Expo Go ignores plugins entirely, so this is a no-op there either way.
  if (iosClientId) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: reversedClientId(iosClientId) },
    ]);
  }

  return { ...config, plugins };
};
