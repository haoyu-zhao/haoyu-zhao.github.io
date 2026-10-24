// The fallback also supports a directly opened file:// preview.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Some browsers disallow the Clipboard API for local files.
  }

  const active = document.activeElement as HTMLElement | null;
  const selection = window.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none';
  document.body.append(field);
  try {
    field.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    active?.focus({ preventScroll: true });
    selection?.removeAllRanges();
    ranges.forEach(range => selection?.addRange(range));
  }
}
