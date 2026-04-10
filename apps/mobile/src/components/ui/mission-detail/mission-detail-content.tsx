import { View } from "react-native";
import { Text } from "../text/text";
import { TagBadge } from "../tag-badge/tag-badge";
import { MissionDetailContentProps } from "./mission-detail-content.types";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-grey-900 mb-3">{title}</Text>
      {children}
    </View>
  );
}

function ChipList({ items }: { items: { id: number; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => (
        <TagBadge key={item.id} label={item.label} variant="surface" size="md" />
      ))}
    </View>
  );
}

/**
 * Corps de la fiche mission.
 * Affiche : description complète, causes, compétences, publics visés,
 * conditions de participation.
 */
export function MissionDetailContent({
  description,
  causes,
  skills,
  publicTypes,
  volunteerTypes,
}: MissionDetailContentProps) {
  return (
    <View>
      {/* Description */}
      <Section title="Description">
        <Text className="text-sm leading-6 text-grey-700">{description}</Text>
      </Section>

      {/* Causes */}
      {causes.length > 0 && (
        <Section title="Causes soutenues">
          <ChipList items={causes} />
        </Section>
      )}

      {/* Compétences */}
      {skills.length > 0 && (
        <Section title="Compétences recherchées">
          <ChipList items={skills} />
        </Section>
      )}

      {/* Publics visés */}
      {publicTypes.length > 0 && (
        <Section title="Publics visés">
          <ChipList items={publicTypes} />
        </Section>
      )}

      {/* Conditions de participation */}
      {volunteerTypes.length > 0 && (
        <Section title="Conditions de participation">
          <ChipList items={volunteerTypes} />
        </Section>
      )}
    </View>
  );
}
