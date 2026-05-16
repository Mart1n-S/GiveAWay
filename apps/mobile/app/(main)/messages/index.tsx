import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import {
  Text,
  ConversationListItem,
  colors,
} from "@/components/ui";
import { useConversationsList } from "@/hooks/useConversationsList";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function MessagesIndexScreen() {
  const router = useRouter();
  usePageTitle("Messages");
  const { conversations, isLoading, error, refresh } = useConversationsList();

  // N'affiche pas les conversations sans aucun message échangé : si on a
  // cliqué "Contacter" sans envoyer, la conv existe en BDD mais on ne la
  // veut pas dans la liste tant qu'elle est vide.
  const visibleConversations = useMemo(
    () => conversations.filter((c) => c.lastMessage !== null),
    [conversations],
  );

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Messages" }} />
      <View testID="messages-screen" className="flex-1 bg-grey-50 items-center">
        <View className="w-full max-w-3xl flex-1">
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
