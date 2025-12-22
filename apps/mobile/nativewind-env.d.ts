/// <reference types="nativewind/types" />

// On importe React Native pour pouvoir étendre ses types
import "react-native";

declare module "react-native" {
    interface ViewProps {
        className?: string;
    }
    interface TextProps {
        className?: string;
    }
    interface ImageProps {
        className?: string;
    }
    interface TouchableOpacityProps {
        className?: string;
    }
    interface PressableProps {
        className?: string;
    }
    interface ScrollViewProps {
        className?: string;
    }
    interface FlatListProps<ItemT> {
        className?: string;
    }
}