export type QRType = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'sms';

export type HistoryType = 'scan' | 'generate';

export interface HistoryItem {
  id: string;
  type: HistoryType;
  content: string;
  timestamp: number;
  qrType?: QRType | 'barcode';
  barcodeFormat?: string; // e.g. EAN_13, CODE_128, etc.
  label?: string; // Option to set user-friendly label
}

export interface QRConfig {
  fgColor: string;
  bgColor: string;
  size: number;
  margin: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  logoDataUrl?: string; // Custom uploaded logo or selected default logo
  logoSizePercent?: number;
}
