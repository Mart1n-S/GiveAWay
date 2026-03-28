const isNativeBuild = process.env.EXPO_NATIVE_BUILD === "true";

module.exports = {
  expo: {
    name: "mobile",
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
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
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
                  "com.googleusercontent.apps.533720849177-ffiikdikajlnurss52ai4of1fldp037t",
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