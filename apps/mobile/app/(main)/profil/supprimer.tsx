import React, { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { isAxiosError } from "axios";
import { cssInterop } from "nativewind";

import { DeleteAccountSchema, DeleteAccountDto } from "@repo/shared";
import { FormInput } from "@/components/form";
import { Button, Text, colors } from "@/components/ui";
import { ProfileService } from "@/services/profile.service";
import { useProfileStore } from "@/stores/profile.store";

import WarningIconSource from "@assets/icons/ic_info.svg";
import LockIconSource from "@assets/icons/ic_lock.svg";
import UnlockIconSource from "@assets/icons/ic_unlock.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const WarningIcon = cssInterop(WarningIconSource, iconConfig);
const LockIcon = cssInterop(LockIconSource, iconConfig);
const UnlockIcon = cssInterop(UnlockIconSource, iconConfig);

// Types
type DeleteAccountFormInput = {
  password?: string;
  confirmation?: string;
};

// Composant
export default function DeleteAccountScreen() {
  const router = useRouter();
  const user = useProfileStore((state) => state.profile);
  const isGoogleAccount = !user?.hasPassword;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Formulaire
  const {
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<DeleteAccountFormInput>({
    resolver: zodResolver(DeleteAccountSchema) as any,
    defaultValues: {
      password: "",
      confirmation: "",
    },
  });

  const confirmationValue = watch("confirmation");
  const isConfirmationValid = isGoogleAccount
    ? confirmationValue === "SUPPRIMER"
    : true;

  // Soumission
  const onSubmit = async (data: DeleteAccountFormInput) => {
    setIsSubmitting(true);
    try {
      const dto: DeleteAccountDto = isGoogleAccount
        ? { confirmation: data.confirmation }
        : { password: data.password };

      await ProfileService.deleteAccount(dto);

      Toast.show({
        type: "success",
        text1: "Compte supprimé",
        text2: "Votre compte a été supprimé définitivement.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });

      router.replace("/");
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const status = error.response.status;
        const apiError = error.response.data as { message?: string };

        if (status === 400) {
          const message = apiError.message || "Confirmation incorrecte.";

          if (isGoogleAccount) {
            setError("confirmation", { type: "server", message });
          } else {
            setError("password", { type: "server", message });
          }
          return;
        }

        Toast.show({
          type: "error",
          text1: "Erreur",
          text2: apiError.message || "Une erreur est survenue.",
          visibilityTime: 10000,
          onPress: () => Toast.hide(),
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Erreur réseau",
          text2:
            "Impossible de contacter le serveur. Vérifiez votre connexion.",
          visibilityTime: 10000,
          onPress: () => Toast.hide(),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rendu
  return (
    <>
      <Stack.Screen options={{ headerTitle: "Supprimer le compte" }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 bg-grey-50"
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-2xl gap-6 px-4">
            {/* Avertissement */}
            <View className="flex-row gap-3 p-4 border border-red-200 rounded-lg bg-red-50">
              <WarningIcon className="w-5 h-5 mt-0.5 text-red-600 shrink-0" />
              <View className="flex-1 gap-1">
                <Text className="text-sm font-bold text-red-700">
                  Action irréversible
                </Text>
                <Text className="text-sm text-red-600">
                  La suppression de votre compte est définitive. Toutes vos
                  données (profil, participations, historique) seront supprimées
                  et ne pourront pas être récupérées.
                </Text>
              </View>
            </View>

            {/* Formulaire selon type de compte */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              {isGoogleAccount ? (
                // Compte Google
                <>
                  <Text className="text-base font-bold text-grey-900">
                    Confirmation
                  </Text>
                  <Text className="text-sm text-grey-600">
                    Pour confirmer la suppression de votre compte Google, tapez{" "}
                    <Text className="font-bold text-grey-900">SUPPRIMER</Text>{" "}
                    dans le champ ci-dessous.
                  </Text>
                  <FormInput
                    control={control}
                    name="confirmation"
                    label='Tapez "SUPPRIMER"'
                    placeholder="SUPPRIMER"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    required
                  />
                </>
              ) : (
                // Compte email/password
                <>
                  <Text className="text-base font-bold text-grey-900">
                    Confirmation
                  </Text>
                  <Text className="text-sm text-grey-600">
                    Pour confirmer la suppression de votre compte, saisissez
                    votre mot de passe actuel.
                  </Text>
                  <FormInput
                    control={control}
                    name="password"
                    label="Mot de passe"
                    secureTextEntry={!showPassword}
                    required
                    rightIcon={
                      showPassword ? (
                        <UnlockIcon
                          width={20}
                          height={20}
                          color={colors.primary.default}
                        />
                      ) : (
                        <LockIcon
                          width={20}
                          height={20}
                          color={colors.grey[600]}
                        />
                      )
                    }
                    onRightIconPress={() => setShowPassword(!showPassword)}
                  />
                </>
              )}
            </View>

            {/* Boutons */}
            <View className="gap-3">
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                disabled={isGoogleAccount && !isConfirmationValid}
                className="w-full bg-red-600 border-red-600 active:bg-red-800 active:border-red-800 hover:bg-red-700 hover:border-red-700 disabled:bg-grey-100 disabled:border-grey-100"
              >
                Supprimer définitivement
              </Button>
              
              <Button
                variant="secondary"
                onPress={() => router.back()}
                disabled={isSubmitting}
                className="w-full"
              >
                Annuler
              </Button>
            </View>

            <View className="h-10" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
