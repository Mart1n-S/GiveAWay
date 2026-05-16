import { Modal, Platform, ScrollView, View } from "react-native";
import { Text } from "../text/text";
import { Button } from "../button/button";

export interface MessagesInfoModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

interface Reason {
  readonly label: string;
  readonly description: string;
}

const REASONS: Reason[] = [
  {
    label: "L'utilisateur a supprimé son compte",
    description:
      "Quand un utilisateur supprime son compte (RGPD), toutes ses conversations sont supprimées pour respecter sa demande d'effacement. Vous ne pouvez plus accéder à l'historique.",
  },
  {
    label: "Le membre a quitté l'association",
    description:
      "Si la personne avec qui vous discutiez représentait une association et qu'elle quitte cette association (départ volontaire ou retrait par un administrateur), la conversation est supprimée.",
  },
  {
    label: "L'association a été supprimée",
    description:
      "Si l'association à laquelle votre interlocuteur appartenait a été refusée ou supprimée par l'équipe GiveAWay, les conversations liées sont retirées.",
  },
  {
    label: "Vous avez supprimé la conversation (à venir)",
    description:
      "Bientôt vous pourrez supprimer manuellement une conversation depuis votre liste. Elle disparaîtra uniquement de votre côté.",
  },
];

/**
 * Modal explicative accessible depuis le bouton "?" sur la liste des
 * conversations. Pattern inspiré de MatchInfoModal.
 */
export function MessagesInfoModal({ visible, onClose }: MessagesInfoModalProps) {
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
        accessibilityViewIsModal={true}
      >
        <View
          testID="messages-info-modal"
          className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-xl h-[80%]"
          // @ts-ignore — `accessibilityRole="dialog"` est web-only
          accessibilityRole={Platform.OS === "web" ? "dialog" : "alert"}
          aria-modal={true}
        >
          {/* --- HEADER --- */}
          <View
            className="px-5 py-4 border-b border-grey-200 bg-grey-50"
            accessibilityRole="header"
          >
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
                <Text className="text-amber-600 font-bold">?</Text>
              </View>
              <Text className="text-lg font-bold text-grey-900">
                Pourquoi une conversation peut disparaître ?
              </Text>
            </View>
          </View>

          {/* --- CONTENU SCROLLABLE --- */}
          <ScrollView
            className="flex-1 px-5 py-4"
            contentContainerStyle={{ paddingBottom: 16 }}
            overScrollMode="always"
            bounces={true}
          >
            <Text className="text-sm text-grey-600 mb-4 leading-5">
              Si une conversation que vous aviez démarrée n'apparaît plus dans
              votre liste, ou si vous obtenez une erreur en l'ouvrant, c'est
              probablement pour l'une de ces raisons :
            </Text>

            <View className="gap-3">
              {REASONS.map((reason) => (
                <View
                  key={reason.label}
                  className="bg-grey-50 rounded-lg p-3 border border-grey-100"
                >
                  <Text className="text-sm font-bold text-grey-900 mb-1">
                    {reason.label}
                  </Text>
                  <Text className="text-xs text-grey-600 leading-4">
                    {reason.description}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Text className="text-xs text-amber-900 leading-4">
                💡 Vous pourrez toujours recontacter l'association via sa fiche
                tant qu'elle reste active et qu'au moins un membre y est
                disponible.
              </Text>
            </View>
          </ScrollView>

          {/* --- FOOTER --- */}
          <View className="p-4 border-t border-grey-200 bg-grey-50">
            <Button
              testID="btn-close-messages-info"
              variant="primary"
              onPress={onClose}
              className="w-full"
            >
              J'ai compris
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
