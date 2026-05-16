// UI-level backup logic — file I/O and system share sheet.
// Data serialization lives in store/repository.ts (exportAllData / importAllData).
// Uses expo-file-system v18+ class-based API (File, Paths).
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import * as repo from '../store/repository';

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportData(): Promise<void> {
  const json = await repo.exportAllData();
  const date = format(new Date(), 'yyyy-MM-dd');
  const fileName = `savebud-backup-${date}.json`;

  const file = new File(Paths.cache, fileName);
  file.write(json);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: `Backup SaveBud ${date}`,
  });
}

// ── Import ────────────────────────────────────────────────────────────────────

// Returns true if import succeeded, false if user cancelled.
// Throws with a user-facing message if the file is invalid.
export async function importData(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return false;

  const file = new File(result.assets[0].uri);
  const raw = await file.text();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }

  if (parsed.version !== repo.EXPORT_VERSION) {
    throw new Error(
      'El archivo no es un backup válido de SaveBud. Verificá que sea un archivo exportado desde la app.',
    );
  }

  await repo.importAllData(raw);
  return true;
}
