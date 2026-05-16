import { useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import clsx from "clsx";
import { colors } from "../theme/tokens";
import { Text } from "../text/text";
import { MESSAGE_MAX_LENGTH, SendMessageSchema } from "@repo/shared";

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

    // Validation Zod côté front (cohérente avec le backend)
    const parsed = SendMessageSchema.safeParse({
      conversationId,
      content: trimmed,
    });
    if (!parsed.success) {
      const flat = parsed.error.issues
        .map((i) => i.message)
        .join(". ");
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

  const isDisabled = disabled || sending || value.trim().length === 0;

  return (
    <View testID={testID} className="border-t border-grey-200 bg-white px-3 py-2">
      {error && (
        <Text
          testID="composer-error"
          className="text-xs text-error-strong mb-1"
        >
          {error}
        </Text>
      )}
      <View className="flex-row items-end gap-2">
        <View className="flex-1 rounded-2xl border border-grey-300 bg-grey-50 px-3 py-1.5">
          <TextInput
            testID="composer-input"
            value={value}
            onChangeText={(t) => {
              setValue(t.slice(0, MESSAGE_MAX_LENGTH));
              if (error) setError(null);
            }}
            placeholder="Écrire un message…"
            placeholderTextColor={colors.grey[600]}
            multiline
            maxLength={MESSAGE_MAX_LENGTH}
            editable={!disabled}
            className="text-base text-grey-900 max-h-32"
            style={Platform.select({
              web: { outlineStyle: "none" } as Record<string, unknown>,
              default: {},
            })}
          />
        </View>
        <Pressable
          testID="composer-send"
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          disabled={isDisabled}
          onPress={handleSend}
          className={clsx(
            "h-11 w-11 rounded-full items-center justify-center",
            isDisabled ? "bg-grey-200" : "bg-primary active:bg-primary-active",
          )}
        >
          <Text
            className={clsx(
              "text-base font-bold",
              isDisabled ? "text-grey-disabledText" : "text-white",
            )}
          >
            ➤
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
