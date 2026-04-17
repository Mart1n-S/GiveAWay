import React from "react";
import { View, Text } from "react-native";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { Control } from "react-hook-form";
import { FormInput } from "@/components/form/";
import { Button } from "@/components/ui/button/button";

interface VerifyEmailStepProps {
  readonly registeredEmail: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly control: Control<any>;
  readonly onSubmit: () => void;
  readonly isSubmitting: boolean;
  readonly resendTimer: number;
  readonly isResending: boolean;
  readonly onResend: () => void;
  readonly outerClassName?: string;
  readonly extraActions?: React.ReactNode;
}

export function VerifyEmailStep({
  registeredEmail,
  control,
  onSubmit,
  isSubmitting,
  resendTimer,
  isResending,
  onResend,
  outerClassName = "gap-6",
  extraActions,
}: VerifyEmailStepProps) {
  return (
    <View className={outerClassName}>
      <View className="items-center gap-2">
        <Text className="text-2xl font-bold text-center text-grey-900">
          Vérifiez votre boîte mail
        </Text>
        <Text className="px-4 text-center text-grey-600">
          Nous avons envoyé un code de confirmation à :{"\n"}
          <Text className="font-bold text-primary">{registeredEmail}</Text>
        </Text>
      </View>

      <FormInput
        control={control}
        name="code"
        label="Code à 6 chiffres"
        testID="input-verify-code"
        helperText="Format : 123456"
        keyboardType="number-pad"
        maxLength={6}
        required
        autoFocus
      />

      <Button
        testID="btn-submit-verify-code"
        onPress={onSubmit}
        loading={isSubmitting}
        className="w-full"
      >
        Valider
      </Button>

      <View className="items-center mt-2">
        <Button
          variant="secondary"
          testID="btn-resend-code"
          onPress={onResend}
          disabled={resendTimer > 0}
          loading={isResending}
          className="w-full"
        >
          {resendTimer > 0
            ? `Renvoyer le code (${resendTimer}s)`
            : "Je n'ai pas reçu le code"}
        </Button>

        <Text className="mt-4 text-xs text-center text-grey-600">
          Vérifiez également vos courriers indésirables (spams).
        </Text>

        {extraActions}
      </View>
    </View>
  );
}
