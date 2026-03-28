import {
  AvailabilityFrequency,
  AvailabilityTime,
  AvailabilityType,
} from "@repo/shared";

export interface AvailabilityValue {
  frequency: AvailabilityFrequency[];
  timeSlots: AvailabilityTime[];
  type: AvailabilityType;
}

export interface AvailabilityPickerProps {
  value: Partial<AvailabilityValue>;
  onChange: (value: Partial<AvailabilityValue>) => void;
  errors?: any;
  className?: string;
}
