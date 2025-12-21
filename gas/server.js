// 【GASコード】server.gs

// シートIDを取得（今開いているシートを使用）
const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
const SHEET = SPREADSHEET.getActiveSheet();

/**
 * データ受信（書き込み用）
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // A列:メモ, B列:タイトル, C列:リンク
    SHEET.appendRow([
      data.memo,
      data.title,
      data.link
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({result: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * データ送信（読み込み用）
 * 動画IDが含まれる行だけを検索して返します
 */
function doGet(e) {
  const videoId = e.parameter.videoId;
  
  // ▼ シートのURLを自動取得
  const sheetUrl = SPREADSHEET.getUrl();

  if (!videoId) return;

  const lastRow = SHEET.getLastRow();
  let result = [];

  if (lastRow > 1) {
    const values = SHEET.getRange(2, 1, lastRow - 1, 3).getValues();
    result = values.filter(row => row[2].includes(videoId)).map(row => ({
      memo: row[0],
      title: row[1],
      link: row[2],
      timeDisplay: extractTimeDisplay(row[2]) 
    }));
  }

  // ▼ URLとデータをセットで返す
  const responseData = {
    sheetUrl: sheetUrl,
    memos: result
  };

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

// リンクから「mm:ss」形式の文字列を作る補助関数
function extractTimeDisplay(url) {
  try {
    const match = url.match(/t=(\d+)s/);
    if (match) {
      const totalSeconds = parseInt(match[1]);
      const min = Math.floor(totalSeconds / 60);
      const sec = totalSeconds % 60;
      return `${min}:${sec.toString().padStart(2, '0')}`;
    }
    return "Link";
  } catch(e) { return "Link"; }
}