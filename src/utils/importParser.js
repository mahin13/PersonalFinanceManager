import * as XLSX from 'xlsx';

// Known aliases for column mapping
const COLUMN_ALIASES = {
  type: ['type', 'transaction type', 'trans type', 'category', 'txn type', 'kind'],
  amount: ['amount', 'value', 'sum', 'total', 'price', 'cost', 'amt'],
  reason: ['reason', 'description', 'note', 'notes', 'memo', 'details', 'purpose', 'source', 'category'],
  date: ['date', 'transaction date', 'trans date', 'datetime', 'time', 'timestamp', 'created', 'when'],
};

// Detect delimiter for CSV/TXT files
const detectDelimiter = (text) => {
  const firstLine = text.split('\n')[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;

  const counts = [
    { delim: ',', count: commaCount },
    { delim: '\t', count: tabCount },
    { delim: ';', count: semicolonCount },
    { delim: '|', count: pipeCount },
  ];

  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delim : ',';
};

// Parse a CSV/TXT line handling quoted fields
const parseCSVLine = (line, delimiter) => {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
};

// Parse CSV or TXT string
export const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('File must have at least a header row and one data row');
  }

  const delimiter = detectDelimiter(text);
  const headers = parseCSVLine(lines[0], delimiter);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      rows.push(row);
    }
  }

  return { headers, rows };
};

// Parse JSON string
export const parseJSON = (jsonString) => {
  const data = JSON.parse(jsonString);
  let rows;

  if (Array.isArray(data)) {
    rows = data;
  } else if (data.transactions && Array.isArray(data.transactions)) {
    rows = data.transactions;
  } else if (data.data && Array.isArray(data.data)) {
    rows = data.data;
  } else {
    throw new Error('JSON must be an array or contain a "transactions" or "data" array');
  }

  if (rows.length === 0) {
    throw new Error('No data found in file');
  }

  const headers = Object.keys(rows[0]);
  return { headers, rows };
};

// Parse Excel from base64
export const parseExcel = (base64Data) => {
  const workbook = XLSX.read(base64Data, { type: 'base64' });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  if (rows.length === 0) {
    throw new Error('No data found in spreadsheet');
  }

  const headers = Object.keys(rows[0]);
  return { headers, rows };
};

// Auto-map columns to known fields
export const autoMapColumns = (headers) => {
  const mapping = {};

  headers.forEach(header => {
    const lowerHeader = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some(alias => lowerHeader.includes(alias))) {
        // Don't overwrite if already mapped (prefer first match)
        if (!mapping[field]) {
          mapping[field] = header;
        }
      }
    }
  });

  return mapping;
};

// Convert parsed rows to transaction objects
export const mapRowsToTransactions = (rows, mapping, userId, accountId) => {
  return rows.map(row => {
    const rawType = mapping.type ? String(row[mapping.type] || '').trim() : '';
    const rawAmount = mapping.amount ? parseFloat(row[mapping.amount]) : 0;
    const rawReason = mapping.reason ? String(row[mapping.reason] || '') : '';
    const rawDate = mapping.date ? row[mapping.date] : null;

    // Normalize type
    let type = 'Withdrawal';
    const lowerType = rawType.toLowerCase();
    if (
      lowerType.includes('deposit') ||
      lowerType.includes('income') ||
      lowerType.includes('credit') ||
      lowerType.includes('earning') ||
      lowerType === 'in'
    ) {
      type = 'Deposit';
    }

    // Parse date
    let date;
    if (rawDate) {
      const parsed = new Date(rawDate);
      date = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    } else {
      date = new Date().toISOString();
    }

    return {
      userId,
      accountId,
      type,
      amount: Math.abs(rawAmount) || 0,
      reason: rawReason.trim(),
      date,
    };
  }).filter(t => t.amount > 0);
};
