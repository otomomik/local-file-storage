import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { LanceDbManager } from './lanceDbManager.js';

// 相対パスを取得する関数
function getRelativePath(fullPath: string, targetDirectory: string): string {
  return path.relative(targetDirectory, fullPath);
}

// ドットファイルやドットディレクトリを含むパスかどうかをチェックする
function containsDotFileOrFolder(filePath: string): boolean {
  return filePath.split(path.sep).some(part => part.startsWith('.'));
}

// 監視の設定と開始
export function watchDirectory(
  targetDirectory: string, 
  options: {
    onNewFile?: (filePath: string) => void;
    onModifiedFile?: (filePath: string) => void;
    onDeletedFile?: (filePath: string) => void;
    onReady?: () => void;
    processChangedFiles?: boolean; // 変更ファイル処理有効フラグ
    skipInitialProcessing?: boolean; // 初回起動時の処理をスキップするフラグ
  } = {}
) {
  // .local ディレクトリがなければ作成
  const localDir = path.join(targetDirectory, '.local');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch (error) {
      // Error creating .local directory
    }
  }

  // LanceDB マネージャーの初期化
  const lanceDbManager = new LanceDbManager(targetDirectory);
  // データベースが初期化されたかどうかのフラグ
  let isDbInitialized = false;
  // 初期化待ちの処理キュー
  const pendingFileProcessingQueue: Array<{fullPath: string, relativePath: string}> = [];
  
  // 非同期初期化を開始
  (async () => {
    try {
      await lanceDbManager.initialize();
      isDbInitialized = true;
      
      // 初期化完了後、キューに溜まった処理を実行
      if (pendingFileProcessingQueue.length > 0) {
        for (const {fullPath, relativePath} of pendingFileProcessingQueue) {
          // ドットファイルをスキップ
          if (containsDotFileOrFolder(relativePath)) continue;
          await processFileWithLanceDb(fullPath, relativePath);
        }
        pendingFileProcessingQueue.length = 0; // キューをクリア
      }
      
      // データベース内の全レコードを取得
      await lanceDbManager.listAllRecords();
    } catch (error) {
      // Failed to initialize LanceDB
    }
  })();

  // .ファイルと .ディレクトリを無視するパターン
  const ignoredPattern = /(^|[\/\\])\..+/;

  // 監視の設定
  const watcher = chokidar.watch(targetDirectory, {
    persistent: true,
    ignoreInitial: false, // 初期ファイルも検知する
    alwaysStat: true, // ファイルの状態情報を常に提供
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    },
    ignored: [
      ignoredPattern, // ドットファイルを無視
      path.join(targetDirectory, '.local', '**/*'), // .local ディレクトリ内は全て除外
      path.join(targetDirectory, 'node_modules', '**/*') // node_modules も除外
    ]
  });

  // LanceDB処理を含むファイル処理関数
  async function processFileWithLanceDb(fullPath: string, relativePath: string): Promise<void> {
    // ドットファイルはスキップ
    if (containsDotFileOrFolder(relativePath)) return;
    
    try {
      // LanceDBに登録
      await lanceDbManager.upsertFile(fullPath, relativePath);
    } catch (error) {
      // Error in file processing
    }
  }

  // ファイル処理関数 - LanceDB へのデータ登録
  async function handleFileProcessing(fullPath: string, relativePath: string): Promise<void> {
    if (!options.processChangedFiles) return;
    
    // ドットファイルはスキップ
    if (containsDotFileOrFolder(relativePath)) return;
    
    // データベース初期化が完了していない場合はキューに入れる
    if (!isDbInitialized) {
      pendingFileProcessingQueue.push({fullPath, relativePath});
      return;
    }
    
    // 初期化済みならば直接処理
    await processFileWithLanceDb(fullPath, relativePath);
  }

  // 準備完了イベント
  watcher.on('ready', () => {
    // 差分を検出して表示・ファイル処理実行
    
    // 初回起動時の処理をスキップするフラグがある場合はメッセージを表示
    if (options.skipInitialProcessing && options.processChangedFiles) {
      options.onReady?.();
      return;
    }
    
    options.onReady?.();
  });

  // ファイル追加イベント（初回スキャンも含む）
  watcher.on('add', (fullPath, stats) => {
    try {
      const relativePath = getRelativePath(fullPath, targetDirectory);
      
      // ドットファイルを徹底的に無視
      if (containsDotFileOrFolder(relativePath)) {
        return;
      }
      
      // ready イベント後の変更のみ処理
      if (Object.keys(watcher.getWatched()).length > 0) {
        options.onNewFile?.(relativePath);
        
        // ファイル追加時に処理を実行
        if (options.processChangedFiles) {
          (async () => {
            await handleFileProcessing(fullPath, relativePath);
          })();
        }
      }
    } catch (error) {
      // Error processing added file
    }
  });

  // ファイル変更イベント
  watcher.on('change', (fullPath, stats) => {
    try {
      const relativePath = getRelativePath(fullPath, targetDirectory);
      
      // ドットファイルを徹底的に無視
      if (containsDotFileOrFolder(relativePath)) {
        return;
      }
      
      options.onModifiedFile?.(relativePath);
      
      // ファイル変更時に処理を実行
      if (options.processChangedFiles) {
        (async () => {
          await handleFileProcessing(fullPath, relativePath);
        })();
      }
    } catch (error) {
      // Error processing changed file
    }
  });

  // ファイル削除イベント
  watcher.on('unlink', (fullPath) => {
    const relativePath = getRelativePath(fullPath, targetDirectory);
    
    // ドットファイルを徹底的に無視
    if (containsDotFileOrFolder(relativePath)) {
      return;
    }
    
    options.onDeletedFile?.(relativePath);
    
    // 削除されたファイルを処理済みデータから削除
    if (options.processChangedFiles) {
      (async () => {
        // データベース初期化が完了していない場合はスキップ
        if (!isDbInitialized) {
          return;
        }
        
        // LanceDBから削除
        await lanceDbManager.deleteFile(relativePath);
      })();
    }
  });

  // ディレクトリ追加イベント
  watcher.on('addDir', (dirPath) => {
    const relativePath = getRelativePath(dirPath, targetDirectory);
    
    // ドットディレクトリを徹底的に無視
    if (containsDotFileOrFolder(relativePath)) {
      return;
    }
  });

  // ディレクトリ削除イベント
  watcher.on('unlinkDir', (dirPath) => {
    const relativePath = getRelativePath(dirPath, targetDirectory);
    
    // ドットディレクトリを徹底的に無視
    if (containsDotFileOrFolder(relativePath)) {
      return;
    }
  });

  // エラーイベント
  watcher.on('error', (error) => {
    // Watcher error
  });

  return watcher;
}