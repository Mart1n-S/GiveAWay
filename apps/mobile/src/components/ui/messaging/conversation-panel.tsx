import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cssInterop } from "nativewind";
import { useConversation } from "@/hooks/useConversation";
import { useMessageStore } from "@/stores/message.store";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "../button/button";
import { Text } from "../text/text";
import { colors } from "../theme/tokens";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";
import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const);

interface ConversationPanelProps {
  readonly conversationId: number;
  /**
   * Mode d'affichage du header interne :
   * - `none` : aucun header rendu (l'écran parent gère le header natif mobile)
   * - `web` : header personnalisé avec bouton retour (split-pane petit)
   * - `embedded` : header sans bouton retour (mode split-pane, retour pas nécessaire)
   * - `fallback` : nom seul, sans bouton (placeholder vide)
   */
  readonly headerMode?: "none" | "web" | "embedded";
  readonly onBack?: () => void;
  readonly testID?: string;
}

export function ConversationPanel({
  conversationId,
  headerMode = "none",
  onBack,
  testID,
}: ConversationPanelProps) {
  // Hauteur du header natif (Stack), 0 sur web et dans les modes sans header
  // natif. Utilisé comme keyboardVerticalOffset pour que le composer ne soit
  // pas caché par le clavier quand on tape un message.
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const otherUserName = useMessageStore((s) => {
    const conv = s.conversations.find((c) => c.id === conversationId);
    return conv
      ? `${conv.otherUser.firstName} ${conv.otherUser.lastName}`
      : null;
  });
  const associationName = useMessageStore((s) => {
    const conv = s.conversations.find((c) => c.id === conversationId);
    return conv?.association.name ?? null;
  });
  const headerTitle = otherUserName ?? "Discussion";

  const {
    messages,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    sendMessage,
  } = useConversation(conversationId);

  return (
    <KeyboardAvoidingView
      testID={testID ?? "conversation-screen"}
      style={{ flex: 1, backgroundColor: "white" }}
      // `padding` sur les deux plateformes (Expo Go Android n'applique pas
      // toujours `adjustResize`).
      // Android : on compense la hauteur de la tab bar qui reste visible
      // sur la route /messages/[id] (cf. (main)/_layout.tsx : la tabBarStyle
      // a `height: 60 + insets.bottom`). Sans cette compensation, le KAV
      // ne pousse pas assez et le textarea reste partiellement caché par
      // le clavier. La valeur s'adapte automatiquement selon l'appareil
      // (insets.bottom varie selon gesture nav / boutons physiques).
      // iOS : offset = header height pour compenser le header natif.
      behavior="padding"
      keyboardVerticalOffset={
        Platform.OS === "ios" ? headerHeight : 70 + insets.bottom
      }
    >
      {/* Header custom — selon le mode */}
      {headerMode === "web" && (
        <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-grey-200">
          {onBack && (
            <Button
              testID="conv-back-button"
              variant="tertiary"
              onPress={onBack}
              accessibilityLabel="Retour aux messages"
              icon={<ArrowLeftIcon className="w-5 h-5 text-primary" />}
            />
          )}
          <View className="flex-1">
            <Text
              className="text-lg font-bold text-grey-900"
              numberOfLines={1}
            >
              {headerTitle}
            </Text>
            {associationName && (
              <Text className="text-xs text-grey-600" numberOfLines={1}>
                via {associationName}
              </Text>
            )}
          </View>
        </View>
      )}
      {headerMode === "embedded" && (
        <View className="px-4 py-3 bg-white border-b border-grey-200">
          <Text className="text-lg font-bold text-grey-900" numberOfLines={1}>
            {headerTitle}
          </Text>
          {associationName && (
            <Text className="text-xs text-grey-600" numberOfLines={1}>
              via {associationName}
            </Text>
          )}
        </View>
      )}

      {error && (
        <View
          testID="conversation-error"
          className="p-3 m-3 border border-red-200 rounded-md bg-red-50"
        >
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      )}

      <View className="flex-1">
        {isLoading && messages.length === 0 ? (
          <View className="items-center justify-center flex-1">
            <ActivityIndicator color={colors.primary.default} size="large" />
          </View>
        ) : (
          <MessageList
            testID="messages-list"
            messages={messages}
            currentUserId={currentUserId}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onEndReached={loadMore}
          />
        )}
      </View>

      <MessageComposer
        testID="message-composer"
        conversationId={conversationId}
        onSend={sendMessage}
      />
    </KeyboardAvoidingView>
  );
}

/**
 * Placeholder affiché côté droit du split-pane web quand aucune conv
 * n'est sélectionnée.
 */
export function ConversationPanelPlaceholder() {
  return (
    <View
      testID="conversation-placeholder"
      className="items-center justify-center flex-1 px-8 bg-grey-50"
    >
      <View className="items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-50">
        <Text className="text-3xl">💬</Text>
      </View>
      <Text className="mb-2 text-lg font-bold text-grey-900">
        Sélectionnez une conversation
      </Text>
      <Text className="max-w-xs text-sm text-center text-grey-600">
        Choisissez une conversation dans la liste à gauche, ou démarrez-en
        une depuis la fiche d'une association.
      </Text>
    </View>
  );
}
