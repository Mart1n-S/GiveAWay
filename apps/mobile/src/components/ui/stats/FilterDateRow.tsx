import { View } from "react-native";
import { Text } from "../text/text";
import { DateInput } from "../mission-filters/DateInput";

interface FilterDateRowProps {
  readonly startDate: string | undefined;
  readonly endDate: string | undefined;
  readonly onStartChange: (v: string | undefined) => void;
  readonly onEndChange: (v: string | undefined) => void;
}

export function FilterDateRow({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: FilterDateRowProps) {
  return (
    <View className="flex-row gap-3">
      <View className="flex-1 gap-1">
        <Text className="text-xs font-semibold text-grey-600">Du</Text>
        <View className="h-11 px-3 border border-grey-200 rounded-lg justify-center bg-white">
          <DateInput value={startDate} onChange={onStartChange} label="Date de début" />
        </View>
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-xs font-semibold text-grey-600">Au</Text>
        <View className="h-11 px-3 border border-grey-200 rounded-lg justify-center bg-white">
          <DateInput value={endDate} onChange={onEndChange} label="Date de fin" />
        </View>
      </View>
    </View>
  );
}
