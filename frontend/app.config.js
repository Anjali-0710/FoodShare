module.exports = ({ config }) => {
  return {
    ...config,
    name: "FoodReach",
    slug: "foodshare-ai",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1B5E20"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      package: "com.foodshareai.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1B5E20"
      }
    },
    web: {
      bundler: "metro"
    },
    extra: {
      EXPO_PUBLIC_GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || "",
      eas: {
        projectId: "c64326ae-0f9a-4ec0-86b4-0943e1d038c8"
      }
    },
    owner: "foodshareai"
  };
};
