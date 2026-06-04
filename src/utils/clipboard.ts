/**
 * Resilient helper to copy plain text to the system clipboard.
 * It uses the modern navigator.clipboard API first, and automatically
 * falls back to a temporary textarea select & document.execCommand('copy') mechanism
 * if the modern API is not supported, blocked by sandboxing, or fails due to document focus.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard first
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed (could be due to sandbox/focus limitations), trying manual fallback...', err);
    }
  }

  // 2. Clear manual fallback using document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Avoid scrolling when placing of screen
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    // Perform copy action
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Fallback copy mechanism also failed:', err);
    return false;
  }
}
