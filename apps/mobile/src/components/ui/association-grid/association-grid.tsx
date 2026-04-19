import { Platform, View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { AssociationCard } from "../association-card/association-card";
import { AssociationGridProps } from "./association-grid.types";

const ITEM_CLASS =
  Platform.OS === "web"
    ? "w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
    : "w-[48%]";
const CONTAINER_GAP = Platform.OS === "web" ? "gap-4" : "gap-3";

export function AssociationGrid({
  associations,
  isLoading,
  onAssociationPress,
  className,
}: AssociationGridProps) {
  if (isLoading) {
    return (
      <View className={clsx("flex-row flex-wrap", CONTAINER_GAP, className)}>
        {(["sk-0", "sk-1", "sk-2", "sk-3", "sk-4", "sk-5"] as const).map((id) => (
          <View
            key={id}
            className={clsx("bg-grey-100 rounded-2xl h-44 animate-pulse", ITEM_CLASS)}
          />
        ))}
      </View>
    );
  }

  if (associations.length === 0) {
    return (
      <View className={clsx("items-center justify-center py-16", className)}>
        <Text className="mb-2 text-lg font-bold text-grey-900">
          Aucune association trouvée
        </Text>
        <Text className="text-sm text-center text-grey-600 max-w-sm">
          Essayez de modifier votre recherche ou de désactiver le filtre de localisation.
        </Text>
      </View>
    );
  }

  return (
    <View
      className={clsx("flex-row flex-wrap", CONTAINER_GAP, className)}
    >
      {associations.map((association) => (
        <View key={association.id} className={ITEM_CLASS}>
          <AssociationCard
            id={association.id}
            name={association.name}
            description={association.description}
            logoUrl={association.logoUrl}
            category={association.category}
            city={association.city}
            activeMissionsCount={association.activeMissionsCount}
            testID={`association-card-${association.id}`}
            onPress={
              onAssociationPress
                ? () => onAssociationPress(association.id)
                : undefined
            }
          />
        </View>
      ))}
    </View>
  );
}
