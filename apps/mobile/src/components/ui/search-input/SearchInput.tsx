import { cssInterop } from "nativewind";
import { Input } from "../input/input";
import type { SearchInputProps } from "./SearchInput.types";

import SearchIconSource from "@assets/icons/ic_search.svg";
import CloseIconSource from "@assets/icons/ic_close.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const SearchIcon = cssInterop(SearchIconSource, iconConfig);
const CloseIcon = cssInterop(CloseIconSource, iconConfig);

export type { SearchInputProps };

/**
 * Champ de recherche réutilisable.
 * - Icône loupe à gauche (non cliquable)
 * - Icône croix à droite quand le champ est non vide (efface d'un tap)
 * - Délègue tout le style focus/hover/erreur au composant `Input`
 */
export function SearchInput({
  value,
  onChangeText,
  placeholder = "Rechercher…",
  containerClassName,
}: SearchInputProps) {
  const hasValue = value.length > 0;

  return (
    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      returnKeyType="search"
      autoCapitalize="none"
      autoCorrect={false}
      containerClassName={containerClassName}
      leftIcon={<SearchIcon className="w-5 h-5 text-grey-400" />}
      rightIcon={
        hasValue ? (
          <CloseIcon className="w-4 h-4 text-grey-400" />
        ) : undefined
      }
      onRightIconPress={hasValue ? () => onChangeText("") : undefined}
      accessibilityLabel="Effacer la recherche"
    />
  );
}
