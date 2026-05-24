import { useCallback, useEffect, useState } from "react";
import { useMessageStore } from "../stores/message.store";
import { MessagingService } from "../services/messaging.service";

interface UseConversationsListResult {
  conversations: ReturnType<typeof useMessageStore.getState>["conversations"];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConversationsList(): UseConversationsListResult {
  const conversations = useMessageStore((s) => s.conversations);
  const loaded = useMessageStore((s) => s.conversationsLoaded);
  const [isLoading, setIsLoading] = useState(!loaded);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await MessagingService.list();
      useMessageStore.getState().setConversations(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les conversations",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      // L'erreur est déjà capturée et stockée dans `error` par refresh()
    });
  }, [refresh]);

  return { conversations, isLoading, error, refresh };
}
