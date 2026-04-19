import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, ScrollView, Platform, Linking, AppState, AppStateStatus } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { isAxiosError } from "axios";
import { cssInterop } from "nativewind";
import * as Notifications from "expo-notifications";

import { Text, ToggleRow, Button } from "@/components/ui";
import { ProfileService } from "@/services/profile.service";
import { useProfileStore } from "@/stores/profile.store";

import InfoIconSource from "@assets/icons/ic_info.svg";
import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import { usePageTitle } from "@/hooks/usePageTitle";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const InfoIcon = cssInterop(InfoIconSource, iconConfig);
const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);

export default function NotificationsScreen() {
  const router = useRouter();
  const profile = useProfileStore((state) => state.profile);
  usePageTitle("Notifications");
  const [emailNotifications, setEmailNotifications] = useState(
    profile?.emailNotifications ?? false,
  );
  const [matchNotifications, setMatchNotifications] = useState(
    profile?.matchNotifications ?? false,
  );

  // État réel de la permission OS — source de vérité
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);

  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [matchError, setMatchError] = useState<string | undefined>(undefined);
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

  const saveMatchNotifications = async (newValue: boolean) => {
    try {
      await ProfileService.updateNotifications({ matchNotifications: newValue });
    } catch (error: unknown) {
      setMatchNotifications(!newValue);

      if (isAxiosError(error) && error.response) {
        const status = error.response.status;
        const message: string =
          error.response.data?.message || "Une erreur est survenue.";

        if (status === 400) {
          setMatchError(message);
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

  const handleMatchToggle = async (newValue: boolean) => {
    setGlobalError(undefined);
    setMatchError(undefined);
    setMatchNotifications(newValue);
    await saveMatchNotifications(newValue);
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

          {/* Missions personnalisées */}
          <View className="overflow-hidden bg-white border rounded-lg border-grey-100">
            <View className="px-5 pt-4 pb-2">
              <Text className="text-base font-bold text-grey-900">
                Missions personnalisées
              </Text>
            </View>

            <View className="h-[1px] mx-5 bg-grey-100" />

            {/* Bulle d'info ambre */}
            <View className="flex-row gap-3 mx-5 mt-4 p-3 border border-amber-200 rounded-lg bg-amber-50">
              <InfoIcon className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
              <Text className="flex-1 text-xs text-amber-700">
                Même sans suivre une association, si une nouvelle mission
                correspond à vos causes, compétences ou disponibilités, nous
                pouvons vous en informer.
              </Text>
            </View>

            <ToggleRow
              testID="toggle-match-notifications"
              label={
                Platform.OS === "web"
                  ? "Suggérer des missions par e-mail"
                  : "Suggérer des missions par e-mail et notifications push"
              }
              description="Recevez des suggestions adaptées à votre profil"
              value={matchNotifications}
              onValueChange={handleMatchToggle}
              errorMessage={matchError}
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

                <Button
                  variant="secondary"
                  onPress={() => Linking.openSettings()}
                >
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
