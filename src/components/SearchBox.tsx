import { type FC } from "hono/jsx";

type SearchBoxProps = {
  searchQuery?: string;
  searchType?: string;
  tableName?: string;
};

export const SearchBox: FC<SearchBoxProps> = ({ 
  searchQuery = "", 
  searchType = "full-text-search",
  tableName = "file_references"
}) => {
  return (
    <div className="mb-6 p-4 bg-white rounded-lg shadow">
      <form method="get">
        <input type="hidden" name="table" value={tableName} />
        
        <div className="flex flex-col space-y-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-8">
              <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-1">
                検索クエリ
              </label>
              <input 
                type="text"
                id="search-query"
                name="q"
                value={searchQuery}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="検索したいテキストを入力"
              />
            </div>
            
            <div className="col-span-12 md:col-span-4">
              <label htmlFor="search-type" className="block text-sm font-medium text-gray-700 mb-1">
                検索タイプ
              </label>
              <select
                id="search-type"
                name="type"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchType}
              >
                <option value="full-text-search">全文検索</option>
                <option value="vector" disabled>ベクトル検索 (未実装)</option>
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
              検索
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};