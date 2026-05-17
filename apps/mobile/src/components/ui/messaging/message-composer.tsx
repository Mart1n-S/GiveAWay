import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { MESSAGE_MAX_LENGTH, SendMessageSchema } from "@repo/shared";
import { Text } from "../text/text";
import { TextArea } from "../textarea/textarea";
import { colors } from "../theme/tokens";
import SendIconSource from "@assets/icons/ic_send.svg";

const SendIcon = cssInterop(SendIconSource, {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const);

interface MessageComposerProps {
  readonly onSend: (content: string) => Promise<void>;
  readonly conversationId: number;
  readonly disabled?: boolean;
  readonly testID?: string;
}

export function MessageComposer({
  onSend,
  conversationId,
  disabled = false,
  testID,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) return;

    const parsed = SendMessageSchema.safeParse({
      conversationId,
      content: trimmed,
    });
    if (!parsed.success) {
      const flat = parsed.error.issues.map((i) => i.message).join(". ");
      setError(flat || "Message invalide");
      return;
    }

    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  const isSendDisabled = disabled || sending || value.trim().length === 0;

  return (
    <View
      testID={testID}
      className="border-t border-grey-200 bg-white px-3 py-2"
    >
      {error && (
        <Text
          testID="composer-error"
          className="text-xs text-error-strong mb-1.5"
        >
          {error}
        </Text>
      )}
      <View className="flex-row items-center gap-2">
        {/* TextArea du design system, configuré en mode "compact" */}
        <View className="flex-1">
          <TextArea
            testID="composer-input"
            value={value}
            onChangeText={(t) => {
              setValue(t);
              if (error) setError(null);
            }}
            placeholder="Écrire un message…"
            maxLength={MESSAGE_MAX_LENGTH}
            showCharacterCount={false}
            disabled={disabled}
            minHeight={44}
            containerClassName="gap-0"
            className="max-h-32 leading-5"
          />
        </View>

        {/* Bouton envoyer — Pressable custom (44×44, charte cohérente avec Button) */}
        <Pressable
          testID="composer-send"
          accessibilityRole="button"
          accessibilityLabel="Envoyer le message"
          accessibilityState={{ disabled: isSendDisabled, busy: sending }}
          disabled={isSendDisabled}
          onPress={handleSend}
          className={clsx(
            "h-control w-[44px] rounded-md items-center justify-center transition-all",
            "web:cursor-pointer",
            isSendDisabled
              ? "bg-grey-100 border border-grey-100"
              : [
                  "bg-primary border border-primary",
                  "hover:bg-primary-hover hover:border-primary-hover",
                  "active:bg-primary-active active:border-primary-active",
                ],
          )}
        >
          {sending ? (
            <ActivityIndicator
              color={isSendDisabled ? colors.grey[600] : colors.white.default}
            />
          ) : (
            <SendIcon
              className={clsx(
                "w-5 h-5",
                isSendDisabled ? "text-grey-disabledText" : "text-white",
              )}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}
