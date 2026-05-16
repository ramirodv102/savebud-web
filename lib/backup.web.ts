// Web backup — uses browser Blob download and FileReader upload.
// Metro automatically prefers this file over backup.ts when bundling for web.
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
      catMap.get(e.categoryId)     ?? '',
      pmMap.get(e.paymentMethodId) ?? '',
      e.note ?? '',
    ]);

  const csv      = [header, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\n');
  const dateStr  = format(new Date(), 'yyyy-MM-dd');
  const fileName = `savebud-gastos-${dateStr}.csv`;

  // BOM so Excel opens it correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Import ────────────────────────────────────────────────────────────────────

export function importData(): Promise<number> {
  return new Promise((resolve, reject) => {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.csv,text/csv,text/plain';
    let resolved   = false;

    // Detect cancel: window regains focus without a file being selected
    function onWindowFocus() {
      window.removeEventListener('focus', onWindowFocus);
      setTimeout(() => { if (!resolved) { resolved = true; resolve(-1); } }, 400);
    }
    window.addEventListener('focus', onWindowFocus);

    input.onchange = async (event) => {
      resolved = true;
      window.removeEventListener('focus', onWindowFocus);
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) { resolve(-1); return; }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const raw   = (e.target?.result as string) ?? '';
          const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
          if (lines.length < 2) { reject(new Error('El archivo CSV no contiene datos.')); return; }

          const [categories, paymentMethods] = await Promise.all([
            repo.getCategories(),
            repo.getPaymentMethods(),
          ]);

          const catByName = new Map(categories.map((c)    => [c.name.toLowerCase(), c.id]));
          const pmByName  = new Map(paymentMethods.map((m) => [m.name.toLowerCase(), m.id]));
          const defaultCatId = categories[0]?.id   ?? '';
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
          resolve(imported);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsText(file);
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}
