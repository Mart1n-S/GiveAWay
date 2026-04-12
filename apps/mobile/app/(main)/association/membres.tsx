import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { cssInterop } from "nativewind";

import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import { AvatarButton } from "@/components/ui/avatar-button/avatar-button";
import { colors } from "@/components/ui/theme/tokens";
import { RoleBadge } from "@/components/ui/role-badge";
import { ConfirmModal } from "@/components/ui/confirm-modal/ConfirmModal";
import { AddMemberModal } from "@/components/ui/add-member-modal/AddMemberModal";

import { useAssociationStore } from "@/stores/association.store";
import { useAuthStore } from "@/stores/auth.store";
import { AssociationRole } from "@repo/shared";
import type { AssociationMemberDto, AddMemberDto } from "@repo/shared";
import { usePageTitle } from "@/hooks/usePageTitle";

import TrashIconSource from "@assets/icons/ic_trash.svg";
import EditIconSource from "@assets/icons/ic_edit.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const TrashIcon = cssInterop(TrashIconSource, iconConfig);
const EditIcon = cssInterop(EditIconSource, iconConfig);

// ─── Role Picker Modal ────────────────────────────────────────────────────────

interface RolePickerModalProps {
  visible: boolean;
  currentRole: AssociationRole;
  memberName: string;
  onSelect: (role: AssociationRole.ADMIN | AssociationRole.EDITOR) => void;
  onClose: () => void;
  loading?: boolean;
}

function RolePickerModal({
  visible,
  currentRole,
  memberName,
  onSelect,
  onClose,
  loading = false,
}: RolePickerModalProps) {
  const roles: Array<{
    value: AssociationRole.ADMIN | AssociationRole.EDITOR;
    label: string;
    description: string;
  }> = [
    {
      value: AssociationRole.ADMIN,
      label: "Administrateur",
      description: "Peut ajouter et retirer des éditeurs.",
    },
    {
      value: AssociationRole.EDITOR,
      label: "Éditeur",
      description: "Accès en lecture seule.",
    },
  ];

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
            <Text className="text-base font-bold text-grey-900">
              Modifier le rôle
            </Text>
            <Text className="text-sm text-grey-500 mt-0.5">{memberName}</Text>
          </View>

          <View className="gap-2 p-4">
            {roles.map((role) => (
              <Pressable
                key={role.value}
                onPress={() => !loading && onSelect(role.value)}
                disabled={loading}
                className="flex-row items-center gap-3 p-3 border rounded-lg web:cursor-pointer active:bg-grey-50"
                style={{
                  borderColor:
                    currentRole === role.value
                      ? colors.primary.default
                      : colors.grey[200],
                  backgroundColor:
                    currentRole === role.value ? "#FEF4F0" : "white",
                }}
              >
                <View
                  className="items-center justify-center w-4 h-4 border-2 rounded-full"
                  style={{
                    borderColor:
                      currentRole === role.value
                        ? colors.primary.default
                        : colors.grey[300],
                  }}
                >
                  {currentRole === role.value && (
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: colors.primary.default }}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-grey-900">
                    {role.label}
                  </Text>
                  <Text className="text-xs text-grey-500">
                    {role.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View className="px-4 pb-4">
            <Button variant="secondary" onPress={onClose} className="w-full">
              Annuler
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: AssociationMemberDto;
  currentUserId: number;
  userRole: AssociationRole;
  onRoleChange?: (
    memberId: number,
    role: AssociationRole.ADMIN | AssociationRole.EDITOR,
  ) => Promise<void>;
  onRemove?: (member: AssociationMemberDto) => void;
}

function MemberCard({
  member,
  currentUserId,
  userRole,
  onRoleChange,
  onRemove,
}: MemberCardProps) {
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const isSelf = member.userId === currentUserId;

  const canChangeRole =
    userRole === AssociationRole.OWNER &&
    !isSelf &&
    member.role !== AssociationRole.OWNER;

  const canRemove =
    !isSelf &&
    ((userRole === AssociationRole.OWNER && member.role !== AssociationRole.OWNER) ||
      (userRole === AssociationRole.ADMIN && member.role === AssociationRole.EDITOR));

  const handleRoleSelect = async (
    newRole: AssociationRole.ADMIN | AssociationRole.EDITOR,
  ) => {
    if (!onRoleChange || newRole === member.role) {
      setShowRolePicker(false);
      return;
    }
    setIsUpdatingRole(true);
    try {
      await onRoleChange(member.id, newRole);
      Toast.show({
        type: "success",
        text1: "Rôle mis à jour",
        text2: `${member.firstName} ${member.lastName} est maintenant ${newRole === AssociationRole.ADMIN ? "Administrateur" : "Éditeur"}.`,
        visibilityTime: 4000,
        onPress: () => Toast.hide(),
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2:
          error instanceof Error
            ? error.message
            : "Impossible de modifier le rôle.",
        visibilityTime: 5000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsUpdatingRole(false);
      setShowRolePicker(false);
    }
  };

  const joinedDate = new Date(member.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <View className="gap-3 p-4 bg-white border rounded-lg border-grey-100">
        {/* Identité */}
        <View className="flex-row items-center gap-3">
          <AvatarButton
            size="md"
            imageUrl={member.profilePicture}
            initials={`${member.firstName[0]}${member.lastName[0]}`}
            readonly
          />
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-grey-900">
              {member.firstName} {member.lastName}
              {isSelf && <Text className="text-xs text-grey-400"> (vous)</Text>}
            </Text>
            <Text className="text-xs text-grey-500">{member.email}</Text>
            <Text className="text-xs text-grey-400">Depuis {joinedDate}</Text>
          </View>
        </View>

        {/* Rôle + Actions */}
        <View className="flex-row items-center justify-between">
          {/* Rôle */}
          <RoleBadge role={member.role} />

          {/* Actions (alignées à droite) */}
          <View className="flex-row items-center gap-1">
            {canChangeRole && (
              <Button
                variant="tertiary"
                onPress={() => setShowRolePicker(true)}
                accessibilityLabel={`Modifier le rôle de ${member.firstName}`}
                className="hover:bg-grey-50 active:bg-grey-100"
                icon={
                  <EditIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                }
              />
            )}
            {canRemove && onRemove && (
              <Button
                variant="tertiary"
                onPress={() => onRemove(member)}
                accessibilityLabel={`Retirer ${member.firstName} ${member.lastName}`}
                className="hover:bg-red-50 active:bg-red-50"
                icon={
                  <TrashIcon className="w-4 h-4 text-red-500 group-hover:text-red-700 group-active:text-red-800" />
                }
              />
            )}
          </View>
        </View>
      </View>

      <RolePickerModal
        visible={showRolePicker}
        currentRole={member.role}
        memberName={`${member.firstName} ${member.lastName}`}
        onSelect={handleRoleSelect}
        onClose={() => setShowRolePicker(false)}
        loading={isUpdatingRole}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MembresScreen() {
  usePageTitle("Membres");
  const router = useRouter();

  const store = useAssociationStore();
  const user = useAuthStore((state) => state.user);

  const userAssociation = user?.associations?.[0] ?? null;
  const associationId = userAssociation?.associationId ?? null;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [memberToRemove, setMemberToRemove] =
    useState<AssociationMemberDto | null>(null);

  const { members, userRole, isLoading } = store;

  const loadMembers = useCallback(
    async (forceRefresh = false) => {
      if (!associationId) return;

      if (forceRefresh) {
        setIsRefreshing(true);
        store.clearAssociation();
      }

      try {
        await store.fetchAssociation(associationId);
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Erreur",
          text2:
            error instanceof Error
              ? error.message
              : "Impossible de charger les membres.",
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
    loadMembers();
  }, [loadMembers]);

  // Garde : OWNER ou ADMIN uniquement
  useEffect(() => {
    if (userRole === AssociationRole.EDITOR) {
      Toast.show({
        type: "error",
        text1: "Accès non autorisé",
        text2: "Seuls les administrateurs peuvent gérer les membres.",
        visibilityTime: 5000,
        onPress: () => Toast.hide(),
      });
      router.back();
    }
  }, [userRole]);

  const handleRoleChange = async (
    memberId: number,
    role: AssociationRole.ADMIN | AssociationRole.EDITOR,
  ) => {
    if (!associationId) return;
    await store.updateMemberRole(associationId, memberId, { role });
  };

  const handleAddMember = async (dto: AddMemberDto) => {
    if (!associationId) return;
    await store.addMember(associationId, dto);
    setShowAddModal(false);
    Toast.show({
      type: "success",
      text1: "Membre ajouté",
      text2: "Le membre a bien été ajouté à l'association.",
      visibilityTime: 4000,
      onPress: () => Toast.hide(),
    });
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove || !associationId) return;
    try {
      await store.removeMember(associationId, memberToRemove.id);
      Toast.show({
        type: "success",
        text1: "Membre retiré",
        text2: `${memberToRemove.firstName} ${memberToRemove.lastName} a été retiré de l'association.`,
        visibilityTime: 4000,
        onPress: () => Toast.hide(),
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2:
          error instanceof Error
            ? error.message
            : "Impossible de retirer le membre.",
        visibilityTime: 5000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setMemberToRemove(null);
    }
  };

  if (isLoading && !members) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: "Membres" }} />
        <View className="items-center justify-center flex-1 bg-grey-50">
          <ActivityIndicator size="large" color={colors.primary.default} />
        </View>
      </>
    );
  }

  const canAdd =
    userRole === AssociationRole.OWNER || userRole === AssociationRole.ADMIN;
  const currentUserId = user?.id ?? -1;

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Membres" }} />

      <ScrollView
        className="flex-1 bg-grey-50"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadMembers(true)}
            colors={[colors.primary.default]}
            tintColor={colors.primary.default}
          />
        }
      >
        <View className="w-full max-w-2xl gap-4 px-4 pt-4 mx-auto">

          {/* Header */}
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-grey-900">
              Membres ({members?.length ?? 0})
            </Text>
            {canAdd && (
              <Button
                onPress={() => setShowAddModal(true)}
                className="px-3"
              >
                + Ajouter
              </Button>
            )}
          </View>

          {/* Liste des membres */}
          {!members || members.length === 0 ? (
            <View className="items-center gap-2 py-12">
              <Text className="text-base font-medium text-grey-600">
                Aucun membre pour le moment.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  currentUserId={currentUserId}
                  userRole={userRole ?? AssociationRole.EDITOR}
                  onRoleChange={
                    userRole === AssociationRole.OWNER
                      ? handleRoleChange
                      : undefined
                  }
                  onRemove={
                    userRole === AssociationRole.OWNER ||
                    userRole === AssociationRole.ADMIN
                      ? setMemberToRemove
                      : undefined
                  }
                />
              ))}
            </View>
          )}

          {/* Info rôle */}
          {userRole === AssociationRole.ADMIN && (
            <View className="p-3 border border-blue-200 rounded-lg bg-blue-50">
              <Text className="text-xs leading-4 text-blue-700">
                En tant qu'Administrateur, vous pouvez ajouter des membres et
                retirer les Éditeurs.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal ajouter un membre */}
      <AddMemberModal
        visible={showAddModal}
        onAdd={handleAddMember}
        onClose={() => setShowAddModal(false)}
      />

      {/* Modal confirmation suppression */}
      <ConfirmModal
        visible={!!memberToRemove}
        title="Retirer ce membre ?"
        message={
          memberToRemove
            ? `Êtes-vous sûr de vouloir retirer ${memberToRemove.firstName} ${memberToRemove.lastName} de l'association ? Cette action est irréversible.`
            : ""
        }
        confirmLabel="Retirer"
        cancelLabel="Annuler"
        destructive
        onConfirm={handleConfirmRemove}
        onCancel={() => setMemberToRemove(null)}
      />
    </>
  );
}
