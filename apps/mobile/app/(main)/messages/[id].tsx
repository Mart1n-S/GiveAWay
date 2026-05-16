import { useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { cssInterop } from "nativewind";
import {
  Text,
  MessageList,
  MessageComposer,
  colors,
} from "@/components/ui";
import { useConversation } from "@/hooks/useConversation";
import { useMessageStore } from "@/stores/message.store";
import { useAuthStore } from "@/stores/auth.store";
import { usePageTitle } from "@/hooks/usePageTitle";
import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const);

const isWeb = Platform.OS === "web";

export default function ConversationScreen() {
  const params = useLocalSearchParams<{
    id: string;
    otherName?: string | string[];
    assocName?: string | string[];
  }>();
  const router = useRouter();
  const conversationId = useMemo(() => {
    const n = Number.parseInt(
      Array.isArray(params.id) ? params.id[0] : (params.id ?? ""),
      10,
    );
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params.id]);

  // Fallback param URL (utile quand on arrive depuis "Contacter" : la conv
  // n'est pas encore dans /conversations donc le store ne la connaît pas)
  const otherNameParam = useMemo(() => {
    const raw = Array.isArray(params.otherName)
      ? params.otherName[0]
      : params.otherName;
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  }, [params.otherName]);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const otherUserName = useMessageStore((s) => {
    if (conversationId === null) return null;
    const conv = s.conversations.find((c) => c.id === conversationId);
    return conv
      ? `${conv.otherUser.firstName} ${conv.otherUser.lastName}`
      : null;
  });
  const headerTitle = otherUserName ?? otherNameParam ?? "Discussion";
  usePageTitle(headerTitle);

  const {
    messages,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    sendMessage,
  } = useConversation(conversationId);

  const handleBack = useMemo(
    () => () => {
      if (router.canGoBack()) router.back();
      else router.replace("/messages");
    },
    [router],
  );

  // Le headerLeft (bouton retour mobile) est défini AU NIVEAU DU LAYOUT
  // messages/_layout.tsx — plus fiable car le Stack parent garantit
  // l'application des options quelle que soit l'origine du push.
  // Ici on ne customise que le titre (dynamique selon la conv).
  const screenOptions = useMemo(() => ({ headerTitle }), [headerTitle]);

  if (conversationId === null) {
    return (
      <View className="flex-1 items-center justify-center bg-grey-50">
        <Text className="text-grey-700">Conversation introuvable</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <View className="flex-1 bg-grey-50">
        <KeyboardAvoidingView
          testID="conversation-screen"
          style={{
            flex: 1,
            backgroundColor: "white",
            alignSelf: "center",
            width: "100%",
            maxWidth: isWeb ? 800 : undefined,
          }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          {/* Header web : bouton retour + nom — mobile a son header natif */}
          {isWeb && (
            <View className="flex-row items-center gap-3 px-4 py-3 border-b border-grey-200 bg-white">
              <Pressable
                testID="conv-back-button"
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Retour aux messages"
                className="w-10 h-10 rounded-full items-center justify-center hover:bg-grey-100 active:bg-grey-200 web:cursor-pointer"
              >
                <ArrowLeftIcon className="w-5 h-5 text-primary" />
              </Pressable>
              <Text className="text-lg font-bold text-grey-900 flex-1" numberOfLines={1}>
                {headerTitle}
              </Text>
            </View>
          )}

          {error && (
            <View
              testID="conversation-error"
              className="m-3 p-3 border border-red-200 rounded-md bg-red-50"
            >
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          <View className="flex-1">
            {isLoading && messages.length === 0 ? (
              <View className="flex-1 items-center justify-center">
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
      </View>
    </>
  );
}
