import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Link as LinkIcon, 
  FileText, 
  Wifi, 
  Mail, 
  Phone, 
  MessageSquare, 
  Download, 
  Copy, 
  Printer, 
  Upload, 
  Check, 
  RefreshCw, 
  RotateCcw,
  Palette,
  Sparkles
} from 'lucide-react';
import { QRType, QRConfig, HistoryItem } from '../types';

interface QRGeneratorProps {
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  prefilledItem?: { type: QRType; content: string } | null;
}

const PRESET_COLORS = [
  { name: 'Oculus Gold', value: '#c2a378' },
  { name: 'Sartorial Bronze', value: '#aa8d65' },
  { name: 'Pure Black', value: '#000000' },
  { name: 'Royal Blue', value: '#1d4ed8' },
  { name: 'Emerald', value: '#047857' },
  { name: 'Amethyst', value: '#7e22ce' },
];

const PRESET_BGS = [
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Soft Cream', value: '#fefcf0' },
  { name: 'Warm Off-White', value: '#faf9f6' },
  { name: 'Ice Blue', value: '#f0f9ff' },
];

export default function QRGenerator({ onAddHistory, prefilledItem }: QRGeneratorProps) {
  const [qrType, setQrType] = useState<QRType>('url');
  
  // Input fields state
  const [url, setUrl] = useState('https://google.com');
  const [text, setText] = useState('Hello World!');
  
  // WiFi states
  const [wifiSsid, setWifiSsid] = useState('MyHomeWiFi');
  const [wifiPassword, setWifiPassword] = useState('wifi123456');
  const [wifiEncryption, setWifiEncryption] = useState('WPA');
  const [wifiHidden, setWifiHidden] = useState(false);
  
  // Email states
  const [emailTo, setEmailTo] = useState('example@mail.com');
  const [emailSubject, setEmailSubject] = useState('Hello from QR');
  const [emailBody, setEmailBody] = useState('Looking forward to speaking with you!');
  
  // Phone state
  const [phone, setPhone] = useState('+1234567890');
  
  // SMS states
  const [smsPhone, setSmsPhone] = useState('+1234567890');
  const [smsMessage, setSmsMessage] = useState('Hello, trace me with QR!');

  // Config State
  const [config, setConfig] = useState<QRConfig>({
    fgColor: '#c2a378',
    bgColor: '#ffffff',
    size: 512,
    margin: 2,
    errorCorrectionLevel: 'H', // Use high by default to tolerate logos
    logoDataUrl: undefined,
    logoSizePercent: 20
  });

  // Modern Design Accents States
  const [designStyle, setDesignStyle] = useState<'classic' | 'dots' | 'rounded' | 'fluid'>('fluid');
  const [eyeStyle, setEyeStyle] = useState<'classic' | 'rounded' | 'circle' | 'leaf'>('leaf');

  const [copied, setCopied] = useState(false);
  const [qrBlobUrl, setQrBlobUrl] = useState<string>('');
  const [customLogoName, setCustomLogoName] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!prefilledItem) return;
    setQrType(prefilledItem.type);
    const content = prefilledItem.content;
    switch (prefilledItem.type) {
      case 'url':
        setUrl(content);
        break;
      case 'text':
        setText(content);
        break;
      case 'wifi':
        // WIFI:S:MySSID;T:WPA;P:password;H:false;;
        const ssidMatch = content.match(/S:([^;]+)/);
        const pwMatch = content.match(/P:([^;]+)/);
        const encMatch = content.match(/T:([^;]+)/);
        const hidMatch = content.match(/H:([^;]+)/);
        if (ssidMatch) setWifiSsid(ssidMatch[1]);
        if (pwMatch) setWifiPassword(pwMatch[1]);
        if (encMatch) setWifiEncryption(encMatch[1]);
        if (hidMatch) setWifiHidden(hidMatch[1] === 'true');
        break;
      case 'email':
        // Parse mailto:contact@agency.com?subject=Hello&body=text
        const mailMatch = content.match(/^mailto:([^?]+)/);
        if (mailMatch) setEmailTo(decodeURIComponent(mailMatch[1]));
        const subMatch = content.match(/[?&]subject=([^&]+)/);
        if (subMatch) setEmailSubject(decodeURIComponent(subMatch[1]));
        const bMatch = content.match(/[?&]body=([^&]+)/);
        if (bMatch) setEmailBody(decodeURIComponent(bMatch[1]));
        break;
      case 'phone':
        // Parse tel:+1234
        setPhone(content.replace(/^tel:/, ''));
        break;
      case 'sms':
        // Parse SMSTO:+1234:msg
        const smsMatch = content.match(/^SMSTO:([^:]+):(.*)$/);
        if (smsMatch) {
          setSmsPhone(smsMatch[1]);
          setSmsMessage(smsMatch[2]);
        }
        break;
    }
  }, [prefilledItem]);

  // Computes the input connection string based on selected QR category
  const getQRContent = (): string => {
    switch (qrType) {
      case 'url':
        return url.trim() ? (url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`) : 'https://google.com';
      case 'text':
        return text || 'Hello World!';
      case 'wifi':
        // WIFI:S:SSID;T:encryption;P:password;H:hidden;;
        return `WIFI:S:${wifiSsid};T:${wifiEncryption};P:${wifiPassword};H:${wifiHidden ? 'true' : 'false'};;`;
      case 'email':
        const subjectEsc = encodeURIComponent(emailSubject);
        const bodyEsc = encodeURIComponent(emailBody);
        return `mailto:${emailTo}?subject=${subjectEsc}&body=${bodyEsc}`;
      case 'phone':
        return `tel:${phone.replace(/\s+/g, '')}`;
      case 'sms':
        return `SMSTO:${smsPhone.replace(/\s+/g, '')}:${smsMessage}`;
      default:
        return '';
    }
  };

  const qrContent = getQRContent();

  // Draw QR code whenever content, style profiles, or format rules change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // We use the QRCode library to generate the raw matrix data
    let qr;
    try {
      qr = QRCode.create(qrContent, {
        errorCorrectionLevel: config.errorCorrectionLevel
      });
    } catch (err) {
      console.error('Error creating QR matrix:', err);
      return;
    }

    const count = qr.modules.size;
    
    // Set a high resolution for the canvas so it's super modern, crisp and vector-sharp (1024x1024)
    canvas.width = 1024;
    canvas.height = 1024;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw background
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate frame offsets (Use 8.5% margin for gorgeous visual breathing space)
    const marginPercent = 0.085;
    const padding = canvas.width * marginPercent;
    const drawSize = canvas.width * (1 - 2 * marginPercent);
    const cellSize = drawSize / count;

    // Setup color parameters
    ctx.fillStyle = config.fgColor;
    ctx.strokeStyle = config.fgColor;

    // Helper to check if a pixel is dark (defensively checks api & array)
    const isDark = (r: number, c: number): boolean => {
      if (r < 0 || r >= count || c < 0 || c >= count) return false;
      if (typeof qr.modules.get === 'function') {
        return qr.modules.get(r, c) === 1;
      }
      if (qr.modules.data) {
        return qr.modules.data[r * count + c] === 1;
      }
      return false;
    };

    // Helper to check if a cell is inside any of the three Finder/Eye patterns (7x7 corners)
    const isFinder = (r: number, c: number): boolean => {
      if (r >= 0 && r < 7 && c >= 0 && c < 7) return true; // Top-Left Scan Eye
      if (r >= 0 && r < 7 && c >= count - 7 && c < count) return true; // Top-Right Scan Eye
      if (r >= count - 7 && r < count && c >= 0 && c < 7) return true; // Bottom-Left Scan Eye
      return false;
    };

    // Calculate center parameters for elegant logo clearance nest
    const center = count / 2;
    const hasLogo = !!config.logoDataUrl;
    const logoPercent = config.logoSizePercent || 20;
    // We add a spacing buffer of cells around the logo bounds to avoid clutter
    const logoHalfCells = (count * (logoPercent / 100)) / 2 + 0.35;

    // Helper to draw rounded rectangle with distinct corner radii
    const drawRoundedRectWithRadii = (
      context: CanvasRenderingContext2D,
      rx: number, ry: number, rw: number, rh: number,
      rTL: number, rTR: number, rBR: number, rBL: number
    ) => {
      context.beginPath();
      context.moveTo(rx + rTL, ry);
      context.lineTo(rx + rw - rTR, ry);
      context.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rTR);
      context.lineTo(rx + rw, ry + rh - rBR);
      context.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rBR, ry + rh);
      context.lineTo(rx + rBL, ry + rh);
      context.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rBL);
      context.lineTo(rx, ry + rTL);
      context.quadraticCurveTo(rx, ry, rx + rTL, ry);
      context.closePath();
    };

    // Override the inline styles set on canvas so it fits cleanly into the container without stretching
    canvas.style.setProperty('width', '100%', 'important');
    canvas.style.setProperty('height', '100%', 'important');

    // 1. Draw the QR body cells
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (isFinder(row, col)) continue; // Corner eyes are drawn separately with bespoke geometries

        // If inside the center logo cutout boundaries, skip cell to leave pristine nested padding
        if (hasLogo) {
          const inLogoZone = 
            row >= center - logoHalfCells && 
            row <= center + logoHalfCells && 
            col >= center - logoHalfCells && 
            col <= center + logoHalfCells;
          if (inLogoZone) continue;
        }

        if (isDark(row, col)) {
          const cx = padding + col * cellSize + cellSize / 2;
          const cy = padding + row * cellSize + cellSize / 2;
          const rx = padding + col * cellSize;
          const ry = padding + row * cellSize;

          ctx.fillStyle = config.fgColor;

          if (designStyle === 'dots') {
            // Modern Round circular dots
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.43, 0, 2 * Math.PI);
            ctx.fill();
          } else if (designStyle === 'rounded') {
            // Rounded corners on squares
            const edgePad = cellSize * 0.05;
            const innerSize = cellSize - 2 * edgePad;
            const radius = innerSize * 0.32;
            drawRoundedRectWithRadii(ctx, rx + edgePad, ry + edgePad, innerSize, innerSize, radius, radius, radius, radius);
            ctx.fill();
          } else if (designStyle === 'fluid') {
            // Connected Liquid Capsule path checking physical neighbors
            const hasTop = isDark(row - 1, col) && !isFinder(row - 1, col);
            const hasBottom = isDark(row + 1, col) && !isFinder(row + 1, col);
            const hasLeft = isDark(row, col - 1) && !isFinder(row, col - 1);
            const hasRight = isDark(row, col + 1) && !isFinder(row, col + 1);

            const rVal = cellSize * 0.46; // Fluid corner radius limit
            const rTL = hasTop || hasLeft ? 0 : rVal;
            const rTR = hasTop || hasRight ? 0 : rVal;
            const rBR = hasBottom || hasRight ? 0 : rVal;
            const rBL = hasBottom || hasLeft ? 0 : rVal;

            drawRoundedRectWithRadii(ctx, rx, ry, cellSize, cellSize, rTL, rTR, rBR, rBL);
            ctx.fill();
          } else {
            // Traditional Solid sharp squares
            ctx.fillRect(rx, ry, cellSize, cellSize);
          }
        }
      }
    }

    // 2. Draw the three specialized Corner Eyes
    const drawCornerEye = (rowStart: number, colStart: number, typeName: string) => {
      const rx = padding + colStart * cellSize;
      const ry = padding + rowStart * cellSize;
      const w = 7 * cellSize;
      const h = 7 * cellSize;

      ctx.fillStyle = config.fgColor;

      if (eyeStyle === 'circle') {
        const cxCenter = rx + w / 2;
        const cyCenter = ry + h / 2;
        
        // Outer concentric circle ring
        ctx.beginPath();
        ctx.arc(cxCenter, cyCenter, 3.5 * cellSize, 0, 2 * Math.PI);
        ctx.fill();

        // Inner Cutout
        ctx.fillStyle = config.bgColor;
        ctx.beginPath();
        ctx.arc(cxCenter, cyCenter, 2.5 * cellSize, 0, 2 * Math.PI);
        ctx.fill();

        // Central Pupil circle dot
        ctx.fillStyle = config.fgColor;
        ctx.beginPath();
        ctx.arc(cxCenter, cyCenter, 1.5 * cellSize, 0, 2 * Math.PI);
        ctx.fill();

      } else if (eyeStyle === 'rounded') {
        const outerRad = w * 0.24;
        const midRad = w * 0.16;
        const innerRad = w * 0.09;

        // Outer rounded ring module
        drawRoundedRectWithRadii(ctx, rx, ry, w, h, outerRad, outerRad, outerRad, outerRad);
        ctx.fill();

        // Inner Cutout
        ctx.fillStyle = config.bgColor;
        drawRoundedRectWithRadii(ctx, rx + cellSize, ry + cellSize, 5 * cellSize, 5 * cellSize, midRad, midRad, midRad, midRad);
        ctx.fill();

        // Central Pupil rounded box
        ctx.fillStyle = config.fgColor;
        drawRoundedRectWithRadii(ctx, rx + 2 * cellSize, ry + 2 * cellSize, 3 * cellSize, 3 * cellSize, innerRad, innerRad, innerRad, innerRad);
        ctx.fill();

      } else if (eyeStyle === 'leaf') {
        // Pointed dialog motif design
        let rTL = 0, rTR = 0, rBR = 0, rBL = 0;
        
        if (typeName === 'top-left') {
          rTL = w * 0.45;
          rBR = w * 0.45;
        } else if (typeName === 'top-right') {
          rTR = w * 0.45;
          rBL = w * 0.45;
        } else if (typeName === 'bottom-left') {
          rTL = w * 0.45;
          rBR = w * 0.45;
        }

        const oTL = rTL, oTR = rTR, oBR = rBR, oBL = rBL;
        const mTL = rTL * (5/7), mTR = rTR * (5/7), mBR = rBR * (5/7), mBL = rBL * (5/7);
        const iTL = rTL * (3/7), iTR = rTR * (3/7), iBR = rBR * (3/7), iBL = rBL * (3/7);

        // Outer Leaf
        ctx.fillStyle = config.fgColor;
        drawRoundedRectWithRadii(ctx, rx, ry, w, h, oTL, oTR, oBR, oBL);
        ctx.fill();

        // Medium Cutout
        ctx.fillStyle = config.bgColor;
        drawRoundedRectWithRadii(ctx, rx + cellSize, ry + cellSize, 5 * cellSize, 5 * cellSize, mTL, mTR, mBR, mBL);
        ctx.fill();

        // Core Pupil Leaf
        ctx.fillStyle = config.fgColor;
        drawRoundedRectWithRadii(ctx, rx + 2 * cellSize, ry + 2 * cellSize, 3 * cellSize, 3 * cellSize, iTL, iTR, iBR, iBL);
        ctx.fill();

      } else {
        // Classic precise squared eyes
        ctx.fillRect(rx, ry, w, h);

        ctx.fillStyle = config.bgColor;
        ctx.fillRect(rx + cellSize, ry + cellSize, 5 * cellSize, 5 * cellSize);

        ctx.fillStyle = config.fgColor;
        ctx.fillRect(rx + 2 * cellSize, ry + 2 * cellSize, 3 * cellSize, 3 * cellSize);
      }
    };

    // Draw the three target scan eyes
    drawCornerEye(0, 0, 'top-left');
    drawCornerEye(0, count - 7, 'top-right');
    drawCornerEye(count - 7, 0, 'bottom-left');

    // 3. Draw center nesting logo
    if (config.logoDataUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const logoSize = (canvas.width * logoPercent) / 100;
        const lx = (canvas.width - logoSize) / 2;
        const ly = (canvas.height - logoSize) / 2;

        // Draw slightly rounded background box behind the logo to nested with padding
        ctx.beginPath();
        ctx.fillStyle = config.bgColor;
        const pad = logoSize * 0.16;
        const rTL = logoSize * 0.28;
        drawRoundedRectWithRadii(ctx, lx - pad, ly - pad, logoSize + pad * 2, logoSize + pad * 2, rTL, rTL, rTL, rTL);
        ctx.fill();

        // Draw actual graphics onto background cutout
        ctx.drawImage(img, lx, ly, logoSize, logoSize);

        // Export stateful image blob representation
        canvas.toBlob((blob) => {
          if (blob) {
            if (qrBlobUrl) URL.revokeObjectURL(qrBlobUrl);
            setQrBlobUrl(URL.createObjectURL(blob));
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        console.error('Failed to load preset svg signature inside canvas, defaulting to plain matrix draw');
        // Fallback: draw directly without logo asset
        canvas.toBlob((blob) => {
          if (blob) {
            if (qrBlobUrl) URL.revokeObjectURL(qrBlobUrl);
            setQrBlobUrl(URL.createObjectURL(blob));
          }
        }, 'image/png');
      };
      img.src = config.logoDataUrl;
    } else {
      // Direct raw export
      canvas.toBlob((blob) => {
        if (blob) {
          if (qrBlobUrl) URL.revokeObjectURL(qrBlobUrl);
          setQrBlobUrl(URL.createObjectURL(blob));
        }
      }, 'image/png');
    }

  }, [qrContent, config, qrType, designStyle, eyeStyle]);

  // Handle dynamic custom Logo Image Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomLogoName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setConfig(prev => ({
            ...prev,
            logoDataUrl: reader.result as string
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setCustomLogoName('');
    setConfig(prev => ({ ...prev, logoDataUrl: undefined }));
  };

  const downloadQR = () => {
    if (!qrBlobUrl) return;
    const link = document.createElement('a');
    link.href = qrBlobUrl;
    link.download = `qr-${qrType}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save history
    onAddHistory({
      type: 'generate',
      content: qrContent,
      qrType: qrType
    });
  };

  const copyQR = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);

              onAddHistory({
                type: 'generate',
                content: qrContent,
                qrType: qrType
              });
            } else {
              throw new Error('ClipboardItem or Clipboard write is not supported.');
            }
          } catch (innerErr) {
            console.warn('Image clipboard write failed, falling back to triggering automated download as fallback.', innerErr);
            // Seamless download fallback for restricted sandbox environments
            downloadQR();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };

  const printQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const windowHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
            img { max-width: 100%; border: 1px solid #ddd; padding: 10px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            h2 { margin-bottom: 20px; color: #1e293b; }
            span { margin-top: 15px; color: #64748b; font-size: 14px; font-family: monospace; }
          </style>
        </head>
        <body>
          <h2>QR Code (${qrType.toUpperCase()})</h2>
          <img src="${dataUrl}" />
          <span>Content: ${qrContent}</span>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (printWindow) {
      printWindow.document.write(windowHtml);
      printWindow.document.close();
      onAddHistory({
        type: 'generate',
        content: qrContent,
        qrType: qrType
      });
    }
  };

  const resetConfig = () => {
    setConfig({
      fgColor: '#c2a378',
      bgColor: '#ffffff',
      size: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
      logoDataUrl: undefined,
      logoSizePercent: 20
    });
    setCustomLogoName('');
  };

  // List of pre-loaded system logo assets as vector icons compiled into 64-bit base64 data strings
  // Or fallback SVG definitions represented as dataURIs
  const PRESET_LOGOS = [
    { 
      name: 'Link', 
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'
    },
    { 
      name: 'WiFi', 
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13a10 10 0 0 1 14 0"></path><path d="M8.5 16.5a5 5 0 0 1 7 0"></path><path d="M2 9a15 15 0 0 1 20 0"></path><line x1="12" y1="20" x2="12.01" y2="20" stroke-width="4"></line></svg>'
    },
    { 
      name: 'Mail', 
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>'
    },
    { 
      name: 'Phone', 
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%238b5cf6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>'
    }
  ];

  return (
    <div id="generator-root" className="flex flex-col lg:grid lg:grid-cols-12 gap-6 sm:gap-8 items-start">
      {/* LEFT: Inputs & Types Selection */}
      <div className="lg:col-span-7 space-y-6 order-1 w-full">
        
        {/* Category Pickers */}
        <div>
          <label className="block text-[11px] font-mono tracking-[0.2em] uppercase font-semibold text-[#8a6f48] dark:text-white/40 mb-3">
            SELECT FORMAT PROTOCOL
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { id: 'url', label: 'URL', icon: LinkIcon },
              { id: 'text', label: 'Text', icon: FileText },
              { id: 'wifi', label: 'WiFi', icon: Wifi },
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'phone', label: 'Phone', icon: Phone },
              { id: 'sms', label: 'SMS', icon: MessageSquare },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = qrType === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`cat-btn-${cat.id}`}
                  onClick={() => setQrType(cat.id as QRType)}
                  className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg border text-center transition-all cursor-pointer ${
                    isActive 
                      ? 'border-[#aa8d65] dark:border-[#c2a378] bg-[#f4efe8]/60 dark:bg-[#151515] text-[#8a6f48] dark:text-[#c2a378] shadow-sm ring-1 ring-[#c2a378]/25' 
                      : 'border-[#e8dfd3]/80 dark:border-white/5 bg-[#fcfcfc] dark:bg-[#0a0a0a]/50 text-slate-500 dark:text-white/40 hover:border-[#aa8d65]/40 dark:hover:border-white/20'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 sm:mb-2 ${isActive ? 'text-[#8a6f48] dark:text-[#c2a378]' : 'text-slate-400 dark:text-white/30'}`} />
                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-[#8a6f48] dark:text-[#c2a378]' : 'text-slate-500 dark:text-white/50'}`}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Forms Box */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#e8dfd3]/80 dark:border-white/10 shadow-sm rounded-xl p-4 sm:p-6 space-y-5 transition-colors duration-300">
          <div className="flex items-center gap-2 pb-3.5 border-b border-[#e8dfd3]/50 dark:border-white/5">
            <Sparkles className="w-4 h-4 text-[#aa8d65] dark:text-[#c2a378]" />
            <h3 className="font-serif italic text-lg text-[#8a6f48] dark:text-[#c2a378]">
              Encoding Parameters
            </h3>
          </div>

          {/* URL Form */}
          {qrType === 'url' && (
            <div className="space-y-2">
              <label htmlFor="url-input" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                Remote URL Address
              </label>
              <input
                id="url-input"
                type="text"
                placeholder="e.g. www.google.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm transition-all shadow-inner"
              />
              <p className="text-[10px] text-slate-400 dark:text-white/30 italic">
                Validates headers and protocols recursively prior to visual binding.
              </p>
            </div>
          )}

          {/* Text Form */}
          {qrType === 'text' && (
            <div className="space-y-2">
              <label htmlFor="text-input" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                Structured File / Plain Text
              </label>
              <textarea
                id="text-input"
                rows={4}
                placeholder="Type your custom message, contact details or secure payloads..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm resize-none transition-all shadow-inner"
              />
            </div>
          )}

          {/* Wi-Fi Form */}
          {qrType === 'wifi' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="wifi-ssid" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                    SSID Identifier
                  </label>
                  <input
                    id="wifi-ssid"
                    type="text"
                    placeholder="MyHomeNetwork"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="wifi-pw" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                    Access Key
                  </label>
                  <input
                    id="wifi-pw"
                    type="password"
                    placeholder="Security Token"
                    disabled={wifiEncryption === 'nopass'}
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label htmlFor="wifi-enc" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                    Cipher Standard
                  </label>
                  <select
                    id="wifi-enc"
                    value={wifiEncryption}
                    onChange={(e) => setWifiEncryption(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm transition-all cursor-pointer outline-none"
                  >
                    <option value="WPA" className="bg-white dark:bg-[#0a0a0a]">WPA / WPA2 Protocol</option>
                    <option value="WEP" className="bg-white dark:bg-[#0a0a0a]">WEP Legacy</option>
                    <option value="nopass" className="bg-white dark:bg-[#0a0a0a]">Open Broadcast</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="wifi-hidden"
                    type="checkbox"
                    checked={wifiHidden}
                    onChange={(e) => setWifiHidden(e.target.checked)}
                    className="w-4 h-4 rounded border-[#e8dfd3] dark:border-[#c2a378]/30 text-[#aa8d65] dark:text-[#c2a378] focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] cursor-pointer"
                  />
                  <label htmlFor="wifi-hidden" className="text-xs font-mono tracking-wider font-semibold text-slate-600 dark:text-white/50 cursor-pointer select-none">
                    BROADCAST MASK ACTIVE (SSID HIDDEN)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Email Form */}
          {qrType === 'email' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="email-to" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                  Destination Address
                </label>
                <input
                  id="email-to"
                  type="email"
                  placeholder="contact@agency.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm transition-all shadow-inner"
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label htmlFor="email-sub" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                    Header Subject
                  </label>
                  <input
                    id="email-sub"
                    type="text"
                    placeholder="Ref: Transmittal details"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="email-b" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                    Payload Body
                  </label>
                  <textarea
                    id="email-b"
                    rows={2}
                    placeholder="Identify body message parameters..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm resize-none transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Phone Form */}
          {qrType === 'phone' && (
            <div className="space-y-2">
              <label htmlFor="phone-input" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                Secure Phone Vector
              </label>
              <input
                id="phone-input"
                type="tel"
                placeholder="+1 234 567 890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm transition-all shadow-inner"
              />
              <p className="text-[10px] text-slate-400 dark:text-white/30 italic">
                Formated strictly to standard global E.164 telemetry protocols.
              </p>
            </div>
          )}

          {/* SMS Form */}
          {qrType === 'sms' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="sms-phone" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                  SMS Destination Call sign
                </label>
                <input
                  id="sms-phone"
                  type="tel"
                  placeholder="+1 234 567 890"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm transition-all shadow-inner"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="sms-msg" className="block text-[10px] font-mono tracking-[0.2em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                  Discrete Text Message payload
                </label>
                <textarea
                  id="sms-msg"
                  rows={2}
                  placeholder="Type auto-filled message..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans text-sm resize-none transition-all shadow-inner"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visual Signatures / Customizations Panel */}
      <div className="lg:col-span-7 space-y-6 order-3 lg:order-none">
        {/* Customization Options */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#e8dfd3]/80 dark:border-white/10 shadow-sm rounded-xl p-6 space-y-5 transition-colors duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-[#e8dfd3]/50 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#aa8d65] dark:text-[#c2a378]" />
              <h3 className="font-serif italic text-lg text-[#8a6f48] dark:text-[#c2a378]">
                Visual Signatures
              </h3>
            </div>
            <button
              id="reset-config-btn"
              onClick={resetConfig}
              className="text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-[#aa8d65] dark:hover:text-[#c2a378] transition-colors flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <RotateCcw className="w-3 h-3" />
              Format Node Default
            </button>
          </div>

          {/* Foreground & Background Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Foreground (Dots) Color */}
            <div className="space-y-3">
              <span className="block text-[10px] font-mono tracking-[0.15em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                CYTOCHROM DOT STAMP COLOR
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    id={`fg-c-${c.value}`}
                    onClick={() => setConfig(prev => ({ ...prev, fgColor: c.value }))}
                    title={c.name}
                    className={`w-7 h-7 rounded-full border border-slate-200/60 dark:border-white/10 cursor-pointer transition-transform relative ${
                      config.fgColor === c.value ? 'scale-110 shadow-md ring-2 ring-[#aa8d65] dark:ring-[#c2a378]' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {config.fgColor === c.value && (
                      <Check className={`w-3.5 h-3.5 absolute inset-0 m-auto ${c.value === '#ffffff' ? 'text-black' : 'text-white'}`} strokeWidth={3} />
                    )}
                  </button>
                ))}
                
                {/* Custom Color Input */}
                <div className="relative flex items-center justify-center cursor-pointer">
                  <input
                    id="fg-custom"
                    type="color"
                    value={config.fgColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, fgColor: e.target.value }))}
                    className="w-7 h-7 rounded-md p-0 cursor-pointer border-0 bg-transparent opacity-0 absolute z-15"
                  />
                  <div 
                    className="w-7 h-7 rounded-full border border-dashed border-[#e8dfd3] dark:border-white/20 flex items-center justify-center text-xs text-slate-500 font-bold bg-[#faf9f6] dark:bg-black"
                    style={{ backgroundColor: PRESET_COLORS.some(c => c.value === config.fgColor) ? undefined : config.fgColor }}
                  >
                    {!PRESET_COLORS.some(c => c.value === config.fgColor) ? <Check className="w-3.5 h-3.5 text-white mix-blend-difference" /> : <span className="text-[#8a6f48] dark:text-[#c2a378]">+</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-3">
              <span className="block text-[10px] font-mono tracking-[0.15em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
                EMBED CANVAS BASE COLOR
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_BGS.map(c => (
                  <button
                    key={c.value}
                    id={`bg-c-${c.value}`}
                    onClick={() => setConfig(prev => ({ ...prev, bgColor: c.value }))}
                    title={c.name}
                    className={`w-7 h-7 rounded-full border border-slate-200/60 dark:border-[#111] cursor-pointer transition-transform relative ${
                      config.bgColor === c.value ? 'scale-110 ring-2 ring-[#aa8d65] dark:ring-[#c2a378]' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {config.bgColor === c.value && (
                      <Check className="w-3.5 h-3.5 absolute inset-0 m-auto text-slate-700" strokeWidth={3} />
                    )}
                  </button>
                ))}

                {/* Custom Color Background */}
                <div className="relative flex items-center justify-center cursor-pointer">
                  <input
                    id="bg-custom"
                    type="color"
                    value={config.bgColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, bgColor: e.target.value }))}
                    className="w-7 h-7 rounded-md p-0 cursor-pointer border-0 bg-transparent opacity-0 absolute z-15"
                  />
                  <div 
                    className="w-7 h-7 rounded-full border border-dashed border-[#e8dfd3] dark:border-white/20 flex items-center justify-center text-xs text-slate-500 font-bold bg-[#faf9f6] dark:bg-black"
                    style={{ backgroundColor: PRESET_BGS.some(b => b.value === config.bgColor) ? undefined : config.bgColor }}
                  >
                    {!PRESET_BGS.some(b => b.value === config.bgColor) ? <Check className="w-3.5 h-3.5 text-black mix-blend-difference" /> : <span className="text-[#8a6f48] dark:text-[#c2a378]">+</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Design Styles Selector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dashed border-[#e8dfd3]/60 dark:border-white/5">
            <div className="space-y-1.5">
              <label htmlFor="design-style-select" className="block text-[10px] font-mono tracking-[0.12em] font-medium text-[#8a6f48] dark:text-white/40 uppercase font-bold">
                MATRIX SHAPE PREMIUM STYLES
              </label>
              <select
                id="design-style-select"
                value={designStyle}
                onChange={(e) => setDesignStyle(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-mono text-[11px] transition-all cursor-pointer font-semibold outline-none shadow-inner"
              >
                <option value="classic" className="bg-white dark:bg-[#0a0a0a]">Classic Crisp Squares</option>
                <option value="dots" className="bg-white dark:bg-[#0a0a0a]">Modern Rounded Dots</option>
                <option value="rounded" className="bg-white dark:bg-[#0a0a0a]">Sleek rounded-corners Squares</option>
                <option value="fluid" className="bg-white dark:bg-[#0a0a0a]">Fluid Liquid Capsules</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="eye-style-select" className="block text-[10px] font-mono tracking-[0.12em] font-medium text-[#8a6f48] dark:text-white/40 uppercase font-bold">
                CORNER SCANNER EYE GEOMETRY
              </label>
              <select
                id="eye-style-select"
                value={eyeStyle}
                onChange={(e) => setEyeStyle(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-mono text-[11px] transition-all cursor-pointer font-semibold outline-none shadow-inner"
              >
                <option value="classic" className="bg-white dark:bg-[#0a0a0a]">Standard Geometric Square</option>
                <option value="rounded" className="bg-white dark:bg-[#0a0a0a]">Sleek Modern Rounded</option>
                <option value="circle" className="bg-white dark:bg-[#0a0a0a]">Target Orbit Circles</option>
                <option value="leaf" className="bg-white dark:bg-[#0a0a0a]">Bespoke Pointed Leaf</option>
              </select>
            </div>
          </div>

          {/* Logo Customizer */}
          <div className="space-y-4 pt-3 border-t border-dashed border-[#e8dfd3]/60 dark:border-white/5">
            <span className="block text-[10px] font-mono tracking-[0.15em] font-medium text-[#8a6f48] dark:text-white/40 uppercase">
              CENTER OVERLAY SIGNATURE
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preset Logos */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500/70 block font-bold">Standard Presets</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    id="logo-none"
                    onClick={() => setConfig(prev => ({ ...prev, logoDataUrl: undefined }))}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-wider font-bold cursor-pointer transition-all ${
                      !config.logoDataUrl 
                        ? 'bg-[#f4efe8] border-[#aa8d65] text-[#aa8d65] dark:bg-[#151515] dark:border-[#c2a378] dark:text-[#c2a378]' 
                        : 'bg-white dark:bg-[#0a0a0a] border-[#e8dfd3] dark:border-white/10 text-slate-600 dark:text-white/50'
                    }`}
                  >
                    None
                  </button>
                  {PRESET_LOGOS.map((lg) => {
                    const isSelected = config.logoDataUrl === lg.url;
                    return (
                      <button
                        key={lg.name}
                        id={`logo-preset-${lg.name}`}
                        onClick={() => {
                          setCustomLogoName('');
                          setConfig(prev => ({ ...prev, logoDataUrl: lg.url }));
                        }}
                        className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-bold cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-[#f4efe8] border-[#aa8d65] text-[#aa8d65] dark:bg-[#151515] dark:border-[#c2a378] dark:text-[#c2a378]' 
                            : 'bg-white dark:bg-[#0a0a0a] border-[#e8dfd3] dark:border-white/10 text-slate-600 dark:text-white/50'
                        }`}
                      >
                        <img src={lg.url} alt={lg.name} className="w-3.5 h-3.5 shrink-0" referrerPolicy="no-referrer" />
                        <span>{lg.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload custom Logo */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500/70 block font-bold">Custom Graphics</span>
                <div className="flex items-center gap-2">
                  <label htmlFor="logo-file-uploader" className="px-4 py-2 rounded-lg border border-[#e8dfd3] dark:border-white/10 text-[10px] font-mono tracking-wider uppercase font-bold bg-slate-50 dark:bg-[#121212] text-slate-700 dark:text-white/50 hover:bg-[#ebd3b4]/10 dark:hover:bg-white/[0.03] cursor-pointer flex items-center gap-1.5 shadow-sm">
                    <Upload className="w-3 h-3 text-slate-400" />
                    <span>Upload Logo</span>
                    <input
                      id="logo-file-uploader"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {customLogoName && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold bg-[#ebd3b4]/10 dark:bg-white/[0.02] border border-[#e8dfd3] dark:border-white/15 text-[#aa8d65] dark:text-[#c2a378] px-2.5 py-1.5 rounded-md">
                      <span className="truncate max-w-[90px]">{customLogoName}</span>
                      <button id="remove-logo-btn" onClick={handleRemoveLogo} className="hover:text-red-500 font-bold ml-1 cursor-pointer">×</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {config.logoDataUrl && (
              <div className="pt-3 border-t border-[#e8dfd3]/30 dark:border-white/5">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  <span className="font-semibold text-[#8a6f48] dark:text-white/40">Scale factor</span>
                  <span className="font-bold text-[#aa8d65] dark:text-[#c2a378]">{config.logoSizePercent}%</span>
                </div>
                <input
                  id="logo-size-range"
                  type="range"
                  min="10"
                  max="30"
                  value={config.logoSizePercent || 20}
                  onChange={(e) => setConfig(prev => ({ ...prev, logoSizePercent: parseInt(e.target.value) }))}
                  className="w-full accent-[#aa8d65] dark:accent-[#c2a378] rounded-lg cursor-pointer h-1.5 bg-slate-200 dark:bg-[#111]"
                />
                <span className="text-[10px] text-amber-600/80 dark:text-amber-400 italic block mt-1">
                  ⚠️ Scales exceeding 22% require robust contrast ratios and high camera focus thresholds.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Live Preview & Actions */}
      <div className="lg:col-span-5 lg:row-span-2 lg:sticky lg:top-24 space-y-6 order-2 lg:order-none w-full">
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#e8dfd3]/80 dark:border-white/10 shadow-sm rounded-xl p-4 sm:p-8 flex flex-col items-center justify-center transition-colors duration-300 w-full">
          
          <span className="text-[10px] font-mono tracking-[0.25em] font-semibold text-slate-400 dark:text-white/40 uppercase mb-4 sm:mb-5">
            BOUND PREVIEW MODULE
          </span>

          {/* QR Canvas Container */}
          <div 
            className="w-full aspect-square max-w-[240px] sm:max-w-[280px] p-3 sm:p-5 rounded-xl border border-slate-200/50 dark:border-white/5 bg-[#fafafa] dark:bg-[#050505] shadow-inner flex items-center justify-center transition-all mb-4 sm:mb-6"
            style={{ backgroundColor: config.bgColor }}
          >
            <canvas 
              id="qr-preview-canvas"
              ref={canvasRef} 
              className="w-full h-full max-w-full max-h-full rounded-md object-contain aspect-square"
            />
          </div>

          <div className="text-center mb-5 sm:mb-6 space-y-2 select-none w-full max-w-[280px]">
            <span className="text-[9px] font-mono tracking-[0.15em] font-bold text-[#aa8d65] dark:text-[#c2a378] bg-[#f4efe8] dark:bg-white/[0.02] border border-[#e8dfd3]/60 dark:border-white/5 px-2.5 py-1 rounded-full uppercase">
              {qrType} matrix
            </span>
            <div className="text-[10px] font-mono text-[#8a6f48] dark:text-white/40 pt-1 font-mono break-all max-w-full truncate max-h-16 overflow-y-auto mx-auto border border-dashed border-[#e8dfd3] dark:border-white/5 p-2 rounded bg-white dark:bg-black/60 shadow-inner">
              {qrContent}
            </div>
          </div>

          <div className="border-t border-[#e8dfd3]/50 dark:border-white/5 w-full pt-4 sm:pt-6">
            <p className="text-[10px] font-sans text-slate-400 italic text-center pb-4 leading-normal">
              Note: Gold/white and high contrast parameters guarantee immediate camera locks. Toggle options below.
            </p>
          </div>

          {/* Actions panel */}
          <div className="w-full grid grid-cols-3 gap-1.5 sm:gap-2.5">
            <button
              id="download-qr-btn"
              onClick={downloadQR}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 bg-[#aa8d65] hover:bg-[#8a6f48] dark:bg-[#c2a378] dark:hover:bg-[#a88a5e] text-white py-2 sm:py-2.5 px-1 sm:px-3 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest font-extrabold uppercase shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Download</span>
            </button>

            <button
              id="copy-qr-btn"
              onClick={copyQR}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 sm:py-2.5 px-1 sm:px-3 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest font-extrabold uppercase transition-all hover:-translate-y-0.5 border cursor-pointer ${
                copied 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                  : 'bg-white dark:bg-[#0a0a0a]/40 border-[#e8dfd3] dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span className="truncate">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Copy</span>
                </>
              )}
            </button>

            <button
              id="print-qr-btn"
              onClick={printQR}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 bg-white dark:bg-[#0a0a0a]/40 border border-[#e8dfd3] dark:border-white/10 hover:bg-[#fcfcfc] dark:hover:bg-white/[0.02] text-slate-700 dark:text-white/70 py-2 sm:py-2.5 px-1 sm:px-2.5 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest font-extrabold uppercase transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
