module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // necesario para reanimated y drawer            // necesario para NativeWind (Tailwind)
    ],
  };
};
