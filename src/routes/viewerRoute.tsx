import { type Context } from "hono";
import { MainLayout } from "../layouts/MainLayout.js";
import { NavigationMenu } from "../components/NavigationMenu.js";
import { DataTable } from "../components/DataTable.js";
import { SearchBox } from "../components/SearchBox.js";
import { LanceDbManager, type SearchType } from "../utils/lanceDbManager.js";
import path from "path";

export const viewerHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      // LanceDbManagerのインスタンスを作成
      const lanceDbManager = new LanceDbManager(targetDirectory);
      
      // DBを初期化
      await lanceDbManager.initialize();
      
      // Get pagination parameters
      const page = parseInt(c.req.query('page') || '1', 10);
      const perPage = parseInt(c.req.query('per_page') || '25', 10);
      
      // Get table name from query params (default to file_references)
      const tableName = c.req.query('table') || 'file_references';
      
      // Get available tables
      const tableNames = await lanceDbManager.getTableNames();
      
      // Open the specified table
      const tableOpened = await lanceDbManager.openTable(tableName);
      if (!tableOpened) {
        return c.render(
          <MainLayout title="Error - DB Viewer">
            <NavigationMenu currentPage="viewer" />
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <h1 className="font-bold">エラー</h1>
              <p>テーブル '{tableName}' が見つかりませんでした。</p>
            </div>
            <a 
              href="/browse/" 
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              ファイルブラウザに戻る
            </a>
          </MainLayout>
        );
      }
      
      // Get search parameters
      const searchQuery = c.req.query('q') || '';
      const searchType = (c.req.query('type') || 'text') as SearchType;
      
      // ソートフィールドとソート方向を取得（デフォルトはpath, asc）
      const sortField = c.req.query('sort') || 'path';
      const sortDirection = c.req.query('direction') === 'desc' ? 'desc' : 'asc';
      
      // Get total count of records
      const totalRecords = await lanceDbManager.countRecords(searchQuery, searchType);
      
      // Calculate pagination
      const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));
      const currentPage = Math.min(Math.max(1, page), totalPages);
      const offset = (currentPage - 1) * perPage;
      
      // Get records based on search parameters with pagination
      let records;
      if (searchQuery) {
        records = await lanceDbManager.searchRecords(searchQuery, searchType, perPage, offset);
      } else {
        records = await lanceDbManager.listAllRecords(perPage, offset);
      }

      // Create URL builder function to maintain query parameters
      const buildUrl = (newParams: Record<string, string | number>) => {
        const params = new URLSearchParams();
        
        // Keep existing parameters
        if (tableName) params.set('table', tableName);
        if (searchQuery) params.set('q', searchQuery);
        if (searchType) params.set('type', searchType);
        if (sortField) params.set('sort', sortField);
        if (sortDirection) params.set('direction', sortDirection);
        if (perPage) params.set('per_page', perPage.toString());
        
        // Override with new parameters
        Object.entries(newParams).forEach(([key, value]) => {
          params.set(key, value.toString());
        });
        
        return `/viewer?${params.toString()}`;
      };
      
      // Generate pagination links
      const paginationLinks = [];
      
      // Previous page
      if (currentPage > 1) {
        paginationLinks.push({
          page: currentPage - 1,
          label: '前へ',
          url: buildUrl({ page: currentPage - 1 })
        });
      }
      
      // Page numbers
      const pageWindow = 3; // Show 3 pages before and after current page
      const startPage = Math.max(1, currentPage - pageWindow);
      const endPage = Math.min(totalPages, currentPage + pageWindow);
      
      // First page if not in window
      if (startPage > 1) {
        paginationLinks.push({
          page: 1,
          label: '1',
          url: buildUrl({ page: 1 })
        });
        
        if (startPage > 2) {
          paginationLinks.push({ page: -1, label: '...', url: '' }); // Ellipsis
        }
      }
      
      // Page numbers
      for (let i = startPage; i <= endPage; i++) {
        paginationLinks.push({
          page: i,
          label: i.toString(),
          url: buildUrl({ page: i }),
          isCurrent: i === currentPage
        });
      }
      
      // Last page if not in window
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          paginationLinks.push({ page: -1, label: '...', url: '' }); // Ellipsis
        }
        
        paginationLinks.push({
          page: totalPages,
          label: totalPages.toString(),
          url: buildUrl({ page: totalPages })
        });
      }
      
      // Next page
      if (currentPage < totalPages) {
        paginationLinks.push({
          page: currentPage + 1,
          label: '次へ',
          url: buildUrl({ page: currentPage + 1 })
        });
      }
      
      return c.render(
        <MainLayout title="DB Viewer - Local File Storage">
          <NavigationMenu currentPage="viewer" />
          <h1 className="text-2xl font-bold mb-4">データベースビューワー</h1>
          
          {/* Table selector */}
          <div className="mb-6">
            <label htmlFor="table-select" className="block text-sm font-medium text-gray-700 mb-1">テーブル選択:</label>
            <select 
              id="table-select"
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={tableName}
              onchange="window.location.href = '/viewer?table=' + this.value"
            >
              {tableNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          
          {/* Search interface */}
          <SearchBox 
            searchQuery={searchQuery} 
            searchType={searchType}
            tableName={tableName} 
          />
          
          {/* Results per page selector */}
          <div className="flex flex-wrap justify-between items-center mb-4">
            <div className="mb-2 sm:mb-0">
              <span className="text-gray-700 mr-2">表示件数:</span>
              <select
                className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={perPage}
                onchange={`window.location.href='${buildUrl({ per_page: "' + this.value + '", page: 1 })}`}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            
            <div className="text-gray-600">
              <span>{offset + 1} - {Math.min(offset + perPage, totalRecords)} / {totalRecords}件</span>
            </div>
          </div>
          
          {/* Results */}
          <div className="bg-white rounded-lg shadow-sm mb-4">
            <div className="p-4">
              <DataTable 
                records={records} 
                sortField={sortField} 
                sortDirection={sortDirection as 'asc' | 'desc'} 
              />
            </div>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center my-4">
              <nav className="inline-flex rounded-md shadow">
                {paginationLinks.map((link, index) => {
                  if (link.page === -1) {
                    return (
                      <span 
                        key={index}
                        className="px-3 py-1 text-gray-700 border border-gray-300"
                      >
                        {link.label}
                      </span>
                    );
                  }
                  
                  return (
                    <a 
                      key={index} 
                      href={link.url}
                      className={`px-3 py-1 border border-gray-300 ${link.isCurrent 
                        ? 'bg-blue-600 text-white' 
                        : 'text-blue-600 hover:bg-gray-50'}`}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </nav>
            </div>
          )}
        </MainLayout>
      );
    } catch (error) {
      return c.render(
        <MainLayout title="Error - DB Viewer">
          <NavigationMenu currentPage="viewer" />
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h1 className="font-bold">エラー</h1>
            <p>DBデータの取得に失敗しました: {String(error)}</p>
          </div>
          <a 
            href="/browse/" 
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            ファイルブラウザに戻る
          </a>
        </MainLayout>
      );
    }
  };
};