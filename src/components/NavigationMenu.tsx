import { type FC } from "hono/jsx";

type NavigationMenuProps = {
  currentPage: string;
};

export const NavigationMenu: FC<NavigationMenuProps> = ({ currentPage }) => {
  return (
    <div className="mb-6 bg-white rounded-lg shadow">
      <nav className="flex">
        <a 
          href="/browse/" 
          className={`px-4 py-3 text-center flex-1 transition font-medium ${currentPage === 'browse' 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          ファイルブラウザ
        </a>
        <a 
          href="/viewer" 
          className={`px-4 py-3 text-center flex-1 transition font-medium ${currentPage === 'viewer' 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          DBビューワー
        </a>
      </nav>
    </div>
  );
};