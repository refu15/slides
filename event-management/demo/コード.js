// ===== 修正版 完全版イベント管理システム - Code.gs =====

const SHEETS = {
    SETTINGS: 'EventSettings',
    PARTICIPANTS: 'Participants',
    CHECKIN: 'CheckInData',
    VENUES: 'Venues',
    STAFF: 'StaffAccess'
};

const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DEFAULT_STAFF_PASSWORD = 'staff123';

// ===== Webアプリのエントリーポイント =====
function doGet(e) {
    const page = e.parameter.page || 'setup';
    const action = e.parameter.action;

    // 初期化チェック
    if (!isInitialized() && page !== 'setup') {
        return createHtmlOutput('Setup');
    }

    // APIエンドポイント
    if (action) {
        return handleApiRequest(e);
    }

    // ページルーティング
    const pages = {
        'setup': 'Setup',
        'admin': 'Admin',
        'participants': 'ParticipantManager',
        'checkin': 'CheckIn',
        'dashboard': 'Dashboard',
        'qr': 'QRGenerator'
    };

    const htmlFile = pages[page] || 'CheckIn';
    return createHtmlOutput(htmlFile);
}

// HTMLテンプレートを正しく処理
function createHtmlOutput(fileName) {
    const template = HtmlService.createTemplateFromFile(fileName);
    template.gasUrl = ScriptApp.getService().getUrl();
    template.ssUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();

    return template.evaluate()
        .setTitle('イベント管理システム')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;

        switch (action) {
            case 'initialize':
                return initializeSystem(data);
            case 'verifyAdmin':
                return verifyPassword(data.password, 'admin');
            case 'verifyStaff':
                return verifyPassword(data.password, 'staff');
            case 'updateSettings':
                return updateEventSettings(data);
            case 'addParticipant':
                return addParticipant(data);
            case 'updateParticipant':
                return updateParticipant(data);
            case 'deleteParticipant':
                return deleteParticipant(data);
            case 'bulkAddParticipants':
                return bulkAddParticipants(data);
            case 'checkin':
            case 'checkout':
                return processCheckInOut(data);
            default:
                return createJsonResponse(false, '不明なアクション');
        }
    } catch (error) {
        return createJsonResponse(false, 'エラー: ' + error.toString());
    }
}

// ===== APIリクエストハンドラー =====
function handleApiRequest(e) {
    const action = e.parameter.action;
    const venue = e.parameter.venue;

    try {
        switch (action) {
            case 'getSettings':
                return createJsonResponse(true, '', getEventSettings());
            case 'getCount':
                const current = calculateCurrentCount(venue);
                const total = getTotalCheckins(venue);
                return createJsonResponse(true, '', { current, total });
            case 'getParticipants':
                return createJsonResponse(true, '', getParticipantsList());
            case 'getCheckInStatus':
                return createJsonResponse(true, '', getCheckInStatus());
            case 'verifyParticipant':
                const userId = e.parameter.userId;
                return createJsonResponse(true, '', verifyParticipantExists(userId));
            default:
                return createJsonResponse(false, '不明なアクション');
        }
    } catch (error) {
        return createJsonResponse(false, error.toString());
    }
}

// ===== システム初期化 =====
function isInitialized() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return ss.getSheetByName(SHEETS.SETTINGS) !== null;
}

// クライアントから呼び出される初期化関数
function initializeSystemFromClient(data) {
    try {
        createSettingsSheet(data);
        createParticipantsSheet();
        createCheckInSheet();
        createVenuesSheet(data.venues || []);
        createStaffSheet();

        return { success: true, message: 'システムを初期化しました' };
    } catch (error) {
        return { success: false, message: error.toString() };
    }
}

function initializeSystem(data) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        createSettingsSheet(data);
        createParticipantsSheet();
        createCheckInSheet();
        createVenuesSheet(data.venues || []);
        createStaffSheet();

        return createJsonResponse(true, 'システムを初期化しました');
    } catch (error) {
        return createJsonResponse(false, error.toString());
    }
}

function createSettingsSheet(data) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.SETTINGS);

    if (sheet) {
        sheet.clear();
    } else {
        sheet = ss.insertSheet(SHEETS.SETTINGS);
    }

    sheet.appendRow(['設定項目', '設定値']);
    sheet.appendRow(['イベント名', data.eventName || 'イベント名未設定']);
    sheet.appendRow(['開催日', data.eventDate || '']);
    sheet.appendRow(['開始時間', data.startTime || '']);
    sheet.appendRow(['終了時間', data.endTime || '']);
    sheet.appendRow(['会場', data.venueName || '']);
    sheet.appendRow(['住所', data.address || '']);
    sheet.appendRow(['管理者パスワード', data.adminPassword || DEFAULT_ADMIN_PASSWORD]);
    sheet.appendRow(['スタッフパスワード', data.staffPassword || DEFAULT_STAFF_PASSWORD]);
    sheet.appendRow(['作成日時', new Date()]);

    formatSheet(sheet, 1);
}

function createParticipantsSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.PARTICIPANTS);

    if (sheet) {
        sheet.clear();
    } else {
        sheet = ss.insertSheet(SHEETS.PARTICIPANTS);
    }

    sheet.appendRow([
        '参加者ID',
        '氏名',
        'フリガナ',
        'メールアドレス',
        '電話番号',
        '所属',
        '参加区分',
        'VIPフラグ',
        '登録日時'
    ]);

    formatSheet(sheet, 1);
}

function createCheckInSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.CHECKIN);

    if (sheet) {
        sheet.clear();
    } else {
        sheet = ss.insertSheet(SHEETS.CHECKIN);
    }

    sheet.appendRow([
        'タイムスタンプ',
        '参加者ID',
        '氏名',
        'アクション',
        '会場',
        '入力方法',
        'スタッフ名'
    ]);

    formatSheet(sheet, 1);
}

function createVenuesSheet(venues) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.VENUES);

    if (sheet) {
        sheet.clear();
    } else {
        sheet = ss.insertSheet(SHEETS.VENUES);
    }

    sheet.appendRow(['会場ID', '会場名', '定員', '表示順']);

    if (venues.length === 0) {
        sheet.appendRow(['main', '本編会場', 100, 1]);
        sheet.appendRow(['party', '懇親会場', 80, 2]);
    } else {
        venues.forEach((venue, index) => {
            sheet.appendRow([venue.id, venue.name, venue.capacity, index + 1]);
        });
    }

    formatSheet(sheet, 1);
}

function createStaffSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.STAFF);

    if (!sheet) {
        sheet = ss.insertSheet(SHEETS.STAFF);
        sheet.appendRow(['スタッフ名', '最終アクセス', 'アクセス回数']);
        formatSheet(sheet, 1);
    }
}

function formatSheet(sheet, headerRows) {
    const headerRange = sheet.getRange(1, 1, headerRows, sheet.getLastColumn());
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(headerRows);
    sheet.autoResizeColumns(1, sheet.getLastColumn());
}

// ===== 設定関連 =====
function getEventSettings() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SETTINGS);
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    const settings = {};

    for (let i = 1; i < data.length; i++) {
        settings[data[i][0]] = data[i][1];
    }

    return settings;
}

function updateEventSettings(data) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SETTINGS);
        const dataRange = sheet.getDataRange().getValues();

        for (let i = 1; i < dataRange.length; i++) {
            const key = dataRange[i][0];
            if (data[key] !== undefined) {
                sheet.getRange(i + 1, 2).setValue(data[key]);
            }
        }

        return createJsonResponse(true, '設定を更新しました');
    } catch (error) {
        return createJsonResponse(false, error.toString());
    }
}

// ===== 参加者管理 =====
function getParticipantsList() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PARTICIPANTS);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    const participants = [];

    for (let i = 1; i < data.length; i++) {
        participants.push({
            id: data[i][0],
            name: data[i][1],
            furigana: data[i][2],
            email: data[i][3],
            phone: data[i][4],
            organization: data[i][5],
            category: data[i][6],
            isVip: data[i][7],
            registeredAt: data[i][8]
        });
    }

    return participants;
}

function addParticipant(data) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PARTICIPANTS);

        sheet.appendRow([
            data.id,
            data.name,
            data.furigana || '',
            data.email || '',
            data.phone || '',
            data.organization || '',
            data.category || '一般',
            data.isVip || false,
            new Date()
        ]);

        return createJsonResponse(true, '参加者を追加しました');
    } catch (error) {
        return createJsonResponse(false, error.toString());
    }
}

// クライアントから呼び出される参加者追加関数
function addParticipantFromClient(data) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PARTICIPANTS);

        sheet.appendRow([
            data.id,
            data.name,
            data.furigana || '',
            data.email || '',
            data.phone || '',
            data.organization || '',
            data.category || '一般',
            data.isVip || false,
            new Date()
        ]);

        return { success: true, message: '参加者を追加しました' };
    } catch (error) {
        return { success: false, message: error.toString() };
    }
}

function bulkAddParticipants(data) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PARTICIPANTS);
        const participants = data.participants;

        participants.forEach(p => {
            sheet.appendRow([
                p.id,
                p.name,
                p.furigana || '',
                p.email || '',
                p.phone || '',
                p.organization || '',
                p.category || '一般',
                p.isVip || false,
                new Date()
            ]);
        });

        return createJsonResponse(true, `${participants.length}名の参加者を追加しました`);
    } catch (error) {
        return createJsonResponse(false, error.toString());
    }
}

// クライアントから呼び出される一括追加関数
function bulkAddParticipantsFromClient(participants) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PARTICIPANTS);

        participants.forEach(p => {
            sheet.appendRow([
                p.id,
                p.name,
                p.furigana || '',
                p.email || '',
                p.phone || '',
                p.organization || '',
                p.category || '一般',
                p.isVip || false,
                new Date()
            ]);
        });

        return { success: true, message: `${participants.length}名の参加者を追加しました` };
    } catch (error) {
        return { success: false, message: error.toString() };
    }
}

function verifyParticipantExists(userId) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PARTICIPANTS);
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
            return {
                exists: true,
                name: data[i][1],
                isVip: data[i][7],
                category: data[i][6]
            };
        }
    }

    return { exists: false };
}

// ===== チェックイン処理 =====
function processCheckInOut(data) {
    try {
        const participant = verifyParticipantExists(data.userId);

        if (!participant.exists && !data.manual) {
            return createJsonResponse(false, 'この参加者IDは登録されていません');
        }

        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CHECKIN);

        sheet.appendRow([
            new Date(),
            data.userId,
            data.name || participant.name || '',
            data.action,
            data.venue,
            data.manual ? '手動' : 'QR',
            data.staffName || ''
        ]);

        if (participant.isVip && data.action === 'checkin') {
            sendVipNotification(participant.name, data.venue);
        }

        const currentCount = calculateCurrentCount(data.venue);

        return createJsonResponse(true, 'チェックインを記録しました', {
            current: currentCount,
            participantName: data.name || participant.name
        });

    } catch (error) {
        return createJsonResponse(false, error.toString());
    }
}

// クライアントから呼び出されるチェックイン関数
function processCheckInOutFromClient(data) {
    try {
        const participant = verifyParticipantExists(data.userId);

        if (!participant.exists && !data.manual) {
            return { success: false, message: 'この参加者IDは登録されていません' };
        }

        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CHECKIN);

        sheet.appendRow([
            new Date(),
            data.userId,
            data.name || participant.name || '',
            data.action,
            data.venue,
            data.manual ? '手動' : 'QR',
            data.staffName || ''
        ]);

        if (participant.exists && participant.isVip && data.action === 'checkin') {
            sendVipNotification(participant.name, data.venue);
        }

        const currentCount = calculateCurrentCount(data.venue);

        return {
            success: true,
            message: 'チェックインを記録しました',
            participantName: data.name || participant.name,
            current: currentCount
        };

    } catch (error) {
        return { success: false, message: error.toString() };
    }
}

function getCheckInStatus() {
    const participants = getParticipantsList();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CHECKIN);

    if (!sheet) return [];

    const checkInData = sheet.getDataRange().getValues();
    const statusMap = {};

    participants.forEach(p => {
        statusMap[p.id] = {
            id: p.id,
            name: p.name,
            checkedIn: false,
            checkInTime: null,
            venue: null
        };
    });

    for (let i = checkInData.length - 1; i >= 1; i--) {
        const userId = checkInData[i][1];
        const action = checkInData[i][3];

        if (statusMap[userId] && !statusMap[userId].checkedIn) {
            if (action === 'checkin') {
                statusMap[userId].checkedIn = true;
                statusMap[userId].checkInTime = checkInData[i][0];
                statusMap[userId].venue = checkInData[i][4];
            }
        }
    }

    return Object.values(statusMap);
}

// ===== 人数カウント =====
function calculateCurrentCount(venue) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CHECKIN);
    if (!sheet) return 0;

    const data = sheet.getDataRange().getValues();
    const userStatus = {};

    for (let i = 1; i < data.length; i++) {
        const userId = data[i][1];
        const action = data[i][3];
        const venueData = data[i][4];

        if (venueData === venue) {
            userStatus[userId] = (action === 'checkin');
        }
    }

    return Object.values(userStatus).filter(status => status === true).length;
}

function getTotalCheckins(venue) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CHECKIN);
    if (!sheet) return 0;

    const data = sheet.getDataRange().getValues();
    const uniqueUsers = new Set();

    for (let i = 1; i < data.length; i++) {
        const userId = data[i][1];
        const action = data[i][3];
        const venueData = data[i][4];

        if (venueData === venue && action === 'checkin') {
            uniqueUsers.add(userId);
        }
    }

    return uniqueUsers.size;
}

// ===== 認証 =====
function verifyPassword(password, type) {
    const settings = getEventSettings();

    let correctPassword;
    if (type === 'admin') {
        correctPassword = settings['管理者パスワード'] || DEFAULT_ADMIN_PASSWORD;
    } else if (type === 'staff') {
        correctPassword = settings['スタッフパスワード'] || DEFAULT_STAFF_PASSWORD;
    }

    return createJsonResponse(
        password === correctPassword,
        password === correctPassword ? '認証成功' : 'パスワードが間違っています'
    );
}

// クライアントから呼び出される認証関数
function verifyAdminPassword(password) {
    const settings = getEventSettings();
    const correctPassword = settings['管理者パスワード'] || DEFAULT_ADMIN_PASSWORD;

    return {
        success: password === correctPassword,
        message: password === correctPassword ? '認証成功' : 'パスワードが間違っています'
    };
}

function verifyStaffPassword(password) {
    const settings = getEventSettings();
    const correctPassword = settings['スタッフパスワード'] || DEFAULT_STAFF_PASSWORD;

    return {
        success: password === correctPassword,
        message: password === correctPassword ? '認証成功' : 'パスワードが間違っています'
    };
}

function getEventSettingsForClient() {
    return getEventSettings();
}

function getParticipantsForClient() {
    return getParticipantsList();
}

function getCheckInStatusForClient() {
    return getCheckInStatus();
}

function verifyParticipantForClient(userId) {
    return verifyParticipantExists(userId);
}

function getCurrentCountForClient(venue) {
    return {
        current: calculateCurrentCount(venue),
        total: getTotalCheckins(venue)
    };
}

// ===== VIP通知 =====
function sendVipNotification(name, venue) {
    const LINE_TOKEN = 'YOUR_LINE_NOTIFY_TOKEN';

    if (LINE_TOKEN !== 'YOUR_LINE_NOTIFY_TOKEN') {
        const options = {
            method: 'post',
            headers: { 'Authorization': 'Bearer ' + LINE_TOKEN },
            payload: { message: `🌟 VIP入場通知\n${name}様が${venue}に入場されました` }
        };

        try {
            UrlFetchApp.fetch('https://notify-api.line.me/api/notify', options);
        } catch (error) {
            console.error('VIP通知エラー:', error);
        }
    }
}

// ===== ユーティリティ =====
function createJsonResponse(success, message, data) {
    return ContentService.createTextOutput(JSON.stringify({
        success: success,
        message: message,
        data: data || null
    })).setMimeType(ContentService.MimeType.JSON);
}