export type ColorMode = 'dark' | 'light';

export const COLOR_MODE_STORAGE_KEY = 'roadmap-color-mode';
export const COLOR_MODE_ATTRIBUTE = 'data-color-mode';
export const DEFAULT_COLOR_MODE: ColorMode = 'dark';

const isColorMode = (value: string | null | undefined): value is ColorMode => {
  return value === 'dark' || value === 'light';
};

export const getStoredColorMode = (): ColorMode | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storedValue = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return isColorMode(storedValue) ? storedValue : null;
  } catch {
    return null;
  }
};

export const getActiveColorMode = (): ColorMode => {
  if (typeof document !== 'undefined') {
    const attributeValue = document.documentElement.getAttribute(COLOR_MODE_ATTRIBUTE);
    if (isColorMode(attributeValue)) return attributeValue;
  }

  return getStoredColorMode() ?? DEFAULT_COLOR_MODE;
};

export const applyColorMode = (colorMode: ColorMode): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(COLOR_MODE_ATTRIBUTE, colorMode);
    document.documentElement.style.colorScheme = colorMode;
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
    } catch {
      /* ignore storage write issues */
    }
  }
};

export const getColorModeInitScript = (): string => {
  return `(() => {
    const root = document.documentElement;
    const fallback = '${DEFAULT_COLOR_MODE}';

    try {
      const storedValue = window.localStorage.getItem('${COLOR_MODE_STORAGE_KEY}');
      const colorMode = storedValue === 'light' || storedValue === 'dark' ? storedValue : fallback;
      root.setAttribute('${COLOR_MODE_ATTRIBUTE}', colorMode);
      root.style.colorScheme = colorMode;
    } catch {
      root.setAttribute('${COLOR_MODE_ATTRIBUTE}', fallback);
      root.style.colorScheme = fallback;
    }
  })();`;
};
