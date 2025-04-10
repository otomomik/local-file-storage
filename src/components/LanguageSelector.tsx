import { type FC } from "hono/jsx";
import { type Language, languageNames } from "../utils/i18n.js";

type LanguageSelectorProps = {
  currentLanguage: Language;
};

export const LanguageSelector: FC<LanguageSelectorProps> = ({ currentLanguage }) => {
  return (
    <div className="flex items-center">
      <span className="text-sm text-gray-600 mr-2">🌐</span>
      <select
        className="text-sm border rounded py-1 px-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={currentLanguage}
        id="language-selector"
      >
        {(Object.keys(languageNames) as Language[]).map(lang => (
          <option
            key={lang}
            value={lang}
            selected={currentLanguage === lang}
          >
            {languageNames[lang]}
          </option>
        ))}
      </select>
      
      {/* Client-side script to handle language switching */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('DOMContentLoaded', function() {
          const langSelector = document.getElementById('language-selector');
          langSelector.addEventListener('change', function(e) {
            const lang = this.value;
            const url = new URL(window.location.href);
            url.searchParams.set('lang', lang);
            window.location.href = url.toString();
          });
        });
      `}} />
    </div>
  );
};