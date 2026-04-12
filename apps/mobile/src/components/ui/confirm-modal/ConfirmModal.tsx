import React, { useState } from "react";
import { Modal, View, Pressable } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { Button } from "../button/button";
import { ConfirmModalProps } from "./ConfirmModal.types";

/**
 * Modal de confirmation générique.
 *
 * @example
 * <ConfirmModal
 * visible={showModal}
 * title="Retirer ce membre ?"
 * message="Cette action est irréversible."
 * destructive
 * confirmLabel="Retirer"
 * onConfirm={handleRemove}
 * onCancel={() => setShowModal(false)}
 * />
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = loading || isProcessing;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
      supportedOrientations={["portrait", "landscape"]}
    >
      <Pressable
        className="items-center justify-center flex-1 p-4 bg-black/50"
        onPress={onCancel}
        accessibilityViewIsModal
      >
        <Pressable
          className="w-full max-w-sm overflow-hidden bg-white shadow-xl rounded-xl"
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
        >
          {/* Header */}
          <View className="px-5 pt-5 pb-3">
            <Text className="text-lg font-bold text-center text-grey-900">
              {title}
            </Text>
          </View>

          {/* Message */}
          <View className="px-5 pb-5">
            <Text className="text-sm leading-5 text-center text-grey-600">
              {message}
            </Text>
          </View>

          {/* Divider */}
          <View className="h-px bg-grey-100" />

          {/* Actions */}
          <View className="flex-row gap-3 px-5 pb-5 pt-2">
            <Button
              variant="secondary"
              onPress={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              {cancelLabel}
            </Button>

            <Button
              onPress={handleConfirm}
              loading={isLoading}
              className={clsx(
                "flex-1",
                destructive &&
                  "bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800 active:border-red-800",
              )}
            >
              {confirmLabel}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
