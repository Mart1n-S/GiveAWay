import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import type { ConversationListItemDto } from "@repo/shared";
import { colors } from "../theme/tokens";
import { Text } from "../text/text";
import { ConversationListItem } from "./conversation-list-item";

interface ConversationsListPanelProps {
  readonly conversations: ConversationListItemDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRefresh: () => void | Promise<void>;
  readonly onSelect: (conversationId: number) => void;
  readonly activeConversationId?: number | null;
  readonly testID?: string;
}

/**
 * Panneau "liste des conversations". Extrait du composant page pour pouvoir
 * être réutilisé côté split-pane web (liste à gauche + conv à droite) et
 * côté page mobile (route /messages).
 */
export function ConversationsListPanel({
  conversations,
  isLoading,
  error,
  onRefresh,
  onSelect,
  activeConversationId,
  testID,
}: ConversationsListPanelProps) {
  // Filtre les conversations vides : si on a juste cliqué "Contacter" sans
  // envoyer, la conv existe en BDD mais ne doit pas polluer la liste.
  const visible = conversations.filter((c) => c.lastMessage !== null);

  if (isLoading && visible.length === 0) {
    return (
      <View testID={testID} className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  return (
    <View testID={testID} className="flex-1">
      {error && (
        <View
          testID="messages-error"
          className="m-4 p-3 border border-red-200 rounded-md bg-red-50"
        >
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      )}
      <FlatList
        testID="conversations-list"
        data={visible}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ConversationListItem
            testID={`conv-${item.id}`}
            conversation={item}
            onPress={() => onSelect(item.id)}
            isActive={activeConversationId === item.id}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void onRefresh()}
            colors={[colors.primary.default]}
          />
        }
        ListEmptyComponent={
          <View
            testID="empty-conversations"
            className="py-16 items-center px-6"
          >
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
    </View>
  );
}
