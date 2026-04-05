import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api } from "../lib/axios";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// expo-file-system v2 : write() et uri sont hérités du NativeModule natif
// mais TypeScript ne résout pas la chaîne d'héritage — on type manuellement.
interface NativeFile {
  write(content: Uint8Array): void;
  create(options?: { overwrite?: boolean }): void;
  readonly uri: string;
}

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

    // Mobile : arraybuffer → fichier temporaire → share sheet
    const bytes = new Uint8Array(response.data);
    const file = new File(Paths.cache, filename) as unknown as NativeFile;
    file.create({ overwrite: true });
    file.write(bytes);

    await Sharing.shareAsync(file.uri, {
      mimeType: XLSX_MIME,
      dialogTitle: "Exporter mes données GiveAWay",
      UTI: "com.microsoft.excel.xlsx",
    });
  },
};
