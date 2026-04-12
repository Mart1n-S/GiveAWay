import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, ScrollView, Platform, Linking, AppState, AppStateStatus } from "react-native";
import { Stack } from "expo-router";
import { useFocusEffect } from "expo-router";
import { isAxiosError } from "axios";
import { cssInterop } from "nativewind";
import * as Notifications from "expo-notifications";

import { Text, ToggleRow, Button } from "@/components/ui";
import { ProfileService } from "@/services/profile.service";
import { useProfileStore } from "@/stores/profile.store";

import InfoIconSource from "@assets/icons/ic_info.svg";
import { usePageTitle } from "@/hooks/usePageTitle";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const InfoIcon = cssInterop(InfoIconSource, iconConfig);

export default function NotificationsScreen() {
  const profile = useProfileStore((state) => state.profile);
  usePageTitle("Notifications");
  const [emailNotifications, setEmailNotifications] = useState(
    profile?.emailNotifications ?? false,
  );

  // État réel de la permission OS — source de vérité
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);

  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [globalError, setGlobalError] = useState<string | undefined>(undefined);

  const checkPushPermission = useCallback(async () => {
    if (Platform.OS === "web") return;
    const { status } = await Notifications.getPermissionsAsync();
    setPushGranted(status === "granted");
  }, []);

  // Lecture initiale à l'affichage de l'écran
  useFocusEffect(
    useCallback(() => {
      checkPushPermission();
    }, [checkPushPermission]),
  );

  // Mise à jour au retour en foreground (ex: retour depuis les paramètres système)
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextState === "active") {
          checkPushPermission();
        }
        appState.current = nextState;
      },
    );
    return () => subscription.remove();
  }, [checkPushPermission]);

  const saveEmailNotifications = async (newValue: boolean) => {
    try {
      await ProfileService.updateNotifications({ emailNotifications: newValue });
    } catch (error: unknown) {
      setEmailNotifications(!newValue);

      if (isAxiosError(error) && error.response) {
        const status = error.response.status;
        const message: string =
          error.response.data?.message || "Une erreur est survenue.";

        if (status === 400) {
          setEmailError(message);
          return;
        }
        setGlobalError(message);
      } else {
        setGlobalError(
          "Impossible de contacter le serveur. Vérifiez votre connexion.",
        );
      }
    }
  };

  const handleEmailToggle = async (newValue: boolean) => {
    setGlobalError(undefined);
    setEmailError(undefined);
    setEmailNotifications(newValue);
    await saveEmailNotifications(newValue);
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Notifications" }} />

      <ScrollView
        className="flex-1 bg-grey-50"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          paddingVertical: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-2xl gap-6 px-4">
          {/* Bulle d'information */}
          <View className="flex-row gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <InfoIcon className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
            <Text className="flex-1 text-sm text-blue-600">
              Les modifications sont sauvegardées automatiquement à chaque
              changement.
            </Text>
          </View>

          {/* Erreur globale */}
          {globalError && (
            <View
              testID="notifications-global-error"
              className="p-3 border border-red-200 rounded-md bg-red-50"
            >
              <Text className="text-sm font-medium text-center text-red-600">
                {globalError}
              </Text>
            </View>
          )}

          {/* Notifications e-mail */}
          <View className="overflow-hidden bg-white border rounded-lg border-grey-100">
            <View className="px-5 pt-4 pb-2">
              <Text className="text-base font-bold text-grey-900">
                Notifications par e-mail
              </Text>
            </View>

            <View className="h-[1px] mx-5 bg-grey-100" />

            <ToggleRow
              testID="toggle-email-notifications"
              label="E-mails de la plateforme"
              description="Missions suggérées, rappels et mises à jour de votre compte"
              value={emailNotifications}
              onValueChange={handleEmailToggle}
              errorMessage={emailError}
            />
          </View>

          {/* Notifications push (mobile uniquement) */}
          {Platform.OS !== "web" && (
            <View className="overflow-hidden bg-white border rounded-lg border-grey-100">
              <View className="px-5 pt-4 pb-2">
                <Text className="text-base font-bold text-grey-900">
                  Notifications push
                </Text>
              </View>

              <View className="h-[1px] mx-5 bg-grey-100" />

              <View className="gap-3 px-5 py-4">
                {/* Statut réel lu depuis l'OS */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-grey-700">
                    Alertes sur l'appareil
                  </Text>
                  {pushGranted !== null && (
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        pushGranted ? "bg-green-100" : "bg-red-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          pushGranted ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {pushGranted ? "Autorisées" : "Refusées"}
                      </Text>
                    </View>
                  )}
                </View>

                <Text className="text-xs text-grey-400">
                  Les autorisations sont gérées par votre système. Appuyez sur
                  le bouton ci-dessous pour ouvrir les paramètres.
                </Text>

                <Button variant="secondary" onPress={() => Linking.openSettings()}>
                  Gérer dans les paramètres
                </Button>
              </View>
            </View>
          )}

          <View className="h-10" />
        </View>
      </ScrollView>
    </>
  );
}
