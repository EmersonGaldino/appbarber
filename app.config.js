/**
 * Injeta `extra.eas.projectId` a partir de EXPO_PUBLIC_EAS_PROJECT_ID (`.env`),
 * necessário para `getExpoPushTokenAsync` em aparelhos físicos.
 * Mantém o restante em app.json.
 */
const appJson = require('./app.json');

const fromEnv =
  typeof process.env.EXPO_PUBLIC_EAS_PROJECT_ID === 'string'
    ? process.env.EXPO_PUBLIC_EAS_PROJECT_ID.trim()
    : '';
const fromAppJson = appJson.expo?.extra?.eas?.projectId;
const projectId = fromEnv || fromAppJson;

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      eas: {
        ...(appJson.expo.extra && appJson.expo.extra.eas),
        ...(projectId ? { projectId } : {}),
      },
    },
  },
};
