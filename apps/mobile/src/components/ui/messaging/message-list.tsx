import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  View,
} from "react-native";
import type { MessageDto } from "@repo/shared";
import { colors } from "../theme/tokens";
import { Text } from "../text/text";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  readonly messages: MessageDto[];
  readonly currentUserId: number | undefined;
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  readonly onEndReached: () => void;
  readonly testID?: string;
}

/**
 * FlatList inversée : les messages récents sont en bas (visibles en premier).
 * onEndReached est déclenché quand on scrolle vers le haut.
 * Pré-condition : `messages` est trié par id desc (le plus récent en premier).
 */
export function MessageList({
  messages,
  currentUserId,
  hasMore,
  isLoadingMore,
  onEndReached,
  testID,
}: MessageListProps) {
  const renderItem: ListRenderItem<MessageDto> = useMemo(
    () =>
      ({ item }) => (
        <MessageBubble
          testID={`msg-${item.id}`}
          content={item.content}
          isMine={item.senderId === currentUserId}
          createdAt={item.createdAt}
          readAt={item.readAt}
        />
      ),
    [currentUserId],
  );

  return (
    <FlatList
      testID={testID}
      data={messages}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      inverted
      onEndReached={hasMore ? onEndReached : undefined}
      onEndReachedThreshold={0.3}
      contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
      ListFooterComponent={
        isLoadingMore ? (
          <View className="items-center py-3">
            <ActivityIndicator color={colors.primary.default} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View className="items-center py-12">
          <Text className="text-sm text-grey-600">
            Aucun message pour le moment. Lancez la conversation !
          </Text>
        </View>
      }
    />
  );
}
