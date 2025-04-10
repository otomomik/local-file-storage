import { type FC } from "hono/jsx";
import { type Language, createTranslator } from "../utils/i18n.js";
import { componentTranslations } from "../translations/components.js";
import { commonTranslations } from "../translations/common.js";

type SearchBoxProps = {
  searchQuery?: string;
  searchType?: string;
  tableName?: string;
  language: Language;
};

export const SearchBox: FC<SearchBoxProps> = ({
  searchQuery = "",
  searchType = "full-text-search",
  tableName = "file_references",
  language
}) => {
  // Create a translator function with the current language
  const t = createTranslator(language, componentTranslations);
  const ct = createTranslator(language, commonTranslations);
  
  return (
    <div className="mb-6 p-4 bg-white rounded-lg shadow">
      <form method="get" action="/viewer">
        <input type="hidden" name="table" value={tableName} />

        <div className="flex flex-col space-y-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-8">
              <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-1">
                {t('search.query')}
              </label>
              <input
                type="text"
                id="search-query"
                name="q"
                value={searchQuery}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={searchType === "like-search" ? t('search.placeholder.like') : t('search.placeholder')}
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <label htmlFor="search-type" className="block text-sm font-medium text-gray-700 mb-1">
                {t('search.type')}
              </label>
              <select
                id="search-type"
                name="type"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchType}
              >
                <option value="full-text-search"
                  selected={searchType === "full-text-search"}>{t('search.types.fullText')}</option>
                <option value="like-search" 
                  selected={searchType === "like-search"}>{t('search.types.like')}</option>
                <option value="vector" disabled>{t('search.types.vector')}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              {ct('button.search')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};