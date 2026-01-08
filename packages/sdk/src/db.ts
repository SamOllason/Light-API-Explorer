import type { AccountingDocument, DocumentStatus, DocumentType, LineItem, Money } from './types.js';

/**
 * Mulberry32 PRNG - simple, fast, deterministic
 * @param seed - Initial seed value
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random helpers using seeded PRNG */
function createRandomHelpers(random: () => number) {
  return {
    int: (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)],
    date: (startYear: number, endYear: number) => {
      const start = new Date(startYear, 0, 1).getTime();
      const end = new Date(endYear, 11, 31).getTime();
      return new Date(start + random() * (end - start)).toISOString().split('T')[0];
    },
    datetime: (startYear: number, endYear: number) => {
      const start = new Date(startYear, 0, 1).getTime();
      const end = new Date(endYear, 11, 31).getTime();
      return new Date(start + random() * (end - start)).toISOString();
    },
  };
}

const STATUSES: readonly DocumentStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'PAID'];
const DOC_TYPES: readonly DocumentType[] = ['AP', 'AR', 'CT', 'JE'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'] as const;

const COMPANY_PREFIXES = ['Acme', 'Global', 'Prime', 'Elite', 'Apex', 'Nova', 'Core', 'Alpha', 'Beta', 'Delta'];
const COMPANY_SUFFIXES = ['Corp', 'Inc', 'LLC', 'Ltd', 'Solutions', 'Services', 'Group', 'Industries', 'Partners', 'Systems'];

const DESCRIPTIONS = [
  'Monthly service fee',
  'Consulting services',
  'Software license',
  'Hardware purchase',
  'Office supplies',
  'Travel expenses',
  'Marketing services',
  'Legal fees',
  'Equipment rental',
  'Maintenance contract',
];

const LINE_ITEM_DESCRIPTIONS = [
  'Professional services',
  'License fee',
  'Support package',
  'Implementation',
  'Training session',
  'Hardware unit',
  'Software module',
  'Consulting hours',
  'Subscription fee',
  'Setup fee',
];

const ACCOUNT_CODES = ['1000', '2000', '3000', '4000', '5000', '6000', '7000', '8000'];

/**
 * Generate a deterministic dataset of accounting documents
 * @param count - Number of documents to generate
 * @param seed - Seed for deterministic generation
 */
export function generateDocuments(count: number, seed: number = 42): AccountingDocument[] {
  const random = mulberry32(seed);
  const { int, pick, date, datetime } = createRandomHelpers(random);

  const documents: AccountingDocument[] = [];

  for (let i = 0; i < count; i++) {
    const docType = pick(DOC_TYPES);
    const currency = pick(CURRENCIES);
    const lineItemCount = int(1, 5);
    const lineItems: LineItem[] = [];

    let totalAmount = 0;

    for (let j = 0; j < lineItemCount; j++) {
      const quantity = int(1, 10);
      const unitPrice = int(100, 10000);
      const itemTotal = quantity * unitPrice;
      totalAmount += itemTotal;

      lineItems.push({
        id: `li-${i}-${j}`,
        description: pick(LINE_ITEM_DESCRIPTIONS),
        quantity,
        unitPrice: { amountInMajors: unitPrice, currency },
        totalAmount: { amountInMajors: itemTotal, currency },
        accountCode: pick(ACCOUNT_CODES),
      });
    }

    const createdAt = datetime(2023, 2025);
    const updatedAt = datetime(2024, 2025);

    const doc: AccountingDocument = {
      id: `doc-${String(i).padStart(6, '0')}`,
      documentType: docType,
      status: pick(STATUSES),
      documentNumber: `${docType}-${int(10000, 99999)}`,
      documentDate: date(2023, 2025),
      createdAt,
      updatedAt: updatedAt > createdAt ? updatedAt : createdAt,
      businessPartnerId: `bp-${int(1000, 9999)}`,
      businessPartnerName: `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)}`,
      description: pick(DESCRIPTIONS),
      totalTransactionAmount: { amountInMajors: totalAmount, currency } as Money,
      lineItems,
    };

    documents.push(doc);
  }

  return documents;
}
