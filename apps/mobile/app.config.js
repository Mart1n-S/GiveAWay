const isNativeBuild = process.env.EXPO_NATIVE_BUILD === "true";

module.exports = {
  expo: {
    name: "GiveAWay",
    slug: "mobile",
    owner: "giveaway-team",
    version: "1.0.0",
    scheme: "giveaway",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.googleoauth",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      icon: {
        dark: "./assets/ios-dark.png",
        light: "./assets/ios-light.png",
        tinted: "./assets/ios-tinted.png",
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        monochrome: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.googleoauth",
      ...(isNativeBuild && {
        googleServicesFile: "./google-services.json",
      }),
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.POST_NOTIFICATIONS",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
      output: "server",
    },
    plugins: [
      "expo-router",
      ...(isNativeBuild
        ? [
            "expo-dev-client",
            "expo-secure-store",
            [
              "@react-native-google-signin/google-signin",
              {
                iosUrlScheme:
                  "com.googleusercontent.apps.511712396227-bcl60qubgq8bstj6il2hqmijavhs800l",
              },
            ],
          ]
        : ["expo-secure-store"]),
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Autorisez GiveAWay à accéder à votre position pour trouver des missions de bénévolat près de vous.",
        },
      ],
      [
        "expo-notifications",
        {
          iosPermissionDescription:
            "Autorisez GiveAWay à vous envoyer des notifications pour les nouvelles missions de bénévolat.",
        },
      ],
      "expo-web-browser",
    ],
    extra: {
      router: {},
      eas: {
        projectId: "8ec15cbb-f3af-4dbe-ae4b-48c7bea59faf",
      },
    },
  },
};