import React, { useState, useEffect } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { isAxiosError } from "axios";
import { cssInterop } from "nativewind";

import { ChangePasswordSchema, ChangePasswordDto } from "@repo/shared";
import { FormInput } from "@/components/form";
import { Button, Text, PasswordCriteria, colors } from "@/components/ui";
import { AuthService } from "@/services/auth.service";

import InfoIconSource from "@assets/icons/ic_info.svg";
import LockIconSource from "@assets/icons/ic_lock.svg";
import UnlockIconSource from "@assets/icons/ic_unlock.svg";
import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import { usePageTitle } from "@/hooks/usePageTitle";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const InfoIcon = cssInterop(InfoIconSource, iconConfig);
const LockIcon = cssInterop(LockIconSource, iconConfig);
const UnlockIcon = cssInterop(UnlockIconSource, iconConfig);
const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);

export default function ChangePasswordScreen() {
  const router = useRouter();
  usePageTitle("Changer mon mot de passe");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ChangePasswordDto>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword");

  useEffect(() => {
    const subscription = watch(() => {
      if (errors.root) {
        clearErrors("root");
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, errors.root, clearErrors]);

  const onSubmit = async (data: ChangePasswordDto) => {
    setIsSubmitting(true);
    try {
      await AuthService.changePassword(
        data.oldPassword,
        data.newPassword,
        data.confirmPassword,
      );

      Toast.show({
        type: "success",
        text1: "Mot de passe modifié",
        text2: "Votre mot de passe a été mis à jour. Veuillez vous reconnecter.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });

      await AuthService.logout();
      router.replace("/");
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const status = error.response.status;
        const apiError = error.response.data as { message?: string };
        const message = apiError.message || "Une erreur est survenue.";

        if (status === 400) {
          // Erreur spécifique à l'ancien mot de passe incorrect
          if (
            typeof message === "string" &&
            message.toLowerCase().includes("ancien")
          ) {
            setError("oldPassword", { type: "server", message });
            return;
          }

          // Autres erreurs 400 → erreur globale
          setError("root", { message });
          return;
        }

        if (status === 429) {
          setError("root", {
            message:
              "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
          });
          return;
        }

        Toast.show({
          type: "error",
          text1: "Erreur",
          text2: message,
          visibilityTime: 10000,
          onPress: () => Toast.hide(),
        });
      } else {
        setError("root", {
          message:
            "Impossible de contacter le serveur. Vérifiez votre connexion.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Mot de passe et sécurité" }} />

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
            {/* Bouton retour — web uniquement */}
            {Platform.OS === "web" && (
              <Button
                variant="secondary"
                onPress={() => router.back()}
                className="self-start"
                icon={
                  <ArrowLeftIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                }
              >
                Retour
              </Button>
            )}
            {/* Bulle d'information */}
            <View className="flex-row gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <InfoIcon className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
              <View className="flex-1 gap-1">
                <Text className="text-sm font-bold text-blue-700">
                  Reconnexion requise
                </Text>
                <Text className="text-sm text-blue-600">
                  Pour des raisons de sécurité, vous serez déconnecté de tous
                  vos appareils après le changement de mot de passe.
                </Text>
              </View>
            </View>

            {/* Erreur globale */}
            {errors.root?.message && (
              <View
                testID="change-password-global-error"
                className="p-3 border border-red-200 rounded-md bg-red-50"
              >
                <Text className="text-sm font-medium text-center text-red-600">
                  {errors.root.message}
                </Text>
              </View>
            )}

            {/* Formulaire */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">
                Modifier le mot de passe
              </Text>

              {/* Ancien mot de passe */}
              <FormInput
                control={control}
                name="oldPassword"
                label="Mot de passe actuel"
                testID="input-old-password"
                secureTextEntry={!showOldPassword}
                required
                rightIcon={
                  showOldPassword ? (
                    <UnlockIcon
                      width={20}
                      height={20}
                      color={colors.primary.default}
                    />
                  ) : (
                    <LockIcon width={20} height={20} color={colors.grey[600]} />
                  )
                }
                onRightIconPress={() => setShowOldPassword(!showOldPassword)}
              />

              {/* Nouveau mot de passe + indicateur */}
              <FormInput
                control={control}
                name="newPassword"
                label="Nouveau mot de passe"
                testID="input-new-password"
                secureTextEntry={!showNewPassword}
                required
                rightIcon={
                  showNewPassword ? (
                    <UnlockIcon
                      width={20}
                      height={20}
                      color={colors.primary.default}
                    />
                  ) : (
                    <LockIcon width={20} height={20} color={colors.grey[600]} />
                  )
                }
                onRightIconPress={() => setShowNewPassword(!showNewPassword)}
              />
              <PasswordCriteria password={newPasswordValue} />

              {/* Confirmation */}
              <FormInput
                control={control}
                name="confirmPassword"
                label="Confirmer le nouveau mot de passe"
                testID="input-confirm-password"
                secureTextEntry={!showConfirmPassword}
                required
                rightIcon={
                  showConfirmPassword ? (
                    <UnlockIcon
                      width={20}
                      height={20}
                      color={colors.primary.default}
                    />
                  ) : (
                    <LockIcon width={20} height={20} color={colors.grey[600]} />
                  )
                }
                onRightIconPress={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              />
            </View>

            {/* Boutons */}
            <View className="gap-3">
              <Button
                testID="btn-submit-change-password"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                className="w-full"
              >
                Enregistrer le nouveau mot de passe
              </Button>

              <Button
                testID="btn-cancel-change-password"
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
