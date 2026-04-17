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
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { isAxiosError } from "axios";
import { cssInterop } from "nativewind";
import { z } from "zod";

import {
  UpdateProfileSchema,
  UpdateProfileDto,
  AvailabilityFrequency,
  AvailabilityTime,
  AvailabilityType,
} from "@repo/shared";
import { FormInput, FormTextarea } from "@/components/form";
import {
  Button,
  AvatarButton,
  AddressAutocomplete,
  MultiSelectList,
  AvailabilityPicker,
  Text,
  colors,
} from "@/components/ui";
import { AvailabilityValue } from "@/components/ui/availability-picker/availability-picker.types";
import { ProfileService } from "@/services/profile.service";
import { useProfileStore } from "@/stores/profile.store";
import { useReferenceStore } from "@/stores/reference.store";

import AddIconSource from "@assets/icons/ic_add.svg";
import TrashIconSource from "@assets/icons/ic_trash.svg";
import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import { usePageTitle } from "@/hooks/usePageTitle";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const AddIcon = cssInterop(AddIconSource, iconConfig);
const TrashIcon = cssInterop(TrashIconSource, iconConfig);
const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);
const CameraPlaceholder = () => <Text className="text-4xl">📷</Text>;

// Types
type UpdateProfileFormInput = z.input<typeof UpdateProfileSchema>;

// Composant
export default function EditProfileScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const user = useProfileStore((state) => state.profile);
  const { skills, causes, fetchReferences } = useReferenceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>(
    user?.skills?.map((s) => s.id) ?? [],
  );
  const [selectedCauseIds, setSelectedCauseIds] = useState<number[]>(
    user?.causes?.map((c) => c.id) ?? [],
  );
  const [availability, setAvailability] = useState<Partial<AvailabilityValue>>({
    frequency: (user?.availability?.frequency as AvailabilityFrequency[]) ?? [],
    timeSlots: (user?.availability?.timeSlots as AvailabilityTime[]) ?? [],
    type: user?.availability?.type as AvailabilityType | undefined,
  });

  usePageTitle("Modifier mon profil");
  
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<UpdateProfileFormInput>({
    resolver: zodResolver(UpdateProfileSchema) as any,
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      age: user?.age ? String(user.age) : "",
      biography: user?.biography ?? "",
      profilePicture: user?.profilePicture ?? undefined,
      removeProfilePicture: false,
      skillIds: user?.skills?.map((s) => s.id) ?? [],
      causeIds: user?.causes?.map((c) => c.id) ?? [],
      availability: user?.availability ?? undefined,
      address: user?.address
        ? {
            street: user.address.street,
            postalCode: user.address.postalCode,
            city: user.address.city,
            latitude: user.address.latitude ?? undefined,
            longitude: user.address.longitude ?? undefined,
          }
        : undefined,
    },
  });

  const profilePicture = watch("profilePicture");

  useEffect(() => {
    setValue("skillIds", selectedSkillIds, { shouldValidate: true });
  }, [selectedSkillIds, setValue]);

  useEffect(() => {
    setValue("causeIds", selectedCauseIds, { shouldValidate: true });
  }, [selectedCauseIds, setValue]);

  useEffect(() => {
    setValue("availability", availability as any, { shouldValidate: true });
  }, [availability, setValue]);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  // Nettoie l'erreur root dès qu'un champ change
  useEffect(() => {
    const subscription = watch(() => {
      if (errors.root) clearErrors("root");
    });
    return () => subscription.unsubscribe();
  }, [watch, errors.root, clearErrors]);

  // Gestion image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      clearErrors("profilePicture");
      setValue("profilePicture", result.assets[0].uri, {
        shouldValidate: true,
      });
    }
  };

  const removeImage = () => {
    clearErrors("profilePicture");
    setValue("profilePicture", undefined, { shouldValidate: true });
  };

  // Soumission
  const onSubmit = async (data: UpdateProfileFormInput) => {
    setIsSubmitting(true);
    try {
      const dto = data as unknown as UpdateProfileDto;
      const newImageUri =
        profilePicture && profilePicture !== user?.profilePicture
          ? profilePicture
          : undefined;
      const shouldRemoveImage = !profilePicture && !!user?.profilePicture;

      await ProfileService.updateProfile(dto, newImageUri, shouldRemoveImage);

      Toast.show({
        type: "success",
        text1: "Profil mis à jour",
        text2: "Vos modifications ont bien été enregistrées.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });

      router.back();
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const apiError = error.response.data;
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });

        // 1. Erreur spécifique à l'image (si ton pipe renvoie 422)
        if (error.response.status === 422 && apiError.message) {
          setError("profilePicture", {
            type: "server",
            message: apiError.message,
          });
          return;
        }

        // 2. Mapping récursif des erreurs de validation
        if (apiError?.errors?.properties) {
          const properties = apiError.errors.properties;

          const mapServerErrors = (obj: any, path = "") => {
            Object.keys(obj).forEach((key) => {
              // Construit le chemin : "availability" -> "availability.frequency"
              const currentPath = path ? `${path}.${key}` : key;
              const field = obj[key];

              // Cas A : Erreur directe sur le champ (ex: type)
              if (field.errors && field.errors.length > 0) {
                setError(currentPath as any, {
                  type: "server",
                  message: field.errors[0],
                });
              }

              // Cas B : C'est un objet (ex: address, availability) -> on descend
              if (field.properties) {
                mapServerErrors(field.properties, currentPath);
              }

              // Cas C : C'veut dire que c'est un tableau (ex: frequency, skillIds)
              // On prend la première erreur trouvée dans les items
              if (field.items && Array.isArray(field.items)) {
                field.items.forEach((item: any) => {
                  if (item.errors && item.errors.length > 0) {
                    setError(currentPath as any, {
                      type: "server",
                      message: item.errors[0],
                    });
                  }
                });
              }
            });
          };

          mapServerErrors(properties);
          return;
        }

        // 3. Erreur générique (Toast)
        Toast.show({
          type: "error",
          text1: "Erreur",
          text2: apiError?.message || "Une erreur est survenue.",
          visibilityTime: 10000,
          onPress: () => Toast.hide(),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Garde si pas de profil
  if (!user) {
    return (
      <View className="items-center justify-center flex-1 bg-grey-50">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  // Rendu
  return (
    <>
      <Stack.Screen options={{ headerTitle: "Modifier le profil" }} />

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
                icon={
                  <ArrowLeftIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                }
              >
                Retour
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

            {/* Photo de profil */}
            <View className="items-center mb-8">
              <View className="relative">
                <AvatarButton
                  size="xl"
                  onPress={pickImage}
                  imageUrl={profilePicture ?? null}
                  initials={
                    !profilePicture
                      ? `${user.firstName[0]}${user.lastName[0]}`
                      : undefined
                  }
                  isGuest={!profilePicture}
                  guestIcon={<CameraPlaceholder />}
                  accessibilityLabel={
                    profilePicture ? "Modifier la photo" : "Ajouter une photo"
                  }
                  className="bg-grey-100 border-grey-200"
                />

                {/* GESTION DU BADGE (Plus / Poubelle) */}
                {!profilePicture ? (
                  <View className="absolute bottom-0 right-0 items-center justify-center w-6 h-6 border-2 border-white rounded-full pointer-events-none bg-primary">
                    <AddIcon className="w-4 h-4 text-white" />
                  </View>
                ) : (
                  <Button
                    onPress={removeImage}
                    variant="primary"
                    icon={<TrashIcon className="w-3 h-3 text-white" />}
                    className="!absolute !bottom-0 !right-0 !w-6 !h-6 !p-0 bg-red-600 active:bg-red-800 active:border-white hover:bg-red-700 hover:border-white border-2 border-white !rounded-full web:focus-visible:ring-1 web:focus-visible:ring-focus web:focus-visible:ring-offset-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Supprimer la photo"
                  />
                )}
              </View>

              {/* AFFICHAGE DE L'ERREUR OU DU TEXTE D'AIDE */}
              {errors.profilePicture ? (
                <Text className="mt-2 text-sm text-center text-error-100">
                  {errors.profilePicture.message as string}
                </Text>
              ) : (
                <Text className="mt-2 text-sm text-grey-500">
                  {profilePicture
                    ? "Modifier la photo"
                    : "Ajouter une photo (optionnel)"}
                </Text>
              )}
            </View>

            {/* Identité */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">
                Informations personnelles
              </Text>

              <View className="flex-col gap-4 md:flex-row">
                <View className="flex-1">
                  <FormInput
                    control={control}
                    name="firstName"
                    label="Prénom"
                    testID="input-firstName"
                    required
                  />
                </View>
                <View className="flex-1">
                  <FormInput
                    control={control}
                    name="lastName"
                    label="Nom"
                    required
                  />
                </View>
              </View>

              <FormInput
                control={control}
                name="age"
                label="Âge"
                keyboardType="numeric"
                required
              />

              <FormTextarea
                control={control}
                name="biography"
                label="Biographie"
                placeholder="Dites-nous en plus sur vous..."
                maxLength={1000}
                showCharacterCount
              />
            </View>

            {/* Adresse */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">Adresse</Text>
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
                    required
                  />
                )}
              />
            </View>

            {/* Disponibilités */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">
                Disponibilités
              </Text>
              <AvailabilityPicker
                value={availability}
                onChange={setAvailability}
                errors={errors.availability}
              />

              {errors.availability?.message && (
                <Text className="mt-2 text-sm text-error-100">
                  {errors.availability.message as string}
                </Text>
              )}
            </View>

            {/* Causes */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">Causes</Text>
              <MultiSelectList
                items={causes}
                selectedIds={selectedCauseIds}
                onChange={setSelectedCauseIds}
                variant="orange"
              />
              {errors.causeIds && (
                <Text className="text-sm text-error-100">
                  {errors.causeIds.message as string}
                </Text>
              )}
            </View>

            {/* Compétences */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">
                Compétences
              </Text>
              <MultiSelectList
                items={skills}
                selectedIds={selectedSkillIds}
                onChange={setSelectedSkillIds}
                variant="blue"
              />
              {errors.skillIds && (
                <Text className="text-sm text-error-100">
                  {errors.skillIds.message as string}
                </Text>
              )}
            </View>

            {/* Boutons actions */}
            <View className="gap-3">
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                className="w-full"
                testID="btn-save-profile"
              >
                Sauvegarder les modifications
              </Button>
              <Button
                variant="secondary"
                onPress={() => router.back()}
                disabled={isSubmitting}
                className="w-full"
              >
                Annuler
              </Button>
            </View>

            <View className="h-10" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
