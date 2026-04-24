import { View } from "react-native";
import { Text } from "../text/text";

interface KpiCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly color?: string;
}

export function KpiCard({ label, value, color }: KpiCardProps) {
  return (
    <View className="flex-1 items-center gap-1 p-4 bg-white border rounded-lg border-grey-100">
      <Text className="text-2xl font-bold" style={color ? { color } : undefined}>
        {value}
      </Text>
      <Text className="text-xs text-center text-grey-500">{label}</Text>
    </View>
  );
}
