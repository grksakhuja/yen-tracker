export function penceToPounds(pence: number): number {
  return Math.round(pence) / 100;
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function formatGBP(pence: number): string {
  const pounds = penceToPounds(pence);
  return `\u00A3${pounds.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatJPY(jpy: number): string {
  return `\u00A5${Math.round(jpy).toLocaleString('en-JP')}`;
}

export function formatRate(rate: number): string {
  return rate.toFixed(2);
}

export function convertGbpToJpy(gbpPence: number, rate: number): number {
  return Math.round((gbpPence / 100) * rate);
}

export function convertJpyToGbp(jpy: number, rate: number): number {
  return Math.round((jpy / rate) * 100);
}

export function calculateFee(amount: number, feePct: number): number {
  return Math.round((amount * feePct) / 100);
}
