import React from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import { STEP_LABELS } from "@/hooks/useMissionStepper";

import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import CheckIconSource from "@assets/icons/ic_check_small.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);
const CheckIcon = cssInterop(CheckIconSource, iconConfig);

interface MissionFormLayoutProps {
  title: string;
  submitLabel: string;
  step: 1 | 2 | 3;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  errorMessage?: string;
  children: React.ReactNode;
}

export function MissionFormLayout({
  title,
  submitLabel,
  step,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
  onCancel,
  errorMessage,
  children,
}: MissionFormLayoutProps) {
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: title,
          headerShown: Platform.OS !== "web",
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="bg-white border-b border-grey-100">
          {Platform.OS === "web" && (
            <View className="px-4 pt-4">
              <Button
                variant="secondary"
                onPress={onCancel}
                className="self-start"
                icon={
                  <ArrowLeftIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                }
              >
                Retour
              </Button>
            </View>
          )}

          <View className="flex-row items-center justify-between px-4 py-3">
            {STEP_LABELS.map((label, idx) => {
              const stepNum = (idx + 1) as 1 | 2 | 3;
              const isActive = stepNum === step;
              const isDone = stepNum < step;
              let stepBg = "bg-grey-100";
              if (isActive) stepBg = "bg-primary";
              else if (isDone) stepBg = "bg-success-100";
              return (
                <View key={label} className="items-center flex-1 gap-1">
                  <View
                    className={`w-7 h-7 rounded-full items-center justify-center ${stepBg}`}
                  >
                    {isDone ? (
                      <CheckIcon className="w-4 h-4 text-white" />
                    ) : (
                      <Text className="text-xs font-bold text-white">
                        {stepNum}
                      </Text>
                    )}
                  </View>
                  <Text
                    className={`text-xs ${
                      isActive ? "text-primary font-semibold" : "text-grey-400"
                    }`}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <ScrollView
          className="flex-1 bg-grey-50"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-2xl gap-4 mx-auto">
            {!!errorMessage && (
              <View className="p-3 border border-red-200 rounded-md bg-red-50">
                <Text className="text-sm font-medium text-center text-red-600">
                  {errorMessage}
                </Text>
              </View>
            )}
            {children}
          </View>
        </ScrollView>

        <View className="flex-row gap-3 px-4 py-3 bg-white border-t border-grey-100">
          {step > 1 ? (
            <Button
              variant="secondary"
              onPress={onBack}
              disabled={isSubmitting}
              className="flex-1"
            >
              Retour
            </Button>
          ) : (
            <Button
              variant="secondary"
              onPress={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annuler
            </Button>
          )}

          {step < 3 ? (
            <Button onPress={onNext} disabled={isSubmitting} className="flex-1">
              Suivant
            </Button>
          ) : (
            <Button onPress={onSubmit} loading={isSubmitting} className="flex-1">
              {submitLabel}
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
