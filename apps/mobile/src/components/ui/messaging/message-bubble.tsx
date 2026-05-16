import { View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";

interface MessageBubbleProps {
  readonly content: string;
  readonly isMine: boolean;
  readonly createdAt: string;
  readonly testID?: string;
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
          isMine
            ? "bg-primary rounded-br-sm"
            : "bg-grey-100 rounded-bl-sm",
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
        <Text
          className={clsx(
            "text-[10px] font-sans mt-1 self-end",
            isMine ? "text-white/80" : "text-grey-700",
          )}
        >
          {formatTime(createdAt)}
        </Text>
      </View>
    </View>
  );
}
