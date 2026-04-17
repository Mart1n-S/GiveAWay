import React, { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ResendVerificationSchema,
  ResendVerificationDto,
  VerifyEmailSchema,
  VerifyEmailDto,
} from "@repo/shared";
import { z } from "zod";
import { FormInput } from "@/components/form/";
import { Button, colors } from "@/components/ui";
import { VerifyEmailStep } from "@/components/ui/verify-email-step/VerifyEmailStep";
import { AuthService } from "@/services/auth.service";
import EmailIconSource from "@assets/icons/ic_email.svg";
import { cssInterop } from "nativewind";
import Toast from "react-native-toast-message";
import { isAxiosError } from "axios";
import { usePageTitle } from "@/hooks/usePageTitle";

type RequestStep = "REQUEST" | "VERIFY";
type RequestFormInput = z.input<typeof ResendVerificationSchema>;
type VerifyFormInput = z.input<typeof VerifyEmailSchema>;

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const EmailIcon = cssInterop(EmailIconSource, iconConfig);

export default function DemandeVerificationEmailScreen() {
  const router = useRouter();
  const [step, setStep] = useState<RequestStep>("REQUEST");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [registeredEmail, setRegisteredEmail] = useState("");
  usePageTitle("Demande de vérification email");

  // --- FORMULAIRE 1 : DEMANDE DE CODE (Email) ---
  const { control: controlRequest, handleSubmit: handleSubmitRequest } =
    useForm<RequestFormInput>({
      resolver: zodResolver(ResendVerificationSchema),
      defaultValues: { email: "" },
    });

  // --- FORMULAIRE 2 : VÉRIFICATION DU CODE (OTP) ---
  const {
    control: controlVerify,
    handleSubmit: handleSubmitVerify,
    setError: setErrorVerify,
    reset: resetVerify,
  } = useForm<VerifyFormInput>({
    resolver: zodResolver(VerifyEmailSchema),
    defaultValues: { code: "" },
  });

  // Gestion du Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleBackToRequest = () => {
    resetVerify();
    setStep("REQUEST");
  };

  // --- ACTIONS ---

  // 1. Demander le renvoi (Action initiale ou bouton "Renvoyer")
  const handleRequestOrResend = async (data: { email: string }) => {
    // Si on est déjà en Step 2, c'est un "Resend", sinon c'est le "Submit" initial
    const isInitialRequest = step === "REQUEST";

    if (isInitialRequest) {
      setIsSubmitting(true);
    } else {
      setIsResending(true);
    }

    try {
      const response = await AuthService.resendVerificationEmail(
        data as ResendVerificationDto,
      );

      setRegisteredEmail(data.email.toLowerCase());
      setStep("VERIFY");
      setResendTimer(60);

      Toast.show({
        type: "info",
        text1: "Code envoyé",
        text2: response.message || "Un nouveau code a été envoyé.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } catch (error: unknown) {
      let msg = "Une erreur est survenue.";
      if (isAxiosError(error)) {
        const apiMessage = error.response?.data?.message;
        msg = Array.isArray(apiMessage) ? apiMessage[0] : (apiMessage ?? msg);
      }

      Toast.show({
        type: "error",
        text1: "Action impossible",
        text2: msg,
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsSubmitting(false);
      setIsResending(false);
    }
  };

  // 2. Valider le code
  const onVerifySubmit = async (data: VerifyFormInput) => {
    setIsSubmitting(true);
    try {
      const validData = data as unknown as VerifyEmailDto;
      await AuthService.verifyEmail(validData);

      Toast.show({
        type: "success",
        text1: "Compte activé !",
        text2: "Votre compte a été activé avec succès !",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });

      router.replace("/connexion");
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const status = error.response.status;
        const apiError = error.response.data as { message?: string };

        if (status === 401 || status === 400) {
          setErrorVerify("code", {
            type: "server",
            message: apiError.message || "Code invalide.",
          });
          return;
        }
      }

      Toast.show({
        type: "error",
        text1: "Vérification échouée",
        text2: "Une erreur est survenue lors de la vérification du code.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle:
            step === "REQUEST" ? "Demande d'activation" : "Vérification",
          headerBackTitle: "Retour",
        }}
      />
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          paddingVertical: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-2xl gap-4 px-4">
          {/* --- STEP 1 : DEMANDE D'EMAIL --- */}
          {step === "REQUEST" && (
            <View className="gap-6">
              <View className="items-center gap-2">
                <Text className="text-3xl font-bold text-center text-grey-900">
                  Activer mon compte
                </Text>
                <Text className="px-4 text-center text-grey-600">
                  Entrez l'adresse email utilisée lors de votre inscription pour
                  recevoir un code.
                </Text>
              </View>

              <FormInput
                control={controlRequest}
                name="email"
                label="Votre adresse email"
                testID="input-request-email"
                helperText="Format : jean.dupont@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={
                  <EmailIcon width={20} height={20} color={colors.grey[600]} />
                }
                required
              />

              <Button
                testID="btn-submit-request-email"
                onPress={handleSubmitRequest(handleRequestOrResend)}
                loading={isSubmitting}
                className="w-full"
              >
                Recevoir le code de confirmation
              </Button>

              <Button
                variant="tertiary"
                onPress={() => router.push("/connexion")}
                className="w-full"
              >
                Retour à la connexion
              </Button>
            </View>
          )}

          {/* --- STEP 2 : VÉRIFICATION CODE --- */}
          {step === "VERIFY" && (
            <VerifyEmailStep
              registeredEmail={registeredEmail}
              control={controlVerify}
              onSubmit={handleSubmitVerify(onVerifySubmit)}
              isSubmitting={isSubmitting}
              resendTimer={resendTimer}
              isResending={isResending}
              onResend={() => handleRequestOrResend({ email: registeredEmail })}
              extraActions={
                <Button
                  variant="tertiary"
                  testID="btn-change-email"
                  className="w-full mt-4"
                  onPress={handleBackToRequest}
                >
                  Changer d'adresse email
                </Button>
              }
            />
          )}
        </View>
      </ScrollView>
    </>
  );
}
