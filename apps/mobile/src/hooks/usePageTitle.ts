import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

export function usePageTitle(title: string) {
  useFocusEffect(
    useCallback(() => {
      if (typeof document !== "undefined") {
        document.title = title;
      }
    }, [title]),
  );
}
