type NativePickerElement = HTMLInputElement | HTMLSelectElement;

export function openNativePicker<T extends NativePickerElement>(event: { currentTarget: T }) {
  const element = event.currentTarget as T & { showPicker?: () => void };

  if (typeof element.showPicker !== 'function') return;

  try {
    element.showPicker();
  } catch {
    // Browsers can reject showPicker when an input is disabled, readonly, or
    // not opened from a direct user gesture. The native click still proceeds.
  }
}
