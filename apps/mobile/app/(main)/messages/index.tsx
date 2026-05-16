import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import clsx from "clsx";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import Toast from "react-native-toast-message";
import {
  Text,
  ConversationListItem,
  MessagesInfoModal,
  colors,
} from "@/components/ui";
import { useConversationsList } from "@/hooks/useConversationsList";
import { usePageTitle } from "@/hooks/usePageTitle";

const isWeb = Platform.OS === "web";

interface InfoButtonProps {
  readonly onPress: () => void;
  readonly variant: "header" | "inline";
}

/**
 * Bouton "?" qui ouvre la modale explicative. Extrait du composant parent
 * pour éviter la recréation à chaque rendu (ce qui démonterait/remonterait
 * le bouton et casserait l'animation du header natif).
 */
function InfoButton({ onPress, variant }: InfoButtonProps) {
  return (
    <Pressable
      testID="messages-info-button"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Pourquoi une conversation peut disparaître ?"
      className={clsx(
        "w-7 h-7 items-center justify-center rounded-full border border-grey-200 bg-white",
        "hover:bg-amber-50 hover:border-amber-400",
        "active:bg-amber-100 active:border-amber-500",
        "web:cursor-pointer",
        variant === "inline" ? "ml-2" : "mr-2",
      )}
    >
      <Text className="text-grey-600 text-xs font-bold">?</Text>
    </Pressable>
  );
}

/**
 * Composant rendu dans le `headerRight` du Stack.Screen. Extrait au niveau
 * module pour respecter la règle "no nested component definitions" — le
 * composant parent passe simplement `onPress`.
 */
function HeaderRightInfo({ onPress }: { readonly onPress: () => void }) {
  if (isWeb) return null;
  return <InfoButton onPress={onPress} variant="header" />;
}

export default function MessagesIndexScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ closed?: string | string[] }>();
  usePageTitle("Messages");
  const { conversations, isLoading, error, refresh } = useConversationsList();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Toast affiché si on arrive ici suite à une conversation supprimée
  // (l'autre user a supprimé son compte, quitté l'asso, etc.)
  useEffect(() => {
    const raw = Array.isArray(params.closed)
      ? params.closed[0]
      : params.closed;
    if (!raw) return;
    Toast.show({
      type: "info",
      text1: "Conversation indisponible",
      text2:
        "Cette conversation a été supprimée. L'utilisateur n'est plus joignable.",
      visibilityTime: 4500,
    });
    router.setParams({ closed: undefined });
  }, [params.closed, router]);

  // N'affiche pas les conversations sans aucun message échangé : si on a
  // cliqué "Contacter" sans envoyer, la conv existe en BDD mais on ne la
  // veut pas dans la liste tant qu'elle est vide.
  const visibleConversations = useMemo(
    () => conversations.filter((c) => c.lastMessage !== null),
    [conversations],
  );

  const openInfo = () => setIsInfoOpen(true);

  // Sur mobile, le bouton "?" s'affiche dans le header natif (à droite)
  // via headerRight. Sur web (pas de header natif), on le rend en haut
  // de la liste dans une barre dédiée.
  const screenOptions = useMemo(
    () => ({
      headerTitle: "Messages",
      headerRight: () => <HeaderRightInfo onPress={openInfo} />,
    }),
    [],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <MessagesInfoModal
        visible={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
      <View testID="messages-screen" className="flex-1 bg-grey-50 items-center">
        <View className="w-full max-w-3xl flex-1">
        {/* Barre titre + "?" — web uniquement (mobile : dans le header natif) */}
        {isWeb && (
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-grey-100 bg-white">
            <Text className="text-xl font-bold text-grey-900">Messages</Text>
            <InfoButton onPress={openInfo} variant="inline" />
          </View>
        )}

        {error && (
          <View
            testID="messages-error"
            className="m-4 p-3 border border-red-200 rounded-md bg-red-50"
          >
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}

        {isLoading && visibleConversations.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary.default} />
          </View>
        ) : (
          <FlatList
            testID="conversations-list"
            data={visibleConversations}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ConversationListItem
                testID={`conv-${item.id}`}
                conversation={item}
                onPress={() => router.push(`/messages/${item.id}`)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refresh}
                colors={[colors.primary.default]}
              />
            }
            ListEmptyComponent={
              <View testID="empty-conversations" className="py-16 items-center px-6">
                <Text className="text-grey-700 text-base font-semibold mb-2">
                  Aucune conversation
                </Text>
                <Text className="text-grey-600 text-sm text-center">
                  Contactez un membre d'une association depuis sa fiche pour
                  démarrer une discussion.
                </Text>
              </View>
            }
          />
        )}
        </View>
      </View>
    </>
  );
}
