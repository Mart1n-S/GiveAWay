import { Image, Pressable, View } from "react-native";
import clsx from "clsx";
import type { ConversationListItemDto } from "@repo/shared";
import { Text } from "../text/text";

interface ConversationListItemProps {
  readonly conversation: ConversationListItemDto;
  readonly onPress: () => void;
  /** Highlight visuel — utilisé en split-pane web pour marquer la conv ouverte. */
  readonly isActive?: boolean;
  readonly testID?: string;
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return "à l'instant";
    if (diff < hour) return `il y a ${Math.floor(diff / minute)} min`;
    if (diff < day) return `il y a ${Math.floor(diff / hour)} h`;
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ConversationListItem({
  conversation,
  onPress,
  isActive = false,
  testID,
}: ConversationListItemProps) {
  const initial =
    conversation.otherUser.firstName.charAt(0).toUpperCase() || "?";
  const hasUnread = conversation.unreadCount > 0;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Ouvrir la conversation avec ${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`}
      className={clsx(
        "flex-row items-center px-4 py-3 border-b border-grey-100",
        "web:cursor-pointer web:transition-colors",
        isActive
          ? "bg-primary-50 border-l-4 border-l-primary"
          : "bg-white hover:bg-grey-50 active:bg-grey-100",
      )}
    >
      {/* Avatar */}
      <View className="w-12 h-12 rounded-full bg-grey-200 items-center justify-center mr-3 overflow-hidden">
        {conversation.otherUser.profilePicture ? (
          <Image
            source={{ uri: conversation.otherUser.profilePicture }}
            style={{ width: 48, height: 48 }}
          />
        ) : (
          <Text className="text-grey-700 font-bold text-lg">{initial}</Text>
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className={clsx(
              "text-base flex-1",
              hasUnread ? "font-bold text-grey-900" : "font-semibold text-grey-800",
            )}
            numberOfLines={1}
          >
            {conversation.otherUser.firstName} {conversation.otherUser.lastName}
          </Text>
          <Text className="text-xs text-grey-600 ml-2">
            {formatRelative(conversation.updatedAt)}
          </Text>
        </View>
        <View className="flex-row items-center mt-0.5">
          <Text className="text-xs text-grey-600 mr-1" numberOfLines={1}>
            via {conversation.association.name}
          </Text>
        </View>
        <View className="flex-row items-center mt-1">
          <Text
            className={clsx(
              "text-sm flex-1",
              hasUnread ? "font-semibold text-grey-900" : "text-grey-700",
            )}
            numberOfLines={1}
          >
            {conversation.lastMessage?.content ?? "Pas encore de message"}
          </Text>
          {hasUnread && (
            <View
              testID="unread-badge"
              accessibilityLabel={`${conversation.unreadCount} messages non lus`}
              className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-primary items-center justify-center"
            >
              <Text className="text-white text-xs font-bold">
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
