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
import * as ImagePicker from "expo-image-picker";
import { cssInterop } from "nativewind";

import {
  UpdateAssociationSchema,
  UpdateAssociationFormValues,
  AssociationRole,
  AssociationStatus,
  type AssociationDocumentDto,
} from "@repo/shared";
import { FormInput, FormTextarea } from "@/components/form";
import {
  Button,
  AddressAutocomplete,
  AvatarButton,
  Text,
  colors,
} from "@/components/ui";
import { ConfirmModal } from "@/components/ui/confirm-modal/ConfirmModal";
import {
  MultipleDocumentsPicker,
  type ReactNativeFile,
} from "@/components/multiple-documents-picker/multiple-documents-picker";
import { useAssociationStore } from "@/stores/association.store";
import { useAuthStore } from "@/stores/auth.store";
import * as AssociationService from "@/services/association.service";
import { usePageTitle } from "@/hooks/usePageTitle";

import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import InfoIconSource from "@assets/icons/ic_info.svg";
import TrashIconSource from "@assets/icons/ic_trash.svg";
import AddIconSource from "@assets/icons/ic_add.svg";
import DownloadIconSource from "@assets/icons/ic_download.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);
const InfoIcon = cssInterop(InfoIconSource, iconConfig);
const TrashIcon = cssInterop(TrashIconSource, iconConfig);
const AddIcon = cssInterop(AddIconSource, iconConfig);
const DownloadIcon = cssInterop(DownloadIconSource, iconConfig);

const CameraPlaceholder = () => <Text className="text-4xl">🏢</Text>;

// ─── Helper ──────────────────────────────────────────────────────────────────

function SensitiveFieldHint() {
  return (
    <View className="flex-row items-center gap-1.5 mt-1">
      <InfoIcon className="w-3 h-3 text-orange-500 shrink-0" />
      <Text className="text-xs text-orange-600">
        Cette modification peut être vérifiée par un administrateur.
      </Text>
    </View>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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

  // ── État logo ──────────────────────────────────────────────────────────────
  const [logoUri, setLogoUri] = useState<string | null>(
    association?.logoUrl ?? null,
  );

  // ── État documents ─────────────────────────────────────────────────────────
  const [deletedDocIds, setDeletedDocIds] = useState<Set<number>>(new Set());
  const [docToDelete, setDocToDelete] =
    useState<AssociationDocumentDto | null>(null);
  const [newDocuments, setNewDocuments] = useState<ReactNativeFile[]>([]);

  const activeDocuments = (association?.documents ?? []).filter(
    (doc) => !deletedDocIds.has(doc.id),
  );

  // ── Formulaire ─────────────────────────────────────────────────────────────
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
    if (
      !store.isLoading &&
      store.association &&
      store.association.status !== AssociationStatus.VALIDATED
    ) {
      Toast.show({
        type: "info",
        text1: "Association non validée",
        text2:
          "La modification des informations est disponible une fois l'association validée.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
      router.back();
    }
  }, [store.isLoading, store.association]);

  // ── Gestion logo ───────────────────────────────────────────────────────────

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const removeLogo = () => setLogoUri(null);

  // ── Gestion documents ──────────────────────────────────────────────────────

  const handleConfirmDeleteDoc = () => {
    if (!docToDelete) return;
    setDeletedDocIds((prev) => new Set([...prev, docToDelete.id]));
    setDocToDelete(null);
  };

  const handleDownloadDoc = async (doc: AssociationDocumentDto) => {
    if (!associationId) return;
    const filename = doc.fileUrl.split("/").pop() || `document-${doc.id}`;
    try {
      await AssociationService.downloadDocument(associationId, doc.id, filename);
    } catch {
      Toast.show({
        type: "error",
        text1: "Téléchargement impossible",
        text2: "Une erreur est survenue lors du téléchargement.",
        visibilityTime: 5000,
        onPress: () => Toast.hide(),
      });
    }
  };

  // ── Soumission ─────────────────────────────────────────────────────────────

  const onSubmit = async (data: UpdateAssociationFormValues) => {
    if (!associationId) return;
    setIsSubmitting(true);

    try {
      const dto: Record<string, unknown> = {};

      if (data.name?.trim()) dto.name = data.name.trim();
      if (data.phone !== undefined) dto.phone = data.phone ?? "";
      if (data.website !== undefined) dto.website = data.website ?? "";
      if (data.description !== undefined)
        dto.description = data.description ?? "";
      if (data.object !== undefined) dto.object = data.object ?? "";
      if (data.address) dto.address = data.address;

      // Logo
      const logoChanged = logoUri !== association?.logoUrl;
      const hasNewLogo = logoChanged && !!logoUri; // nouveau fichier à uploader
      const deletedLogo = logoChanged && !logoUri; // logo supprimé
      if (deletedLogo) dto.logoUrl = ""; // signal de suppression

      // Documents existants : envoyer les URLs restantes si au moins un doc supprimé
      if (deletedDocIds.size > 0) {
        dto.documentUrls = activeDocuments.map((d) => d.fileUrl);
      }

      await store.updateAssociation(
        associationId,
        dto as any,
        hasNewLogo ? logoUri! : undefined,
        newDocuments.length > 0 ? newDocuments : undefined,
      );

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
          const mapServerErrors = (
            obj: Record<string, unknown>,
            path = "",
          ) => {
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
          mapServerErrors(apiError.errors.properties);
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

  // ── Chargement ─────────────────────────────────────────────────────────────

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

  // ── Rendu ──────────────────────────────────────────────────────────────────

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
                icon={
                  <ArrowLeftIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                }
              >
                Retour
              </Button>
            )}

            {/* Bulle d'information sensible */}
            <View className="flex-row items-start gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <InfoIcon className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
              <Text className="flex-1 text-sm leading-5 text-blue-700">
                Certaines informations sensibles peuvent faire l'objet d'une
                vérification par les équipes GiveAWay après modification.
              </Text>
            </View>

            {/* Erreur globale */}
            {errors.root?.message && (
              <View className="p-3 border rounded-md bg-error-30 border-error-100">
                <Text className="text-sm font-medium text-center text-error-100">
                  {errors.root.message}
                </Text>
              </View>
            )}

            {/* ── Logo ── */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">Logo</Text>

              <View className="items-center gap-3">
                <View className="relative">
                  <AvatarButton
                    size="xl"
                    onPress={pickLogo}
                    imageUrl={logoUri}
                    initials={association.name.substring(0, 2).toUpperCase()}
                    isGuest={!logoUri}
                    guestIcon={<CameraPlaceholder />}
                    accessibilityLabel={
                      logoUri ? "Modifier le logo" : "Ajouter un logo"
                    }
                    className="bg-grey-100 border-grey-200"
                  />

                  {!logoUri ? (
                    <View className="absolute bottom-0 right-0 items-center justify-center w-6 h-6 border-2 border-white rounded-full pointer-events-none bg-primary">
                      <AddIcon className="w-4 h-4 text-white" />
                    </View>
                  ) : (
                    <Button
                      onPress={removeLogo}
                      variant="primary"
                      icon={<TrashIcon className="w-3 h-3 text-white" />}
                      className="!absolute !bottom-0 !right-0 !w-6 !h-6 !p-0 bg-red-600 active:bg-red-800 active:border-white hover:bg-red-700 hover:border-white border-2 border-white !rounded-full web:focus-visible:ring-1 web:focus-visible:ring-focus web:focus-visible:ring-offset-1"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel="Supprimer le logo"
                    />
                  )}
                </View>

                <Text className="text-sm text-grey-500">
                  {logoUri ? "Appuyer pour modifier le logo" : "Ajouter un logo (optionnel)"}
                </Text>
              </View>
            </View>

            {/* ── Informations légales (readonly) ── */}
            {(association.siret || association.rna) && (
              <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
                <Text className="text-base font-bold text-grey-900">
                  Informations légales
                </Text>

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

                <View className="flex-row items-center gap-1.5">
                  <InfoIcon className="w-3 h-3 text-grey-400 shrink-0" />
                  <Text className="text-xs text-grey-400">
                    Ces informations ne sont pas modifiables ici.
                  </Text>
                </View>
              </View>
            )}

            {/* ── Informations générales ── */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">
                Informations générales
              </Text>

              <View>
                <FormInput
                  control={control}
                  name="name"
                  label="Nom de l'association"
                  required
                />
                <SensitiveFieldHint />
              </View>

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

            {/* ── Présentation ── */}
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

              <View>
                <FormTextarea
                  control={control}
                  name="object"
                  label="Objet social"
                  placeholder="L'objet statutaire de l'association..."
                  maxLength={500}
                  showCharacterCount
                />
                <SensitiveFieldHint />
              </View>
            </View>

            {/* ── Adresse du siège ── */}
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

            {/* ── Documents justificatifs ── */}
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">
                Documents justificatifs
              </Text>

              {activeDocuments.length === 0 ? (
                <Text className="text-sm text-grey-500">
                  Aucun document associé.
                </Text>
              ) : (
                <View className="gap-2">
                  {activeDocuments.map((doc) => {
                    const filename =
                      doc.fileUrl.split("/").pop() || doc.type;
                    const date = new Date(doc.createdAt).toLocaleDateString(
                      "fr-FR",
                      { day: "numeric", month: "short", year: "numeric" },
                    );
                    return (
                      <View
                        key={doc.id}
                        className="flex-row items-center gap-3 p-3 border border-grey-100 rounded-lg bg-grey-50"
                      >
                        <View className="flex-1 gap-0.5 min-w-0">
                          <Text
                            className="text-sm font-medium text-grey-900"
                            numberOfLines={1}
                            ellipsizeMode="middle"
                          >
                            {filename}
                          </Text>
                          <Text className="text-xs text-grey-500">
                            {doc.type} · {date}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-1 shrink-0">
                          {/* Télécharger */}
                          <Button
                            variant="tertiary"
                            onPress={() => handleDownloadDoc(doc)}
                            accessibilityLabel="Télécharger le document"
                            className="hover:bg-grey-100 active:bg-grey-200"
                            icon={
                              <DownloadIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                            }
                          />
                          {/* Supprimer */}
                          <Button
                            variant="tertiary"
                            onPress={() => setDocToDelete(doc)}
                            accessibilityLabel={`Supprimer le document ${doc.type}`}
                            className="hover:bg-red-50 active:bg-red-100"
                            icon={
                              <TrashIcon className="w-4 h-4 text-red-500 group-hover:text-red-700 group-active:text-red-800" />
                            }
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {deletedDocIds.size > 0 && (
                <View className="flex-row items-center gap-1.5 p-2 border border-orange-200 rounded-md bg-orange-50">
                  <InfoIcon className="w-3 h-3 text-orange-500 shrink-0" />
                  <Text className="text-xs text-orange-600">
                    {deletedDocIds.size} document
                    {deletedDocIds.size > 1 ? "s" : ""} sera
                    {deletedDocIds.size > 1 ? "ont" : ""} supprimé
                    {deletedDocIds.size > 1 ? "s" : ""} à la sauvegarde.
                  </Text>
                </View>
              )}

              <MultipleDocumentsPicker
                value={newDocuments}
                onChange={setNewDocuments}
                maxFiles={5}
                label="Ajouter de nouveaux documents"
                helperText="Formats acceptés : PDF, JPEG, PNG, WEBP. Ces fichiers seront ajoutés aux documents existants."
              />
            </View>

            {/* ── Boutons actions ── */}
            <View className="gap-3">
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                className="w-full"
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

      {/* Modal confirmation suppression document */}
      <ConfirmModal
        visible={!!docToDelete}
        title="Supprimer ce document ?"
        message={
          docToDelete
            ? `Êtes-vous sûr de vouloir supprimer ce document (${docToDelete.type}) ? Cette action sera appliquée à la sauvegarde.`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        onConfirm={handleConfirmDeleteDoc}
        onCancel={() => setDocToDelete(null)}
      />
    </>
  );
}
