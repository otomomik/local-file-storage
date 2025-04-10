import { type FC } from "hono/jsx";
import type { FileReferenceData } from "../utils/lanceDbManager.js";

type DataTableProps = {
  records: FileReferenceData[];
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
};

export const DataTable: FC<DataTableProps> = ({ 
  records, 
  sortField = 'path', 
  sortDirection = 'asc' 
}) => {
  // ソート済みのレコードを準備
  const sortedRecords = [...records].sort((a, b) => {
    const fieldA = (a[sortField] || '').toString();
    const fieldB = (b[sortField] || '').toString();
    
    return sortDirection === 'asc' 
      ? fieldA.localeCompare(fieldB)
      : fieldB.localeCompare(fieldA);
  });

  // コンテンツ長の整形（最初の50文字だけ表示）
  const formatContent = (content: string): string => {
    if (!content) return '(empty)';
    
    if (content === 'null') {
      return '(binary data)';
    }
    
    if (content.length > 50) {
      return content.substring(0, 50) + '...';
    }
    
    return content;
  };

  // メタデータを整形
  const formatMetadata = (metadata: Record<string, any> | undefined): string => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return '{}';
    }
    
    try {
      return JSON.stringify(metadata, null, 2).substring(0, 100) + 
        (JSON.stringify(metadata).length > 100 ? '...' : '');
    } catch (error) {
      return '{}';
    }
  };

  // 日付を整形
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ファイルパス
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              コンテンツプレビュー
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              メタデータ
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              作成日時
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              更新日時
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedRecords.map((record, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <a 
                  href={`/browse/${record.path}`} 
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {record.path}
                </a>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <div className="font-mono bg-gray-50 p-1 rounded max-w-md overflow-hidden text-ellipsis">
                  {formatContent(record.content as string)}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <div className="font-mono bg-gray-50 p-1 rounded max-w-md overflow-hidden text-ellipsis">
                  {formatMetadata(record.metadata as Record<string, any> | undefined)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(record.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(record.updated_at)}
              </td>
            </tr>
          ))}
          
          {sortedRecords.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                データがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};