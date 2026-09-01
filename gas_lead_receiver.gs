/**
 * 株式会社g-wic 採用LP リード受信 ＋ 自動返信メール
 * -------------------------------------------
 * ■ 役割:
 *   フォーム(ウェブアプリ)のPOSTを受信 → スプレッドシートに追記 → 応募者へ自動返信メール
 *
 * ■ 配置: スプレッドシート 1rmPX-QotCA04b6cdViBixcuYlwc3NTAdP5_ghccFTyY に
 *         バインドしたコンテナバインドスクリプト
 * ■ デプロイ: ウェブアプリ / 次のユーザーとして実行=自分 / アクセス=全員
 *
 * ■ シート列構成（自動でヘッダー作成）:
 *   A:申込日時 B:お名前 C:生年月日 D:電話番号 E:メールアドレス
 *   F:現在のお住まい G:気になること・質問 H:流入ページ
 *   I:SENTフラグ J:送付日時 K:メールID
 *
 * ■ ⚠️ 要確認:
 *   - 差出人は「このスクリプトを所有するGoogleアカウントのGmail」になります
 *   - MAIL.FROM / REPLY_TO はGmailの確認済みエイリアスがある場合のみ設定
 *   - GmailApp利用のため、初回に一度 sendTestMail を実行して権限を承認してください
 */

const SHEET_ID = '1rmPX-QotCA04b6cdViBixcuYlwc3NTAdP5_ghccFTyY';

const COL = {
  TIMESTAMP: 1, NAME: 2, BIRTHDATE: 3, PHONE: 4, EMAIL: 5,
  RESIDENCE: 6, MESSAGE: 7, URL: 8,
  SENT_FLAG: 9, SENT_AT: 10, MSG_ID: 11
};

const HEADERS = ['申込日時', 'お名前', '生年月日', '電話番号', 'メールアドレス',
  '現在のお住まい', '気になること・質問', '流入ページ', 'SENTフラグ', '送付日時', 'メールID'];

const MAIL = {
  FROM_NAME: '株式会社g-wic 採用担当',
  FROM: 'recruit@g-wic.jp',      // 送信元アドレス（このアカウント自身 or 登録済みエイリアスであること）
  REPLY_TO: 'recruit@g-wic.jp',  // 返信先
  SUBJECT: '【株式会社g-wic】カジュアル面談のお申し込みありがとうございます',
  BCC: ''         // 応募控えを受け取りたい場合はアドレスを設定
};

/***** ウェブアプリ: フォーム受信 → 追記 → 自動返信 *****/
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30 * 1000);
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets()[0]; // 先頭シート（gid=0）

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }

    const p = (e && e.parameter) ? e.parameter : {};
    const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

    const values = [now, p.name || '', p.birthdate || '', p.tel || '', p.email || '',
      p.residence || '', p.message || '', p.page || '', '', '', ''];

    // 電話番号の先頭0が消えないよう全列テキストで保存
    const row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, values.length).setNumberFormat('@').setValues([values]);

    // 自動返信メール
    if (p.email && validateEmail_(p.email)) {
      try {
        const res = sendAutoReply_(p);
        sheet.getRange(row, COL.SENT_FLAG).setValue('SENT');
        sheet.getRange(row, COL.SENT_AT).setValue(now);
        sheet.getRange(row, COL.MSG_ID).setValue(res && res.getId ? res.getId() : '');
      } catch (mailErr) {
        sheet.getRange(row, COL.SENT_FLAG).setValue('MAIL_ERROR');
        Logger.log('メール送信失敗: ' + mailErr);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput('OK');
}

/***** 未送付リードの一括送信（保険：手動メニュー / 時間トリガー用） *****/
function processPendingLeads() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const rows = sheet.getRange(2, 1, lastRow - 1, COL.MSG_ID).getValues();
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  rows.forEach((r, i) => {
    const rowIndex = i + 2;
    if (String(r[COL.SENT_FLAG - 1]).trim().toUpperCase() === 'SENT') return;
    const email = String(r[COL.EMAIL - 1]).trim();
    if (!validateEmail_(email)) return;

    const p = {
      name: r[COL.NAME - 1], birthdate: r[COL.BIRTHDATE - 1], tel: r[COL.PHONE - 1],
      email: email, residence: r[COL.RESIDENCE - 1], message: r[COL.MESSAGE - 1]
    };
    try {
      const res = sendAutoReply_(p);
      sheet.getRange(rowIndex, COL.SENT_FLAG).setValue('SENT');
      sheet.getRange(rowIndex, COL.SENT_AT).setValue(now);
      sheet.getRange(rowIndex, COL.MSG_ID).setValue(res && res.getId ? res.getId() : '');
    } catch (e) {
      sheet.getRange(rowIndex, COL.SENT_FLAG).setValue('MAIL_ERROR');
      Logger.log('行' + rowIndex + ' 送信失敗: ' + e);
    }
  });
}

/***** メール本文・送信 *****/
function sendAutoReply_(p) {
  const name = String(p.name || '').trim();
  const toName = name ? name + ' 様' : 'ご応募者 様';

  const body =
toName + '\n\n' +
'この度は、株式会社g-wicのカジュアル面談にお申し込みいただき、誠にありがとうございます。\n' +
'担当者より、ご記入いただいたメールアドレス・お電話にて、改めてご連絡を差し上げます。\n\n' +
'---------\n\n' +
'■g-wicについて\n' +
'私たちは「女性が生涯、真に活躍できるリーディングカンパニー」を目指す、女性による営業支援の会社です。\n' +
'未経験からでも、一生通用する営業スキルと自信を身につけられる環境をご用意しています。\n\n' +
'■募集職種\n' +
'未経験から“市場価値”を高める女性営業職（正社員／東京・大阪）\n' +
'※アパレル以外の方のご応募も歓迎しています。\n\n' +
'■今後の流れ\n' +
'STEP1：フォーム送信（完了しています）\n' +
'STEP2：カジュアル面談（以下いずれかの方法で日程をご調整ください）\n\n' +
'---\n\n' +
'① Web予約（かんたん）\n' +
'以下のURLより、ご都合の良い日時をご予約ください。\n' +
'https://timerex.net/s/gwic.nao.o_1be8/3e2315c4\n\n' +
'② メールでの日程調整\n' +
'Web予約が難しい場合は、本メールへのご返信にて、ご都合の良い日時を第2〜第3希望までお知らせください。\n\n' +
'※面談の所要時間は約30分を予定しております。\n' +
'※対面・オンラインから選択可能です。\n\n' +
'---\n\n' +
'応募＝入社ではありません。\n' +
'「まずは話を聞いてみたい」というお気持ちだけで大丈夫です。\n' +
'面談は、あなたとg-wicがお互いを知るための時間ですので、不安や疑問も率直にお聞かせください。\n\n' +
'ご返信を心よりお待ちしております。\n\n' +
'---------\n\n' +
'■ご記入内容の控え\n' +
'お名前　　　　：' + (name || '-') + '\n' +
'生年月日　　　：' + (p.birthdate || '-') + '\n' +
'電話番号　　　：' + (p.tel || '-') + '\n' +
'メール　　　　：' + (p.email || '-') + '\n' +
'現在のお住まい：' + (p.residence || '-') + '\n' +
'気になること　：' + (p.message || '-') + '\n\n' +
'---------\n\n' +
'面談前に気になることがございましたら、本メールへのご返信にてお気軽にお問い合わせください。\n' +
'引き続き、何卒よろしくお願いいたします。\n\n' +
'――――――――――――\n' +
'株式会社g-wic 採用担当\n' +
'URL：https://g-wic.jp\n' +
'――――――――――――';

  const htmlBody = body.split('\n').map(sanitizeHtml_).join('<br>');
  const options = { name: MAIL.FROM_NAME, htmlBody: htmlBody };
  if (MAIL.REPLY_TO) options.replyTo = MAIL.REPLY_TO;
  if (MAIL.BCC) options.bcc = MAIL.BCC;
  if (MAIL.FROM) options.from = MAIL.FROM;

  return GmailApp.sendEmail(p.email, MAIL.SUBJECT, body, options);
}

/***** メニュー *****/
function onOpen() {
  SpreadsheetApp.getUi().createMenu('g-wic 自動返信')
    .addItem('未送付リードを一括送信', 'processPendingLeads')
    .addItem('自分宛にテスト送信（権限承認用）', 'sendTestMail')
    .addToUi();
}

function sendTestMail() {
  const email = Session.getActiveUser().getEmail();
  sendAutoReply_({
    name: 'テスト', birthdate: '2000-01-01', tel: '09000000000',
    email: email, residence: '東京都', message: 'これはテスト送信です'
  });
  SpreadsheetApp.getUi().alert('テストメールを ' + email + ' に送信しました。受信をご確認ください。');
}

/***** ユーティリティ *****/
function validateEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}
function sanitizeHtml_(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
