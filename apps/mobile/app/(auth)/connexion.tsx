import React, { useState } from "react";
import {
  View,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, Link } from "expo-router";

// --- Imports Monorepo ---
import { LoginSchema, LoginDto } from "@repo/shared";
import { Button, Text, colors } from "@/components/ui";
import { FormInput } from "@/components/form/form-input";

// --- Services ---
import { AuthService } from "../../src/services/auth.service";

import EmailIcon from "../../assets/icons/ic_email.svg";
import LockIcon from "../../assets/icons/ic_lock.svg";
import UnlockIcon from "../../assets/icons/ic_unlock.svg";

export default function LoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { isSubmitting },
  } = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginDto) => {
    try {
      // On nettoie proprement l'erreur root avant la tentative
      clearErrors("root");

      await AuthService.login(data);
      router.replace("/");
    } catch (error: any) {
      const apiError = error?.response?.data;
      const status = error?.response?.status;

      // --- GESTION DES ERREURS ---

      // CAS 429 : Rate Limit
      if (status === 429) {
        setError("root", {
          message:
            apiError?.message || "Trop de tentatives. Veuillez patienter.",
        });
      }

      // CAS 401 : Unauthorized
      else if (status === 401) {
        const serverMessage =
          apiError?.message || "Email ou mot de passe incorrect.";
        setError("root", { message: serverMessage });
      }

      // CAS 400 : Bad Request
      else if (status === 400) {
        let hasMappedError = false;

        // A. Tentative de mapping intelligent (Zod Tree)
        // Vérifie si l'erreur a la structure { message: "Validation failed", errors: { properties: ... } }
        if (apiError?.errors?.properties) {
          const properties = apiError.errors.properties;

          // On boucle sur chaque clé (ex: "email") renvoyée par le back
          Object.keys(properties).forEach((field) => {
            // Le message précis se trouve dans errors[0]
            const errorMessage = properties[field]?.errors?.[0];

            if (errorMessage) {
              // On attache l'erreur au champ spécifique du formulaire
              // Le champ concerné deviendra rouge avec le message du back.
              setError(field as keyof LoginDto, {
                type: "server",
                message: errorMessage,
              });
              hasMappedError = true;
            }
          });
        }

        // B. Fallback (Si ce n'est pas une erreur Zod ou si le mapping a échoué)
        // On affiche l'erreur dans le cadre rouge global "root"
        if (!hasMappedError) {
          const fallbackMessage = Array.isArray(apiError?.message)
            ? apiError.message[0]
            : apiError?.message || "Données invalides";

          setError("root", { message: fallbackMessage });
        }
      }

      // CAS AUTRES
      else {
        Alert.alert(
          "Oups",
          "Problème de connexion au serveur. Vérifiez votre internet.",
        );
      }
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="justify-center flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
          keyboardShouldPersistTaps="handled"
          className="px-4"
        >
          <View className="w-full max-w-md p-6 bg-white shadow-xl rounded-3xl">
            {/* Header */}
            <View className="items-center mb-8">
              <Text className="mb-2 text-3xl font-bold text-center text-grey-900">
                Bon retour ! 👋
              </Text>
              <Text className="text-center text-grey-600">
                Connectez-vous à votre espace
              </Text>
            </View>

            {/* Formulaire */}
            <View className="gap-4">
              {/* Message d'erreur global */}
              {control._formState.errors.root?.message && (
                <View className="p-3 mb-2 border rounded-md bg-error-30 border-error-100">
                  <Text className="text-sm text-center text-error-100">
                    {control._formState.errors.root.message}
                  </Text>
                </View>
              )}

              {/* EMAIL */}
              <FormInput
                control={control}
                name="email"
                label="Email"
                placeholder="exemple@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={
                  <EmailIcon width={20} height={20} color={colors.grey[600]} />
                }
              />

              {/* PASSWORD */}
              <FormInput
                control={control}
                name="password"
                label="Mot de passe"
                placeholder="Votre mot de passe"
                secureTextEntry={!showPassword}
                rightIcon={
                  showPassword ? (
                    <UnlockIcon
                      width={20}
                      height={20}
                      color={colors.primary.default}
                    />
                  ) : (
                    <LockIcon width={20} height={20} color={colors.grey[600]} />
                  )
                }
                onRightIconPress={() => setShowPassword(!showPassword)}
              />

              {/* Mot de passe oublié */}
              <View className="items-end">
                <Link href="/mot-de-passe-oublie" asChild>
                  <TouchableOpacity>
                    <Text className="text-sm font-medium text-primary-600">
                      Mot de passe oublié ?
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>

              {/* Bouton Submit */}
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                className="mt-4"
              >
                Se connecter
              </Button>
            </View>

            {/* Footer Inscription */}
            <View className="flex-row justify-center gap-1 pt-4 mt-8 border-t border-gray-100">
              <Text className="text-grey-700">Pas encore de compte ?</Text>
              <Link href="/inscription" asChild>
                <TouchableOpacity>
                  <Text className="font-bold text-primary-600">S'inscrire</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
