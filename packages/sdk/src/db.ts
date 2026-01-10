import type {
  AccountingDocument,
  DocumentStatus,
  DocumentType,
  LineItem,
  Money,
  InvoicePayable,
  InvoicePayableType,
} from './types.js';

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

const STATUSES: readonly DocumentStatus[] = ['INIT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELED', 'DECLINED'];
const DOC_TYPES: readonly DocumentType[] = ['AP', 'AR', 'CT', 'JE'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'] as const;


// Professional B2B vendors for realistic invoice payables
const COMPANY_PREFIXES = [
  'Acme Software Solutions',
  'Global Consulting Partners',
  'TechVendor Inc',
  'Global Treats Ltd.',
  'Paws & Play',
  'Happy Tails Supply',
  'Furry Friends Co.',
  'Puppy Palace',
  'Canine Central',
  'Doggo Depot',
  'Tail Waggers Inc.'
];
const COMPANY_SUFFIXES = ['']; // Not used, but kept for compatibility

const DESCRIPTIONS = [
  'Bulk order of squeaky toys',
  'Monthly treat box subscription',
  'Dog beds for winter sale',
  'Assorted chew toys',
  'Premium dog food shipment',
  'Leashes and collars restock',
  'Grooming supplies',
  'Puppy starter kits',
  'Holiday gift bundles',
  'Training pads and accessories',
];

const LINE_ITEM_DESCRIPTIONS = [
  'Squeaky Toy (500 units)',
  'Treat Box (200 units)',
  'Dog Bed (100 units)',
  'Chew Toy (300 units)',
  'Premium Dog Food (50 bags)',
  'Leash (150 units)',
  'Collar (150 units)',
  'Grooming Brush (75 units)',
  'Puppy Starter Kit (20 units)',
  'Training Pad (400 units)',
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


    // Use more realistic status for Invoice Payables
    const statuses = ['INIT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELED', 'DECLINED'];
    const status = pick(statuses as any);

    const doc: AccountingDocument = {
      id: `doc-${String(i).padStart(6, '0')}`,
      documentType: docType,
      status: status as any, // For now, typecast to allow INIT/CANCELED/DECLINED
      documentNumber: `${docType}-${int(10000, 99999)}`,
      documentDate: date(2023, 2025),
      createdAt,
      updatedAt: updatedAt > createdAt ? updatedAt : createdAt,
      businessPartnerId: `bp-${int(1000, 9999)}`,
      businessPartnerName: pick(COMPANY_PREFIXES),
      description: pick(DESCRIPTIONS),
      totalTransactionAmount: { amountInMajors: totalAmount, currency } as Money,
      lineItems,
    };

    documents.push(doc);
  }

  return documents;
}

// ============================================
// Invoice Payables Generator (Light API)
// ============================================

/** Pet shop vendor names */
const PET_VENDORS = [
  'BarkBox Wholesale',
  'Happy Tails Supply Co.',
  'Furry Friends Distribution',
  'Paws & Claws Imports',
  'Canine Cuisine Inc.',
  'Whiskers & Wags Ltd.',
  'Pet Paradise Suppliers',
  'Tail Waggers Wholesale',
  'Critter Care Products',
  'Pawsome Provisions',
] as const;

/** Pet shop invoice descriptions */
const INVOICE_DESCRIPTIONS = [
  'Bulk squeaky toys order',
  'Premium dog food shipment',
  'Monthly treat box subscription',
  'Grooming supplies restock',
  'Winter dog beds collection',
  'Leashes and collars assortment',
  'Cat scratching posts',
  'Aquarium supplies',
  'Bird seed and feeders',
  'Small animal bedding',
] as const;

/** Pet product line items */
const PET_LINE_ITEMS = [
  { desc: 'Squeaky Bone Toy (case of 50)', price: 150 },
  { desc: 'Premium Kibble 25lb Bag', price: 45 },
  { desc: 'Treat Variety Pack', price: 28 },
  { desc: 'Adjustable Collar (pack of 20)', price: 120 },
  { desc: 'Retractable Leash 16ft', price: 35 },
  { desc: 'Orthopedic Dog Bed Large', price: 85 },
  { desc: 'Grooming Brush Set', price: 42 },
  { desc: 'Dental Chews (bulk 100ct)', price: 65 },
  { desc: 'Travel Water Bowl (case of 24)', price: 72 },
  { desc: 'Training Pads (200ct)', price: 38 },
] as const;

/**
 * Generate deterministic invoice payables for the pet shop demo
 * @param count - Number of invoices to generate
 * @param seed - Seed for deterministic generation
 */
export function generateInvoicePayables(count: number, seed: number = 42): InvoicePayable[] {
  const random = mulberry32(seed);
  const { int, pick, date, datetime } = createRandomHelpers(random);

  const invoices: InvoicePayable[] = [];
  const states: DocumentStatus[] = ['INIT', 'SUBMITTED', 'APPROVED', 'PAID', 'CANCELED', 'DECLINED'];
  const types: InvoicePayableType[] = ['VENDOR_INVOICE', 'REIMBURSEMENT'];

  for (let i = 0; i < count; i++) {
    const state = pick(states);
    const type = pick(types);
    const currency = pick(CURRENCIES);
    const lineItemCount = int(1, 4);
    const lineItems: LineItem[] = [];

    let totalAmount = 0;

    for (let j = 0; j < lineItemCount; j++) {
      const item = pick(PET_LINE_ITEMS);
      const quantity = int(1, 10);
      const itemTotal = quantity * item.price;
      totalAmount += itemTotal;

      lineItems.push({
        id: `inv-${String(i).padStart(6, '0')}-li-${j}`,
        description: item.desc,
        quantity,
        unitPrice: { amountInMajors: item.price, currency },
        totalAmount: { amountInMajors: itemTotal, currency },
        accountCode: pick(ACCOUNT_CODES),
      });
    }

    const createdAt = datetime(2024, 2025);
    const issuedDate = date(2024, 2025);
    const dueDate = new Date(new Date(issuedDate).getTime() + int(14, 45) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const vendorName = pick(PET_VENDORS);
    const vendorId = `vendor-${int(100, 999)}`;

    const invoice: InvoicePayable = {
      id: `inv-${String(i).padStart(6, '0')}`,
      type,
      state,
      version: state === 'INIT' ? 1 : int(1, 5),

      documentName: `INV-${int(10000, 99999)}`,
      documentKey: `doc-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
      invoiceNumber: `INV-${int(10000, 99999)}`,

      vendor: {
        vendorId,
        vendorName,
        vendorEmail: `${vendorName.toLowerCase().replaceAll(/[^a-z]/g, '')}@example.com`,
        vendorCountry: 'US',
      },
      companyId: `company-${seed}`,
      companyEntityName: 'Paws & Claws Pet Emporium',

      amount: totalAmount,
      currency,
      dueDate,
      issuedDate,
      paymentAt: state === 'PAID' ? datetime(2024, 2025) : undefined,

      nextApprover: state === 'SUBMITTED' ? {
        userId: 'user-finance-01',
        firstName: 'Finance',
        lastName: 'Team',
        fullName: 'Finance Team',
        approvalSentAt: datetime(2024, 2025),
      } : undefined,
      approvalNote: state === 'APPROVED' || state === 'PAID' ? 'Approved for payment' : undefined,
      canceledAt: state === 'CANCELED' ? datetime(2024, 2025) : undefined,
      cancellationReason: state === 'CANCELED' ? 'Duplicate invoice' : undefined,
      declineReason: state === 'DECLINED' ? 'Amount does not match PO' : undefined,

      metadata: {
        type: type === 'REIMBURSEMENT' ? 'REIMBURSEMENT_METADATA' : 'VENDOR_INVOICE_METADATA',
      },
      description: pick(INVOICE_DESCRIPTIONS),

      lineItems,

      createdAt,
      updatedAt: createdAt,
    };

    invoices.push(invoice);
  }

  return invoices;
}
