import React, { useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import Toast from "react-native-toast-message";

import { Text } from "@/components/ui";
import {
  ProfileHeader,
  ProfileStats,
  ProfileBioCard,
  ProfileAvailability,
  ProfileCausesSkills,
  ProfileHistory,
  ProfileActions,
} from "@/components/ui";

import { ProfileService } from "@/services/profile.service";
import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { useProfileStore } from "@/stores/profile.store";
import { colors } from "@/components/ui/theme/tokens";

export default function ProfileScreen() {
  const router = useRouter();

  // Store
  const user = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Chargement

  const loadProfile = useCallback(async (isRefresh = false) => {
    // Ne pas charger si l'utilisateur n'est plus connecté
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) return;

    if (isRefresh) {
      // Pour le refresh on force le rechargement depuis l'API
      useProfileStore.getState().clearProfile();
      setIsRefreshing(true);
    }

    try {
      await ProfileService.getProfile();
    } catch {
      // Ne pas afficher le toast si l'utilisateur s'est déconnecté entre temps
      if (!useAuthStore.getState().isAuthenticated) return;
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: "Impossible de charger votre profil. Veuillez réessayer.",
        visibilityTime: 5000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Actions

  const handleEdit = () => router.push("/profil/modifier");
  const handleDelete = () => router.push("/profil/supprimer");
  const handleChangePassword = () => router.push("/profil/mot-de-passe");
  const handleNotifications = () => router.push("/profil/notifications");
  const handleMissionPress = (id: number) => router.push(`/missions/${id}`);
  const handleSeeAllMissions = () => router.push("/profil/historique");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await AuthService.logout();
      router.replace("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // États de chargement

  if (isLoading && !user) {
    return (
      <View className="items-center justify-center flex-1 bg-grey-50">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="items-center justify-center flex-1 px-6 bg-grey-50">
        <Text className="text-base font-medium text-center text-grey-600">
          Impossible de charger votre profil.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        className="flex-1 bg-grey-50"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadProfile(true)}
            colors={[colors.primary.default]}
            tintColor={colors.primary.default}
          />
        }
      >
        <View className="w-full max-w-2xl gap-6 px-4 pt-4 mx-auto">
          <ProfileHeader user={user} />

          <ProfileStats user={user} />

          <ProfileBioCard user={user} />

          <ProfileAvailability availability={user.availability} />

          <ProfileCausesSkills user={user} />

          <ProfileHistory
            user={user}
            onMissionPress={handleMissionPress}
            onSeeAllPress={handleSeeAllMissions}
          />

          <ProfileActions
            isGoogleAccount={!user.hasPassword}
            onEditPress={handleEdit}
            onLogoutPress={handleLogout}
            onDeletePress={handleDelete}
            onPasswordPress={handleChangePassword}
            onNotificationsPress={handleNotifications}
            isLoggingOut={isLoggingOut}
          />
        </View>
      </ScrollView>
    </>
  );
}
