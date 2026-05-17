import { useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import Toast from "react-native-toast-message";
import {
  Text,
  ConversationsListPanel,
  ConversationPanelPlaceholder,
  InfoButton,
  MessagesInfoModal,
  useMediaQuery,
} from "@/components/ui";
import { useConversationsList } from "@/hooks/useConversationsList";
import { useDeleteConversation } from "@/hooks/useDeleteConversation";
import { usePageTitle } from "@/hooks/usePageTitle";

const isWeb = Platform.OS === "web";

/**
 * Composant rendu dans le `headerRight` du Stack.Screen. Extrait au niveau
 * module pour respecter la règle "no nested component definitions".
 */
function HeaderRightInfo({ onPress }: { readonly onPress: () => void }) {
  if (isWeb) return null;
  return <InfoButton onPress={onPress} variant="header" />;
}

export default function MessagesIndexScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ closed?: string | string[] }>();
  const { isDesktop } = useMediaQuery();
  const useSplitPane = isWeb && isDesktop;
  usePageTitle("Messages");
  const { conversations, isLoading, error, refresh } = useConversationsList();
  const deleteConversation = useDeleteConversation();
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

  const openInfo = () => setIsInfoOpen(true);

  // Sur mobile : "?" dans le header natif. Sur web : géré inline dans la barre.
  const screenOptions = useMemo(
    () => ({
      headerTitle: "Messages",
      headerRight: () => <HeaderRightInfo onPress={openInfo} />,
    }),
    [],
  );

  // ── Mode split-pane (web, grand écran) ───────────────────────────
  if (useSplitPane) {
    return (
      <>
        <Stack.Screen options={screenOptions} />
        <MessagesInfoModal
          visible={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
        />
        <View
          testID="messages-screen"
          className="flex-1 flex-row bg-grey-50"
        >
          {/* Colonne gauche : liste */}
          <View className="w-[360px] border-r border-grey-200 bg-white flex-col">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-grey-100">
              <Text className="text-xl font-bold text-grey-900">
                Messages
              </Text>
              <InfoButton onPress={openInfo} variant="inline" />
            </View>
            <ConversationsListPanel
              conversations={conversations}
              isLoading={isLoading}
              error={error}
              onRefresh={refresh}
              onSelect={(id) => router.push(`/messages/${id}`)}
              onDeleteConfirm={deleteConversation}
              activeConversationId={null}
            />
          </View>
          {/* Colonne droite : placeholder car aucune conv sélectionnée */}
          <View className="flex-1">
            <ConversationPanelPlaceholder />
          </View>
        </View>
      </>
    );
  }

  // ── Mode "page" (mobile + petit web) ────────────────────────────
  return (
    <>
      <Stack.Screen options={screenOptions} />
      <MessagesInfoModal
        visible={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
      <View testID="messages-screen" className="flex-1 bg-grey-50 items-center">
        <View className="w-full max-w-3xl flex-1">
          {isWeb && (
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-grey-100 bg-white">
              <Text className="text-xl font-bold text-grey-900">Messages</Text>
              <InfoButton onPress={openInfo} variant="inline" />
            </View>
          )}

          <ConversationsListPanel
            conversations={conversations}
            isLoading={isLoading}
            error={error}
            onRefresh={refresh}
            onSelect={(id) => router.push(`/messages/${id}`)}
            onDeleteConfirm={deleteConversation}
          />
        </View>
      </View>
    </>
  );
}
