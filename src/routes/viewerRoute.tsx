import { type Context } from "hono";
import { MainLayout } from "../layouts/MainLayout.js";
import { NavigationMenu } from "../components/NavigationMenu.js";
import { DataTable } from "../components/DataTable.js";
import { SearchBox } from "../components/SearchBox.js";
import { LanceDbManager, type SearchType } from "../utils/lanceDbManager.js";
import { getCurrentLanguage, createTranslator } from "../utils/i18n.js";
import { commonTranslations } from "../translations/common.js";
import { componentTranslations } from "../translations/components.js";
import path from "path";

export const viewerHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      // Get current language from context
      const language = getCurrentLanguage(c);
      
      // Create translators
      const t = createTranslator(language, commonTranslations);
      const ct = createTranslator(language, componentTranslations);
      
      // LanceDbManagerのインスタンスを作成
      const lanceDbManager = new LanceDbManager(targetDirectory);
      
      // DBを初期化
      await lanceDbManager.initialize();
      
      // Get pagination parameters
      const page = parseInt(c.req.query('page') || '1', 10);
      // 表示件数を50に固定
      const perPage = 50;
      
      // Get table name from query params (default to file_references)
      const tableName = c.req.query('table') || 'file_references';
      
      // Get available tables
      const tableNames = await lanceDbManager.getTableNames();
      
      // Open the specified table
      const tableOpened = await lanceDbManager.openTable(tableName);
      if (!tableOpened) {
        return c.render(
          <MainLayout title={`${t('app.error.title')} - ${t('nav.dbViewer')}`} language={language}>
            <NavigationMenu currentPage="viewer" language={language} />
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <h1 className="font-bold">{t('error.title')}</h1>
              <p>{ct('error.tableNotFound').replace('{tableName}', tableName)}</p>
            </div>
            <a 
              href="/browse/" 
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {ct('error.returnToFileBrowser')}
            </a>
          </MainLayout>
        );
      }
      
      // Get search parameters
      const searchQuery = c.req.query('q') || '';
      // 修正：デフォルト値を'full-text-search'に変更し、正確に型をキャストする
      const searchType = (c.req.query('type') || 'full-text-search') as SearchType;
      
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
          label: ct('table.pagination.prev'),
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
          label: ct('table.pagination.next'),
          url: buildUrl({ page: currentPage + 1 })
        });
      }
      
      return c.render(
        <MainLayout title={`${t('app.dbViewer.title')} - ${t('app.title')}`} language={language}>
          <NavigationMenu currentPage="viewer" language={language} />
          <h1 className="text-2xl font-bold mb-4">{t('app.dbViewer.title')}</h1>
          
          {/* Table selector */}
          <div className="mb-6">
            <label htmlFor="table-select" className="block text-sm font-medium text-gray-700 mb-1">{ct('table.select')}</label>
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
            language={language}
          />
          
          {/* 総レコード数と表示範囲のみ表示 */}
          <div className="flex justify-end items-center mb-4">
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
                language={language}
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
      // Get current language from context
      const language = getCurrentLanguage(c);
      
      // Create translators
      const t = createTranslator(language, commonTranslations);
      const ct = createTranslator(language, componentTranslations);
      
      return c.render(
        <MainLayout title={`${t('app.error.title')} - ${t('nav.dbViewer')}`} language={language}>
          <NavigationMenu currentPage="viewer" language={language} />
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h1 className="font-bold">{t('error.title')}</h1>
            <p>{ct('error.dbFetchFailed').replace('{error}', String(error))}</p>
          </div>
          <a 
            href="/browse/" 
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {ct('error.returnToFileBrowser')}
          </a>
        </MainLayout>
      );
    }
  };
};