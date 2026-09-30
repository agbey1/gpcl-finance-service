export type ParsedTx = {
  rowIndex: number;
  txnDate: string | null;   // ISO yyyy-mm-dd
  valueDate: string | null;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  warning?: string;
};

export function parseBankStatementCsv(csv: string): { rows: ParsedTx[]; warnings: string[] } {
  const lines = csv.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], warnings: ['CSV must contain a header row and at least one data row'] };

  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  const idx = {
    date: findHeader(headers, ['transaction date', 'txn date', 'posting date', 'trans date', 'post date', 'date']),
    valueDate: findHeader(headers, ['value date', 'val date']),
    description: findHeader(headers, ['description', 'narration', 'details', 'particulars', 'remarks', 'transaction details', 'statement details']),
    reference: findHeader(headers, ['reference', 'ref', 'ref no', 'reference number', 'cheque no', 'chq no', 'tran ref']),
    debit: findHeader(headers, ['debit', 'withdrawal', 'withdrawals', 'dr', 'debit amount', 'money out', 'out']),
    credit: findHeader(headers, ['credit', 'deposit', 'deposits', 'cr', 'credit amount', 'money in', 'in']),
    amount: findHeader(headers, ['amount', 'net amount', 'txn amount']),
    balance: findHeader(headers, ['balance', 'running balance', 'closing balance', 'available balance']),
  };

  const warnings: string[] = [];
  if (idx.date === -1) warnings.push('No date column found — first column will be used.');
  if (idx.description === -1) warnings.push('No description column found — text will be empty.');
  if (idx.debit === -1 && idx.credit === -1 && idx.amount === -1) warnings.push('No debit/credit/amount column found — every row will be zero.');

  const dateIdx = idx.date === -1 ? 0 : idx.date;

  const rows: ParsedTx[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.every(c => c.trim() === '')) continue;
    const txnDateRaw = cell(cells, dateIdx);
    const txnDate = parseDate(txnDateRaw);
    if (!txnDate) {
      rows.push({
        rowIndex: i,
        txnDate: null,
        valueDate: null,
        description: cell(cells, idx.description),
        reference: idx.reference >= 0 ? cell(cells, idx.reference) : null,
        debit: 0,
        credit: 0,
        balance: null,
        warning: `Could not parse date "${txnDateRaw}"`,
      });
      continue;
    }

    let debit = 0, credit = 0;
    if (idx.debit >= 0 || idx.credit >= 0) {
      debit = idx.debit >= 0 ? toNum(cell(cells, idx.debit)) : 0;
      credit = idx.credit >= 0 ? toNum(cell(cells, idx.credit)) : 0;
    } else if (idx.amount >= 0) {
      const amt = toNum(cell(cells, idx.amount));
      if (amt < 0) debit = -amt; else credit = amt;
    }

    rows.push({
      rowIndex: i,
      txnDate,
      valueDate: idx.valueDate >= 0 ? parseDate(cell(cells, idx.valueDate)) : null,
      description: idx.description >= 0 ? cell(cells, idx.description) : '',
      reference: idx.reference >= 0 ? cell(cells, idx.reference) || null : null,
      debit,
      credit,
      balance: idx.balance >= 0 ? (toNum(cell(cells, idx.balance)) || null) : null,
    });
  }

  return { rows, warnings };
}

function findHeader(headers: string[], candidates: string[]): number {
  for (const cand of candidates) {
    const idx = headers.findIndex(h => {
      if (cand.length <= 3) {
        return h.split(/[^a-z]+/).some(w => w === cand);
      }
      return h.includes(cand);
    });
    if (idx !== -1) return idx;
  }
  return -1;
}

function cell(cells: string[], i: number): string {
  return i >= 0 && i < cells.length ? cells[i].trim() : '';
}

function toNum(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[, ]/g, '').replace(/[()]/g, '-');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(s: string): string | null {
  if (!s) return null;
  const cleaned = s.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(cleaned);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(cleaned);
  if (dmy) {
    let y = dmy[3];
    if (y.length === 2) y = (parseInt(y, 10) >= 50 ? '19' : '20') + y;
    return `${y}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  const d = new Date(cleaned);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuote = false; }
      else { cur += c; }
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"' && cur.length === 0) { inQuote = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}
