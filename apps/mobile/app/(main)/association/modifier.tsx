import React, { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { isAxiosError } from "axios";

import {
  UpdateAssociationSchema,
  UpdateAssociationFormValues,
  AssociationRole,
  AssociationStatus,
} from "@repo/shared";
import { FormInput, FormTextarea } from "@/components/form";
import {
  Button,
  AddressAutocomplete,
  Text,
  colors,
} from "@/components/ui";
import { useAssociationStore } from "@/stores/association.store";
import { useAuthStore } from "@/stores/auth.store";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function EditAssociationScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  usePageTitle("Modifier l'association");

  const store = useAssociationStore();
  const user = useAuthStore((state) => state.user);
  const userAssociation = user?.associations?.[0] ?? null;
  const associationId = userAssociation?.associationId ?? null;

  const association = store.association;
  const userRole = store.userRole;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<UpdateAssociationFormValues>({
    resolver: zodResolver(UpdateAssociationSchema) as any,
    defaultValues: {
      name: association?.name ?? "",
      phone: association?.phone ?? "",
      website: association?.website ?? "",
      description: association?.description ?? "",
      object: association?.object ?? "",
      address: association?.address
        ? {
            street: association.address.street,
            postalCode: association.address.postalCode,
            city: association.address.city,
            latitude: association.address.latitude ?? undefined,
            longitude: association.address.longitude ?? undefined,
          }
        : undefined,
    },
  });

  // Nettoie l'erreur root dès qu'un champ change
  useEffect(() => {
    const subscription = watch(() => {
      if (errors.root) clearErrors("root");
    });
    return () => subscription.unsubscribe();
  }, [watch, errors.root, clearErrors]);

  // Charge l'association si pas encore en store
  useEffect(() => {
    if (associationId && !association) {
      store.fetchAssociation(associationId).catch(() => {
        Toast.show({
          type: "error",
          text1: "Erreur",
          text2: "Impossible de charger l'association.",
          visibilityTime: 5000,
          onPress: () => Toast.hide(),
        });
      });
    }
  }, [associationId, association]);

  // Garde : OWNER uniquement
  useEffect(() => {
    if (userRole !== null && userRole !== AssociationRole.OWNER) {
      Toast.show({
        type: "error",
        text1: "Accès non autorisé",
        text2: "Seul le propriétaire peut modifier les informations.",
        visibilityTime: 5000,
        onPress: () => Toast.hide(),
      });
      router.back();
    }
  }, [userRole]);

  // Garde : association validée uniquement
  useEffect(() => {
    if (!store.isLoading && store.association && store.association.status !== AssociationStatus.VALIDATED) {
      Toast.show({
        type: "info",
        text1: "Association non validée",
        text2: "La modification des informations est disponible une fois l'association validée.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
      router.back();
    }
  }, [store.isLoading, store.association]);

  const onSubmit = async (data: UpdateAssociationFormValues) => {
    if (!associationId) return;
    setIsSubmitting(true);

    try {
      // On n'envoie que les champs non vides (évite d'écraser avec des chaînes vides)
      const dto: Record<string, unknown> = {};
      if (data.name?.trim()) dto.name = data.name.trim();
      if (data.phone?.trim()) dto.phone = data.phone.trim();
      if (data.website?.trim()) dto.website = data.website.trim();
      if (data.description?.trim()) dto.description = data.description.trim();
      if (data.object?.trim()) dto.object = data.object.trim();
      if (data.address) dto.address = data.address;

      await store.updateAssociation(associationId, dto as any);

      Toast.show({
        type: "success",
        text1: "Association mise à jour",
        text2: "Vos modifications ont bien été enregistrées.",
        visibilityTime: 5000,
        onPress: () => Toast.hide(),
      });

      router.back();
    } catch (error: unknown) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      if (isAxiosError(error) && error.response) {
        const apiError = error.response.data;

        if (apiError?.errors?.properties) {
          const properties = apiError.errors.properties;
          const mapServerErrors = (obj: Record<string, unknown>, path = "") => {
            Object.keys(obj).forEach((key) => {
              const currentPath = path ? `${path}.${key}` : key;
              const field = obj[key] as Record<string, unknown>;
              if (
                Array.isArray(field.errors) &&
                (field.errors as unknown[]).length > 0
              ) {
                setError(currentPath as any, {
                  type: "server",
                  message: (field.errors as string[])[0],
                });
              }
              if (field.properties) {
                mapServerErrors(
                  field.properties as Record<string, unknown>,
                  currentPath,
                );
              }
            });
          };
          mapServerErrors(properties);
          return;
        }

        Toast.show({
          type: "error",
          text1: "Erreur",
          text2: apiError?.message || "Une erreur est survenue.",
          visibilityTime: 10000,
          onPress: () => Toast.hide(),
        });
        return;
      }

      Toast.show({
        type: "error",
        text1: "Erreur",
        text2:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chargement
  if (store.isLoading && !association) {
    return (
      <View className="items-center justify-center flex-1 bg-grey-50">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  if (!association) {
    return (
      <View className="items-center justify-center flex-1 px-6 bg-grey-50">
        <Text className="text-base font-medium text-center text-grey-600">
          Impossible de charger l'association.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Modifier l'association" }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 bg-grey-50"
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-2xl gap-6 px-4">

            {/* Bouton retour — web uniquement */}
            {Platform.OS === "web" && (
              <Button
                variant="secondary"
                onPress={() => router.back()}
                className="self-start"
              >
                ← Retour
              </Button>
            )}

            {/* Erreur globale */}
            {errors.root?.message && (
              <View className="p-3 border rounded-md bg-error-30 border-error-100">
                <Text className="text-sm font-medium text-center text-error-100">
                  {errors.root.message}
                </Text>
              </View>
            )}

            {/* Informations légales (lecture seule) */}
            {(association.siret || association.rna) && (
              <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
                <Text className="text-base font-bold text-grey-900">
                  Informations légales
                </Text>
                {association.siret && (
                  <View className="gap-1">
                    <Text className="text-xs font-semibold tracking-wide uppercase text-grey-500">
                      SIRET
                    </Text>
                    <Text className="font-mono text-sm text-grey-900">
                      {association.siret}
                    </Text>
                  </View>
                )}
                {association.rna && (
                  <View className="gap-1">
                    <Text className="text-xs font-semibold tracking-wide uppercase text-grey-500">
                      RNA
                    </Text>
                    <Text className="font-mono text-sm text-grey-900">
                      {association.rna}
                    </Text>
                  </View>
                )}
                <Text className="text-xs text-grey-400">
                  Ces informations ne sont pas modifiables ici.
                </Text>
              </View>
            )}

            {/* Informations générales */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">
                Informations générales
              </Text>

              <FormInput
                control={control}
                name="name"
                label="Nom de l'association"
                placeholder={association.name}
                required
              />

              <FormInput
                control={control}
                name="phone"
                label="Téléphone"
                placeholder="0606060606"
                keyboardType="phone-pad"
              />

              <FormInput
                control={control}
                name="website"
                label="Site web"
                placeholder="https://www.monassociation.fr"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            {/* Description et objet */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">
                Présentation
              </Text>

              <FormTextarea
                control={control}
                name="description"
                label="Description"
                placeholder="Décrivez votre association..."
                maxLength={1000}
                showCharacterCount
              />

              <FormTextarea
                control={control}
                name="object"
                label="Objet social"
                placeholder="L'objet statutaire de l'association..."
                maxLength={500}
                showCharacterCount
              />
            </View>

            {/* Adresse */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">
                Adresse du siège
              </Text>
              <Controller
                control={control}
                name="address"
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <AddressAutocomplete
                    label="Adresse"
                    value={value as any}
                    onSelect={(result) => {
                      if (result) {
                        onChange({
                          street: result.street,
                          postalCode: result.postcode,
                          city: result.city,
                          latitude: result.latitude,
                          longitude: result.longitude,
                        });
                      } else {
                        onChange(undefined);
                      }
                    }}
                    error={error}
                  />
                )}
              />
            </View>

            {/* Boutons actions */}
            <View className="flex-row gap-3">
              {Platform.OS === "web" && (
                <Button
                  variant="secondary"
                  onPress={() => router.back()}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Annuler
                </Button>
              )}
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                className="flex-1"
              >
                Sauvegarder les modifications
              </Button>
            </View>

            <View className="h-10" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
