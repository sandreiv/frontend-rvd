const SUPPORTED_FILE_TYPE_ICONS = new Set([
  'aac',
  'avi',
  'doc',
  'gif',
  'jpg',
  'mp3',
  'mpg',
  'pdf',
  'png',
  'ppt',
  'txt',
  'xls',
  'xml',
  'zip',
]);

export function getFileExtension(fileName: string): string {
  const normalized = (fileName ?? '').trim().toLowerCase();
  const parts = normalized.split('.');
  return parts.length > 1 ? (parts.pop() ?? 'txt') : 'txt';
}

export function getFileTypeIconPath(fileName: string): string {
  const extension = getFileExtension(fileName);
  const icon = SUPPORTED_FILE_TYPE_ICONS.has(extension) ? extension : 'txt';
  return `/images/file-types/${icon}.svg`;
}
