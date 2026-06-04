import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  Upload, 
  Copy, 
  ExternalLink, 
  Wifi, 
  Mail, 
  Check, 
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  Clock,
  History
} from 'lucide-react';
import { HistoryItem } from '../types';
import { copyTextToClipboard } from '../utils/clipboard';

interface QRScannerProps {
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
}

export default function QRScanner({ onAddHistory }: QRScannerProps) {
  const [scanMode, setScanMode] = useState<'camera' | 'file'>('camera');
  const [scanResult, setScanResult] = useState<string>('');
  const [formatName, setFormatName] = useState<string>('');
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'qr-camera-element';

  // Fetch cameras on mount or when mode changes to 'camera'
  useEffect(() => {
    if (scanMode === 'camera') {
      Html5Qrcode.getCameras()
        .then((devices) => {
          setCameraList(devices);
          if (devices.length > 0) {
            // Find a rear camera if possible
            const rearCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
            setSelectedCameraId(rearCamera ? rearCamera.id : devices[0].id);
          }
        })
        .catch((err) => {
          console.error('Error fetching cameras:', err);
          setErrorMessage('Could not find or access system cameras. Please use File Upload mode.');
        });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [scanMode]);

  const startCamera = async (cameraId: string) => {
    if (!cameraId) return;
    setErrorMessage('');
    setScanResult('');
    setFormatName('');

    try {
      if (scannerRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      // Scan standard QR as well as common linear Barcodes
      const config = {
        fps: 10,
        qrbox: (width: number, height: number) => {
          // Dynamic square scaling box centered exactly on mobile
          const size = Math.round(Math.min(width, height) * 0.65);
          return { width: size, height: size };
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF
        ]
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText, decodedResult) => {
          const rawFormat = decodedResult?.result?.format?.formatName || 'QR_CODE';
          handleSuccessScan(decodedText, rawFormat);
          
          // Flash effect
          const el = document.getElementById(scannerContainerId);
          if (el) {
            el.classList.add('ring-4', 'ring-emerald-500');
            setTimeout(() => el.classList.remove('ring-4', 'ring-emerald-500'), 400);
          }
        },
        () => {
          // Verbose log from html5-qrcode, ignore to avoid spamming UI
        }
      );

      setScannerActive(true);
    } catch (err: any) {
      console.error('Failed to start camera scan:', err);
      setErrorMessage(`Camera initialization failed: ${err.message || err}. Ensure page has permissions.`);
      setScannerActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Failed to stop camera scan:', err);
      }
    }
    scannerRef.current = null;
    setScannerActive(false);
  };

  const toggleScanner = () => {
    if (scannerActive) {
      stopCamera();
    } else {
      startCamera(selectedCameraId);
    }
  };

  // Process file upload parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setScanResult('');
    setFormatName('');

    // Temporarily mount Html5Qrcode to parse the file image
    const parser = new Html5Qrcode(scannerContainerId);
    
    parser.scanFile(file, true)
      .then((decodedText) => {
        // Find format based on content, default to QR code
        handleSuccessScan(decodedText, 'UPLOADED_FILE');
      })
      .catch((err) => {
        console.error('File scan error:', err);
        setErrorMessage('Could not detect any QR code or Barcode in this image. Try high-contrast files.');
      });
  };

  const handleSuccessScan = (text: string, format: string) => {
    setScanResult(text);
    setFormatName(format);

    // Save history
    const isBarcode = format !== 'QR_CODE';
    let qrType: any = 'text';
    
    if (text.startsWith('http://') || text.startsWith('https://') || text.includes('www.')) {
      qrType = 'url';
    } else if (text.startsWith('WIFI:')) {
      qrType = 'wifi';
    } else if (text.startsWith('mailto:')) {
      qrType = 'email';
    } else if (text.startsWith('tel:')) {
      qrType = 'phone';
    } else if (isBarcode) {
      qrType = 'barcode';
    }

    onAddHistory({
      type: 'scan',
      content: text,
      qrType: qrType,
      barcodeFormat: isBarcode ? format : undefined
    });
  };

  const copyResult = () => {
    if (!scanResult) return;
    copyTextToClipboard(scanResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Smooth scroll to results once decoded on small devices
  useEffect(() => {
    if (scanResult) {
      const resultsEl = document.getElementById('decoded-spectrum-box');
      if (resultsEl && typeof window !== 'undefined' && window.innerWidth < 1024) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [scanResult]);

  // Helper parsers to make results actionable
  const isUrl = scanResult.startsWith('http://') || scanResult.startsWith('https://') || scanResult.includes('www.');
  const isWifi = scanResult.startsWith('WIFI:');
  const isEmail = scanResult.startsWith('mailto:');
  
  const parsedWifiInfo = () => {
    if (!isWifi) return null;
    // Format: WIFI:S:SSID;T:WPA;P:password;;
    const sMatch = scanResult.match(/S:([^;]+)/);
    const pMatch = scanResult.match(/P:([^;]+)/);
    const tMatch = scanResult.match(/T:([^;]+)/);
    return {
      ssid: sMatch ? sMatch[1] : 'Unknown',
      password: pMatch ? pMatch[1] : 'None',
      type: tMatch ? tMatch[1] : 'WPA'
    };
  };

  const cleanUrl = () => {
    if (!isUrl) return '';
    return scanResult.startsWith('http') ? scanResult : `https://${scanResult}`;
  };

  return (
    <div id="scanner-root" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT: SCANNING CANVAS & CAM CONTROLS */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Toggle Mode */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#e8dfd3]/80 dark:border-white/10 shadow-sm rounded-xl p-1.5 flex gap-1 font-mono">
          <button
            id="mode-camera-btn"
            onClick={() => setScanMode('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all cursor-pointer ${
              scanMode === 'camera' 
                ? 'bg-[#f4efe8]/85 dark:bg-[#151515] text-[#8a6f48] dark:text-[#c2a378] shadow-sm border border-[#e8dfd3]/60 dark:border-white/5' 
                : 'text-slate-500 dark:text-white/40 hover:text-[#aa8d65] dark:hover:text-[#c2a378]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera Scan
          </button>
          <button
            id="mode-file-btn"
            onClick={() => setScanMode('file')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all cursor-pointer ${
              scanMode === 'file' 
                ? 'bg-[#f4efe8]/85 dark:bg-[#151515] text-[#8a6f48] dark:text-[#c2a378] shadow-sm border border-[#e8dfd3]/60 dark:border-white/5' 
                : 'text-slate-500 dark:text-white/40 hover:text-[#aa8d65] dark:hover:text-[#c2a378]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File/Image
          </button>
        </div>

        {/* Camera Stage */}
        <div className="relative bg-slate-950 dark:bg-black rounded-xl overflow-hidden border border-[#e8dfd3]/50 dark:border-white/10 shadow-lg group aspect-[4/3] xs:aspect-[4/3] sm:aspect-video lg:aspect-[4/3] max-h-[250px] xs:max-h-[290px] sm:max-h-[380px] lg:max-h-none flex flex-col items-center justify-center text-white w-full">
          
          {/* HTML5 QR Container (Camera viewport or hidden parser frame for files) */}
          <div 
            id={scannerContainerId} 
            className={`w-full h-full max-w-full rounded-xl bg-black ${
              scanMode === 'file' ? 'absolute opacity-0 pointer-events-none' : ''
            }`}
          />

          {/* Fallbacks & File interface */}
          {scanMode === 'file' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-4">
              <div className="p-3 sm:p-4 bg-slate-900/60 dark:bg-[#070707] border border-[#ebd3b4]/20 rounded-full text-[#aa8d65] dark:text-[#c2a378] group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="space-y-1">
                <p className="font-serif italic text-base sm:text-lg text-slate-200">Parse Document Image</p>
                <p className="text-[10px] sm:text-[11px] text-slate-400 max-w-xs mx-auto font-mono uppercase tracking-wider">
                  Drag and drop code files here, or upload to scan instantly.
                </p>
              </div>
              <button
                id="file-upload-trigger"
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#aa8d65] hover:bg-[#8a6f48] dark:bg-[#c2a378] dark:hover:bg-[#a88a5e] text-white font-mono uppercase tracking-wider font-bold text-xs py-2 px-5 rounded-lg shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
              >
                Upload Image
              </button>
              <input
                id="file-scanner-input"
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {scanMode === 'camera' && !scannerActive && (
            <div className="absolute inset-0 bg-slate-950 dark:bg-black flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-4 z-10">
              <div className="p-3 sm:p-4 bg-slate-900/40 dark:bg-[#0c0c0c] border border-white/5 rounded-full text-[#aa8d65] dark:text-[#c2a378]/75 animate-pulse-slow">
                <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="space-y-1">
                <p className="font-serif italic text-base sm:text-lg text-slate-200">Device Video Capture</p>
                <p className="text-[10px] sm:text-[11px] text-slate-400 max-w-xs mx-auto font-mono uppercase tracking-wider">
                  Select start to activate live feeds and decode visual signatures.
                </p>
              </div>
              <button
                id="start-camera-prompt"
                onClick={() => startCamera(selectedCameraId)}
                className="bg-[#aa8d65] hover:bg-[#8a6f48] dark:bg-[#c2a378] dark:hover:bg-[#a88a5e] text-white font-mono uppercase tracking-wider font-bold text-xs py-2.5 px-6 rounded-lg transition-all cursor-pointer hover:-translate-y-0.5"
              >
                Start Scanner
              </button>
            </div>
          )}

          {/* Active laser animation inside scanner box */}
          {scanMode === 'camera' && scannerActive && (
            <div className="absolute inset-0 pointer-events-none border border-[#aa8d65]/10 dark:border-[#c2a378]/10 flex items-center justify-center z-10">
              {/* Target Scan Box Overlay */}
              <div className="w-[50%] xs:w-[45%] sm:w-[50%] aspect-square max-w-[200px] sm:max-w-[245px] border-2 border-dashed border-[#aa8d65]/70 dark:border-[#c2a378]/60 rounded-xl relative flex items-center justify-center">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-[#aa8d65] dark:bg-[#c2a378] shadow-[0_0_8px_#c2a378] animate-[bounce_3s_infinite_ease-in-out]" />
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-[#f4efe8] dark:text-[#c2a378] bg-black/80 px-2 sm:px-2.5 py-1 rounded-md absolute bottom-2 tracking-[0.1em] uppercase border border-white/5 whitespace-nowrap">
                  ALIGN TARGET MATRIX
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Camera Select dropdown */}
        {scanMode === 'camera' && cameraList.length > 0 && (
          <div className="bg-white dark:bg-[#0a0a0a] border border-[#e8dfd3]/80 dark:border-white/10 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-[#aa8d65] dark:text-[#c2a378]" />
              <div>
                <span className="text-xs font-mono font-bold tracking-wider text-[#8a6f48] dark:text-white/70 block uppercase font-bold">HARDWARE RESOURCE BUS</span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-white/30 truncate block">Devices detected: {cameraList.length} units</span>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <select
                id="camera-select-dropdown"
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  if (scannerActive) startCamera(e.target.value);
                }}
                className="flex-1 md:flex-none px-3 py-2 rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] text-[11px] font-mono tracking-wide focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] inline-block shadow-inner outline-none font-semibold"
              >
                {cameraList.map((cam) => (
                  <option key={cam.id} value={cam.id} className="bg-white dark:bg-[#0a0a0a]">
                    {cam.label || `Camera Dev-${cam.id.slice(0, 5)}`}
                  </option>
                ))}
              </select>

              <button
                id="toggle-camera-btn"
                onClick={toggleScanner}
                className={`px-4 py-2 rounded-lg text-[10px] font-mono tracking-widest uppercase font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scannerActive 
                    ? 'bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/40' 
                    : 'bg-[#aa8d65] text-white hover:bg-[#8a6f48] dark:bg-[#c2a378] dark:hover:bg-[#a88a5e]'
                }`}
              >
                {scannerActive ? (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    Shutdown
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    Engage
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error notification if any */}
        {errorMessage && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-xl flex gap-3 text-amber-800 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0 pt-0.5" />
            <div className="text-xs font-mono tracking-wide space-y-1">
              <p className="font-bold uppercase tracking-widest text-[#aa8d65]">DIAGNOSTIC FAULT</p>
              <p className="text-slate-500 dark:text-white/60">{errorMessage}</p>
            </div>
          </div>
        )}

      </div>

      {/* RIGHT: LIVE SCAN RESULTS BOX */}
      <div id="decoded-spectrum-box" className="lg:col-span-5 space-y-6 scroll-mt-24 w-full">
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#e8dfd3]/80 dark:border-white/10 shadow-sm rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 pb-3.5 border-b border-[#e8dfd3]/50 dark:border-white/5 mb-5">
            <History className="w-4 h-4 text-[#aa8d65] dark:text-[#c2a378]" />
            <h3 className="font-serif italic text-lg text-[#8a6f48] dark:text-[#c2a378]">
              Decoded Spectrum
            </h3>
          </div>

          {scanResult ? (
            <div className="space-y-5 animate-[fadeIn_0.3s_ease]">
              
              {/* Type and Format Tags */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-[#8a6f48] dark:text-[#c2a378] bg-[#f4efe8] dark:bg-white/[0.02] px-2.5 py-1 rounded-full border border-[#e8dfd3]/60 dark:border-white/5 flex items-center gap-1.5 animate-pulse">
                  <Check className="w-3 h-3" strokeWidth={3} />
                  SIGNATURE KEY DECODED
                </span>
                {formatName && (
                  <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-white/40 bg-[#faf9f6]/90 dark:bg-black px-2 py-0.5 rounded border border-slate-250/60 dark:border-white/5">
                    {formatName}
                  </span>
                )}
              </div>

              {/* Resolved Text Display */}
              <div className="bg-white dark:bg-[#050505] border border-[#e8dfd3]/80 dark:border-white/10 p-4 rounded-lg break-all font-mono text-xs text-slate-800 dark:text-[#e0e0e0] selection:bg-[#ebd3b4]/30 relative max-h-[140px] overflow-y-auto shadow-inner">
                {scanResult}
              </div>

              {/* WIFI Parsed view */}
              {isWifi && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#111] border border-[#ebd3b4]/40 dark:border-white/5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8a6f48] dark:text-[#c2a378] font-bold uppercase tracking-wider">
                    <Wifi className="w-4 h-4" />
                    <span>WLAN Provision Payload</span>
                  </div>
                  {parsedWifiInfo() && (
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono pt-1.5">
                      <div>
                        <span className="text-slate-400 block uppercase">Network SSID</span>
                        <span className="font-bold text-slate-800 dark:text-[#e0e0e0] text-xs leading-5">{parsedWifiInfo()?.ssid}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase">Cipher Standard</span>
                        <span className="font-bold text-slate-800 dark:text-[#e0e0e0] text-xs leading-5">{parsedWifiInfo()?.type}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block uppercase">Pass Key Phrase</span>
                        <span className="font-mono text-slate-600 dark:text-[#c2a378] font-bold bg-[#faf9f6] dark:bg-black px-2 py-1.5 rounded border border-[#e8dfd3] dark:border-white/5 inline-block mt-0.5 select-all">
                          {parsedWifiInfo()?.password}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 space-y-2 font-mono">
                <button
                  id="scanner-copy-btn"
                  onClick={copyResult}
                  className="w-full flex items-center justify-center gap-2 bg-[#aa8d65] hover:bg-[#8a6f48] dark:bg-[#c2a378] dark:hover:bg-[#a88a5e] font-bold text-white py-2.5 rounded-lg text-[10px] tracking-widest uppercase transition-all cursor-pointer shadow-sm hover:-translate-y-0.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      COPIED TO CLIPBOARD!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      COPY RESOLVED CONTENT
                    </>
                  )}
                </button>

                {isUrl && (
                  <a
                    id="scanner-url-visit-btn"
                    href={cleanUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 dark:bg-black hover:dark:bg-white/[0.02] text-[#8a6f48] dark:text-[#c2a378] py-2.5 rounded-lg text-[10px] font-extrabold tracking-widest uppercase transition-all cursor-pointer border border-[#e8dfd3] dark:border-white/10 text-center block hover:-translate-y-0.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#aa8d65] dark:text-[#c2a378]" />
                    LAUNCH WEB RESOURCE
                  </a>
                )}

                {isEmail && (
                  <a
                    id="scanner-email-btn"
                    href={scanResult}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 dark:bg-black hover:dark:bg-white/[0.02] text-[#8a6f48] dark:text-[#c2a378] py-2.5 rounded-lg text-[10px] font-extrabold tracking-widest uppercase transition-all cursor-pointer border border-[#e8dfd3] dark:border-white/10 text-center block hover:-translate-y-0.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#aa8d65] dark:text-[#c2a378]" />
                    DISPATCH EMAIL REQUEST
                  </a>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-10 space-y-2.5 border border-dashed border-[#e8dfd3] dark:border-white/10 rounded-xl">
              <Clock className="w-7 h-7 text-slate-400 mx-auto animate-pulse-slow" />
              <div className="space-y-1">
                <p className="text-xs font-mono tracking-widest uppercase font-bold text-slate-500 dark:text-white/40">Resource Awaiting Capture Input</p>
                <p className="text-[10px] font-mono text-slate-400 dark:text-white/20 max-w-[210px] mx-auto uppercase tracking-wide">
                  Engage webcam scan matrix or load files to resolve indicators.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
