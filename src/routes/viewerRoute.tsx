import { type Context } from "hono";
import { MainLayout } from "../layouts/MainLayout.js";
import { NavigationMenu } from "../components/NavigationMenu.js";
import { DataTable } from "../components/DataTable.js";
import { LanceDbManager } from "../utils/lanceDbManager.js";
import path from "path";

export const viewerHandler = (targetDirectory: string) => {
  return async (c: Context) => {
    try {
      // LanceDbManagerのインスタンスを作成
      const lanceDbManager = new LanceDbManager(targetDirectory);
      
      // DBを初期化
      await lanceDbManager.initialize();
      
      // 全レコードを取得
      const records = await lanceDbManager.listAllRecords();
      
      // ソートフィールドとソート方向を取得（デフォルトはpath, asc）
      const sortField = c.req.query('sort') || 'path';
      const sortDirection = c.req.query('direction') === 'desc' ? 'desc' : 'asc';
      
      return c.render(
        <MainLayout title="DB Viewer - Local File Storage">
          <NavigationMenu currentPage="viewer" />
          <h1 className="text-2xl font-bold mb-4">データベースビューワー</h1>
          <p className="text-gray-600 mb-6">
            LanceDB に保存されているファイル情報を表示します。現在 {records.length} 件のレコードが登録されています。
          </p>
          
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">ファイルレコード一覧</h2>
            </div>
            <div className="p-4">
              <DataTable 
                records={records} 
                sortField={sortField} 
                sortDirection={sortDirection as 'asc' | 'desc'} 
              />
            </div>
          </div>
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