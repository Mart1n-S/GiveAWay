import React, { useState } from "react";
import { Modal, View, Pressable, ScrollView } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AddMemberSchema, AddMemberDto } from "@repo/shared";
import { z } from "zod";
import { Text } from "../text/text";
import { Button } from "../button/button";
import { FormInput } from "@/components/form";
import { AddMemberModalProps } from "./AddMemberModal.types";

type AddMemberFormInput = z.input<typeof AddMemberSchema>;

/**
 * Modal pour inviter un membre par son email.
 *
 * - Validation email côté client (Zod)
 * - Les erreurs API sont affichées dans la modal (ne ferme pas)
 * - Succès → ferme automatiquement, le parent montre un Toast
 */
export function AddMemberModal({
  visible,
  onAdd,
  onClose,
}: AddMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
  } = useForm<AddMemberFormInput>({
    resolver: zodResolver(AddMemberSchema),
    defaultValues: { email: "" },
  });

  const handleClose = () => {
    reset();
    setServerError(null);
    onClose();
  };

  const onSubmit = async (data: AddMemberFormInput) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await onAdd(data as AddMemberDto);
      reset();
      setServerError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter le membre.";
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
      supportedOrientations={["portrait", "landscape"]}
    >
      <Pressable
        className="items-center justify-center flex-1 p-4 bg-black/50"
        onPress={handleClose}
        accessibilityViewIsModal
      >
        <Pressable
          className="w-full max-w-sm overflow-hidden bg-white shadow-xl rounded-xl"
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
        >
          {/* Header */}
          <View className="px-5 pt-5 pb-3 border-b border-grey-100">
            <Text className="text-lg font-bold text-grey-900">
              Ajouter un membre
            </Text>
            <Text className="mt-1 text-sm text-grey-500">
              Le membre sera ajouté avec le rôle Éditeur.
            </Text>
          </View>

          {/* Form */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 16 }}
          >
            {serverError && (
              <View className="p-3 border rounded-md bg-error-30 border-error-100">
                <Text className="text-sm font-medium text-center text-error-100">
                  {serverError}
                </Text>
              </View>
            )}

            <FormInput
              control={control}
              name="email"
              label="Adresse email"
              placeholder="prenom.nom@exemple.fr"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              required
            />
          </ScrollView>

          {/* Actions */}
          <View className="flex-row gap-3 px-5 pb-5">
            <Button
              variant="secondary"
              onPress={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              className="flex-1"
            >
              Inviter
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
