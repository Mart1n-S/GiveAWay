import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";

import type { FollowedAssociationItem } from "@repo/shared";
import { ProfileService } from "@/services/profile.service";
import { unfollowAssociation } from "@/services/association.service";
import { useProfileStore } from "@/stores/profile.store";
import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import { SearchInput } from "@/components/ui/search-input/SearchInput";
import { colors } from "@/components/ui/theme/tokens";
import { usePageTitle } from "@/hooks/usePageTitle";

import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import NotificationSolidIconSource from "@assets/icons/ic_notification_solid.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);
const NotificationSolidIcon = cssInterop(NotificationSolidIconSource, iconConfig);

export default function AbonnementsScreen() {
  const router = useRouter();
  usePageTitle("Abonnements");

  const [items, setItems] = useState<FollowedAssociationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const unfollowingIds = useRef<Set<number>>(new Set());

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ProfileService.getFollowedAssociations();
      setItems(data);
    } catch {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: "Impossible de charger vos abonnements.",
        visibilityTime: 4000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = search.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  const handleUnfollow = async (item: FollowedAssociationItem) => {
    if (unfollowingIds.current.has(item.id)) return;
    unfollowingIds.current.add(item.id);

    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const store = useProfileStore.getState();
    const prevCount = store.profile?.followsCount ?? 0;
    store.updateProfile({ followsCount: Math.max(0, prevCount - 1) });

    try {
      await unfollowAssociation(item.id);
    } catch (error) {
      setItems((prev) => [item, ...prev]);
      store.updateProfile({ followsCount: prevCount });
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Impossible de se désabonner.";
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: message,
        visibilityTime: 4000,
        onPress: () => Toast.hide(),
      });
    } finally {
      unfollowingIds.current.delete(item.id);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Abonnements",
          headerShown: Platform.OS !== "web",
        }}
      />

      <View className="flex-1 bg-grey-50">
        {Platform.OS === "web" && (
          <View className="px-4 pt-4 items-start">
            <Button
              variant="secondary"
              onPress={() => router.back()}
              icon={
                <ArrowLeftIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
              }
            >
              Retour
            </Button>
          </View>
        )}

        <View className="px-4 py-3 bg-white border-b border-grey-100 mt-2">
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une association..."
          />
        </View>

        {isLoading ? (
          <View className="items-center justify-center flex-1">
            <ActivityIndicator size="large" color={colors.primary.default} />
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center justify-center flex-1 px-6">
            <Text className="text-sm font-medium text-center text-grey-500">
              {search.trim()
                ? "Aucune association ne correspond à votre recherche."
                : "Vous ne suivez aucune association pour l'instant."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListHeaderComponent={
              <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-wide uppercase text-grey-500">
                {items.length} association{items.length > 1 ? "s" : ""} suivie{items.length > 1 ? "s" : ""}
              </Text>
            }
            renderItem={({ item }) => (
              <AssociationRow
                item={item}
                onPress={() => router.push(`/associations/${item.id}`)}
                onUnfollow={() => void handleUnfollow(item)}
              />
            )}
            ItemSeparatorComponent={() => (
              <View className="h-[1px] mx-4 bg-grey-100" />
            )}
          />
        )}
      </View>
    </>
  );
}

function AssociationRow({
  item,
  onPress,
  onUnfollow,
}: {
  item: FollowedAssociationItem;
  onPress: () => void;
  onUnfollow: () => void;
}) {
  const initial = item.name.charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3 bg-white active:bg-grey-50"
    >
      {item.logoUrl ? (
        <Image
          source={{ uri: item.logoUrl }}
          className="w-10 h-10 rounded-full bg-grey-100"
          resizeMode="cover"
        />
      ) : (
        <View className="items-center justify-center w-10 h-10 rounded-full bg-primary-50">
          <Text className="text-base font-bold text-primary">{initial}</Text>
        </View>
      )}

      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold text-grey-900" numberOfLines={1}>
          {item.name}
        </Text>
        {item.city && (
          <Text className="text-xs text-grey-400" numberOfLines={1}>
            {item.city}
          </Text>
        )}
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          onUnfollow();
        }}
        hitSlop={8}
        className="p-2 rounded-full active:bg-grey-100"
      >
        <NotificationSolidIcon className="w-5 h-5 text-primary" />
      </Pressable>
    </Pressable>
  );
}
