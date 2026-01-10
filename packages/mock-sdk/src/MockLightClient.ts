/**
 * MockLightClient - In-memory implementation of Light API
 * 
 * Loads fixtures and simulates API side effects:
 * - openInvoiceReceivable: assigns invoiceNumber, sets state OPEN
 * - updateCardTransactionLine: merges fields into line
 * - approve/confirm actions: mock state changes
 */

import type {
  ILightClient,
  CompanyEntity,
  LedgerAccount,
  LedgerTransactionLine,
  InvoiceReceivable,
  InvoicePayable,
  CardTransaction,
  CardTransactionLine,
  Product,
} from './types.js';

// Import fixtures
import entitiesData from '../fixtures/entities.json' assert { type: 'json' };
import ledgerAccountsData from '../fixtures/ledgerAccounts.json' assert { type: 'json' };
import ledgerLinesData from '../fixtures/ledgerLines.json' assert { type: 'json' };
import arInvoicesData from '../fixtures/arInvoices.json' assert { type: 'json' };
import apPayablesData from '../fixtures/apPayables.json' assert { type: 'json' };
import cardTransactionsData from '../fixtures/cardTransactions.json' assert { type: 'json' };
import productsData from '../fixtures/products.json' assert { type: 'json' };

export class MockLightClient implements ILightClient {
  private entities: CompanyEntity[];
  private ledgerAccounts: LedgerAccount[];
  private ledgerLines: LedgerTransactionLine[];
  private arInvoices: InvoiceReceivable[];
  private apPayables: InvoicePayable[];
  private cardTransactions: CardTransaction[];
  private products: Product[];

  constructor() {
    // Load fixtures into memory
    this.entities = entitiesData as CompanyEntity[];
    this.ledgerAccounts = ledgerAccountsData as LedgerAccount[];
    this.ledgerLines = ledgerLinesData as LedgerTransactionLine[];
    this.arInvoices = arInvoicesData as InvoiceReceivable[];
    this.apPayables = apPayablesData as InvoicePayable[];
    this.cardTransactions = cardTransactionsData as CardTransaction[];
    this.products = productsData as Product[];
  }

  // Simulate latency
  private async delay(ms = 250): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Entities & Ledger
  async listCompanyEntities(): Promise<CompanyEntity[]> {
    await this.delay(100);
    return this.entities;
  }

  async listLedgerAccounts(): Promise<LedgerAccount[]> {
    await this.delay(150);
    return this.ledgerAccounts;
  }

  async listLedgerTransactionLines(): Promise<LedgerTransactionLine[]> {
    await this.delay(200);
    return this.ledgerLines;
  }

  // AR - Invoice Receivables
  async listInvoiceReceivables(): Promise<InvoiceReceivable[]> {
    await this.delay(200);
    return this.arInvoices;
  }

  async getInvoiceReceivable(id: string): Promise<InvoiceReceivable> {
    await this.delay(100);
    const invoice = this.arInvoices.find((inv) => inv.id === id);
    if (!invoice) {
      throw new Error(`Invoice ${id} not found`);
    }
    return invoice;
  }

  async openInvoiceReceivable(
    id: string,
    opts?: { shouldSendEmail?: boolean }
  ): Promise<InvoiceReceivable> {
    await this.delay(300);
    const invoice = this.arInvoices.find((inv) => inv.id === id);
    if (!invoice) {
      throw new Error(`Invoice ${id} not found`);
    }
    if (invoice.state !== 'DRAFT') {
      throw new Error(`Invoice ${id} is not in DRAFT state`);
    }

    // Simulate opening: assign invoice number and set state to OPEN
    const entity = this.entities.find((e) => e.id === invoice.companyEntityId);
    const entityCode = entity?.code || 'INV';
    const nextNumber = Math.floor(Math.random() * 9000) + 1000;
    invoice.invoiceNumber = `${entityCode}-${String(nextNumber).padStart(5, '0')}`;
    invoice.state = 'OPEN';

    // Fill in account/tax from product defaults
    invoice.lines = invoice.lines.map((line) => {
      if (line.productId && !line.accountId) {
        const product = this.products.find((p) => p.id === line.productId);
        if (product) {
          return {
            ...line,
            accountId: product.defaultLedgerAccountId || undefined,
            taxCodeId: product.defaultTaxId || undefined,
          };
        }
      }
      return line;
    });

    return invoice;
  }

  // AP - Invoice Payables
  async listInvoicePayables(): Promise<InvoicePayable[]> {
    await this.delay(200);
    return this.apPayables;
  }

  async getInvoicePayable(id: string): Promise<InvoicePayable> {
    await this.delay(100);
    const payable = this.apPayables.find((p) => p.id === id);
    if (!payable) {
      throw new Error(`Payable ${id} not found`);
    }
    return payable;
  }

  /** Mock approve action (not in real Light API list endpoint, but used for demo) */
  async approveInvoicePayable(id: string): Promise<InvoicePayable> {
    await this.delay(250);
    const payable = this.apPayables.find((p) => p.id === id);
    if (!payable) {
      throw new Error(`Payable ${id} not found`);
    }
    if (payable.state !== 'INIT') {
      throw new Error(`Payable ${id} is not in INIT state`);
    }
    payable.state = 'APPROVED';
    return payable;
  }

  // Cards
  async listCardTransactions(): Promise<CardTransaction[]> {
    await this.delay(200);
    return this.cardTransactions;
  }

  async getCardTransaction(id: string): Promise<CardTransaction> {
    await this.delay(100);
    const tx = this.cardTransactions.find((c) => c.id === id);
    if (!tx) {
      throw new Error(`Card transaction ${id} not found`);
    }
    return tx;
  }

  async updateCardTransactionLine(
    txId: string,
    lineId: string,
    patch: Partial<CardTransactionLine>
  ): Promise<CardTransactionLine> {
    await this.delay(250);
    const tx = this.cardTransactions.find((c) => c.id === txId);
    if (!tx) {
      throw new Error(`Card transaction ${txId} not found`);
    }
    const line = tx.lines.find((l) => l.id === lineId);
    if (!line) {
      throw new Error(`Line ${lineId} not found in transaction ${txId}`);
    }

    // Merge patch into line
    Object.assign(line, patch);
    return line;
  }

  // Products
  async getProduct(id: string): Promise<Product> {
    await this.delay(50);
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }
    return product;
  }

  /** Mock FX confirm action (for demo) */
  async confirmFxForEntity(entityId: string): Promise<void> {
    await this.delay(200);
    // Clear FX flags for accounts in this entity
    this.ledgerAccounts = this.ledgerAccounts.map((acc) => {
      if (acc.companyEntityId === entityId && acc.fxFlag) {
        return { ...acc, fxFlag: false };
      }
      return acc;
    });
  }
}
