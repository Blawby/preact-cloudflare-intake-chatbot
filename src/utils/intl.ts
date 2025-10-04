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
    minimumFractionDigits,
    maximumFractionDigits
  }: FormatCurrencyOptions = {}
): string => {
  if (Number.isNaN(value)) {
    return '';
  }

  const resolvedLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency
  };

  if (minimumFractionDigits !== undefined) {
    options.minimumFractionDigits = minimumFractionDigits;
  }
  if (maximumFractionDigits !== undefined) {
    options.maximumFractionDigits = maximumFractionDigits;
  }

  return new Intl.NumberFormat(resolvedLocale, options).format(value);
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
