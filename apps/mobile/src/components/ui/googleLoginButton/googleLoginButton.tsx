import React from "react";
import { TouchableOpacity, View, ActivityIndicator, Text } from "react-native";
import { GoogleLoginButtonProps } from "./button-google.types";
import IcGoogle from "@assets/icons/ic_google.svg";

export const GoogleLoginButton = ({
  onPress,
  loading,
  disabled,
}: GoogleLoginButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      className={`flex-row items-center justify-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm ${
        disabled || loading ? "opacity-50" : ""
      }`}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : (
        <View className="flex-row items-center">
          <IcGoogle width={20} height={20} style={{ marginRight: 12 }} />
          <Text
            className="font-semibold text-grey-900"
            style={{ fontSize: 15 }}
          >
            Continuer avec Google
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
