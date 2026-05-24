import React from "react";
import { View } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Button } from "@/components/ui/button/button";
import type { MissionActionBarProps } from "./MissionActionBar.types";

import EditIconSource from "@assets/icons/ic_edit.svg";
import BoxIconSource from "@assets/icons/ic_box.svg";
import UnlockIconSource from "@assets/icons/ic_unlock.svg";
import TrashIconSource from "@assets/icons/ic_trash.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const EditIcon = cssInterop(EditIconSource, iconConfig);
const BoxIcon = cssInterop(BoxIconSource, iconConfig);
const UnlockIcon = cssInterop(UnlockIconSource, iconConfig);
const TrashIcon = cssInterop(TrashIconSource, iconConfig);

export function MissionActionBar({
  status,
  isLoading,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: MissionActionBarProps) {
  if (status === "DELETED") {
    return null;
  }

  if (status === "ARCHIVED") {
    return (
      <View className="flex-row gap-2 px-4 py-3 border-t border-grey-100 bg-white">
        <Button
          variant="secondary"
          onPress={onUnarchive}
          disabled={isLoading}
          className="flex-1"
          icon={
            <UnlockIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
          }
        >
          Désarchiver
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2 px-4 py-3 border-t border-grey-100 bg-white">
      <Button
        variant="secondary"
        onPress={onEdit}
        disabled={isLoading}
        className="flex-1 min-w-[120px]"
        icon={
          <EditIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
        }
      >
        Modifier
      </Button>
      <Button
        variant="secondary"
        onPress={onArchive}
        disabled={isLoading}
        className="flex-1 min-w-[120px]"
        icon={
          <BoxIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
        }
      >
        Archiver
      </Button>
      <Button
        onPress={onDelete}
        disabled={isLoading}
        className={clsx(
          "flex-1 min-w-[120px]",
          "bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800 active:border-red-800",
        )}
        icon={<TrashIcon className="w-4 h-4 text-white" />}
      >
        Supprimer
      </Button>
    </View>
  );
}
