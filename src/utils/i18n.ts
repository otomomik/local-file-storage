import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

// Define available languages
export type Language = 'en' | 'ja';

// Define language names for display
export const languageNames: Record<Language, string> = {
  en: 'English',
  ja: '日本語'
};

// Default language
export const defaultLanguage: Language = 'ja';

// Get current language from context (using cookies or query parameters)
export function getCurrentLanguage(c: Context): Language {
  // Check for language in query parameter
  const queryLang = c.req.query('lang') as Language | undefined;
  if (queryLang && (queryLang === 'en' || queryLang === 'ja')) {
    // Set cookie for future requests
    setCookie(c, 'lang', queryLang, { path: '/', maxAge: 60 * 60 * 24 * 30 }); // 30 days
    return queryLang;
  }
  
  // Check for language in cookies
  const cookieLang = getCookie(c, 'lang') as Language | undefined;
  if (cookieLang && (cookieLang === 'en' || cookieLang === 'ja')) {
    return cookieLang;
  }
  
  // Fall back to default language
  return defaultLanguage;
}

// Store translations for each language
export type TranslationKey = string;
export type TranslationDictionary = Record<TranslationKey, Record<Language, string>>;

// Create a translator function for the selected language
export function createTranslator(lang: Language, translations: TranslationDictionary) {
  return function t(key: keyof typeof translations): string {
    if (!translations[key]) {
      console.warn(`Translation key not found: ${key}`);
      return key as string;
    }
    
    return translations[key][lang] || translations[key][defaultLanguage] || key as string;
  };
}