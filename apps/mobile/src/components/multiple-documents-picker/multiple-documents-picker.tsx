import React, { useRef, useState } from "react";
import { Platform, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Button, Text } from "@/components/ui";
import { cssInterop } from "nativewind";
import AddIconSource from "@assets/icons/ic_add.svg";
import TrashIconSource from "@assets/icons/ic_trash.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const AddIcon = cssInterop(AddIconSource, iconConfig);
const TrashIcon = cssInterop(TrashIconSource, iconConfig);

/**
 * Objet fichier au format attendu par FormData en React Native.
 */
export interface ReactNativeFile {
  uri: string;
  name: string;
  type: string;
  // Blob/File web réel, utilisé sur web pour éviter de manipuler des URIs blob
  webFile?: File;
}

export interface MultipleDocumentsPickerProps {
  value: ReactNativeFile[];
  onChange: (files: ReactNativeFile[]) => void;
  maxFiles?: number;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
}

const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export const MultipleDocumentsPicker: React.FC<MultipleDocumentsPickerProps> = ({
  value,
  onChange,
  maxFiles = 5,
  label = "Documents justificatifs",
  helperText = "Formats acceptés : PDF, JPEG, PNG, WEBP. Exemples : statuts de l'association, récépissé de déclaration en préfecture, avis de situation SIRENE.",
  error,
  disabled = false,
}) => {
  const webInputRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const reachedMax = value.length >= maxFiles;
  const isDisabled = disabled || reachedMax;

  const buildRejectionMessage = (
    rejected: Array<{ name: string; type: string }>,
  ) => {
    const list = rejected
      .map((r) => `${r.name} (${r.type || "type inconnu"})`)
      .join(", ");
    return `Les fichiers suivants ne sont pas acceptés : ${list}. Formats acceptés : PDF, JPEG, PNG, WEBP`;
  };

  const pickNative = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_MIME,
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const picked = result.assets ?? [];
      const rejected: Array<{ name: string; type: string }> = [];
      const accepted: ReactNativeFile[] = [];

      for (const asset of picked) {
        const mime = asset.mimeType ?? "application/octet-stream";
        if (!ACCEPTED_MIME.includes(mime)) {
          rejected.push({ name: asset.name ?? "document", type: mime });
          continue;
        }
        accepted.push({
          uri: asset.uri,
          name: asset.name ?? `document-${Date.now()}`,
          type: mime,
        });
      }

      const remaining = Math.max(0, maxFiles - value.length);
      const next = accepted.slice(0, remaining);
      setLocalError(rejected.length > 0 ? buildRejectionMessage(rejected) : undefined);
      if (next.length > 0) onChange([...value, ...next]);
    } catch (e) {
      console.warn("[MultipleDocumentsPicker] Erreur sélection:", e);
    }
  };

  const handleWebFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = Math.max(0, maxFiles - value.length);
    const next: ReactNativeFile[] = [];
    const rejected: Array<{ name: string; type: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const mime = f.type || "application/octet-stream";
      if (!ACCEPTED_MIME.includes(mime)) {
        rejected.push({ name: f.name, type: mime });
        continue;
      }
      if (next.length >= remaining) continue;
      next.push({
        uri: URL.createObjectURL(f),
        name: f.name,
        type: mime,
        webFile: f,
      });
    }

    setLocalError(rejected.length > 0 ? buildRejectionMessage(rejected) : undefined);
    if (next.length > 0) onChange([...value, ...next]);
  };

  const onPressAdd = () => {
    if (isDisabled) return;
    if (Platform.OS === "web") {
      webInputRef.current?.click();
    } else {
      void pickNative();
    }
  };

  const removeAt = (index: number) => {
    const next = value.slice();
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <View className="w-full">
      <Text className="mb-1 text-base font-medium text-grey-900">{label}</Text>
      <Text className="mb-3 text-sm text-grey-600">{helperText}</Text>

      <Button
        variant="secondary"
        onPress={onPressAdd}
        disabled={isDisabled}
        icon={
          <AddIcon
            className={
              "w-5 h-5 " +
              (isDisabled
                ? "text-grey-disabledText"
                : "text-primary group-hover:text-primary-hover group-active:text-primary-active")
            }
          />
        }
        className="w-full"
      >
        {reachedMax
          ? `Maximum atteint (${maxFiles})`
          : `Ajouter un document (${value.length}/${maxFiles})`}
      </Button>

      {Platform.OS === "web" && (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <input
          ref={webInputRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME.join(",")}
          style={{ display: "none" }}
          onChange={(e) => {
            handleWebFiles(e.target.files);
            // reset pour permettre de sélectionner le même fichier à nouveau
            e.target.value = "";
          }}
        />
      )}

      {value.length > 0 && (
        <View className="gap-2 mt-3">
          {value.map((file, index) => (
            <View
              key={`${file.name}-${index}`}
              className="flex-row items-center justify-between p-3 border rounded-md bg-grey-50 border-grey-200"
            >
              <View className="flex-1 pr-2">
                <Text
                  className="text-sm font-medium text-grey-900"
                  numberOfLines={1}
                >
                  {file.name}
                </Text>
                <Text className="text-xs text-grey-500" numberOfLines={1}>
                  {file.type}
                </Text>
              </View>
              <Button
                onPress={() => removeAt(index)}
                variant="primary"
                icon={<TrashIcon className="w-3 h-3 text-white" />}
                className="!w-8 !h-8 !p-0 bg-red-600 active:bg-red-800 active:border-white hover:bg-red-700 hover:border-white border-2 border-white !rounded-full web:focus-visible:ring-1 web:focus-visible:ring-focus web:focus-visible:ring-offset-1"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={`Supprimer ${file.name}`}
              />
            </View>
          ))}
        </View>
      )}

      {localError && (
        <Text className="mt-2 text-sm text-error-100">{localError}</Text>
      )}
      {error && <Text className="mt-2 text-sm text-error-100">{error}</Text>}
    </View>
  );
};
