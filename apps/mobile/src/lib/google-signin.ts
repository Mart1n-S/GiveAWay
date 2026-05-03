import Constants, { ExecutionEnvironment } from "expo-constants";

// ExecutionEnvironment.StoreClient = Expo Go
// ExecutionEnvironment.Bare = APK dev build ou production
const isNativeBuild =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export async function googleSignOut(): Promise<void> {
  if (!isNativeBuild) return;
  const mod = await import("./google-signin.dev").catch(() => null);
  if (mod) await mod.googleSignOut();
}

export async function googleSignIn(): Promise<string> {
  if (!isNativeBuild) {
    throw new Error(
      "Google Sign-In natif non disponible - utilisez le Development Build",
    );
  }
  const mod = await import("./google-signin.dev").catch(() => null);
  if (!mod) throw new Error("Module Google Sign-In non disponible");
  return mod.googleSignIn();
}

export const statusCodes = {
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
  PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
};
