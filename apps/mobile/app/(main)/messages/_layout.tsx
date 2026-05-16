import { Platform, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { cssInterop } from "nativewind";
import { ProtectedStack } from "@/components/layouts/ProtectedStack";
import { colors } from "@/components/ui";
import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const);

/**
 * Bouton retour custom rendu dans le header natif du Stack messages.
 * Toujours visible (sauf web où le header est masqué et un bouton custom
 * est rendu dans la page). Si l'historique est vide (deep-link direct
 * depuis fiche asso), retombe sur /messages.
 */
function MobileBackButton({ tintColor }: { tintColor?: string }) {
  return (
    <Pressable
      onPress={() =>
        router.canGoBack() ? router.back() : router.replace("/messages")
      }
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Retour aux messages"
      style={{ paddingHorizontal: 4 }}
    >
      <ArrowLeftIcon
        className="w-6 h-6"
        color={tintColor ?? colors.primary.default}
      />
    </Pressable>
  );
}

export default function MessagesLayout() {
  // initialRouteName="index" garantit que la liste est toujours posée
  // comme base du stack (utile pour les deep-links). Combiné au headerLeft
  // custom ci-dessous, le bouton retour est toujours fonctionnel.
  return (
    <ProtectedStack initialRouteName="index">
      <Stack.Screen
        name="index"
        options={{ headerTitle: "Messages", headerBackVisible: false }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: "Discussion",
          headerBackTitle: "Messages",
          // headerLeft défini AU NIVEAU DU LAYOUT : garanti d'être appliqué
          // au Stack messages quelle que soit l'origine de la navigation
          // (push depuis fiche asso, depuis l'index, etc.).
          headerLeft: (props) =>
            Platform.OS === "web" ? null : (
              <MobileBackButton tintColor={props.tintColor} />
            ),
        }}
      />
    </ProtectedStack>
  );
}
