import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import clsx from "clsx";
import type { ContactableMemberDto } from "@repo/shared";
import { Text } from "../text/text";
import { Button } from "../button/button";
import { colors } from "../theme/tokens";

export interface ContactMemberPickerModalProps {
  readonly visible: boolean;
  readonly associationName: string;
  readonly members: ContactableMemberDto[];
  readonly isLoading: boolean;
  readonly error?: string | null;
  /** ID du membre actuellement en cours de création de conv (loader sur la ligne). */
  readonly pendingUserId?: number | null;
  readonly onSelect: (userId: number) => void;
  readonly onClose: () => void;
}

const ROLE_LABEL: Record<ContactableMemberDto["role"], string> = {
  OWNER: "Responsable",
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
};

const ROLE_BADGE_STYLE: Record<ContactableMemberDto["role"], string> = {
  OWNER: "bg-primary-50 text-primary",
  ADMIN: "bg-blue-50 text-blue-700",
  EDITOR: "bg-grey-100 text-grey-700",
};

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
}

interface MemberRowProps {
  readonly member: ContactableMemberDto;
  readonly isPending: boolean;
  readonly onPress: () => void;
}

function MemberRow({ member, isPending, onPress }: MemberRowProps) {
  return (
    <Pressable
      testID={`contact-member-${member.userId}`}
      onPress={onPress}
      disabled={isPending}
      accessibilityRole="button"
      accessibilityLabel={`Envoyer un message à ${member.firstName} ${member.lastName}, ${ROLE_LABEL[member.role]}`}
      className={clsx(
        "flex-row items-center px-4 py-3 border-b border-grey-100",
        "web:cursor-pointer web:transition-colors",
        isPending ? "bg-grey-50" : "bg-white hover:bg-grey-50 active:bg-grey-100",
      )}
    >
      {/* Avatar */}
      <View className="w-12 h-12 rounded-full bg-grey-200 items-center justify-center mr-3 overflow-hidden">
        {member.profilePicture ? (
          <Image
            source={{ uri: member.profilePicture }}
            style={{ width: 48, height: 48 }}
          />
        ) : (
          <Text className="text-grey-700 font-bold text-base">
            {initialsOf(member.firstName, member.lastName)}
          </Text>
        )}
      </View>

      <View className="flex-1">
        <Text
          className="text-base font-semibold text-grey-900"
          numberOfLines={1}
        >
          {member.firstName} {member.lastName}
        </Text>
        <View className="flex-row items-center gap-2 mt-1">
          <View
            className={clsx(
              "px-2 py-0.5 rounded-full",
              ROLE_BADGE_STYLE[member.role].split(" ")[0],
            )}
          >
            <Text
              className={clsx(
                "text-xs font-semibold",
                ROLE_BADGE_STYLE[member.role].split(" ")[1],
              )}
            >
              {ROLE_LABEL[member.role]}
            </Text>
          </View>
        </View>
      </View>

      {isPending && (
        <ActivityIndicator color={colors.primary.default} className="ml-2" />
      )}
    </Pressable>
  );
}

/**
 * Modale "Contacter l'association" : affiche la liste des membres actifs
 * et permet à l'utilisateur de choisir le destinataire de sa première
 * conversation. Composant agnostique — l'appel API est délégué au parent
 * via `onSelect`.
 */
export function ContactMemberPickerModal({
  visible,
  associationName,
  members,
  isLoading,
  error,
  pendingUserId,
  onSelect,
  onClose,
}: ContactMemberPickerModalProps) {
  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <View className="py-12 items-center justify-center">
        <ActivityIndicator color={colors.primary.default} size="large" />
      </View>
    );
  } else if (error) {
    body = (
      <View className="py-8 px-4 items-center">
        <Text className="text-sm text-red-700 text-center">{error}</Text>
      </View>
    );
  } else if (members.length === 0) {
    body = (
      <View className="py-12 px-6 items-center gap-2">
        <Text className="text-sm font-semibold text-grey-700 text-center">
          Aucun membre disponible
        </Text>
        <Text className="text-xs text-grey-600 text-center leading-4">
          Cette association n'a pour l'instant aucun membre actif à qui
          envoyer un message.
        </Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        testID="contact-member-list"
        data={members}
        keyExtractor={(item) => String(item.userId)}
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            isPending={pendingUserId === item.userId}
            onPress={() => onSelect(item.userId)}
          />
        )}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      supportedOrientations={["portrait", "landscape"]}
    >
      <View
        className="items-center justify-center flex-1 p-4 bg-black/50"
        accessibilityViewIsModal
      >
        <View
          testID="contact-member-picker-modal"
          className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-xl max-h-[80%]"
          // @ts-ignore — `accessibilityRole="dialog"` est web-only
          accessibilityRole={Platform.OS === "web" ? "dialog" : "alert"}
          aria-modal
        >
          {/* Header */}
          <View className="px-5 py-4 border-b border-grey-200 bg-grey-50">
            <Text className="text-lg font-bold text-grey-900" numberOfLines={2}>
              Contacter {associationName}
            </Text>
            <Text className="text-xs text-grey-600 mt-1">
              Choisissez à qui envoyer votre message.
            </Text>
          </View>

          {/* Body */}
          <View className="flex-1">{body}</View>

          {/* Footer */}
          <View className="p-4 border-t border-grey-200 bg-grey-50">
            <Button
              testID="btn-cancel-contact-picker"
              variant="secondary"
              onPress={onClose}
              className="w-full"
            >
              Annuler
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
