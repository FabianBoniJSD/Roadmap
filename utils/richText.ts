import type { Project } from '@/types';
import sanitizeHtml from 'sanitize-html';

const RICH_TEXT_EMPTY_HTML = ['<p><br></p>', '<p></p>', '<br>', '<br/>', '<br />'];

const richTextSanitizeOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'blockquote',
    'ul',
    'ol',
    'li',
    'h2',
    'h3',
    'a',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  disallowedTagsMode: 'discard' as const,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer',
      target: '_blank',
    }),
  },
};

const plainTextSanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeLineBreaks = (value: string): string => value.replace(/\r\n?/g, '\n');

const looksLikeHtml = (value: string): boolean => /<\/?[a-z][\s\S]*>/i.test(value);

const convertPlainTextToHtml = (value: string): string => {
  const normalized = normalizeLineBreaks(value).trim();
  if (!normalized) return '';

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
};

const toSanitizableHtml = (value?: string | null): string => {
  const normalized = normalizeLineBreaks(String(value || '')).trim();
  if (!normalized) return '';
  if (RICH_TEXT_EMPTY_HTML.includes(normalized)) return '';
  return looksLikeHtml(normalized) ? normalized : convertPlainTextToHtml(normalized);
};

export const getRichTextPlainText = (value?: string | null): string => {
  const html = toSanitizableHtml(value);
  if (!html) return '';

  return sanitizeHtml(html, plainTextSanitizeOptions)
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const sanitizeRichTextHtml = (value?: string | null): string => {
  const html = toSanitizableHtml(value);
  if (!html) return '';

  const sanitized = sanitizeHtml(html, richTextSanitizeOptions).trim();
  if (!getRichTextPlainText(sanitized)) {
    return '';
  }

  return sanitized;
};

export const normalizeRichTextEditorValue = (value?: string | null): string =>
  sanitizeRichTextHtml(value);

export const sanitizeProjectRichTextFields = (project: Partial<Project>): Partial<Project> => {
  const next = { ...project };

  if (typeof next.description === 'string') {
    next.description = sanitizeRichTextHtml(next.description);
  }
  if (typeof next.bisher === 'string') {
    next.bisher = sanitizeRichTextHtml(next.bisher);
  }
  if (typeof next.zukunft === 'string') {
    next.zukunft = sanitizeRichTextHtml(next.zukunft);
  }

  return next;
};

export const sanitizeSettingRichTextFields = <T extends { description?: string | null }>(
  setting: T
): T => {
  const next = { ...setting };
  if (typeof next.description === 'string') {
    next.description = sanitizeRichTextHtml(next.description) as T['description'];
  }
  return next;
};
