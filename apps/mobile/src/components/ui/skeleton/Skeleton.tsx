import { useRef, useEffect } from "react";
import { Animated } from "react-native";
import clsx from "clsx";

export function Skeleton({ className = "" }: { readonly className?: string }) {
  const anim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.9, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      className={clsx("bg-grey-300 rounded-xl", className)}
      style={{ opacity: anim }}
    />
  );
}
