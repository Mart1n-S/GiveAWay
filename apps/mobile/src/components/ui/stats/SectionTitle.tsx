import { Text } from "../text/text";

interface SectionTitleProps {
  readonly title: string;
}

export function SectionTitle({ title }: SectionTitleProps) {
  return (
    <Text className="text-base font-bold text-grey-900 mb-3">{title}</Text>
  );
}
