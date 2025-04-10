import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  processFile, 
  updateProcessedFileStore, 
  saveProcessedFileStore,
  loadProcessedFileStore,
  removeFileFromStore
} from './fileProcessor.js';

// ファイルのハッシュを計算する関数
function calculateHash(filePath: string): string {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    console.error(`Error calculating hash for ${filePath}:`, error);
    return '';
  }
}

// ファイル状態を格納するタイプ
interface FileState {
  [filePath: string]: string; // ファイルパス -> ハッシュ値
}

// 相対パスを取得する関数
function getRelativePath(fullPath: string, targetDirectory: string): string {
  return path.relative(targetDirectory, fullPath);
}

// 監視の設定と開始
export function watchDirectory(
  targetDirectory: string, 
  stateFilePath?: string, 
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
      console.error('Error creating .local directory:', error);
    }
  }

  // 前回の状態を保存するファイルパス
  const stateFile = stateFilePath || path.join(targetDirectory, '.local', 'file-history-state.json');
  
  // 処理済みファイルのデータを格納するファイルパス
  const processedDataFile = path.join(targetDirectory, '.local', 'processed-file-data.json');
  
  // 処理済みファイルデータの読み込み
  if (options.processChangedFiles) {
    loadProcessedFileStore(processedDataFile);
  }

  // 以前の状態を読み込む
  let previousState: FileState = {};
  if (fs.existsSync(stateFile)) {
    try {
      const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      
      // ファイルパスが相対パスでない場合は、相対パスに変換
      for (const fullPath in stateData) {
        const relativePath = getRelativePath(fullPath, targetDirectory);
        previousState[relativePath] = stateData[fullPath];
      }
    } catch (error) {
      console.error('Error reading previous state file:', error);
    }
  }

  // 現在の状態を保存するオブジェクト（相対パス -> ハッシュ値）
  const currentState: FileState = {};

  // .ファイルと .ディレクトリを無視するパターン
  const ignoredPattern = /(^|[\/\\])\.(?!local\/file-history-state\.json$).+/;

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
      ignoredPattern, // ドットファイルを無視（ただし状態ファイルは除く）
      path.join(targetDirectory, '.local', 'file-history-state.json'), // 状態ファイル自体も監視対象から除外
      path.join(targetDirectory, '.local', 'processed-file-data.json') // 処理済みファイルデータも除外
    ]
  });

  // ファイル処理関数 - テキスト抽出・画像はbase64化
  async function handleFileProcessing(fullPath: string, relativePath: string): Promise<void> {
    if (!options.processChangedFiles) return;
    
    try {
      console.log(`Processing file: ${relativePath}`);
      const processedData = await processFile(fullPath, relativePath);
      
      if (processedData.processed) {
        // 処理済みデータを保存
        updateProcessedFileStore(processedData);
        console.log(`Successfully processed ${relativePath} as ${processedData.type}`);
      }
    } catch (error) {
      console.error(`Error in file processing for ${relativePath}:`, error);
    }
  }
  
  // ファイル履歴状態を保存する関数
  function saveFileHistoryState(): void {
    try {
      fs.writeFileSync(stateFile, JSON.stringify(currentState, null, 2));
      console.log(`File history state updated in .local/file-history-state.json`);
    } catch (error) {
      console.error('Error writing state file:', error);
    }
  }

  // 準備完了イベント
  watcher.on('ready', () => {
    console.log('Initial scan complete. Ready for changes.');
    
    // 初期状態を保存（相対パスで）
    saveFileHistoryState();
    
    // 差分を検出して表示・ファイル処理実行
    console.log('Changes detected on startup:');
    
    // 新規・変更ファイルを処理するためのキュー
    const filesToProcess: Array<{fullPath: string, relativePath: string}> = [];
    
    for (const relativePath in currentState) {
      if (!previousState[relativePath]) {
        console.log(`New file: ${relativePath}`);
        options.onNewFile?.(relativePath);
        if (options.processChangedFiles && !options.skipInitialProcessing) {
          const fullPath = path.join(targetDirectory, relativePath);
          filesToProcess.push({fullPath, relativePath});
        }
      } else if (previousState[relativePath] !== currentState[relativePath]) {
        console.log(`Modified: ${relativePath}`);
        options.onModifiedFile?.(relativePath);
        if (options.processChangedFiles && !options.skipInitialProcessing) {
          const fullPath = path.join(targetDirectory, relativePath);
          filesToProcess.push({fullPath, relativePath});
        }
      }
    }
    
    for (const relativePath in previousState) {
      if (!currentState[relativePath]) {
        console.log(`Deleted: ${relativePath}`);
        options.onDeletedFile?.(relativePath);
        // 削除されたファイルを処理済みデータから削除
        if (options.processChangedFiles) {
          removeFileFromStore(relativePath);
        }
      }
    }
    
    // 初回起動時の処理をスキップするフラグがある場合はメッセージを表示
    if (options.skipInitialProcessing && options.processChangedFiles && filesToProcess.length > 0) {
      console.log(`Skipping initial processing of ${filesToProcess.length} files as requested.`);
      options.onReady?.();
      return;
    }
    
    // ファイル処理を実行（順次処理）
    if (options.processChangedFiles && filesToProcess.length > 0) {
      console.log(`Processing ${filesToProcess.length} changed files...`);
      
      // 変更ファイルを順次処理
      (async () => {
        for (const {fullPath, relativePath} of filesToProcess) {
          await handleFileProcessing(fullPath, relativePath);
        }
        
        // 処理完了後、保存
        saveProcessedFileStore(processedDataFile);
        // 処理後にファイル履歴状態も更新
        saveFileHistoryState();
        console.log(`Completed processing ${filesToProcess.length} files`);
      })();
    }
    
    options.onReady?.();
  });

  // ファイル追加イベント（初回スキャンも含む）
  watcher.on('add', (fullPath, stats) => {
    // .ファイルを無視（追加の安全策）
    if (path.basename(fullPath).startsWith('.')) {
      return;
    }
    
    try {
      const fileHash = calculateHash(fullPath);
      const relativePath = getRelativePath(fullPath, targetDirectory);
      currentState[relativePath] = fileHash;
      
      // ready イベント後の変更のみログ出力
      if (Object.keys(watcher.getWatched()).length > 0) {
        console.log(`File ${relativePath} has been added`);
        options.onNewFile?.(relativePath);
        
        // ファイル追加時に処理を実行
        if (options.processChangedFiles) {
          (async () => {
            await handleFileProcessing(fullPath, relativePath);
            // 処理後データ保存
            saveProcessedFileStore(processedDataFile);
            // ファイル履歴状態も更新
            saveFileHistoryState();
          })();
        }
      }
    } catch (error) {
      console.error(`Error processing added file ${fullPath}:`, error);
    }
  });

  // ファイル変更イベント
  watcher.on('change', (fullPath, stats) => {
    // .ファイルを無視（追加の安全策）
    if (path.basename(fullPath).startsWith('.')) {
      return;
    }
    
    try {
      const fileHash = calculateHash(fullPath);
      const relativePath = getRelativePath(fullPath, targetDirectory);
      currentState[relativePath] = fileHash;
      console.log(`File ${relativePath} has been changed`);
      options.onModifiedFile?.(relativePath);
      
      // ファイル変更時に処理を実行
      if (options.processChangedFiles) {
        (async () => {
          await handleFileProcessing(fullPath, relativePath);
          // 処理後データ保存
          saveProcessedFileStore(processedDataFile);
          // ファイル履歴状態も更新
          saveFileHistoryState();
        })();
      }
    } catch (error) {
      console.error(`Error processing changed file ${fullPath}:`, error);
    }
  });

  // ファイル削除イベント
  watcher.on('unlink', (fullPath) => {
    // .ファイルを無視（追加の安全策）
    if (path.basename(fullPath).startsWith('.')) {
      return;
    }
    
    const relativePath = getRelativePath(fullPath, targetDirectory);
    delete currentState[relativePath];
    console.log(`File ${relativePath} has been removed`);
    options.onDeletedFile?.(relativePath);
    
    // 削除されたファイルを処理済みデータから削除
    if (options.processChangedFiles) {
      removeFileFromStore(relativePath);
      saveProcessedFileStore(processedDataFile);
      // ファイル履歴状態も更新
      saveFileHistoryState();
    }
  });

  // ディレクトリ追加イベント
  watcher.on('addDir', (dirPath) => {
    // .ディレクトリを無視（ただし.localは許可）
    if (path.basename(dirPath).startsWith('.') && path.basename(dirPath) !== '.local') {
      return;
    }
    
    const relativePath = getRelativePath(dirPath, targetDirectory);
    console.log(`Directory ${relativePath} has been added`);
  });

  // ディレクトリ削除イベント
  watcher.on('unlinkDir', (dirPath) => {
    // .ディレクトリを無視（ただし.localは許可）
    if (path.basename(dirPath).startsWith('.') && path.basename(dirPath) !== '.local') {
      return;
    }
    
    const relativePath = getRelativePath(dirPath, targetDirectory);
    console.log(`Directory ${relativePath} has been removed`);
  });

  // エラーイベント
  watcher.on('error', (error) => {
    console.error(`Watcher error:`, error);
  });

  return watcher;
}