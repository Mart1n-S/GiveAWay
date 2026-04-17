import { View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { TagBadge } from "../tag-badge/tag-badge";
import { ProfileCausesSkillsProps } from "./profile-causes-skills.types";

/**
 * Section causes & compétences du profil bénévole.
 *
 * Affiche :
 * - Les causes de l'utilisateur en badges orange
 * - Les compétences de l'utilisateur en badges gris neutres
 *
 * Si l'une des deux listes est vide, un message d'invitation est affiché.
 *
 * @example
 * <ProfileCausesSkills user={user} />
 */
export function ProfileCausesSkills({
  user,
  className,
}: ProfileCausesSkillsProps) {
  const hasCauses = user.causes && user.causes.length > 0;
  const hasSkills = user.skills && user.skills.length > 0;

  return (
    <View className={clsx("gap-6", className)}>
      {/* Causes */}
      <View className="gap-3">
        <Text className="text-sm font-bold tracking-widest uppercase text-grey-900">
          Causes
        </Text>
        {hasCauses ? (
          <View className="flex-row flex-wrap gap-2">
            {user.causes!.map((cause) => (
              <TagBadge
                key={cause.id}
                label={cause.label}
                variant="orange"
              />
            ))}
          </View>
        ) : (
          <Text className="text-sm text-grey-600">
            Aucune cause renseignée.
          </Text>
        )}
      </View>

      {/* Compétences */}
      <View className="gap-3">
        <Text className="text-sm font-bold tracking-widest uppercase text-grey-900">
          Compétences
        </Text>
        {hasSkills ? (
          <View className="flex-row flex-wrap gap-2">
            {user.skills!.map((skill) => (
              <TagBadge
                key={skill.id}
                label={skill.label}
                variant="blue"
              />
            ))}
          </View>
        ) : (
          <Text className="text-sm text-grey-600">
            Aucune compétence renseignée.
          </Text>
        )}
      </View>
    </View>
  );
}