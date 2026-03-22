import {
  AvailabilityFrequency,
  AvailabilityTime,
  AvailabilityType,
} from "../profile/availability.enums";

export interface UserAvailability {
  frequency: AvailabilityFrequency;
  timeSlot: AvailabilityTime;
  type: AvailabilityType;
}
