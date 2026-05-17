import { useCallback } from "react";
import Toast from "react-native-toast-message";
import { MessagingService } from "../services/messaging.service";
import { useMessageStore } from "../stores/message.store";

/**
 * Renvoie un handler qui supprime "côté user" une conversation :
 * appel API + retrait optimiste du store + toast. La promesse rejette en
 * cas d'erreur API pour que l'UI (modale de confirmation) puisse rester
 * ouverte et permettre un retry.
 */
export function useDeleteConversation(): (
  conversationId: number,
) => Promise<void> {
  return useCallback(async (conversationId: number) => {
    try {
      await MessagingService.remove(conversationId);
      useMessageStore.getState().removeConversation(conversationId);
      Toast.show({
        type: "success",
        text1: "Conversation supprimée",
        visibilityTime: 2500,
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2:
          err instanceof Error
            ? err.message
            : "Impossible de supprimer la conversation",
        visibilityTime: 4000,
      });
      throw err;
    }
  }, []);
}
