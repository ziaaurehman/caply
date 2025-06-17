// Tax rates and logic for Canadian provinces
export interface TaxRates {
  gst: number;
  pst: number;
  hst: number;
  qst: number;
}

export interface TaxCalculation {
  subtotal: number;
  gst: number;
  pst: number;
  hst: number;
  qst: number;
  total: number;
}

export const PROVINCES = {
  AB: { name: 'Alberta', code: 'AB' },
  BC: { name: 'British Columbia', code: 'BC' },
  MB: { name: 'Manitoba', code: 'MB' },
  NB: { name: 'New Brunswick', code: 'NB' },
  NL: { name: 'Newfoundland and Labrador', code: 'NL' },
  NT: { name: 'Northwest Territories', code: 'NT' },
  NS: { name: 'Nova Scotia', code: 'NS' },
  NU: { name: 'Nunavut', code: 'NU' },
  ON: { name: 'Ontario', code: 'ON' },
  PE: { name: 'Prince Edward Island', code: 'PE' },
  QC: { name: 'Quebec', code: 'QC' },
  SK: { name: 'Saskatchewan', code: 'SK' },
  YT: { name: 'Yukon', code: 'YT' },
} as const;

export const getTaxRates = (provinceCode: keyof typeof PROVINCES): TaxRates => {
  switch (provinceCode) {
    // GST only provinces (5%)
    case 'AB':
    case 'NT':
    case 'NU':
    case 'YT':
      return { gst: 0.05, pst: 0, hst: 0, qst: 0 };

    // GST + PST provinces
    case 'BC': // 5% GST + 7% PST
      return { gst: 0.05, pst: 0.07, hst: 0, qst: 0 };
    case 'MB': // 5% GST + 7% PST
      return { gst: 0.05, pst: 0.07, hst: 0, qst: 0 };
    case 'SK': // 5% GST + 6% PST
      return { gst: 0.05, pst: 0.06, hst: 0, qst: 0 };

    // HST provinces
    case 'ON': // 13% HST
      return { gst: 0, pst: 0, hst: 0.13, qst: 0 };
    case 'NB': // 15% HST
    case 'NS':
    case 'PE':
    case 'NL':
      return { gst: 0, pst: 0, hst: 0.15, qst: 0 };

    // Quebec (GST + QST)
    case 'QC': // 5% GST + 9.975% QST
      return { gst: 0.05, pst: 0, hst: 0, qst: 0.09975 };

    default:
      return { gst: 0, pst: 0, hst: 0, qst: 0 };
  }
};

export const calculateTaxes = (
  subtotal: number,
  provinceCode: keyof typeof PROVINCES | undefined,
  isInternational: boolean,
  taxableItems: boolean = true
): TaxCalculation => {
  // No tax for international clients
  if (isInternational || !provinceCode || !taxableItems) {
    return {
      subtotal,
      gst: 0,
      pst: 0,
      hst: 0,
      qst: 0,
      total: subtotal,
    };
  }

  const rates = getTaxRates(provinceCode);
  const gst = subtotal * rates.gst;
  const pst = subtotal * rates.pst;
  const hst = subtotal * rates.hst;
  const qst = subtotal * rates.qst;
  
  // Calculate total including all applicable taxes
  const total = subtotal + gst + pst + hst + qst;

  return {
    subtotal,
    gst,
    pst,
    hst,
    qst,
    total,
  };
};

export const formatTaxLabel = (provinceCode: keyof typeof PROVINCES | undefined, taxType: 'gst' | 'pst' | 'hst' | 'qst'): string => {
  if (!provinceCode) return '';

  const rates = getTaxRates(provinceCode);
  
  switch (taxType) {
    case 'gst':
      return rates.gst > 0 ? `GST (${(rates.gst * 100).toFixed(0)}%)` : '';
    case 'pst':
      return rates.pst > 0 ? `PST (${(rates.pst * 100).toFixed(1)}%)` : '';
    case 'hst':
      return rates.hst > 0 ? `HST (${(rates.hst * 100).toFixed(1)}%)` : '';
    case 'qst':
      return rates.qst > 0 ? `QST (${(rates.qst * 100).toFixed(3)}%)` : '';
    default:
      return '';
  }
};