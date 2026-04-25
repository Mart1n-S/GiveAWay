import { isAxiosError } from "axios";
import type { UseFormSetError } from "react-hook-form";
import Toast from "react-native-toast-message";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildMissionPayload(data: any): any {
  return {
    ...data,
    durationInt:
      data.durationInt == null
        ? undefined
        : Math.round(Number(data.durationInt) * 60),
  };
}

/**
 * Handles API errors from mission form submissions.
 * Returns true if the caller should `return` early (validation errors were mapped to fields).
 */
export function handleMissionApiError(
  err: unknown,
  setError: UseFormSetError<any>,
  setStep: (step: 1 | 2 | 3) => void,
  mapServerErrorsToFields: (props: Record<string, unknown>) => 1 | 2 | 3 | null,
  fallbackMessage: string,
): boolean {
  if (isAxiosError(err) && err.response) {
    const status = err.response.status;
    const apiError: { message?: string; errors?: { properties?: Record<string, unknown> } } = err.response.data;

    if (status === 400 && apiError?.errors?.properties) {
      const firstErrorStep = mapServerErrorsToFields(apiError.errors.properties);
      if (firstErrorStep !== null) {
        setError("root", { message: "Certains champs nécessitent une correction." });
        setStep(firstErrorStep);
        return true;
      }
    }

    setError("root", { message: apiError?.message ?? fallbackMessage });
  } else {
    const msg = err instanceof Error ? err.message : "Impossible de contacter le serveur.";
    setError("root", { message: msg });
    Toast.show({
      type: "error",
      text1: "Erreur",
      text2: msg,
      visibilityTime: 5000,
      onPress: () => Toast.hide(),
    });
  }
  return false;
}
