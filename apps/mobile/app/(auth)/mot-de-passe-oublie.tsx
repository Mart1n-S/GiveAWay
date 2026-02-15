import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ForgotPasswordSchema, ForgotPasswordDto } from "@repo/shared";
import { FormInput } from "@/components/form/";
import { Button, colors } from "@/components/ui";
import { AuthService } from "@/services/auth.service";
import EmailIconSource from "@assets/icons/ic_email.svg";
import { cssInterop } from "nativewind";
import Toast from "react-native-toast-message";

const EmailIcon = cssInterop(EmailIconSource, {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
});

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<ForgotPasswordDto>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordDto) => {
    setIsSubmitting(true);
    try {
      const response = await AuthService.forgotPassword(data);

      Toast.show({
        type: "info",
        text1: "Vérifiez vos emails",
        text2:
          response.message || "Un code de réinitialisation vous a été envoyé.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });

      // On redirige vers la page suivante en passant l'email
      router.push({
        pathname: "/reinitialisation-mot-de-passe"
      });
    } catch (error) {
      // Le backend renvoie un message générique pour la sécurité (même si l'email n'existe pas)
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: "Impossible d'envoyer le code.",
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
          headerTitle: "Mot de passe oublié",
          headerBackTitle: "Retour",
        }}
      />
      <View className="flex-1 bg-gray-50">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
          keyboardShouldPersistTaps="handled"
          className="px-4"
        >
          <View className="w-full max-w-md gap-6 p-6 bg-white shadow-xl rounded-3xl">
            <View className="items-center gap-2">
              <Text className="text-3xl font-bold text-center text-grey-900">
                Réinitialisation
              </Text>
              <Text className="text-center text-grey-600">
                Entrez votre email pour recevoir un code de sécurité.
              </Text>
            </View>

            <View className="gap-6">
              <FormInput
                control={control}
                name="email"
                label="Adresse email"
                helperText="Format : jean.dupont@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={
                  <EmailIcon width={20} height={20} color={colors.grey[600]} />
                }
              />

              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                className="w-full"
              >
                Envoyer le code
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
