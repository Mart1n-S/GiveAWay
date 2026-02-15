import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ResetPasswordSchema, ResetPasswordDto } from "@repo/shared";
import { FormInput } from "@/components/form/";
import { Button, colors } from "@/components/ui";
import { PasswordCriteria } from "@/components/ui";
import { AuthService } from "@/services/auth.service";
import { cssInterop } from "nativewind";
import Toast from "react-native-toast-message";
import { isAxiosError } from "axios";

// Icons
import LockIconSource from "@assets/icons/ic_lock.svg";
import UnlockIconSource from "@assets/icons/ic_unlock.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const LockIcon = cssInterop(LockIconSource, iconConfig);
const UnlockIcon = cssInterop(UnlockIconSource, iconConfig);

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, setError } = useForm<ResetPasswordDto>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      code: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Observation du mot de passe pour les critères de sécurité
  const passwordValue = useWatch({
    control,
    name: "password",
  });

  const onSubmit = async (data: ResetPasswordDto) => {
    setIsSubmitting(true);
    try {
      const response = await AuthService.resetPassword(data);

      Toast.show({
        type: "success",
        text1: "Mot de passe modifié",
        text2: response.message || "Votre mot de passe a été réinitialisé avec succès.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });

      router.replace("/connexion");
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const apiError = error.response.data as { message?: string };

        // Si le code OTP est faux ou expiré (Erreur 400 suite à notre modif Backend)
        if (error.response.status === 400) {
          setError("code", {
            message: apiError.message || "Code invalide ou expiré.",
          });
          return;
        }
      }

      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: "Une erreur est survenue lors de la réinitialisation.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Sécurité" }} />
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingVertical: 40,
          alignItems: "center",
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-lg">
          {/* --- FORM CARD --- */}
          <View className="w-full p-6 bg-white border shadow-sm border-grey-200 rounded-3xl">
            {/* --- EN-TÊTE DANS LA CARD --- */}
            <View className="items-center gap-3 mb-8">
              <View className="p-3 rounded-full bg-primary/10">
                <LockIcon
                  width={28}
                  height={28}
                  color={colors.primary.default}
                />
              </View>
              <Text className="text-2xl font-bold text-center text-grey-900">
                Nouveau mot de passe
              </Text>
              <Text className="text-center text-grey-600">
                Saisissez le code que vous avez reçu par email et choisissez un nouveau mot de passe.
              </Text>
            </View>

            <View className="gap-5">
              {/* --- CODE OTP --- */}
              <FormInput
                control={control}
                name="code"
                label="Code de sécurité"
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                helperText="Code à 6 chiffres reçu par mail"
                required
                autoFocus
              />

              <View className="w-full h-[1px] bg-grey-100 my-2" />

              {/* --- NOUVEAUX MOTS DE PASSE --- */}
              <View className="gap-5">
                <FormInput
                  control={control}
                  name="password"
                  label="Nouveau mot de passe"
                  secureTextEntry={!showPassword}
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
                  required
                />

                <PasswordCriteria password={passwordValue} />

                <FormInput
                  control={control}
                  name="confirmPassword"
                  label="Confirmer le mot de passe"
                  secureTextEntry={!showPassword}
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
                  required
                />
              </View>

              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                className="w-full mt-6"
              >
                Mettre à jour le mot de passe
              </Button>
              <Button
                variant="tertiary"
                onPress={() => router.push("/connexion")}
                className="w-full mt-2"
              >
                Annuler et retourner à la connexion
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
