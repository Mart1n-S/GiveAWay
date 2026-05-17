import { useMemo } from "react";
import { Platform, View } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Text,
  ConversationPanel,
  ConversationsListPanel,
  useMediaQuery,
} from "@/components/ui";
import { useConversationsList } from "@/hooks/useConversationsList";
import { useMessageStore } from "@/stores/message.store";
import { usePageTitle } from "@/hooks/usePageTitle";

const isWeb = Platform.OS === "web";

export default function ConversationScreen() {
  const params = useLocalSearchParams<{
    id: string;
    otherName?: string | string[];
  }>();
  const router = useRouter();
  const { isDesktop } = useMediaQuery();
  const useSplitPane = isWeb && isDesktop;

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

  const otherUserName = useMessageStore((s) => {
    if (conversationId === null) return null;
    const conv = s.conversations.find((c) => c.id === conversationId);
    return conv
      ? `${conv.otherUser.firstName} ${conv.otherUser.lastName}`
      : null;
  });
  const headerTitle = otherUserName ?? otherNameParam ?? "Discussion";
  usePageTitle(headerTitle);

  // Liste utilisée par le split-pane web (mode desktop uniquement)
  const { conversations, isLoading, error, refresh } = useConversationsList();

  const screenOptions = useMemo(() => ({ headerTitle }), [headerTitle]);

  const handleBack = useMemo(
    () => () => {
      if (router.canGoBack()) router.back();
      else router.replace("/messages");
    },
    [router],
  );

  if (conversationId === null) {
    return (
      <View className="flex-1 items-center justify-center bg-grey-50">
        <Text className="text-grey-700">Conversation introuvable</Text>
      </View>
    );
  }

  // ── Mode split-pane (web, grand écran) ───────────────────────────
  if (useSplitPane) {
    return (
      <>
        <Stack.Screen options={screenOptions} />
        <View className="flex-1 flex-row bg-grey-50">
          {/* Colonne gauche : liste avec highlight de la conv active */}
          <View className="w-[360px] border-r border-grey-200 bg-white flex-col">
            <View className="px-4 py-3 border-b border-grey-100">
              <Text className="text-xl font-bold text-grey-900">Messages</Text>
            </View>
            <ConversationsListPanel
              conversations={conversations}
              isLoading={isLoading}
              error={error}
              onRefresh={refresh}
              onSelect={(id) => router.replace(`/messages/${id}`)}
              activeConversationId={conversationId}
            />
          </View>
          {/* Colonne droite : la conversation ouverte */}
          <View className="flex-1 max-w-[900px]">
            <ConversationPanel
              conversationId={conversationId}
              headerMode="embedded"
            />
          </View>
        </View>
      </>
    );
  }

  // ── Mode "page" (mobile + petit web) ────────────────────────────
  return (
    <>
      <Stack.Screen options={screenOptions} />
      <View className="flex-1 bg-grey-50">
        <View
          className="flex-1 bg-white self-center w-full"
          style={isWeb ? { maxWidth: 800 } : undefined}
        >
          <ConversationPanel
            conversationId={conversationId}
            headerMode={isWeb ? "web" : "none"}
            onBack={isWeb ? handleBack : undefined}
          />
        </View>
      </View>
    </>
  );
}
