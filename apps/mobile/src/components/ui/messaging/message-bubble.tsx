import { View } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import CheckSmallIconSource from "@assets/icons/ic_check_small.svg";

const CheckSmallIcon = cssInterop(CheckSmallIconSource, {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const);

interface MessageBubbleProps {
  readonly content: string;
  readonly isMine: boolean;
  readonly createdAt: string;
  /** Date de lecture par le destinataire (ISO) ou null si non lu.
   *  Utilisé uniquement pour les messages envoyés par l'utilisateur courant. */
  readonly readAt: string | null;
  readonly testID?: string;
}

/**
 * Icône de statut de lecture WhatsApp-like :
 * - 1 ✓  → message envoyé/livré (readAt null)
 * - 2 ✓✓ → message lu par le destinataire (readAt défini)
 *
 * Affiché uniquement sur les messages de l'utilisateur courant.
 */
function ReadReceipt({ read }: { readonly read: boolean }) {
  return (
    <View
      testID={read ? "msg-read" : "msg-sent"}
      accessibilityLabel={read ? "Lu" : "Envoyé"}
      className="flex-row items-center ml-1"
    >
      <CheckSmallIcon className="w-3.5 h-3.5 text-white/90" />
      {read && <CheckSmallIcon className="w-3.5 h-3.5 text-white/90 -ml-2" />}
    </View>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const sameDay =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    const time = d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (sameDay) return time;
    const date = d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
    return `${date} ${time}`;
  } catch {
    return "";
  }
}

export function MessageBubble({
  content,
  isMine,
  createdAt,
  readAt,
  testID,
}: MessageBubbleProps) {
  return (
    <View
      testID={testID}
      className={clsx(
        "flex-row mb-2",
        isMine ? "justify-end" : "justify-start",
      )}
    >
      <View
        className={clsx(
          "max-w-[80%] px-3 py-2 rounded-2xl",
          isMine ? "bg-primary rounded-br-sm" : "bg-grey-100 rounded-bl-sm",
        )}
      >
        <Text
          className={clsx(
            "text-base font-sans",
            isMine ? "text-white" : "text-grey-900",
          )}
        >
          {content}
        </Text>
        <View className="flex-row items-center self-end mt-1">
          <Text
            className={clsx(
              "text-[10px] font-sans",
              isMine ? "text-white/80" : "text-grey-700",
            )}
          >
            {formatTime(createdAt)}
          </Text>
          {isMine && <ReadReceipt read={readAt !== null} />}
        </View>
      </View>
    </View>
  );
}
