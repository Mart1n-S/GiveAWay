import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { api } from "../lib/axios";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const ExportService = {
  /**
   * GET /profile/export
   * Télécharge le fichier Excel généré par le backend :
   * - Web    : téléchargement direct du .xlsx dans le navigateur
   * - Mobile : écrit le fichier sur le disque puis ouvre le share sheet natif
   */
  exportUserData: async (): Promise<void> => {
    const response = await api.get<ArrayBuffer>("/profile/export", {
      responseType: "arraybuffer",
    });

    const filename = `giveaway-mes-donnees-${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (Platform.OS === "web") {
      const blob = new Blob([response.data], { type: XLSX_MIME });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Mobile : arraybuffer → base64 → fichier temporaire → share sheet
    const bytes = new Uint8Array(response.data);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const base64 = btoa(binary);

    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(fileUri, {
      mimeType: XLSX_MIME,
      dialogTitle: "Exporter mes données GiveAWay",
      UTI: "com.microsoft.excel.xlsx",
    });
  },
};
