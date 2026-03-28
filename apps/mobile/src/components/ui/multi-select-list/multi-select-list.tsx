import { View, Pressable } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { MultiSelectListProps } from "./multi-select-list.types";
import CheckIconSource from "@assets/icons/ic_check_small.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const CheckIcon = cssInterop(CheckIconSource, iconConfig);

const variantConfig = {
  orange: {
    // Sélectionné
    selectedBg: "bg-badge-orange-bg",
    selectedText: "text-badge-orange-text",
    selectedBorder: "border-badge-orange-text",
    // Non sélectionné
    defaultBg: "bg-white",
    defaultText: "text-grey-700",
    defaultBorder: "border-grey-200",
    // Hover
    hoverBg: "hover:bg-badge-orange-bg hover:border-badge-orange-text",
    // Active
    activeBg: "active:bg-white-active active:border-primary",
  },
  blue: {
    // Sélectionné
    selectedBg: "bg-badge-blue-bg",
    selectedText: "text-badge-blue-text",
    selectedBorder: "border-badge-blue-text",
    // Non sélectionné
    defaultBg: "bg-white",
    defaultText: "text-grey-700",
    defaultBorder: "border-grey-200",
    // Hover
    hoverBg: "hover:bg-badge-blue-bg hover:border-badge-blue-text",
    // Active
    activeBg: "active:bg-blue-100 active:border-blue-400",
  },
};

/**
 * Liste de tags multi-sélectionnables.
 *
 * Chaque tag est cliquable — un clic le sélectionne ou le désélectionne.
 * Les tags sélectionnés affichent un fond coloré et une icône ✓.
 *
 * @example
 * <MultiSelectList
 *   items={skills}
 *   selectedIds={selectedSkillIds}
 *   onChange={setSelectedSkillIds}
 *   variant="blue"
 * />
 */
export function MultiSelectList({
  items,
  selectedIds,
  onChange,
  variant = "orange",
  className,
}: MultiSelectListProps) {
  const config = variantConfig[variant];

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <View className={clsx("flex-row flex-wrap gap-2", className)}>
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);

        return (
          <Pressable
            key={item.id}
            onPress={() => toggle(item.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={item.label}
            className={clsx(
              "flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all",
              "web:cursor-pointer web:outline-none",
              "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",

              isSelected
                ? [
                    config.selectedBg,
                    config.selectedBorder,
                    "active:opacity-80",
                  ]
                : [
                    config.defaultBg,
                    config.defaultBorder,
                    config.hoverBg,
                    config.activeBg,
                  ],
            )}
          >
            {/* Icône check - visible uniquement si sélectionné */}
            {isSelected && (
              <CheckIcon className={clsx("w-3.5 h-3.5", config.selectedText)} />
            )}

            <Text
              className={clsx(
                "text-xs font-semibold",
                isSelected ? config.selectedText : config.defaultText,
              )}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
