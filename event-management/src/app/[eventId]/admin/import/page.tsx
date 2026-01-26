"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDemo, Participant, ParticipantStatus, TicketType, Category } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertTriangle, CheckCircle, X, ChevronRight, Settings, ArrowRight } from "lucide-react";
import Papa from "papaparse";

type ImportStep = "upload" | "preview" | "mapping" | "duplicates" | "result";
type CsvRow = Record<string, string>;

// 表示用ラベルとキーの定義
const SYSTEM_FIELDS: Record<string, string> = {
    ignore: "-- 取り込まない --",
    name: "名前 *",
    furigana: "フリガナ",
    email: "メールアドレス",
    phone: "電話番号",
    organization: "会社/組織",
    status: "ステータス",
    ticketType: "チケット種別",
    hasAfterParty: "懇親会参加",
    ptxOrderKey: "PTX注文キー",
    source: "流入元",
    ticketDetails: "チケット内訳",
    notes: "備考 (Notes)",
};

const TICKET_MAP: Record<string, TicketType> = {
    "来場": "attendance",
    "会場参加": "attendance",
    "現地参加": "attendance",
    "オンライン": "online",
    "オンライン参加": "online",
    "アーカイブ": "archive",
};

type ImportSettings = {
    defaultCategoryId: string;
    forceCategory: boolean;
    defaultTicketType: TicketType;
    forceTicketType: boolean;
    defaultPaymentStatus: Participant['paymentStatus'];
    forcePaymentStatus: boolean;
};

export default function ImportPage() {
    const router = useRouter();
    const { eventId, participants, bulkAddParticipants, categories } = useDemo();
    const [step, setStep] = useState<ImportStep>("upload");
    const [csvData, setCsvData] = useState<CsvRow[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

    // Mapping keys are CSV Headers, Values are SystemField keys
    const [mapping, setMapping] = useState<Record<string, string>>({});

    const [duplicates, setDuplicates] = useState<{ row: CsvRow; existing: Participant }[]>([]);
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [importResult, setImportResult] = useState({ total: 0, imported: 0, skipped: 0 });
    const [importSettings, setImportSettings] = useState<ImportSettings>({
        defaultCategoryId: "",
        forceCategory: false,
        defaultTicketType: "attendance",
        forceTicketType: false,
        defaultPaymentStatus: "paid",
        forcePaymentStatus: false
    });

    const handleFileUpload = useCallback((file: File) => {
        // First pass: Parse as array of arrays to find the header row
        Papa.parse(file, {
            header: false,
            skipEmptyLines: "greedy",
            complete: (results) => {
                const rawData = results.data as string[][];

                // 1. Find the header row
                let headerRowIndex = -1;
                let detectedHeaders: string[] = [];

                for (let i = 0; i < Math.min(rawData.length, 20); i++) {
                    const row = rawData[i];
                    const rowStr = row.join("").toLowerCase();
                    // Check for multiple keywords to be sure
                    if ((rowStr.includes("名前") || rowStr.includes("name")) &&
                        (rowStr.includes("mail") || rowStr.includes("メール") || rowStr.includes("チケット"))) {
                        headerRowIndex = i;
                        detectedHeaders = row.map(cell => cell.trim());
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    // Fallback to first row if no header found
                    headerRowIndex = 0;
                    detectedHeaders = rawData[0];
                    console.warn("Could not detect header row, using first row");
                }

                // 2. Process data rows with hybrid logic
                const processedRows: CsvRow[] = [];

                // Identify column indices for critical fields
                const nameIndex = detectedHeaders.findIndex(h => h.includes("名前") || h.toLowerCase().includes("name"));

                for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                    const row = rawData[i];
                    if (row.length === 0) continue;

                    let rowObj: CsvRow = {};

                    // Pattern Check: Is first column empty but second column has data? (Pattern B)
                    // And assume Standard Pattern A has data in first column
                    const isPatternB = row[0] === "" && row[1] !== "" && row.length > 1;

                    if (isPatternB) {
                        // Shift processing: 
                        // Empty Name col (0) -> Ignored
                        // Actual Name is in col (1)
                        // We need to map this carefully. 
                        // If we use the standard headers, we need to map row[1] to "名前" header.

                        // Strategy: Manually construct the object based on detected headers
                        // We effectively shift the data array left by 1 for this row, OR just map explicitly

                        // Let's look at the CSV structure from the user issue:
                        // Header: 名前, 表示名, ...
                        // Pattern B: [empty], [Name], ...
                        // It seems the columns align from index 1 onwards? No, "チケット名" etc seems to align.
                        // Let's assume standard Peatix format alignment for subsequent columns.

                        // Re-mapping for Pattern B:
                        // Header[0] ("名前") <= row[1]
                        // Header[1] ("表示名") <= row[1] (duplicate name as display name?) or row[2]?
                        // Looking at the sample:
                        // 259: ,残間彩香,2025/11/25,参加（リアル）,1
                        // Header: 名前, 表示名, 申込日, チケット名, 枚数...
                        // It seems row[1] aligns with "名前"? No, "名前" is index 0.
                        // So row[1] is "残間彩香". row[2] is date.
                        // Headers:
                        // 0: 名前
                        // 1: 表示名
                        // 2: 申込日
                        // 3: チケット名
                        //
                        // Data (Pattern B):
                        // 0: ""
                        // 1: "残間彩香"
                        // 2: "2025/11/25"
                        // 3: "参加（リアル）"

                        // It seems explicitly shifted by 1 OR the "名前" column is empty and "表示名" has the name?
                        // Actually, looking at line 10 (Standard):
                        // ソウマ コトコ(0), soma(1), 2025-...(2)
                        //
                        // Line 259 (Pattern B):
                        // [empty](0), 残間彩香(1), 2025/...(2)

                        // So for Pattern B, the Name is in index 1.
                        // Date is in index 2.

                        // Construction:
                        detectedHeaders.forEach((header, colIndex) => {
                            if (colIndex === nameIndex) {
                                // For name column, take value from current index + 1?
                                // OR is it that index 1 IS "表示名" header, and we just want to use it as Name?
                                // Let's populate normally first
                                rowObj[header] = row[colIndex];
                            } else {
                                rowObj[header] = row[colIndex];
                            }
                        });

                        // Patching Name:
                        if (nameIndex !== -1) {
                            // If name is empty, try taking from col 1 (which aligns with "表示名" usually)
                            if (!rowObj[detectedHeaders[nameIndex]] && row[nameIndex + 1]) {
                                rowObj[detectedHeaders[nameIndex]] = row[nameIndex + 1];
                            }
                        }

                    } else {
                        // Standard Pattern A
                        detectedHeaders.forEach((header, colIndex) => {
                            rowObj[header] = row[colIndex] || "";
                        });
                    }

                    // Filter out rows with absolutely no valid data
                    if (!rowObj[detectedHeaders[nameIndex]] && !rowObj[detectedHeaders[nameIndex + 1]]) {
                        // Double check: if name is empty, skip.
                        // But we just patched it.
                        continue;
                    }

                    // Additional Safety: Skip if "名前" column value is literally "名前" (repeated header)
                    const nameVal = rowObj[detectedHeaders[nameIndex]];
                    if (nameVal === "名前" || nameVal === "Name") continue;

                    processedRows.push(rowObj);
                }

                setCsvData(processedRows);
                setCsvHeaders(detectedHeaders);

                // Init mapping logic (same as before)
                const newMapping: Record<string, string> = {};
                detectedHeaders.forEach(h => {
                    const lower = h.toLowerCase();
                    let field = "ignore";

                    if (lower.includes("名前") || lower.includes("name") || lower === "氏名") field = "name";
                    else if (lower.includes("ふりがな") || lower.includes("フリガナ")) field = "furigana";
                    else if (lower.includes("mail") || lower.includes("メール")) field = "email";
                    else if (lower.includes("電話") || lower.includes("phone") || lower.includes("tel")) field = "phone";

                    // Organization: Be strict to avoid "Company Industry" or "Company Position"
                    else if (lower.includes("会社名") || lower.includes("company name")) field = "organization";
                    else if (lower.includes("organization") || lower.includes("所属")) field = "organization";
                    else if (lower.includes("会社") && !lower.includes("業種") && !lower.includes("役職")) field = "organization";

                    else if (lower.includes("ステータス") || lower.includes("status") || lower.includes("種別")) field = "status";
                    else if (lower.includes("チケット") || lower.includes("ticket") || lower.includes("参加形態")) field = "ticketType";
                    else if (lower.includes("懇親会") || lower.includes("after") || lower.includes("パーティ")) field = "hasAfterParty";
                    else if (lower.includes("注文") || lower.includes("order") || lower.includes("購入者") || lower.includes("ptx")) field = "ptxOrderKey";

                    // Source: Add more keywords
                    else if (lower.includes("流入") || lower.includes("source") || lower.includes("経路") || lower.includes("申し込み元") || lower.includes("きっかけ") || lower.includes("紹介")) field = "source";

                    else if (lower.includes("内訳") || lower.includes("detail") || lower.includes("詳細")) field = "ticketDetails";
                    else if (lower.includes("備考") || lower.includes("note") || lower.includes("メモ")) field = "notes";

                    newMapping[h] = field;
                });

                setMapping(newMapping);
                setStep("preview");
            },
            error: (error) => {
                console.error("CSV Parse Error:", error);
                alert("CSVの読み込みに失敗しました");
            }
        });
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith(".csv")) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    // Helper to get value for a specific system field from a row
    const getValue = (row: CsvRow, field: string) => {
        const header = Object.keys(mapping).find(h => mapping[h] === field);
        return header ? row[header] : "";
    };

    const checkDuplicates = () => {
        const found: { row: CsvRow; existing: Participant; matchType: 'ptx' | 'email' | 'name_only' }[] = [];

        csvData.forEach(row => {
            const name = getValue(row, "name");
            const email = getValue(row, "email");
            const ptxOrderKey = getValue(row, "ptxOrderKey");

            // 優先順位: PTX注文キー > メールアドレス > 氏名のみ
            let existing: Participant | undefined;
            let matchType: 'ptx' | 'email' | 'name_only' = 'name_only';

            // PTX注文キーで検索（最優先）
            if (ptxOrderKey) {
                existing = participants.find(p => p.ptxOrderKey && p.ptxOrderKey === ptxOrderKey);
                if (existing) matchType = 'ptx';
            }

            // メールアドレスで検索
            if (!existing && email) {
                existing = participants.find(p => p.email === email);
                if (existing) matchType = 'email';
            }

            // 氏名のみで検索
            if (!existing && name) {
                existing = participants.find(p => p.name === name);
                if (existing) matchType = 'name_only';
            }

            if (existing) {
                found.push({ row, existing, matchType });
            }
        });

        setDuplicates(found as any);
        setStep(found.length > 0 ? "duplicates" : "result");

        if (found.length === 0) {
            executeImport([]);
        }
    };

    const executeImport = (duplicatesToSkip: CsvRow[]) => {
        const skipSet = new Set(duplicatesToSkip.map(d => JSON.stringify(d)));

        const newParticipants: Participant[] = csvData
            .filter(row => !skipSet.has(JSON.stringify(row)))
            .map(row => {
                const statusValue = getValue(row, "status");
                const ticketValue = getValue(row, "ticketType");
                const afterPartyValue = getValue(row, "hasAfterParty");
                const ticketDetailsValue = getValue(row, "ticketDetails");
                const sourceValue = getValue(row, "source");

                // --- カテゴリ決定ロジック ---
                // Fallback to a default object if categories is empty to prevent crash
                let resolvedCategory: Category = categories.find(c => c.id === "general") || categories[0] || { id: 'general', name: '一般', color: 'bg-gray-100 text-gray-600', isVip: false };

                if (importSettings.forceCategory && importSettings.defaultCategoryId) {
                    const settingCat = categories.find(c => c.id === importSettings.defaultCategoryId);
                    if (settingCat) resolvedCategory = settingCat;
                } else {
                    const statusLower = statusValue.toLowerCase();
                    if (statusValue) {
                        const exactMatch = categories.find(c => c.id.toLowerCase() === statusLower || c.name === statusValue);
                        if (exactMatch) {
                            resolvedCategory = exactMatch;
                        } else {
                            // 優先キーワード判定 (ランクや特定の役割を部分一致より優先)
                            const rankKeywords: [string, string][] = [
                                ['platinum', 'platinum'], ['プラチナ', 'platinum'],
                                ['gold', 'gold'], ['ゴールド', 'gold'],
                                ['silver', 'silver'], ['シルバー', 'silver'],
                                ['speaker', 'speaker'], ['登壇', 'speaker'],
                                ['student', 'student'], ['学生', 'student'],
                                ['guest', 'guest'], ['招待', 'guest'], ['関係者', 'guest'],
                                ['friend', 'guest'], ['友人', 'guest'],
                                ['acquaintance', 'guest'], ['知人', 'guest'],
                                ['client', 'guest'], ['クライアント', 'guest'],
                                ['partner', 'guest'], ['パートナー', 'guest'],
                                ['special', 'guest'], ['特例', 'guest'], ['特別', 'guest'],
                            ];

                            let priorityMatch: Category | undefined;
                            for (const [keyword, targetId] of rankKeywords) {
                                if (statusLower.includes(keyword)) {
                                    priorityMatch = categories.find(c => c.id === targetId);
                                    if (priorityMatch) break;
                                }
                            }

                            if (priorityMatch) {
                                resolvedCategory = priorityMatch;
                            } else if (statusLower.includes("vip")) {
                                const vipCat = categories.find(c => c.id === 'vip') || categories.find(c => c.isVip);
                                if (vipCat) resolvedCategory = vipCat;
                            } else {
                                // 部分一致判定: カテゴリ名がステータス文字列に含まれているかチェック
                                // 長いカテゴリ名から順にチェック（例: "VIP Sponsor" を "Sponsor" より優先）
                                const sortedCats = [...categories].sort((a, b) => b.name.length - a.name.length);
                                const partialMatch = sortedCats.find(c => statusLower.includes(c.name.toLowerCase()));
                                if (partialMatch) resolvedCategory = partialMatch;
                            }
                        }
                    } else if (importSettings.defaultCategoryId) {
                        const settingCat = categories.find(c => c.id === importSettings.defaultCategoryId);
                        if (settingCat) resolvedCategory = settingCat;
                    }
                }

                const status = resolvedCategory.id;

                // --- チケット種別決定ロジック ---
                let ticketType = TICKET_MAP[ticketValue] || "attendance";

                if (ticketValue) {
                    if (ticketValue.includes("オンライン") || ticketValue.includes("視聴") || ticketValue.includes("ライブ")) {
                        ticketType = "online";
                    } else if (ticketValue.includes("アーカイブ")) {
                        ticketType = "archive";
                    } else if (ticketValue.includes("来場") || ticketValue.includes("現地")) {
                        ticketType = "attendance";
                    }
                }

                if (importSettings.forceTicketType) {
                    ticketType = importSettings.defaultTicketType;
                } else if (!ticketValue && importSettings.defaultTicketType) {
                    ticketType = importSettings.defaultTicketType;
                }

                // --- 懇親会 ---
                let hasAfterParty = afterPartyValue.includes("○") || afterPartyValue.includes("あり") || afterPartyValue === "1";
                if (ticketValue && ticketValue.includes("懇親会")) {
                    hasAfterParty = true;
                }

                // --- 決済ステータス ---
                let paymentStatus = importSettings.defaultPaymentStatus;

                // --- 複数チケット判定 ---
                const hasMultipleTickets = ticketDetailsValue.includes("/") ||
                    (ticketDetailsValue.includes("来場") && (ticketDetailsValue.includes("ライブ") || ticketDetailsValue.includes("アーカイブ")));

                // --- Source判定 ---
                let source: 'ptx' | 'invitation' | 'sponsor' | 'media' | 'other' = 'other';
                const sourceLower = sourceValue.toLowerCase();
                if (sourceLower.includes("ptx") || sourceLower.includes("peatix")) source = 'ptx';
                else if (sourceLower.includes("招待")) source = 'invitation';
                else if (sourceLower.includes("スポンサー") || sourceLower.includes("sponsor")) source = 'sponsor';
                else if (sourceLower.includes("メディア") || sourceLower.includes("media")) source = 'media';

                // --- 備考 (Notes) ---
                const noteHeaders = Object.keys(mapping).filter(h => mapping[h] === "notes");
                const notes = noteHeaders
                    .map(h => {
                        const val = row[h];
                        return val ? `${h}: ${val}` : "";
                    })
                    .filter(s => s !== "")
                    .join("\n");

                return {
                    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    name: getValue(row, "name"),
                    furigana: getValue(row, "furigana"),
                    email: getValue(row, "email"),
                    phone: getValue(row, "phone"),
                    organization: getValue(row, "organization"),
                    category: 'deprecated',
                    isVip: resolvedCategory.isVip,
                    registeredAt: new Date().toISOString(),
                    status,
                    ticketType,
                    hasAfterParty,
                    hasMultipleTickets,
                    ticketDetails: ticketDetailsValue || undefined,
                    confirmationStatus: "unconfirmed" as const,
                    paymentStatus,
                    source,
                    ptxOrderKey: row[mapping.ptxOrderKey] || undefined,
                    notes: notes || undefined,
                };
            });

        bulkAddParticipants(newParticipants);

        setImportResult({
            total: csvData.length,
            imported: newParticipants.length,
            skipped: csvData.length - newParticipants.length
        });
        setStep("result");
    };

    const reset = () => {
        setStep("upload");
        setCsvData([]);
        setCsvHeaders([]);
        setMapping({});
        setDuplicates([]);
    };

    const nameHeader = Object.keys(mapping).find(h => mapping[h] === "name");

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
                    CSVインポート
                </h1>
                <p className="text-gray-500 font-medium mt-1">参加者リストの一括取り込み</p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                {["upload", "preview", "mapping", "duplicates", "result"].map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <span className={step === s ? "text-red-600" : "text-gray-300"}>
                            {["アップロード", "プレビュー", "マッピング", "重複確認", "完了"][i]}
                        </span>
                        {i < 4 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                    </div>
                ))}
            </div>

            {/* Step: Upload */}
            {step === "upload" && (
                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-4 border-dashed border-gray-200 hover:border-red-600 p-16 text-center transition-colors cursor-pointer"
                    onClick={() => document.getElementById("csv-input")?.click()}
                >
                    <Upload className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold uppercase mb-2">CSVファイルをドラッグ&ドロップ</h3>
                    <p className="text-gray-400 mb-4">または クリックして選択</p>
                    <input
                        id="csv-input"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />
                </div>
            )}

            {/* Step: Preview */}
            {step === "preview" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-red-600" />
                            <span className="font-bold">{csvData.length}件のデータを検出</span>
                        </div>
                    </div>

                    <div className="border-2 border-black overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-black text-white">
                                <tr>
                                    {csvHeaders.slice(0, 6).map(h => (
                                        <th key={h} className="p-3 text-left font-bold uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {csvData.slice(0, 5).map((row, i) => (
                                    <tr key={i} className="border-b border-gray-200">
                                        {csvHeaders.slice(0, 6).map(h => (
                                            <td key={h} className="p-3">{row[h]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {csvData.length > 5 && (
                        <p className="text-gray-400 text-sm">...他 {csvData.length - 5}件</p>
                    )}

                    <div className="flex gap-4">
                        <Button onClick={reset} variant="outline" className="h-12 px-6 rounded-none border-2">
                            キャンセル
                        </Button>
                        <Button onClick={() => setStep("mapping")} className="h-12 px-8 bg-black hover:bg-red-600 text-white rounded-none">
                            次へ: 列マッピング
                        </Button>
                    </div>
                </div>
            )}

            {/* Step: Mapping */}
            {step === "mapping" && (
                <div className="space-y-6">
                    <p className="text-gray-500">CSVの各列をどの項目に取り込むか選択してください</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {csvHeaders.map((header) => (
                            <div key={header} className="border-2 border-gray-200 p-4 bg-white">
                                <label className="block text-sm font-bold uppercase mb-2 truncate" title={header}>
                                    {header}
                                </label>
                                <div className="flex items-center gap-2 mb-2">
                                    <ArrowRight className="w-4 h-4 text-gray-300" />
                                    <select
                                        value={mapping[header] || "ignore"}
                                        onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                                        className={`w-full h-10 px-2 border-2 rounded-none bg-white font-bold ${mapping[header] === "ignore" ? "border-gray-200 text-gray-400" : "border-black text-black"
                                            }`}
                                    >
                                        {Object.entries(SYSTEM_FIELDS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                    例: {csvData[0]?.[header] || "(空)"}
                                </div>
                            </div>
                        ))}
                    </div>

                    {!nameHeader && (
                        <div className="text-red-600 font-bold text-sm bg-red-50 p-2">
                            ⚠️ 「名前」項目への割り当てが必須です
                        </div>
                    )}

                    <div className="bg-neutral-100 p-6 border-2 border-black mt-8">
                        <h3 className="font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5" /> 詳細設定 (デフォルト値・強制適用)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Category Settings */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold block">デフォルトカテゴリ</label>
                                <select
                                    className="w-full h-10 border-2 border-gray-300 rounded-none px-2 bg-white"
                                    value={importSettings.defaultCategoryId}
                                    onChange={e => setImportSettings({ ...importSettings, defaultCategoryId: e.target.value })}
                                >
                                    <option value="">-- 指定なし --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={importSettings.forceCategory}
                                        onChange={e => setImportSettings({ ...importSettings, forceCategory: e.target.checked })}
                                        className="w-4 h-4 accent-black bg-gray-100 border-gray-300"
                                    />
                                    <span>CSV値を無視して強制適用</span>
                                </label>
                            </div>

                            {/* Ticket Settings */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold block">デフォルトチケット</label>
                                <select
                                    className="w-full h-10 border-2 border-gray-300 rounded-none px-2 bg-white"
                                    value={importSettings.defaultTicketType}
                                    onChange={e => setImportSettings({ ...importSettings, defaultTicketType: e.target.value as TicketType })}
                                >
                                    <option value="attendance">来場</option>
                                    <option value="online">オンライン</option>
                                    <option value="archive">アーカイブ</option>
                                </select>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={importSettings.forceTicketType}
                                        onChange={e => setImportSettings({ ...importSettings, forceTicketType: e.target.checked })}
                                        className="w-4 h-4 accent-black bg-gray-100 border-gray-300"
                                    />
                                    <span>CSV値を無視して強制適用</span>
                                </label>
                            </div>

                            {/* Payment Settings */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold block">決済ステータス</label>
                                <select
                                    className="w-full h-10 border-2 border-gray-300 rounded-none px-2 bg-white"
                                    value={importSettings.defaultPaymentStatus}
                                    onChange={e => setImportSettings({ ...importSettings, defaultPaymentStatus: e.target.value as any })}
                                >
                                    <option value="paid">支払済 (Paid)</option>
                                    <option value="unpaid">未払 (Unpaid)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">※CSV読込未対応のため全適用されます</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button onClick={() => setStep("preview")} variant="outline" className="h-12 px-6 rounded-none border-2">
                            戻る
                        </Button>
                        <Button
                            onClick={checkDuplicates}
                            disabled={!nameHeader}
                            className={`h-12 px-8 text-white rounded-none ${!nameHeader ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-red-600"}`}
                        >
                            次へ: 重複チェック
                        </Button>
                    </div>
                </div>
            )}

            {/* Step: Duplicates */}
            {step === "duplicates" && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-yellow-50 border-2 border-yellow-400">
                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                        <span className="font-bold">{duplicates.length}件の重複が見つかりました</span>
                    </div>

                    <div className="border-2 border-black max-h-80 overflow-y-auto">
                        {duplicates.map((d, i) => {
                            const nameHeader = Object.keys(mapping).find(h => mapping[h] === "name") || "";
                            const emailHeader = Object.keys(mapping).find(h => mapping[h] === "email") || "";

                            return (
                                <div key={i} className="p-4 border-b border-gray-200 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold">{d.row[nameHeader] || "(名前なし)"}</div>
                                        <div className="text-sm text-gray-500">{d.row[emailHeader] || ""}</div>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        既存: {d.existing.name}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="skipDuplicates"
                            checked={skipDuplicates}
                            onChange={(e) => setSkipDuplicates(e.target.checked)}
                            className="w-5 h-5 accent-red-600"
                        />
                        <label htmlFor="skipDuplicates" className="font-bold">重複は取り込まない</label>
                    </div>

                    <div className="flex gap-4">
                        <Button onClick={() => setStep("mapping")} variant="outline" className="h-12 px-6 rounded-none border-2">
                            戻る
                        </Button>
                        <Button
                            onClick={() => executeImport(skipDuplicates ? duplicates.map(d => d.row) : [])}
                            className="h-12 px-8 bg-red-600 hover:bg-black text-white rounded-none"
                        >
                            インポート実行
                        </Button>
                    </div>
                </div>
            )}

            {/* Step: Result */}
            {step === "result" && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 p-6 bg-green-50 border-2 border-green-600">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                            <div className="font-black text-xl">インポート完了</div>
                            <div className="text-gray-600">
                                {importResult.imported}件を登録 / {importResult.skipped}件をスキップ
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button onClick={reset} variant="outline" className="h-12 px-6 rounded-none border-2">
                            新しいファイルをインポート
                        </Button>
                        <Button
                            onClick={() => router.push(`/${eventId}/admin/participants`)}
                            className="h-12 px-8 bg-black hover:bg-red-600 text-white rounded-none"
                        >
                            参加者一覧へ
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
