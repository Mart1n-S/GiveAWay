import { UserAvailability } from "@repo/shared";

export interface ProfileAvailabilityProps {
  availability: UserAvailability | null | undefined;
  className?: string;
}
