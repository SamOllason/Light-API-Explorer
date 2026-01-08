import type { SortSpec, FilterSpec, Direction, Operator, AccountingDocument } from './types.js';

/** Allowed filter/sort fields */
const ALLOWED_FIELDS = new Set([
  'status',
  'createdAt',
  'documentDate',
  'businessPartnerName',
  'totalTransactionAmountInMajors',
  'currency',
  'documentType',
]);

const VALID_OPERATORS = new Set<Operator>([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'starts_with'
]);

/**
 * Parse sort string: "field:direction,field:direction"
 * @example "createdAt:desc,businessPartnerName:asc"
 */
export function parseSort(sortStr?: string): SortSpec[] {
  if (!sortStr?.trim()) return [];

  return sortStr.split(',').map((part) => {
    const [field, dir] = part.trim().split(':');
    
    if (!field || !ALLOWED_FIELDS.has(field)) {
      throw createValidationError(`Invalid sort field: ${field}`);
    }
    
    const direction: Direction = dir === 'desc' ? 'desc' : 'asc';
    return { field, direction };
  });
}

/**
 * Parse filter string: "field:operator:value,field:operator:value"
 * For in/not_in operators, value uses pipe separator: "status:in:DRAFT|SUBMITTED"
 * @example "status:eq:DRAFT,businessPartnerName:contains:Acme"
 */
export function parseFilter(filterStr?: string): FilterSpec[] {
  if (!filterStr?.trim()) return [];

  return filterStr.split(',').map((part) => {
    const segments = part.trim().split(':');
    
    if (segments.length < 3) {
      throw createValidationError(`Invalid filter format: ${part}`);
    }

    const [field, operator, ...valueParts] = segments;
    const rawValue = valueParts.join(':'); // Rejoin in case value contains colons

    if (!field || !ALLOWED_FIELDS.has(field)) {
      throw createValidationError(`Invalid filter field: ${field}`);
    }

    if (!operator || !VALID_OPERATORS.has(operator as Operator)) {
      throw createValidationError(`Invalid filter operator: ${operator}`);
    }

    const op = operator as Operator;
    const value = (op === 'in' || op === 'not_in') 
      ? rawValue.split('|') 
      : rawValue;

    return { field, operator: op, value };
  });
}

/**
 * Get a nested or computed field value from a document
 */
function getFieldValue(doc: AccountingDocument, field: string): unknown {
  switch (field) {
    case 'totalTransactionAmountInMajors':
      return doc.totalTransactionAmount.amountInMajors;
    case 'currency':
      return doc.totalTransactionAmount.currency;
    default:
      return (doc as unknown as Record<string, unknown>)[field];
  }
}

/**
 * Apply filter specifications to a list of documents
 */
export function applyFilters(
  items: AccountingDocument[],
  specs: FilterSpec[]
): AccountingDocument[] {
  if (specs.length === 0) return items;

  return items.filter((item) =>
    specs.every((spec) => {
      const value = getFieldValue(item, spec.field);
      return matchesFilter(value, spec);
    })
  );
}

/**
 * Check if a value matches a filter specification
 */
function matchesFilter(value: unknown, spec: FilterSpec): boolean {
  const { operator, value: filterValue } = spec;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return operator === 'neq' || operator === 'not_in';
  }

  const strValue = String(value);
  const numValue = typeof value === 'number' ? value : parseFloat(strValue);

  switch (operator) {
    case 'eq':
      return strValue === filterValue;
    case 'neq':
      return strValue !== filterValue;
    case 'gt':
      return !isNaN(numValue) && numValue > Number(filterValue);
    case 'gte':
      return !isNaN(numValue) && numValue >= Number(filterValue);
    case 'lt':
      return !isNaN(numValue) && numValue < Number(filterValue);
    case 'lte':
      return !isNaN(numValue) && numValue <= Number(filterValue);
    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(strValue);
    case 'not_in':
      return Array.isArray(filterValue) && !filterValue.includes(strValue);
    case 'contains':
      return strValue.toLowerCase().includes(String(filterValue).toLowerCase());
    case 'starts_with':
      return strValue.toLowerCase().startsWith(String(filterValue).toLowerCase());
    default:
      return false;
  }
}

/**
 * Apply sort specifications to a list of documents
 */
export function applySort(
  items: AccountingDocument[],
  specs: SortSpec[]
): AccountingDocument[] {
  if (specs.length === 0) return items;

  return [...items].sort((a, b) => {
    for (const spec of specs) {
      const aVal = getFieldValue(a, spec.field);
      const bVal = getFieldValue(b, spec.field);

      let comparison = 0;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal ?? '').localeCompare(String(bVal ?? ''));
      }

      if (comparison !== 0) {
        return spec.direction === 'desc' ? -comparison : comparison;
      }
    }
    return 0;
  });
}

/**
 * Create a validation error with 422 status
 */
function createValidationError(message: string): Error {
  const error = new Error(message) as Error & { status: number };
  error.status = 422;
  return error;
}
