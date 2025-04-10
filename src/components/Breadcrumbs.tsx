import { type FC } from "hono/jsx";
import { type Language, createTranslator } from "../utils/i18n.js";
import { commonTranslations } from "../translations/common.js";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  currentName?: string;
  language: Language;
};

export const Breadcrumbs: FC<BreadcrumbsProps> = ({ items, currentName, language }) => {
  // Create translator function
  const t = createTranslator(language, commonTranslations);

  return (
    <nav className="flex py-3 px-4 mb-4 bg-gray-100 rounded-md">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && <span className="mx-2 text-gray-400">/</span>}
            <a 
              href={item.path} 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
            >
              {item.name === '🏠' ? '🏠' : item.name}
            </a>
          </li>
        ))}
        
        {currentName && (
          <li className="inline-flex items-center">
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-600 font-medium">{currentName}</span>
          </li>
        )}
      </ol>
    </nav>
  );
};