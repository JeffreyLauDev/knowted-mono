import { marked } from 'marked';

/**
 * Converts markdown text to HTML with safe defaults for email templates
 * @param markdownText - The markdown text to convert
 * @returns HTML string with proper formatting for email display
 */
export function markdownToHtml(markdownText: string): string {
  if (!markdownText || typeof markdownText !== 'string') {
    return '';
  }

  // Configure marked with safe options for email
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  try {
    return marked(markdownText.trim());
  } catch (error) {
    // If markdown parsing fails, return the original text
    console.warn('Failed to parse markdown:', error);
    return markdownText.trim();
  }
}

/**
 * Converts markdown text to HTML with additional email-specific formatting
 * @param markdownText - The markdown text to convert
 * @returns HTML string optimized for email display
 */
export function markdownToEmailHtml(markdownText: string): string {
  if (!markdownText || typeof markdownText !== 'string') {
    return 'No summary available for this meeting.';
  }

  const html = markdownToHtml(markdownText);
  
  // Add email-specific styling classes
  return html
    .replace(/<h1([^>]*)>/g, '<h1$1 style="color: #1D503A; font-size: 24px; font-weight: 600; margin: 16px 0 8px 0;">')
    .replace(/<h2([^>]*)>/g, '<h2$1 style="color: #1D503A; font-size: 20px; font-weight: 600; margin: 16px 0 8px 0;">')
    .replace(/<h3([^>]*)>/g, '<h3$1 style="color: #1D503A; font-size: 18px; font-weight: 600; margin: 12px 0 6px 0;">')
    .replace(/<h4([^>]*)>/g, '<h4$1 style="color: #1D503A; font-size: 16px; font-weight: 600; margin: 12px 0 6px 0;">')
    .replace(/<h5([^>]*)>/g, '<h5$1 style="color: #1D503A; font-size: 14px; font-weight: 600; margin: 8px 0 4px 0;">')
    .replace(/<h6([^>]*)>/g, '<h6$1 style="color: #1D503A; font-size: 14px; font-weight: 600; margin: 8px 0 4px 0;">')
    .replace(/<p>/g, '<p style="margin: 8px 0; line-height: 1.6;">')
    .replace(/<ul>/g, '<ul style="margin: 8px 0; padding-left: 20px;">')
    .replace(/<ol>/g, '<ol style="margin: 8px 0; padding-left: 20px;">')
    .replace(/<li>/g, '<li style="margin: 4px 0; line-height: 1.5;">')
    .replace(/<strong>/g, '<strong style="font-weight: 600; color: #1D503A;">')
    .replace(/<em>/g, '<em style="font-style: italic; color: #374151;">')
    .replace(/<code>/g, '<code style="background-color: #F3F4F6; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 14px;">')
    .replace(/<pre>/g, '<pre style="background-color: #F3F4F6; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0;">')
    .replace(/<blockquote>/g, '<blockquote style="border-left: 4px solid #1D503A; padding-left: 16px; margin: 12px 0; color: #6B7280; font-style: italic;">')
    .replace(/<a /g, '<a style="color: #1D503A; text-decoration: underline;" ')
    .replace(/<table>/g, '<table style="border-collapse: collapse; width: 100%; margin: 12px 0;">')
    .replace(/<th>/g, '<th style="border: 1px solid #D1D5DB; padding: 8px; background-color: #F9FAFB; font-weight: 600; text-align: left;">')
    .replace(/<td>/g, '<td style="border: 1px solid #D1D5DB; padding: 8px;">');
}
