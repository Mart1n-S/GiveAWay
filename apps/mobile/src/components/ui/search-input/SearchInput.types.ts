export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Classes NativeWind sur le conteneur global (label + input + helper) */
  containerClassName?: string;
}
