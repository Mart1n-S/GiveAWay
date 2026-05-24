import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import type { ConversationListItemDto } from "@repo/shared";
import { colors } from "../theme/tokens";
import { Text } from "../text/text";
import { ConfirmModal } from "../confirm-modal/ConfirmModal";
import { ConversationListItem } from "./conversation-list-item";

interface ConversationsListPanelProps {
  readonly conversations: ConversationListItemDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRefresh: () => void | Promise<void>;
  readonly onSelect: (conversationId: number) => void;
  /**
   * Optionnel : si fourni, active le bouton "supprimer" sur chaque item.
   * Le composant gère la modale de confirmation ; le parent reçoit l'id
   * une fois l'utilisateur confirmé et est responsable de l'appel API +
   * de la mise à jour du store. Si la promesse échoue, la modale reste
   * ouverte pour permettre un retry.
   */
  readonly onDeleteConfirm?: (conversationId: number) => Promise<void>;
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
  onDeleteConfirm,
  activeConversationId,
  testID,
}: ConversationsListPanelProps) {
  // Filtre les conversations vides : si on a juste cliqué "Contacter" sans
  // envoyer, la conv existe en BDD mais ne doit pas polluer la liste.
  const visible = conversations.filter((c) => c.lastMessage !== null);

  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const pendingConv = useMemo(
    () =>
      pendingDeleteId === null
        ? null
        : (conversations.find((c) => c.id === pendingDeleteId) ?? null),
    [pendingDeleteId, conversations],
  );

  const handleConfirmDelete = async () => {
    if (pendingDeleteId === null || !onDeleteConfirm) return;
    try {
      await onDeleteConfirm(pendingDeleteId);
      setPendingDeleteId(null);
    } catch {
      // L'erreur est gérée par le parent (toast/affichage).
      // On ne ferme pas la modale pour permettre un retry.
    }
  };

  if (isLoading && visible.length === 0) {
    return (
      <View testID={testID} className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  return (
    <View testID={testID} className="flex-1">
      {error !== null && error !== "" && (
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
            onDelete={
              onDeleteConfirm ? () => setPendingDeleteId(item.id) : undefined
            }
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

      <ConfirmModal
        visible={pendingConv !== null}
        title="Supprimer cette conversation ?"
        message={
          pendingConv
            ? `La conversation avec ${pendingConv.otherUser.firstName} ${pendingConv.otherUser.lastName} sera retirée de votre liste. ${pendingConv.otherUser.firstName} continuera de voir l'historique. Si un nouveau message arrive, la conversation réapparaîtra (sans les anciens messages).`
            : ""
        }
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </View>
  );
}
