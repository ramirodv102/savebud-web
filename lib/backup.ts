// UI-level backup logic — CSV export/import.
// Uses expo-file-system v18+ class-based API (File, Paths).
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import * as repo from '../store/repository';

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ── Export ────────────────────────────────────────────────────────────────────

// Columns: fecha, monto, categoria, medio_de_pago, nota
export async function exportData(): Promise<void> {
  const [expenses, categories, paymentMethods] = await Promise.all([
    repo.getExpenses(),
    repo.getCategories(),
    repo.getPaymentMethods(),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const pmMap  = new Map(paymentMethods.map((m) => [m.id, m.name]));

  const header = ['fecha', 'monto', 'categoria', 'medio_de_pago', 'nota'];
  const rows   = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => [
      e.date,
      String(e.amount),
      catMap.get(e.categoryId)      ?? '',
      pmMap.get(e.paymentMethodId)  ?? '',
      e.note ?? '',
    ]);

  const csv      = [header, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
  const date     = format(new Date(), 'yyyy-MM-dd');
  const fileName = `savebud-gastos-${date}.csv`;

  const file = new File(Paths.cache, fileName);
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Compartir no está disponible en este dispositivo.');

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: `Gastos SaveBud ${date}`,
  });
}

// ── Import ────────────────────────────────────────────────────────────────────

// Returns number of imported rows, or -1 if the user cancelled.
// Throws with a user-facing message on invalid file.
export async function importData(): Promise<number> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return -1;

  const file = new File(result.assets[0].uri);
  const raw  = await file.text();

  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('El archivo CSV no contiene datos.');

  const [categories, paymentMethods] = await Promise.all([
    repo.getCategories(),
    repo.getPaymentMethods(),
  ]);

  const catByName = new Map(categories.map((c)    => [c.name.toLowerCase(), c.id]));
  const pmByName  = new Map(paymentMethods.map((m) => [m.name.toLowerCase(), m.id]));
  const defaultCatId = categories[0]?.id  ?? '';
  const defaultPmId  = paymentMethods[0]?.id ?? '';

  let imported = 0;

  for (const line of lines.slice(1)) {
    const [fecha, monto, categoria, medioDePago, nota] = parseCSVLine(line);

    const amount = parseInt(monto ?? '', 10);
    if (!fecha || isNaN(amount) || amount <= 0) continue;

    const categoryId      = catByName.get((categoria   ?? '').toLowerCase()) ?? defaultCatId;
    const paymentMethodId = pmByName.get((medioDePago  ?? '').toLowerCase()) ?? defaultPmId;

    if (!categoryId || !paymentMethodId) continue;

    await repo.addExpense({
      amount,
      categoryId,
      paymentMethodId,
      date:   fecha,
      note:   nota || undefined,
      source: 'manual',
    });
    imported++;
  }

  return imported;
}
