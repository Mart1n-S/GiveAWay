import { Modal, Platform, ScrollView, View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { Button } from "../button/button";

export interface MatchInfoModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

interface AxisRow {
  label: string;
  max: number;
  description: string;
}

const AXES: AxisRow[] = [
  {
    label: "Causes en commun",
    max: 30,
    description:
      "Pourcentage des causes de la mission que vous soutenez aussi dans votre profil.",
  },
  {
    label: "Compétences en commun",
    max: 25,
    description:
      "Pourcentage des compétences requises par la mission que vous avez renseignées.",
  },
  {
    label: "Disponibilité compatible",
    max: 20,
    description:
      "Compatibilité entre votre mode (présentiel / distanciel / hybride) et vos créneaux (semaine, week-end, soir) avec ceux de la mission.",
  },
  {
    label: "Distance",
    max: 15,
    description:
      "Score plein si vous êtes à moins de 5 km de la mission ; nul au-delà de 50 km. Les missions à distance gagnent automatiquement le score plein.",
  },
  {
    label: "Historique",
    max: 10,
    description:
      "Bonus si vous avez déjà participé à une mission partageant au moins une cause ou une compétence.",
  },
];

const TOTAL_MAX = AXES.reduce((sum, a) => sum + a.max, 0);
const THRESHOLD = 40;

/**
 * Modal expliquant le calcul du score de matching, accessible depuis le
 * bouton "?" à côté du toggle "Pour moi". Structure inspirée de TermsModal :
 * un wrapper plein écran avec hauteur fixe (80%), header + ScrollView flex-1
 * + footer pour garantir le scroll sur mobile et grand écran.
 */
export function MatchInfoModal({ visible, onClose }: MatchInfoModalProps) {
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
          testID="match-info-modal"
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
                <Text className="text-amber-600 font-bold">★</Text>
              </View>
              <Text className="text-lg font-bold text-grey-900">
                Comment fonctionne le matching ?
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
              Quand vous activez « Pour moi », chaque mission obtient un score
              sur {TOTAL_MAX} points calculé à partir de votre profil. Une
              mission est mise en avant à partir de {THRESHOLD} points.
            </Text>

            <View className="gap-3">
              {AXES.map((axis) => (
                <View
                  key={axis.label}
                  className="bg-grey-50 rounded-lg p-3 border border-grey-100"
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-bold text-grey-900">
                      {axis.label}
                    </Text>
                    <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                      <Text className="text-xs font-bold text-amber-700">
                        jusqu'à {axis.max} pts
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-grey-600 leading-4">
                    {axis.description}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Text className="text-xs text-amber-900 leading-4">
                💡 Plus votre profil est complet (compétences, causes,
                disponibilités, adresse), plus le matching est pertinent.
              </Text>
            </View>
          </ScrollView>

          {/* --- FOOTER --- */}
          <View
            className={clsx(
              "p-4 border-t border-grey-200 bg-grey-50",
            )}
          >
            <Button
              testID="btn-close-match-info"
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
