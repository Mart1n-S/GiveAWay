import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Modal,
  Linking,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import Toast from "react-native-toast-message";
import clsx from "clsx";
import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import { AvatarButton } from "@/components/ui/avatar-button/avatar-button";
import { TagBadge } from "@/components/ui/tag-badge/tag-badge";
import { colors } from "@/components/ui/theme/tokens";
import { AssociationMissionHistory } from "@/components/ui/association-mission-history/AssociationMissionHistory";
import GlobeIconSource from "@assets/icons/ic_globe.svg";
import PhoneIconSource from "@assets/icons/ic_phone.svg";
import InfoIconSource from "@assets/icons/ic_info.svg";
import DownloadIconSource from "@assets/icons/ic_download.svg";
import TrashIconSource from "@assets/icons/ic_trash.svg";

import { useAuthStore } from "@/stores/auth.store";
import { useAssociationStore } from "@/stores/association.store";
import { MissionService } from "@/services/mission.service";
import * as AssociationService from "@/services/association.service";
import { ConfirmModal } from "@/components/ui/confirm-modal/ConfirmModal";

import { AssociationRole, AssociationStatus } from "@repo/shared";
import type { AssociationMemberDto, MissionListItem } from "@repo/shared";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cssInterop } from "react-native-css-interop";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const GlobeIcon = cssInterop(GlobeIconSource, iconConfig);
const PhoneIcon = cssInterop(PhoneIconSource, iconConfig);
const InfoIcon = cssInterop(InfoIconSource, iconConfig);
const DownloadIcon = cssInterop(DownloadIconSource, iconConfig);
const TrashIcon = cssInterop(TrashIconSource, iconConfig);

const STATUS_CONFIG: Record<
  AssociationStatus,
  { label: string; variant: "orange" | "green" | "red" | "surface" }
> = {
  [AssociationStatus.PENDING]: {
    label: "En attente de validation",
    variant: "orange",
  },
  [AssociationStatus.VALIDATED]: { label: "Validée", variant: "green" },
  [AssociationStatus.REJECTED]: { label: "Rejetée", variant: "red" },
  [AssociationStatus.SUSPENDED]: { label: "Suspendue", variant: "surface" },
};

// ─── Delete Document Modal ────────────────────────────────────────────────────

interface DeleteDocModalProps {
  visible: boolean;
  filename: string;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteDocModal({
  visible,
  filename,
  isLoading,
  onClose,
  onConfirm,
}: DeleteDocModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <Pressable
        className="items-center justify-center flex-1 p-4 bg-black/50"
        onPress={onClose}
        accessibilityViewIsModal
      >
        <Pressable
          className="w-full max-w-sm overflow-hidden bg-white shadow-xl rounded-xl"
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
        >
          <View className="px-5 pt-5 pb-3 border-b border-grey-100">
            <Text className="text-lg font-bold text-grey-900">
              Supprimer le document
            </Text>
          </View>

          <View className="gap-4 px-5 py-4">
            <Text className="text-sm leading-5 text-grey-600">
              Voulez-vous vraiment supprimer{" "}
              <Text className="font-semibold text-grey-900">{filename}</Text>
              {" "}? Cette action est irréversible.
            </Text>
          </View>

          <View className="flex-row gap-3 px-5 pb-5">
            <Button
              variant="secondary"
              onPress={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onPress={onConfirm}
              loading={isLoading}
              className="flex-1 bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800 active:border-red-800"
            >
              Supprimer
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Transfer Owner Modal ─────────────────────────────────────────────────────

interface TransferOwnerModalProps {
  visible: boolean;
  members: AssociationMemberDto[];
  currentUserId: number;
  associationId: number;
  onClose: () => void;
  onSuccess: () => void;
  /** Affiche une bannière expliquant que le transfert est requis pour quitter */
  leaveMode?: boolean;
}

function TransferOwnerModal({
  visible,
  members,
  currentUserId,
  associationId,
  onClose,
  onSuccess,
  leaveMode = false,
}: TransferOwnerModalProps) {
  const eligibleMembers = members.filter((m) => m.userId !== currentUserId);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    eligibleMembers[0]?.userId ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleTransfer = async () => {
    if (!selectedUserId) return;
    setIsLoading(true);
    try {
      await AssociationService.transferOwner(associationId, {
        newOwnerUserId: selectedUserId,
      });
      useAssociationStore.getState().clearAssociation();
      onSuccess();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2:
          error instanceof Error
            ? error.message
            : "Impossible de transférer la propriété.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <Pressable
        className="items-center justify-center flex-1 p-4 bg-black/50"
        onPress={onClose}
        accessibilityViewIsModal
      >
        <Pressable
          className="w-full max-w-sm overflow-hidden bg-white shadow-xl rounded-xl"
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
        >
          <View className="px-5 pt-5 pb-3 border-b border-grey-100">
            <Text className="text-lg font-bold text-grey-900">
              Transférer la propriété
            </Text>
          </View>

          <View className="gap-4 px-5 py-4">
            {leaveMode && (
              <View className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                <Text className="text-sm leading-5 text-blue-700">
                  Pour quitter l'association, vous devez d'abord transférer la
                  propriété à un autre membre.
                </Text>
              </View>
            )}
            <View className="p-3 border border-red-200 rounded-lg bg-red-50">
              <Text className="text-sm leading-5 text-red-700">
                ⚠️ Cette action est irréversible. Vous perdrez le rôle
                Propriétaire et serez rétrogradé Administrateur.
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-grey-800">
                Choisir le nouveau propriétaire
              </Text>
              {eligibleMembers.length === 0 ? (
                <Text className="text-sm text-grey-500">
                  Aucun autre membre disponible.
                </Text>
              ) : (
                eligibleMembers.map((member) => (
                  <Pressable
                    key={member.id}
                    onPress={() => setSelectedUserId(member.userId)}
                    className="flex-row items-center gap-3 p-3 border rounded-lg web:cursor-pointer active:bg-grey-50"
                    style={{
                      borderColor:
                        selectedUserId === member.userId
                          ? colors.primary.default
                          : colors.grey[200],
                      backgroundColor:
                        selectedUserId === member.userId ? "#FEF4F0" : "white",
                    }}
                  >
                    <AvatarButton
                      size="sm"
                      imageUrl={member.profilePicture}
                      initials={`${member.firstName[0]}${member.lastName[0]}`}
                      readonly
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-grey-900">
                        {member.firstName} {member.lastName}
                      </Text>
                      <Text className="text-xs text-grey-500">
                        {member.email}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          <View className="flex-row gap-3 px-5 pb-5">
            <Button
              variant="secondary"
              onPress={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onPress={handleTransfer}
              loading={isLoading}
              disabled={!selectedUserId || eligibleMembers.length === 0}
              className={clsx(
                "flex-1",
                selectedUserId && eligibleMembers.length > 0
                  ? "bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800 active:border-red-800"
                  : undefined,
              )}
            >
              Transférer
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssociationScreen() {
  const router = useRouter();
  usePageTitle("Mon Association");

  const user = useAuthStore((state) => state.user);
  const store = useAssociationStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLeaveMode, setTransferLeaveMode] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeavingAssociation, setIsLeavingAssociation] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [objectExpanded, setObjectExpanded] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: number; fileUrl: string; filename: string } | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  const [recentMissions, setRecentMissions] = useState<MissionListItem[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsError, setMissionsError] = useState<string | null>(null);

  const userAssociation = user?.associations?.[0] ?? null;
  const associationId = userAssociation?.associationId ?? null;

  const loadRecentMissions = useCallback(async () => {
    if (!associationId) return;
    setMissionsLoading(true);
    setMissionsError(null);
    try {
      const result = await MissionService.getMissionsByAssociation(associationId, { page: 1, pageSize: 3 });
      setRecentMissions(result.missions.slice(0, 3));
    } catch {
      setMissionsError("Impossible de charger les missions.");
    } finally {
      setMissionsLoading(false);
    }
  }, [associationId]);

  useEffect(() => {
    loadRecentMissions();
  }, [loadRecentMissions]);

  const loadAssociation = useCallback(
    async (forceRefresh = false) => {
      if (!associationId) return;

      if (forceRefresh) {
        store.clearAssociation();
        setIsRefreshing(true);
      }

      try {
        await store.fetchAssociation(associationId);
      } catch (error) {
        if (!useAuthStore.getState().isAuthenticated) return;
        Toast.show({
          type: "error",
          text1: "Erreur",
          text2:
            error instanceof Error
              ? error.message
              : "Impossible de charger l'association.",
          visibilityTime: 5000,
          onPress: () => Toast.hide(),
        });
      } finally {
        setIsRefreshing(false);
      }
    },
    [associationId],
  );

  useEffect(() => {
    loadAssociation();
  }, [loadAssociation]);

  const handleTransferSuccess = async () => {
    setShowTransferModal(false);
    setTransferLeaveMode(false);

    // Mettre à jour le rôle dans AuthStore (OWNER → ADMIN)
    if (user && user.associations && associationId) {
      const updatedAssociations = user.associations.map((a) =>
        a.associationId === associationId
          ? { ...a, role: AssociationRole.ADMIN }
          : a,
      );
      useAuthStore.getState().setUser({ ...user, associations: updatedAssociations });
    }

    // Rafraîchir le store association : userRole passera à ADMIN
    store.clearAssociation();
    if (associationId) {
      await store.fetchAssociation(associationId);
    }

    Toast.show({
      type: "success",
      text1: "Propriété transférée",
      text2: "Vous êtes maintenant Administrateur. Vous pouvez maintenant quitter l'association si vous le souhaitez.",
      visibilityTime: 10000,
      onPress: () => Toast.hide(),
    });
  };

  // ── Empty state : pas d'association
  if (!associationId) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="items-center justify-center flex-1 gap-4 px-6 bg-grey-50">
          <Text className="text-2xl font-bold text-center text-grey-900">
            Aucune association
          </Text>
          <Text className="text-base leading-6 text-center text-grey-500">
            Vous n'êtes membre d'aucune association pour le moment.
          </Text>
        </View>
      </>
    );
  }

  // ── Chargement initial
  if (store.isLoading && !store.association) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="items-center justify-center flex-1 bg-grey-50">
          <ActivityIndicator size="large" color={colors.primary.default} />
        </View>
      </>
    );
  }

  // ── Erreur : pas de données
  if (!store.association) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="items-center justify-center flex-1 gap-4 px-6 bg-grey-50">
          <Text className="text-base font-medium text-center text-grey-600">
            Impossible de charger votre association.
          </Text>
          <Button variant="secondary" onPress={() => loadAssociation(true)}>
            Réessayer
          </Button>
        </View>
      </>
    );
  }

  const { association, userRole, members } = store;
  const statusConfig = STATUS_CONFIG[association.status];

  const isOwner = userRole === AssociationRole.OWNER;
  const isAdmin = userRole === AssociationRole.ADMIN;
  const isEditor = userRole === AssociationRole.EDITOR;
  const memberCount = members?.length ?? association.members.length;
  const isValidated = association.status === AssociationStatus.VALIDATED;

  const handleDownloadDoc = async (docId: number, fileUrl: string) => {
    if (!associationId) return;
    const filename = fileUrl.split("/").pop() || `document-${docId}`;
    setDownloadingDocId(docId);
    try {
      await AssociationService.downloadDocument(associationId, docId, filename);
    } catch {
      Toast.show({
        type: "error",
        text1: "Téléchargement impossible",
        text2: "Une erreur est survenue lors du téléchargement.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete || !associationId || !association) return;
    setIsDeletingDoc(true);
    try {
      await AssociationService.deleteDocument(
        associationId,
        docToDelete.id,
        association.documents ?? [],
      );
      store.clearAssociation();
      await store.fetchAssociation(associationId);
      setDocToDelete(null);
      Toast.show({
        type: "success",
        text1: "Document supprimé",
        text2: "Le document a été supprimé avec succès.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer le document.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const handleLeaveAssociation = async () => {
    if (!associationId) return;
    setIsLeavingAssociation(true);
    try {
      await AssociationService.leaveAssociation(associationId);
      store.clearAssociation();
      if (user) {
        useAuthStore.getState().setUser({
          ...user,
          associations: (user.associations ?? []).filter(
            (a) => a.associationId !== associationId,
          ),
        });
      }
      setShowLeaveModal(false);
      Toast.show({
        type: "success",
        text1: "Association quittée",
        text2: "Vous avez quitté l'association avec succès.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
      router.replace("/");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2:
          error instanceof Error
            ? error.message
            : "Impossible de quitter l'association.",
        visibilityTime: 10000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsLeavingAssociation(false);
    }
  };

  const handleLockedAction = () => {
    Toast.show({
      type: "info",
      text1: "Association non validée",
      text2: "Ces actions seront disponibles une fois votre association validée par notre équipe.",
      visibilityTime: 10000,
      onPress: () => Toast.hide(),
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        className="flex-1 bg-grey-50"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadAssociation(true)}
            colors={[colors.primary.default]}
            tintColor={colors.primary.default}
          />
        }
      >
        <View className="w-full max-w-2xl gap-6 px-4 pt-4 mx-auto">
          {/* ── Section 1 : Header ── */}
          <View className="items-center gap-3 p-5 bg-white border rounded-lg border-grey-100">
            <AvatarButton
              size="xl"
              imageUrl={association.logoUrl}
              initials={association.name.substring(0, 2).toUpperCase()}
              readonly
              accessibilityLabel={`Logo de ${association.name}`}
            />

            <View className="items-center gap-1.5">
              <Text className="text-xl font-bold text-center text-grey-900">
                {association.name}
              </Text>

              <TagBadge
                label={statusConfig.label}
                variant={statusConfig.variant}
                size="sm"
              />

              {association.address && (
                <Text className="text-sm text-center text-grey-500">
                  {association.address.city}
                  {association.address.postalCode
                    ? ` (${association.address.postalCode.substring(0, 2)})`
                    : ""}
                </Text>
              )}
            </View>
          </View>

          {/* ── Section 2 : Infos rapides ── */}
          <View className="flex-col overflow-hidden bg-white border rounded-lg border-grey-100 divide-y divide-grey-100 lg:flex-row lg:divide-y-0 lg:divide-x">
            {/* Nombre de membres */}
            <View className="items-center flex-1 gap-1 py-4">
              <Text className="text-2xl font-bold text-grey-900">
                {memberCount}
              </Text>
              <Text className="text-xs text-grey-500">
                {memberCount > 1 ? "Membres" : "Membre"}
              </Text>
            </View>

            {/* Téléphone (si disponible) */}
            {association.phone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${association.phone}`)}
                className="items-center flex-1 gap-1 py-4 web:cursor-pointer active:bg-grey-50"
                accessibilityRole="link"
                accessibilityLabel="Appeler l'association"
              >
                <View className="flex-row items-center gap-2 mb-3">
                  <PhoneIcon className="w-4 h-4 text-primary" />
                  <Text className="text-xs font-semibold text-primary">
                    Téléphone
                  </Text>
                </View>
                <Text
                  className="px-2 text-xs text-center text-grey-600"
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {association.phone}
                </Text>
              </Pressable>
            )}

            {/* Site web (si disponible) */}
            {association.website && (
              <Pressable
                onPress={() => Linking.openURL(association.website!)}
                className="items-center flex-1 gap-1 py-4 web:cursor-pointer active:bg-grey-50"
                accessibilityRole="link"
                accessibilityLabel="Visiter le site web"
              >
                <View className="flex-row items-center gap-2 mb-3">
                  {/* GlobeIcon doit être un composant React Native valide (ex: SVG ou wrapper natif) */}
                  <GlobeIcon className="w-4 h-4 text-primary" />
                  <Text className="text-xs font-semibold text-primary">
                    Site web
                  </Text>
                </View>
                <Text
                  className="px-2 text-xs text-center text-grey-600"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {association.website.replace(/(https?:\/\/[^\/\s]+).*/, "$1")}
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── Section 3 : Description ── */}
          {(association.description || association.object) && (
            <View className="gap-4 p-5 bg-white border rounded-lg border-grey-100">
              {association.description && (
                <View className="gap-2">
                  <Text className="text-base font-bold text-grey-900">
                    Description
                  </Text>
                  <Text
                    className="text-sm leading-5 text-grey-600"
                    numberOfLines={descriptionExpanded ? undefined : 3}
                  >
                    {association.description}
                  </Text>
                  {association.description.length > 150 && (
                    <Pressable
                      onPress={() => setDescriptionExpanded((prev) => !prev)}
                      className="web:cursor-pointer"
                    >
                      <Text className="text-sm font-semibold text-primary">
                        {descriptionExpanded ? "Voir moins" : "Voir plus"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              {association.object && (
                <View className="gap-2">
                  <Text className="text-base font-bold text-grey-900">
                    Objet social
                  </Text>
                  <Text
                    className="text-sm leading-5 text-grey-600"
                    numberOfLines={objectExpanded ? undefined : 3}
                  >
                    {association.object}
                  </Text>
                  {association.object.length > 150 && (
                    <Pressable
                      onPress={() => setObjectExpanded((prev) => !prev)}
                      className="web:cursor-pointer"
                    >
                      <Text className="text-sm font-semibold text-primary">
                        {objectExpanded ? "Voir moins" : "Voir plus"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ── Section 3b : Documents justificatifs (OWNER uniquement) ── */}
          {isOwner && association.documents && association.documents.length > 0 && (
            <View className="gap-3 p-5 bg-white border rounded-lg border-grey-100">
              <Text className="text-base font-bold text-grey-900">
                Documents justificatifs
              </Text>
              <View className="gap-2">
                {association.documents.map((doc) => {
                  const filename = doc.fileUrl.split("/").pop() || doc.type;
                  const date = new Date(doc.createdAt).toLocaleDateString(
                    "fr-FR",
                    { day: "numeric", month: "short", year: "numeric" },
                  );
                  const isDownloading = downloadingDocId === doc.id;
                  return (
                    <View
                      key={doc.id}
                      className="flex-row items-center gap-3 p-3 border rounded-lg border-grey-100 bg-grey-50"
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
                      <Button
                        variant="tertiary"
                        onPress={() => handleDownloadDoc(doc.id, doc.fileUrl)}
                        disabled={isDownloading}
                        loading={isDownloading}
                        accessibilityLabel={`Télécharger ${doc.type}`}
                        className="hover:bg-grey-100 active:bg-grey-200 shrink-0"
                        icon={
                          !isDownloading ? (
                            <DownloadIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                          ) : undefined
                        }
                      />
                      <Button
                        variant="tertiary"
                        onPress={() =>
                          setDocToDelete({
                            id: doc.id,
                            fileUrl: doc.fileUrl,
                            filename,
                          })
                        }
                        disabled={isDownloading}
                        accessibilityLabel={`Supprimer ${doc.type}`}
                        className="hover:bg-red-50 active:bg-red-100 shrink-0"
                        icon={
                          <TrashIcon className="w-4 h-4 text-red-500 group-hover:text-red-600 group-active:text-red-700" />
                        }
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Section 4 : Actions ── */}
          {(isOwner || isAdmin) && (
            <View className="gap-3">
              {/* Bannière d'information si l'association n'est pas encore validée */}
              {!isValidated && (
                <View className="flex-row items-start gap-2.5 p-3 border border-orange-200 rounded-lg bg-orange-50">
                  <InfoIcon className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <Text className="flex-1 text-sm leading-5 text-orange-700">
                    Ces actions seront disponibles une fois votre association validée par notre équipe.
                  </Text>
                </View>
              )}

              {isOwner && (
                <Button
                  onPress={
                    isValidated
                      ? () => router.push("/association/modifier" as any)
                      : handleLockedAction
                  }
                  disabled={!isValidated}
                  icon={
                    !isValidated ? (
                      <InfoIcon className="w-4 h-4 text-grey-disabledText" />
                    ) : undefined
                  }
                  className="w-full"
                >
                  Modifier les informations
                </Button>
              )}

              {(isOwner || isAdmin) && (
                <Button
                  variant="secondary"
                  onPress={
                    isValidated
                      ? () => router.push("/association/membres" as any)
                      : handleLockedAction
                  }
                  disabled={!isValidated}
                  icon={
                    !isValidated ? (
                      <InfoIcon className="w-4 h-4 text-grey-disabledText" />
                    ) : undefined
                  }
                  className="w-full"
                >
                  Gérer les membres
                </Button>
              )}

              {isOwner && (
                <Pressable
                  onPress={
                    isValidated ? () => setShowTransferModal(true) : handleLockedAction
                  }
                  accessibilityRole="button"
                  className={clsx(
                    "h-control w-full rounded-md flex-row items-center justify-center gap-2 transition-all mt-8",
                    "border border-transparent",
                    isValidated
                      ? "hover:bg-red-50 active:bg-red-200"
                      : "opacity-40 web:cursor-not-allowed",
                    "web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-red-500 web:focus-visible:ring-offset-2",
                  )}
                >
                  {({ pressed }) => (
                    <>
                      {!isValidated && (
                        <InfoIcon className="w-4 h-4 text-red-400" />
                      )}
                      <Text
                        className="text-sm font-bold text-red-600"
                        style={{
                          color: pressed && isValidated ? colors.red[900] : colors.red[600],
                        }}
                      >
                        Transférer la propriété
                      </Text>
                    </>
                  )}
                </Pressable>
              )}

              {/* Quitter l'association — OWNER doit transférer d'abord */}
              {isOwner && (
                <Pressable
                  onPress={() => {
                    setTransferLeaveMode(true);
                    setShowTransferModal(true);
                  }}
                  accessibilityRole="button"
                  className="flex-row items-center justify-center w-full gap-2 transition-all border border-transparent rounded-md h-control hover:bg-red-50 active:bg-red-200 web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-red-500 web:focus-visible:ring-offset-2"
                >
                  {({ pressed }) => (
                    <Text
                      className="text-sm font-bold text-red-600"
                      style={{ color: pressed ? colors.red[900] : colors.red[600] }}
                    >
                      Quitter l'association
                    </Text>
                  )}
                </Pressable>
              )}

              {/* Quitter l'association — ADMIN */}
              {isAdmin && (
                <Pressable
                  onPress={() => setShowLeaveModal(true)}
                  accessibilityRole="button"
                  className="flex-row items-center justify-center w-full gap-2 mt-8 transition-all border border-transparent rounded-md h-control hover:bg-red-50 active:bg-red-200 web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-red-500 web:focus-visible:ring-offset-2"
                >
                  {({ pressed }) => (
                    <Text
                      className="text-sm font-bold text-red-600"
                      style={{ color: pressed ? colors.red[900] : colors.red[600] }}
                    >
                      Quitter l'association
                    </Text>
                  )}
                </Pressable>
              )}

              {/* Bulle info suppression de l'association — OWNER uniquement */}
              {isOwner && (
                <View className="flex-row items-start gap-2.5 p-3 border border-grey-200 rounded-lg bg-grey-50 mt-2">
                  <InfoIcon className="w-4 h-4 text-grey-500 mt-0.5 shrink-0" />
                  <Text className="flex-1 text-sm leading-5 text-grey-600">
                    Pour supprimer définitivement l'association, contactez
                    l'équipe GiveAWay à{" "}
                    <Text
                      className="font-semibold text-primary web:cursor-pointer"
                      onPress={() =>
                        Linking.openURL(
                          `mailto:${process.env.EXPO_PUBLIC_CONTACT_ADMIN_GIVEAWAY ?? "contact-giveaway@gmail.com"}`,
                        )
                      }
                    >
                      {process.env.EXPO_PUBLIC_CONTACT_ADMIN_GIVEAWAY ?? "contact-giveaway@gmail.com"}
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Section 4b : Actions EDITOR ── */}
          {isEditor && (
            <View className="gap-3">
              {!isValidated && (
                <View className="flex-row items-start gap-2.5 p-3 border border-orange-200 rounded-lg bg-orange-50">
                  <InfoIcon className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <Text className="flex-1 text-sm leading-5 text-orange-700">
                    Ces actions seront disponibles une fois votre association validée par notre équipe.
                  </Text>
                </View>
              )}
              <Button
                variant="secondary"
                onPress={
                  isValidated
                    ? () => router.push("/association/membres" as any)
                    : handleLockedAction
                }
                disabled={!isValidated}
                icon={
                  !isValidated ? (
                    <InfoIcon className="w-4 h-4 text-grey-disabledText" />
                  ) : undefined
                }
                className="w-full"
              >
                Voir les membres
              </Button>

              {/* Quitter l'association — EDITOR */}
              <Pressable
                onPress={() => setShowLeaveModal(true)}
                accessibilityRole="button"
                className="flex-row items-center justify-center w-full gap-2 mt-8 transition-all border border-transparent rounded-md h-control hover:bg-red-50 active:bg-red-200 web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-red-500 web:focus-visible:ring-offset-2"
              >
                {({ pressed }) => (
                  <Text
                    className="text-sm font-bold text-red-600"
                    style={{ color: pressed ? colors.red[900] : colors.red[600] }}
                  >
                    Quitter l'association
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* ── Section 5 : Missions récentes ── */}
          <AssociationMissionHistory
            missions={recentMissions}
            loading={missionsLoading}
            error={missionsError}
            onRetry={loadRecentMissions}
            onViewAll={() => {
              Toast.show({
                type: "info",
                text1: "Bientôt disponible",
                text2: "La gestion des missions arrive prochainement.",
                visibilityTime: 3000,
                onPress: () => Toast.hide(),
              });
            }}
          />
        </View>
      </ScrollView>

      {/* Modal suppression de document */}
      {isOwner && (
        <DeleteDocModal
          visible={!!docToDelete}
          filename={docToDelete?.filename ?? ""}
          isLoading={isDeletingDoc}
          onClose={() => setDocToDelete(null)}
          onConfirm={handleConfirmDeleteDoc}
        />
      )}

      {/* Modal quitter l'association (ADMIN / EDITOR) */}
      <ConfirmModal
        visible={showLeaveModal}
        title="Quitter l'association ?"
        message="Êtes-vous sûr de vouloir quitter cette association ? Vous perdrez votre accès et ne pourrez rejoindre qu'une seule association à la fois."
        confirmLabel="Quitter"
        cancelLabel="Annuler"
        destructive
        loading={isLeavingAssociation}
        onConfirm={handleLeaveAssociation}
        onCancel={() => setShowLeaveModal(false)}
      />

      {/* Modal transfert de propriété */}
      {isOwner && members && (
        <TransferOwnerModal
          visible={showTransferModal}
          members={members}
          currentUserId={user?.id ?? -1}
          associationId={associationId}
          onClose={() => { setShowTransferModal(false); setTransferLeaveMode(false); }}
          onSuccess={handleTransferSuccess}
          leaveMode={transferLeaveMode}
        />
      )}
    </>
  );
}
