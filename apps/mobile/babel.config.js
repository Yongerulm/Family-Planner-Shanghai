module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated muss als letztes Plugin stehen
      'react-native-reanimated/plugin',
    ],
  };
};
