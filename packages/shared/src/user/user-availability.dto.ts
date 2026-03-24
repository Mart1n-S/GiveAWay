import {
  AvailabilityFrequency,
  AvailabilityTime,
  AvailabilityType,
} from "../profile/availability.enums";

export interface UserAvailability {
  frequency: AvailabilityFrequency[];
  timeSlots: AvailabilityTime[];
  type: AvailabilityType;
}
