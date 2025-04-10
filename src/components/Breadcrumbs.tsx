import { type FC } from "hono/jsx";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  currentName?: string;
};

export const Breadcrumbs: FC<BreadcrumbsProps> = ({ items, currentName }) => {
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
              {item.name}
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