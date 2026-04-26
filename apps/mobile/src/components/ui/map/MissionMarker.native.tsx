import type { MissionMapItem } from "@repo/shared";

export const TYPE_COLORS: Record<MissionMapItem["type"], string> = {
  MISSION: "#00805b",
  EVENT: "#096e9b",
  COLLECT: "#CC460F",
  INFO: "#5d5f70",
};
