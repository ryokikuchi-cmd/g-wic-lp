/**
 * g-wic 採用LP フォーム受信 → スプレッドシート追記
 * デプロイ: ウェブアプリ / 実行=自分 / アクセス=全員
 */
const SHEET_ID = '1rmPX-QotCA04b6cdViBixcuYlwc3NTAdP5_ghccFTyY';

const HEADERS = ['申込日時', 'お名前', '生年月日', '電話番号', 'メールアドレス', '現在のお住まい', '気になること・質問', '流入ページ'];

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets()[0]; // 先頭シート（gid=0）

    // 1行目にヘッダーが無ければ作成
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }

    const p = (e && e.parameter) ? e.parameter : {};
    const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

    const values = [
      now,
      p.name || '',
      p.birthdate || '',
      p.tel || '',
      p.email || '',
      p.residence || '',
      p.message || '',
      p.page || ''
    ];

    // 電話番号の先頭0などが消えないよう、全列テキストとして保存
    const row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, values.length)
      .setNumberFormat('@')
      .setValues([values]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 動作確認用（ブラウザでURLを開くと OK が出れば公開成功）
function doGet(e) {
  return ContentService.createTextOutput('OK');
}
