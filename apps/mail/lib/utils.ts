import { format, isToday, isThisMonth, differenceInCalendarMonths } from 'date-fns';
import { MAX_URL_LENGTH } from './constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { JSONContent } from 'novel';
import LZString from 'lz-string';
import axios from 'axios';

export const FOLDERS = {
  SPAM: 'spam',
  INBOX: 'inbox',
  ARCHIVE: 'archive',
  TRASH: 'trash',
  DRAFT: 'draft',
  SENT: 'sent',
} as const;

export const LABELS = {
  SPAM: 'SPAM',
  INBOX: 'INBOX',
  UNREAD: 'UNREAD',
  IMPORTANT: 'IMPORTANT',
  SENT: 'SENT',
} as const;

export const FOLDER_NAMES = [
  'inbox',
  'spam',
  'trash',
  'unread',
  'starred',
  'important',
  'sent',
  'draft',
];

export const FOLDER_TAGS: Record<string, string[]> = {
  [FOLDERS.SPAM]: [LABELS.SPAM],
  [FOLDERS.INBOX]: [LABELS.INBOX],
  [FOLDERS.ARCHIVE]: [],
  [FOLDERS.SENT]: [LABELS.SENT],
};

export const getFolderTags = (folder: string): string[] => {
  return FOLDER_TAGS[folder] || [];
};

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const compressText = (text: string): string => {
  const compressed = LZString.compressToEncodedURIComponent(text);
  return compressed.slice(0, MAX_URL_LENGTH);
};

export const decompressText = (compressed: string): string => {
  return LZString.decompressFromEncodedURIComponent(compressed) || '';
};

export const getCookie = (key: string): string | null => {
  const cookies = Object.fromEntries(
    document.cookie.split('; ').map((v) => v.split(/=(.*)/s).map(decodeURIComponent)),
  );
  return cookies?.[key] ?? null;
};

export const formatDate = (date: string) => {
  try {
    // Handle empty or invalid input
    if (!date) {
      return '';
    }

    // Parse the date string to a Date object
    const dateObj = new Date(date);
    const now = new Date();

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date', date);
      return '';
    }

    // If it's today, always show the time
    if (isToday(dateObj)) {
      return format(dateObj, 'h:mm a');
    }

    // Calculate hours difference between now and the email date
    const hoursDifference = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);

    // If it's not today but within the last 12 hours, show the time
    if (hoursDifference <= 12) {
      return format(dateObj, 'h:mm a');
    }

    // If it's this month or last month, show the month and day
    if (isThisMonth(dateObj) || differenceInCalendarMonths(now, dateObj) === 1) {
      return format(dateObj, 'MMM dd');
    }

    // Otherwise show the date in MM/DD/YY format
    return format(dateObj, 'MM/dd/yy');
  } catch (error) {
    console.error('Error formatting date', error);
    return '';
  }
};

export const cleanEmailAddress = (email: string = '') => {
  return email.replace(/[<>]/g, '').trim();
};

export const truncateFileName = (name: string, maxLength = 15) => {
  if (name.length <= maxLength) return name;
  const extIndex = name.lastIndexOf('.');
  if (extIndex !== -1 && name.length - extIndex <= 5) {
    return `${name.slice(0, maxLength - 5)}...${name.slice(extIndex)}`;
  }
  return `${name.slice(0, maxLength)}...`;
};

export const fetcher = (url: string) => axios.get(url).then((res) => res.data);

export type FilterSuggestion = {
  filter: string;
  description: string;
  icon: React.ReactNode;
  prefix: string;
};

export const extractFilterValue = (filter: string): string => {
  if (!filter || !filter.includes(':')) return '';

  const colonIndex = filter.indexOf(':');
  const value = filter.substring(colonIndex + 1);

  return value || '';
};

export const defaultPageSize = 20;

export function createSectionId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (mimeType: string): string => {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '📊';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    return '📝';
  if (mimeType.includes('image')) return ''; // Empty for images as they're handled separately
  return '📎'; // Default icon
};

export const convertJSONToHTML = (json: any): string => {
  if (!json) return '';

  // Handle different types
  if (typeof json === 'string') return json;
  if (typeof json === 'number' || typeof json === 'boolean') return json.toString();
  if (json === null) return '';

  // Handle arrays
  if (Array.isArray(json)) {
    return json.map((item) => convertJSONToHTML(item)).join('');
  }

  // Handle objects (assuming they might have specific email content structure)
  if (typeof json === 'object') {
    // Check if it's a text node
    if (json.type === 'text') {
      let text = json.text || '';

      // Apply formatting if present
      if (json.bold) text = `<strong>${text}</strong>`;
      if (json.italic) text = `<em>${text}</em>`;
      if (json.underline) text = `<u>${text}</u>`;
      if (json.code) text = `<code>${text}</code>`;

      return text;
    }

    // Handle paragraph
    if (json.type === 'paragraph') {
      return `<p>${convertJSONToHTML(json.children)}</p>`;
    }

    // Handle headings
    if (json.type?.startsWith('heading-')) {
      const level = json.type.split('-')[1];
      return `<h${level}>${convertJSONToHTML(json.children)}</h${level}>`;
    }

    // Handle lists
    if (json.type === 'bulleted-list') {
      return `<ul>${convertJSONToHTML(json.children)}</ul>`;
    }

    if (json.type === 'numbered-list') {
      return `<ol>${convertJSONToHTML(json.children)}</ol>`;
    }

    if (json.type === 'list-item') {
      return `<li>${convertJSONToHTML(json.children)}</li>`;
    }

    // Handle links
    if (json.type === 'link') {
      return `<a href="${json.url}">${convertJSONToHTML(json.children)}</a>`;
    }

    // Handle images
    if (json.type === 'image') {
      return `<img src="${json.url}" alt="${json.alt || ''}" />`;
    }

    // Handle blockquote
    if (json.type === 'block-quote') {
      return `<blockquote>${convertJSONToHTML(json.children)}</blockquote>`;
    }

    // Handle code blocks
    if (json.type === 'code-block') {
      return `<pre><code>${convertJSONToHTML(json.children)}</code></pre>`;
    }

    // If it has children property, process it
    if (json.children) {
      return convertJSONToHTML(json.children);
    }

    // Process all other properties
    return Object.values(json)
      .map((value) => convertJSONToHTML(value))
      .join('');
  }

  return '';
};

export const createAIJsonContent = (text: string): JSONContent => {
  // Try to identify common sign-off patterns with a more comprehensive regex
  const signOffPatterns = [
    /\b((?:Best regards|Regards|Sincerely|Thanks|Thank you|Cheers|Best|All the best|Yours truly|Yours sincerely|Kind regards|Cordially)(?:,)?)\s*\n+\s*([A-Za-z][A-Za-z\s.]*)$/i,
  ];

  let mainContent = text;
  let signatureLines: string[] = [];

  // Extract sign-off if found
  for (const pattern of signOffPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Find the index where the sign-off starts
      const signOffIndex = text.lastIndexOf(match[0]);
      if (signOffIndex > 0) {
        // Split the content
        mainContent = text.substring(0, signOffIndex).trim();

        // Split the signature part into separate lines
        const signature = text.substring(signOffIndex).trim();
        signatureLines = signature
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
        break;
      }
    }
  }

  // If no signature was found with regex but there are newlines at the end,
  // check if the last lines could be a signature
  if (signatureLines.length === 0) {
    const allLines = text.split(/\n+/);
    if (allLines.length > 1) {
      // Check if last 1-3 lines might be a signature (short lines at the end)
      const potentialSigLines = allLines
        .slice(-3)
        .filter(
          (line) =>
            line.trim().length < 60 && !line.trim().endsWith('?') && !line.trim().endsWith('.'),
        );

      if (potentialSigLines.length > 0) {
        signatureLines = potentialSigLines;
        mainContent = allLines
          .slice(0, allLines.length - potentialSigLines.length)
          .join('\n')
          .trim();
      }
    }
  }

  // Split the main content into paragraphs
  const paragraphs = mainContent
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0 && signatureLines.length === 0) {
    // If no paragraphs and no signature were found, treat the whole text as one paragraph
    paragraphs.push(text);
  }

  // Create a content array with appropriate spacing between paragraphs
  const content = [];

  paragraphs.forEach((paragraph, index) => {
    // Add the content paragraph
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: paragraph }],
    });

    // Add an empty paragraph between main paragraphs
    if (index < paragraphs.length - 1) {
      content.push({
        type: 'paragraph',
      });
    }
  });

  // If we found a signature, add it with proper spacing
  if (signatureLines.length > 0) {
    // Add spacing before the signature if there was content
    if (paragraphs.length > 0) {
      content.push({
        type: 'paragraph',
      });
    }

    // Add each line of the signature as a separate paragraph
    signatureLines.forEach((line) => {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line }],
      });
    });
  }

  return {
    type: 'doc',
    content: content,
  };
};

export const getEmailLogo = (email: string) => {
  if (!process.env.NEXT_PUBLIC_IMAGE_API_URL) return '';
  return process.env.NEXT_PUBLIC_IMAGE_API_URL + email;
};
