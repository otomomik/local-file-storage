import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

// 監視の設定と開始
export function watchDirectory(
  targetDirectory: string, 
  stateFilePath?: string, 
  options: {
    onNewFile?: (filePath: string) => void;
    onModifiedFile?: (filePath: string) => void;
    onDeletedFile?: (filePath: string) => void;
    onReady?: () => void;
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

  // 以前の状態を読み込む
  let previousState: FileState = {};
  if (fs.existsSync(stateFile)) {
    try {
      previousState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch (error) {
      console.error('Error reading previous state file:', error);
    }
  }

  // 現在の状態を保存するオブジェクト
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
      path.join(targetDirectory, '.local', 'file-history-state.json') // 状態ファイル自体も監視対象から除外
    ]
  });

  // 準備完了イベント
  watcher.on('ready', () => {
    console.log('Initial scan complete. Ready for changes.');
    
    // 現在の状態を保存
    try {
      fs.writeFileSync(stateFile, JSON.stringify(currentState, null, 2));
    } catch (error) {
      console.error('Error writing state file:', error);
    }
    
    // 差分を検出して表示
    console.log('Changes detected on startup:');
    for (const filePath in currentState) {
      if (!previousState[filePath]) {
        console.log(`New file: ${filePath}`);
        options.onNewFile?.(filePath);
      } else if (previousState[filePath] !== currentState[filePath]) {
        console.log(`Modified: ${filePath}`);
        options.onModifiedFile?.(filePath);
      }
    }
    
    for (const filePath in previousState) {
      if (!currentState[filePath]) {
        console.log(`Deleted: ${filePath}`);
        options.onDeletedFile?.(filePath);
      }
    }
    
    options.onReady?.();
  });

  // ファイル追加イベント（初回スキャンも含む）
  watcher.on('add', (filePath, stats) => {
    // .ファイルを無視（追加の安全策）
    if (path.basename(filePath).startsWith('.')) {
      return;
    }
    
    try {
      const fileHash = calculateHash(filePath);
      currentState[filePath] = fileHash;
      
      // ready イベント後の変更のみログ出力
      if (watcher.getWatched()) {
        console.log(`File ${filePath} has been added`);
        options.onNewFile?.(filePath);
      }
    } catch (error) {
      console.error(`Error processing added file ${filePath}:`, error);
    }
  });

  // ファイル変更イベント
  watcher.on('change', (filePath, stats) => {
    // .ファイルを無視（追加の安全策）
    if (path.basename(filePath).startsWith('.')) {
      return;
    }
    
    try {
      const fileHash = calculateHash(filePath);
      currentState[filePath] = fileHash;
      console.log(`File ${filePath} has been changed`);
      options.onModifiedFile?.(filePath);
    } catch (error) {
      console.error(`Error processing changed file ${filePath}:`, error);
    }
  });

  // ファイル削除イベント
  watcher.on('unlink', (filePath) => {
    // .ファイルを無視（追加の安全策）
    if (path.basename(filePath).startsWith('.')) {
      return;
    }
    
    delete currentState[filePath];
    console.log(`File ${filePath} has been removed`);
    options.onDeletedFile?.(filePath);
  });

  // ディレクトリ追加イベント
  watcher.on('addDir', (dirPath) => {
    // .ディレクトリを無視（ただし.localは許可）
    if (path.basename(dirPath).startsWith('.') && path.basename(dirPath) !== '.local') {
      return;
    }
    
    console.log(`Directory ${dirPath} has been added`);
  });

  // ディレクトリ削除イベント
  watcher.on('unlinkDir', (dirPath) => {
    // .ディレクトリを無視（ただし.localは許可）
    if (path.basename(dirPath).startsWith('.') && path.basename(dirPath) !== '.local') {
      return;
    }
    
    console.log(`Directory ${dirPath} has been removed`);
  });

  // エラーイベント
  watcher.on('error', (error) => {
    console.error(`Watcher error:`, error);
  });

  return watcher;
}