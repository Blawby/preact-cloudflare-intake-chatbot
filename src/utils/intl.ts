export interface FormatCurrencyOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export const formatCurrency = (
  value: number,
  {
    locale,
    currency = 'USD',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  }: FormatCurrencyOptions = {}
): string => {
  if (Number.isNaN(value)) {
    return '';
  }

  const resolvedLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
};

export interface FormatNumberOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export const formatNumber = (
  value: number,
  {
    locale,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  }: FormatNumberOptions = {}
): string => {
  if (Number.isNaN(value)) {
    return '';
  }

  const resolvedLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

  return new Intl.NumberFormat(resolvedLocale, {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
};
