"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isModelActiveAndAvailable = isModelActiveAndAvailable;
exports.filterConfiguredModels = filterConfiguredModels;
exports.startChat = startChat;
const prompts_1 = require("@clack/prompts");
const zod_1 = require("zod");
const picocolors_1 = __importDefault(require("picocolors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const readlineCore = __importStar(require("readline"));
const readline = __importStar(require("readline/promises"));
const api_1 = require("./api");
const ui_1 = require("./ui");
const trust_1 = require("./trust");
const context_1 = require("./context");
/**
 * Helper untuk menyaring model OmniRoute / Gateway yang tersedia, dikonfigurasi (configured), dan aktif.
 */
function isModelActiveAndAvailable(m) {
    if (!m || !m.id)
        return false;
    // Cek properti configured jika ada
    if (m.configured !== undefined) {
        if (m.configured === false || m.configured === 0 || m.configured === "false" || m.configured === "unconfigured") {
            return false;
        }
    }
    // Cek properti is_configured / isConfigured jika ada
    if (m.is_configured !== undefined && (m.is_configured === false || m.is_configured === 0 || m.is_configured === "false")) {
        return false;
    }
    if (m.isConfigured !== undefined && (m.isConfigured === false || m.isConfigured === 0 || m.isConfigured === "false")) {
        return false;
    }
    // Cek properti active jika ada
    if (m.active !== undefined) {
        if (m.active === false || m.active === 0 || m.active === "false" || m.active === "inactive") {
            return false;
        }
    }
    // Cek properti available jika ada
    if (m.available !== undefined) {
        if (m.available === false || m.available === 0 || m.available === "false" || m.available === "unavailable") {
            return false;
        }
    }
    // Cek properti enabled jika ada
    if (m.enabled !== undefined) {
        if (m.enabled === false || m.enabled === 0 || m.enabled === "false") {
            return false;
        }
    }
    // Cek status atau state string jika ada
    const statusStr = typeof m.status === 'string' ? m.status : (typeof m.state === 'string' ? m.state : null);
    if (statusStr) {
        const disabledStatuses = ["inactive", "disabled", "offline", "error", "unavailable", "maintenance", "unconfigured", "not_configured"];
        if (disabledStatuses.includes(statusStr.toLowerCase())) {
            return false;
        }
    }
    return true;
}
function filterConfiguredModels(rawList) {
    if (!rawList || !Array.isArray(rawList))
        return [];
    const availableModels = rawList.filter(isModelActiveAndAvailable);
    const envAllowed = process.env.ALLOWED_MODELS;
    if (envAllowed) {
        const allowedArr = envAllowed.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
        if (allowedArr.length > 0) {
            return availableModels.filter(m => allowedArr.includes(m.id.toLowerCase()));
        }
    }
    const hasExplicitProperty = availableModels.some(m => m.configured !== undefined ||
        m.is_configured !== undefined ||
        m.isConfigured !== undefined ||
        m.active !== undefined ||
        m.available !== undefined);
    if (hasExplicitProperty) {
        return availableModels.filter(m => {
            const isConf = m.configured === true || m.configured === 1 || m.configured === "true" ||
                m.is_configured === true || m.is_configured === 1 || m.is_configured === "true" ||
                m.isConfigured === true || m.isConfigured === 1 || m.isConfigured === "true";
            const isActive = m.active === true || m.active === 1 || m.active === "true";
            const isAvailable = m.available === true || m.available === 1 || m.available === "true";
            return isConf || isActive || isAvailable;
        });
    }
    return availableModels;
}
function saveToEnv(key, value) {
    const configDir = path_1.default.join(os_1.default.homedir(), ".aicli");
    if (!fs_1.default.existsSync(configDir)) {
        fs_1.default.mkdirSync(configDir, { recursive: true });
    }
    const envFile = path_1.default.join(configDir, ".env");
    let content = "";
    if (fs_1.default.existsSync(envFile)) {
        content = fs_1.default.readFileSync(envFile, "utf8");
    }
    if (content.includes(`${key}=`)) {
        const regex = new RegExp(`^${key}=.*`, 'm');
        content = content.replace(regex, `${key}="${value}"`);
    }
    else {
        content += (content.endsWith("\n") || content === "" ? "" : "\n") + `${key}="${value}"\n`;
    }
    fs_1.default.writeFileSync(envFile, content, "utf8");
}
const TRUSTED_WORKSPACE = process.cwd();
function isPathTrusted(aiRequestedPath) {
    const absolutePath = path_1.default.resolve(TRUSTED_WORKSPACE, aiRequestedPath);
    return absolutePath.startsWith(TRUSTED_WORKSPACE);
}
const tools = [
    {
        type: "function",
        function: {
            name: "write_file",
            description: "Write or edit a file in the project. Creates the file if it doesn't exist.",
            parameters: {
                type: "object",
                properties: {
                    filePath: { type: "string", description: "Relative path to the file" },
                    content: { type: "string", description: "The content to write" }
                },
                required: ["filePath", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_file",
            description: "Read the content of a file.",
            parameters: {
                type: "object",
                properties: {
                    filePath: { type: "string", description: "Relative path to the file" }
                },
                required: ["filePath"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "list_dir",
            description: "List contents of a directory (files and folders).",
            parameters: {
                type: "object",
                properties: {
                    dirPath: { type: "string", description: "Relative path to the directory (use '.' for current workspace)" }
                },
                required: ["dirPath"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "grep_search",
            description: "Search for a keyword/pattern in all files under a directory recursively (ignores node_modules and .git).",
            parameters: {
                type: "object",
                properties: {
                    dirPath: { type: "string", description: "Relative path to start searching from (use '.' for workspace root)" },
                    keyword: { type: "string", description: "The search query/keyword (case-insensitive)" }
                },
                required: ["dirPath", "keyword"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "patch_file",
            description: "Replace a specific block of code in an existing file. The targetContent block must match EXACTLY character-for-character including indentation.",
            parameters: {
                type: "object",
                properties: {
                    filePath: { type: "string", description: "Relative path to the file" },
                    targetContent: { type: "string", description: "The exact block of code to search for and replace" },
                    replacementContent: { type: "string", description: "The new code block to replace targetContent with" }
                },
                required: ["filePath", "targetContent", "replacementContent"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "run_command",
            description: "Execute a terminal shell command inside the workspace directory. Use this to compile code, run tests, or verify implementations. Only run commands relevant to the task.",
            parameters: {
                type: "object",
                properties: {
                    command: { type: "string", description: "The terminal shell command to execute" }
                },
                required: ["command"]
            }
        }
    }
];
const toolSchemas = {
    read_file: zod_1.z.object({
        filePath: zod_1.z.string().min(1, "filePath is required")
    }),
    write_file: zod_1.z.object({
        filePath: zod_1.z.string().min(1, "filePath is required"),
        content: zod_1.z.string()
    }),
    list_dir: zod_1.z.object({
        dirPath: zod_1.z.string().min(1, "dirPath is required")
    }),
    grep_search: zod_1.z.object({
        dirPath: zod_1.z.string().min(1, "dirPath is required"),
        keyword: zod_1.z.string().min(1, "keyword is required")
    }),
    patch_file: zod_1.z.object({
        filePath: zod_1.z.string().min(1, "filePath is required"),
        targetContent: zod_1.z.string(),
        replacementContent: zod_1.z.string()
    }),
    run_command: zod_1.z.object({
        command: zod_1.z.string().min(1, "command is required")
    })
};
/**
 * Membangun representasi string dari struktur direktori dalam bentuk pohon (tree view),
 * mirip dengan perintah `tree`. Mengabaikan node_modules, .git, dist, dll.
 */
function buildProjectTree(dirPath, options = {}) {
    const { showSize = false, maxDepth = 10 } = options;
    const IGNORE = new Set([
        "node_modules", ".git", ".next", "dist", "build", "coverage",
        ".cache", ".turbo", ".pytest_cache", "__pycache__", ".svn"
    ]);
    const lines = [];
    const rootName = path_1.default.basename(dirPath) || dirPath;
    lines.push(picocolors_1.default.bold(picocolors_1.default.cyan(rootName)));
    function walk(currentDir, prefix, depth) {
        if (depth > maxDepth)
            return;
        let entries;
        try {
            entries = fs_1.default.readdirSync(currentDir, { withFileTypes: true });
        }
        catch {
            return;
        }
        // Filter ignored dirs/files
        const filtered = entries.filter(e => {
            if (IGNORE.has(e.name))
                return false;
            if (e.name.startsWith(".") && e.name !== ".env")
                return false;
            return true;
        });
        // Sort: directories first, then files, alphabetical
        filtered.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory())
                return -1;
            if (!a.isDirectory() && b.isDirectory())
                return 1;
            return a.name.localeCompare(b.name);
        });
        for (let i = 0; i < filtered.length; i++) {
            const entry = filtered[i];
            const isLast = i === filtered.length - 1;
            const connector = isLast ? "└── " : "├── ";
            const childPrefix = prefix + (isLast ? "    " : "│   ");
            if (entry.isDirectory()) {
                lines.push(`${picocolors_1.default.gray(prefix)}${picocolors_1.default.gray(connector)}${picocolors_1.default.bold(picocolors_1.default.blue(entry.name))}${picocolors_1.default.gray("/")}`);
                walk(path_1.default.join(currentDir, entry.name), childPrefix, depth + 1);
            }
            else {
                let suffix = "";
                if (showSize) {
                    try {
                        const stat = fs_1.default.statSync(path_1.default.join(currentDir, entry.name));
                        suffix = picocolors_1.default.gray(` (${(0, context_1.formatFileSize)(stat.size)})`);
                    }
                    catch {
                        // ignore
                    }
                }
                // Highlight by file type
                const ext = path_1.default.extname(entry.name).toLowerCase();
                let nameColored;
                if ([".ts", ".tsx"].includes(ext)) {
                    nameColored = picocolors_1.default.blue(entry.name);
                }
                else if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
                    nameColored = picocolors_1.default.yellow(entry.name);
                }
                else if ([".json"].includes(ext)) {
                    nameColored = picocolors_1.default.green(entry.name);
                }
                else if ([".md"].includes(ext)) {
                    nameColored = picocolors_1.default.white(entry.name);
                }
                else if ([".env"].includes(ext)) {
                    nameColored = picocolors_1.default.red(entry.name);
                }
                else if ([".py"].includes(ext)) {
                    nameColored = picocolors_1.default.cyan(entry.name);
                }
                else {
                    nameColored = picocolors_1.default.gray(entry.name);
                }
                lines.push(`${picocolors_1.default.gray(prefix)}${picocolors_1.default.gray(connector)}${nameColored}${suffix}`);
            }
        }
    }
    walk(dirPath, "", 1);
    return lines.join("\n");
}
/**
 * Menghitung jumlah file & folder dalam sebuah direktori (rekursif).
 */
function countProjectItems(dirPath, maxDepth = 10) {
    const IGNORE = new Set([
        "node_modules", ".git", ".next", "dist", "build", "coverage",
        ".cache", ".turbo", ".pytest_cache", "__pycache__", ".svn"
    ]);
    let files = 0;
    let dirs = 0;
    function walk(currentDir, depth) {
        if (depth > maxDepth)
            return;
        let entries;
        try {
            entries = fs_1.default.readdirSync(currentDir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (IGNORE.has(entry.name))
                continue;
            if (entry.name.startsWith(".") && entry.name !== ".env")
                continue;
            if (entry.isDirectory()) {
                dirs++;
                walk(path_1.default.join(currentDir, entry.name), depth + 1);
            }
            else if (entry.isFile()) {
                files++;
            }
        }
    }
    walk(dirPath, 1);
    return { files, dirs };
}
class NpmSpinner {
    frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    timer = null;
    current = 0;
    message = "";
    start(msg) {
        this.message = msg;
        this.timer = setInterval(() => {
            process.stdout.write(`\r\x1b[K${picocolors_1.default.magenta(this.frames[this.current])} ${this.message}`);
            this.current = (this.current + 1) % this.frames.length;
        }, 80);
    }
    stop(msg) {
        if (this.timer)
            clearInterval(this.timer);
        if (msg) {
            process.stdout.write(`\r\x1b[K◇  ${msg}\n`);
        }
        else {
            process.stdout.write(`\r\x1b[K`);
        }
    }
}
function countWrappedLines(text, columns) {
    const cleanText = text.replace(/\x1b\[[0-9;]*[a-zA-Z~]/g, ""); // strip ANSI
    const lines = cleanText.split("\n");
    // If the last element is empty (due to trailing newline), remove it
    if (lines.length > 0 && lines[lines.length - 1] === "") {
        lines.pop();
    }
    let totalLines = 0;
    for (const line of lines) {
        if (line.length === 0) {
            totalLines += 1;
        }
        else {
            totalLines += Math.ceil(line.length / columns);
        }
    }
    return totalLines;
}
function formatMarkdownLine(line, inCodeBlock) {
    let formatted = line;
    if (formatted.trim().startsWith("```")) {
        return picocolors_1.default.cyan(formatted);
    }
    if (inCodeBlock) {
        return formatted;
    }
    // 1. Format Headers: #, ##, ###, ####, etc.
    const headerMatch = formatted.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
        const level = headerMatch[1].length;
        const content = headerMatch[2];
        const styledContent = formatMarkdownLineInside(content);
        if (level === 1) {
            return picocolors_1.default.bold(picocolors_1.default.magenta(styledContent));
        }
        else if (level === 2) {
            return picocolors_1.default.bold(picocolors_1.default.cyan(styledContent));
        }
        else {
            return picocolors_1.default.bold(picocolors_1.default.yellow(styledContent));
        }
    }
    // 2. Format Bullet points: starting with '* ' or '- ' (with optional indentation)
    const bulletMatch = formatted.match(/^(\s*)([*|-]+)\s+(.*)$/);
    if (bulletMatch) {
        const indent = bulletMatch[1];
        const bulletChar = bulletMatch[2];
        const rest = bulletMatch[3];
        if (bulletChar === "*" || bulletChar === "-") {
            const formattedRest = formatMarkdownLineInside(rest);
            return `${indent}${picocolors_1.default.green("•")} ${formattedRest}`;
        }
    }
    return formatMarkdownLineInside(formatted);
}
function formatMarkdownLineInside(text) {
    let formatted = text;
    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, (_, p1) => picocolors_1.default.bold(picocolors_1.default.yellow(p1)));
    // Italic: *text* (matching non-space/non-star borders)
    formatted = formatted.replace(/\*([^\s*](?:.*?[^\s*])?)\*/g, (_, p1) => picocolors_1.default.italic(picocolors_1.default.cyan(p1)));
    // Inline code: `code`
    formatted = formatted.replace(/`(.*?)`/g, (_, p1) => picocolors_1.default.cyan(p1));
    return formatted;
}
function highlightCodeLine(line) {
    // 1. Comments: line starts with # or //
    const commentMatch = line.match(/^(\s*)(#|\/\/)(.*)$/);
    if (commentMatch) {
        const indent = commentMatch[1];
        const commentSign = commentMatch[2];
        const rest = commentMatch[3];
        return indent + picocolors_1.default.gray(commentSign + rest);
    }
    let highlighted = line;
    // 2. Strings: "text" or 'text' or f"text"
    highlighted = highlighted.replace(/(f?["'])(.*?)(["'])/g, (_, p1, p2, p3) => picocolors_1.default.green(p1 + p2 + p3));
    // 3. Keywords
    const keywords = [
        /\b(def|class|return|import|from|print|input|and|or|not|if|elif|else|for|while|in|as|try|except|with|pass|lambda)\b/g,
        /\b(const|let|var|function|async|await|import|export|from|return|if|else|for|while|switch|case|break|continue|new|class|try|catch|finally|throw)\b/g
    ];
    for (const regex of keywords) {
        highlighted = highlighted.replace(regex, (match) => picocolors_1.default.yellow(match));
    }
    // 4. Numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, (match) => picocolors_1.default.magenta(match));
    // 5. Special constants
    highlighted = highlighted.replace(/\b(self|this|true|false|None|True|False|null|undefined)\b/g, (match) => picocolors_1.default.cyan(match));
    return highlighted;
}
let activeRedrawDashboard = null;
async function showCustomDropdown(promptText, options, initialFilter = "", allowCustomInput = false) {
    return new Promise((resolve) => {
        let selectedIndex = 0;
        let lastOutput = "";
        let filterText = initialFilter;
        let blinkOn = true;
        readlineCore.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY)
            process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdout.write("\x1b[?25l"); // hide system cursor
        // Handle terminal resize
        let resizeHandler = () => {
            blinkOn = true;
            lastOutput = "";
            if (activeRedrawDashboard) {
                activeRedrawDashboard();
            }
            render();
        };
        process.on('SIGWINCH', resizeHandler);
        const getFilteredOptions = () => {
            let filtered = options.filter(o => o.cmd.toLowerCase().includes(filterText.toLowerCase()));
            const trimmedFilter = filterText.trim();
            if (allowCustomInput && trimmedFilter.length > 0) {
                const exactMatch = filtered.some(o => o.cmd.toLowerCase() === trimmedFilter.toLowerCase());
                if (!exactMatch) {
                    filtered.push({
                        cmd: trimmedFilter,
                        desc: "✏️  Gunakan input ini"
                    });
                }
            }
            return filtered;
        };
        /** Blinking cursor block for inline search input */
        const cursorBlock = () => blinkOn ? picocolors_1.default.bgCyan(picocolors_1.default.black(" ")) : picocolors_1.default.dim(" ");
        const render = () => {
            const totalRows = process.stdout.rows || 24;
            const maxSafeLines = Math.max(0, totalRows - 1); // sisakan 1 baris untuk prompt
            if (lastOutput.length > 0) {
                const cols = process.stdout.columns || 80;
                const previousLinesCount = countWrappedLines(lastOutput, cols);
                if (previousLinesCount > maxSafeLines) {
                    // Terlalu banyak baris → bersihkan seluruh layar untuk menghindari ghosting
                    process.stdout.write("\x1b[2J\x1b[H");
                }
                else {
                    // Aman: naik sejumlah baris lalu bersihkan bawah
                    process.stdout.write(`\r\x1b[${previousLinesCount}A\r\x1b[0J`);
                }
            }
            const width = process.stdout.columns || 80;
            const boxWidth = Math.min(65, width);
            const divider = picocolors_1.default.gray("─".repeat(width));
            let output = "";
            if (promptText === "/" || promptText === "@") {
                output += picocolors_1.default.bold(picocolors_1.default.cyan("> ")) + picocolors_1.default.white(promptText + filterText) + cursorBlock() + "\n";
            }
            else {
                output += divider + "\n";
                output +=
                    picocolors_1.default.cyan("? ") +
                        picocolors_1.default.white(promptText) +
                        " " +
                        picocolors_1.default.yellow(filterText) +
                        cursorBlock() +
                        "\n";
            }
            output += divider + "\n";
            const filteredOptions = getFilteredOptions();
            const innerWidth = boxWidth - 2;
            const maxCmdLen = options.length > 0 ? Math.max(...options.map(o => o.cmd.length), 16) : 16;
            const maxItems = 10;
            output += picocolors_1.default.gray("┌" + "─".repeat(innerWidth) + "┐") + "\n";
            if (filteredOptions.length === 0) {
                const emptyMsg = " Tidak ada opsi yang cocok";
                const padRight = Math.max(0, innerWidth - emptyMsg.length);
                output += picocolors_1.default.gray("│") + picocolors_1.default.dim(emptyMsg) + " ".repeat(padRight) + picocolors_1.default.gray("│") + "\n";
                for (let i = 1; i < maxItems; i++) {
                    output += picocolors_1.default.gray("│") + " ".repeat(innerWidth) + picocolors_1.default.gray("│") + "\n";
                }
            }
            else {
                let startIdx = 0;
                if (filteredOptions.length > maxItems) {
                    startIdx = Math.max(0, Math.min(selectedIndex - Math.floor(maxItems / 2), filteredOptions.length - maxItems));
                }
                const visibleOptions = filteredOptions.slice(startIdx, startIdx + maxItems);
                visibleOptions.forEach((opt, relativeIdx) => {
                    const idx = startIdx + relativeIdx;
                    const isSelected = idx === selectedIndex;
                    const prefix = isSelected ? " ❯ " : "   ";
                    const paddedDesc = opt.desc ? opt.desc : "";
                    const rightDesc = opt.rightDesc ? opt.rightDesc : "";
                    const getVisLen = (s) => s.replace(/\x1b\[[0-9;]*[a-zA-Z~]/g, "").length;
                    const visDescLen = getVisLen(paddedDesc);
                    const visRightLen = getVisLen(rightDesc);
                    let cmdStr = opt.cmd;
                    const extraLen = (paddedDesc ? visDescLen + 2 : 0) + (rightDesc ? visRightLen + 2 : 0);
                    const maxAvailCmd = Math.min(maxCmdLen, innerWidth - 3 - extraLen);
                    if (cmdStr.length > maxAvailCmd && maxAvailCmd > 3) {
                        cmdStr = cmdStr.slice(0, maxAvailCmd - 1) + "…";
                    }
                    const leftPartText = prefix + cmdStr.padEnd(maxAvailCmd) + (paddedDesc ? " " + paddedDesc : "");
                    const visLeftLen = getVisLen(leftPartText);
                    const padRight = Math.max(0, innerWidth - visLeftLen - visRightLen);
                    if (isSelected) {
                        const innerText = leftPartText + " ".repeat(padRight) + rightDesc;
                        output += picocolors_1.default.gray("│") + picocolors_1.default.bgBlue(picocolors_1.default.white(innerText)) + picocolors_1.default.gray("│") + "\n";
                    }
                    else {
                        const cmdText = picocolors_1.default.white(cmdStr.padEnd(maxAvailCmd));
                        const descText = picocolors_1.default.gray(paddedDesc ? " " + paddedDesc : "");
                        const rightText = rightDesc;
                        const row = picocolors_1.default.gray("│") + prefix + cmdText + descText + " ".repeat(padRight) + rightText + picocolors_1.default.gray("│");
                        output += row + "\n";
                    }
                });
                const emptyRows = maxItems - visibleOptions.length;
                for (let i = 0; i < emptyRows; i++) {
                    output += picocolors_1.default.gray("│") + " ".repeat(innerWidth) + picocolors_1.default.gray("│") + "\n";
                }
            }
            if (filteredOptions.length > maxItems) {
                const hiddenCount = filteredOptions.length - maxItems;
                const moreText = `  ▼ ${hiddenCount} options lagi `;
                const padRight = Math.max(0, innerWidth - moreText.length);
                output += picocolors_1.default.gray("│") + picocolors_1.default.dim(moreText) + " ".repeat(padRight) + picocolors_1.default.gray("│") + "\n";
            }
            output += picocolors_1.default.gray("└" + "─".repeat(innerWidth) + "┘") + "\n";
            lastOutput = output;
            process.stdout.write(output);
        };
        const blinkTimer = setInterval(() => {
            blinkOn = !blinkOn;
            render();
        }, 530);
        const onKeypress = (str, key) => {
            const filteredOptions = getFilteredOptions();
            if (key && key.name === 'up') {
                if (filteredOptions.length > 0) {
                    selectedIndex = (selectedIndex - 1 + filteredOptions.length) % filteredOptions.length;
                }
                blinkOn = true;
                render();
            }
            else if (key && key.name === 'down') {
                if (filteredOptions.length > 0) {
                    selectedIndex = (selectedIndex + 1) % filteredOptions.length;
                }
                blinkOn = true;
                render();
            }
            else if (key && key.name === 'return') {
                cleanup();
                if (filteredOptions.length > 0) {
                    resolve(filteredOptions[selectedIndex].cmd);
                }
                else {
                    resolve((promptText === "/" || promptText === "@") ? promptText + filterText : filterText);
                }
            }
            else if (key && (key.name === 'escape' || (key.ctrl && key.name === 'c'))) {
                cleanup();
                resolve(null);
            }
            else if (key && key.name === 'backspace') {
                if (filterText.length > 0) {
                    filterText = filterText.slice(0, -1);
                    selectedIndex = 0;
                    blinkOn = true;
                    render();
                }
                else if (promptText === "/" || promptText === "@") {
                    cleanup();
                    resolve(null);
                }
            }
            else if (str && !key.ctrl && !key.meta) {
                if (str.length === 1 && str.charCodeAt(0) >= 32) {
                    filterText += str;
                    selectedIndex = 0;
                    blinkOn = true;
                    render();
                }
            }
        };
        let cleanup = () => {
            clearInterval(blinkTimer);
            if (process.stdin.isTTY)
                process.stdin.setRawMode(false);
            process.stdin.removeListener("keypress", onKeypress);
            process.stdin.pause();
            process.stdout.write("\x1b[?25h"); // restore system cursor
            if (lastOutput.length > 0) {
                const cols = process.stdout.columns || 80;
                const previousLinesCount = countWrappedLines(lastOutput, cols);
                process.stdout.write(`\r\x1b[${previousLinesCount}A\r\x1b[0J`);
            }
            process.off('SIGWINCH', resizeHandler);
        };
        process.stdin.on("keypress", onKeypress);
        render();
    });
}
async function startChat(options) {
    process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
    (0, ui_1.printBanner)();
    let { baseUrl, apiKey } = options;
    if (!baseUrl && !process.env.OPENAI_BASE_URL) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await rl.question(picocolors_1.default.cyan("🔑 Masukkan API Base URL (e.g. http://localhost:11434/v1): "));
        baseUrl = answer.trim() || undefined;
        if (baseUrl) {
            saveToEnv("OPENAI_BASE_URL", baseUrl);
            process.env.OPENAI_BASE_URL = baseUrl;
        }
        rl.close();
    }
    if (!apiKey && !process.env.OPENAI_API_KEY) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await rl.question(picocolors_1.default.cyan("🔑 Masukkan API Key (e.g. sk-...): "));
        apiKey = answer.trim() || undefined;
        if (apiKey) {
            saveToEnv("OPENAI_API_KEY", apiKey);
            process.env.OPENAI_API_KEY = apiKey;
        }
        rl.close();
    }
    // --- WORKSPACE TRUST CHECK ---
    let isWorkspaceTrusted = (0, trust_1.isDirectoryTrusted)(process.cwd());
    if (!isWorkspaceTrusted) {
        process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
        (0, ui_1.printBanner)();
        isWorkspaceTrusted = await (0, trust_1.promptWorkspaceTrust)(process.cwd());
    }
    const refreshDashboard = () => {
        process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
        (0, ui_1.printBanner)();
        (0, ui_1.printDashboard)({
            model: options.model,
            baseUrl: baseUrl || process.env.OPENAI_BASE_URL,
            permissionMode: process.env.FILE_PERMISSION_MODE || "ask",
            isTrusted: isWorkspaceTrusted,
            activePath: process.cwd()
        });
        (0, ui_1.printHelp)();
    };
    activeRedrawDashboard = refreshDashboard;
    refreshDashboard();
    let openai = (0, api_1.getOpenAIClient)(apiKey, baseUrl);
    let messages = [
        { role: "system", content: options.system },
    ];
    const fileHistory = [];
    let isAutoFixEnabled = true;
    console.log(picocolors_1.default.green(`✔ Berhasil terhubung ke server OmniRoute!`));
    console.log();
    let nextInitialLine = "";
    let lastPromptOutput = "";
    while (true) {
        const initialLine = nextInitialLine;
        nextInitialLine = "";
        let input = await new Promise((resolve) => {
            const theme = (0, ui_1.getTheme)();
            const promptSymbol = picocolors_1.default.bold(theme.primary("> "));
            const placeholder = "Ketik pesan di sini... (gunakan @file untuk menyisipkan file)";
            let line = initialLine;
            let cursorPos = initialLine.length;
            let blinkOn = true;
            let done = false;
            let lastOutput = "";
            let pastedContents = [];
            let pasteCounter = 1;
            let bracketedPasteBuffer = "";
            let inBracketedPaste = false;
            // Realtime inline @ file autocomplete state
            let atSelectedIndex = 0;
            let atMenuClosedExplicitly = false;
            const workspaceFiles = (0, context_1.getWorkspaceFiles)(process.cwd());
            const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*[a-zA-Z~]/g, "");
            const getAtMatch = () => {
                if (atMenuClosedExplicitly)
                    return null;
                const textBeforeCursor = line.slice(0, cursorPos);
                const match = textBeforeCursor.match(/@([a-zA-Z0-9_\-\.\/\\~]*)$/);
                return match;
            };
            const getFilteredFiles = (filterText) => {
                const cleanFilter = filterText.toLowerCase();
                return workspaceFiles.filter(f => f.toLowerCase().includes(cleanFilter));
            };
            let resizeHandler = () => {
                blinkOn = true;
                lastOutput = "";
                refreshDashboard();
                render();
            };
            process.on('SIGWINCH', resizeHandler);
            const render = () => {
                const cols = process.stdout.columns || 80;
                const boxW = Math.max(40, cols - 4);
                const innerW = boxW - 4;
                process.stdout.write("\x1b[?25l");
                if (lastOutput.length > 0) {
                    const cols = process.stdout.columns || 80;
                    const previousLinesCount = countWrappedLines(lastOutput, cols);
                    const totalRows = process.stdout.rows || 24;
                    const maxSafeLines = Math.max(0, totalRows - 3); // beri ruang untuk prompt, footer, dan jeda
                    if (previousLinesCount > maxSafeLines) {
                        // Terlalu banyak baris → bersihkan seluruh layar untuk menghindari ghosting
                        process.stdout.write("\x1b[2J\x1b[H");
                    }
                    else {
                        // Aman: naik sejumlah baris lalu bersihkan bawah
                        process.stdout.write(`\r\x1b[${previousLinesCount}A\r\x1b[0J`);
                    }
                }
                let output = "";
                // 1. Main prompt box rendering
                let contentDisplay = "";
                const displayLine = line.replace(/\r/g, "").replace(/\n/g, "↵");
                if (displayLine.length === 0) {
                    const cursorChar = blinkOn
                        ? picocolors_1.default.bgWhite(picocolors_1.default.black(placeholder[0]))
                        : theme.border(placeholder[0]);
                    const visiblePlaceholder = placeholder.slice(0, Math.max(1, innerW - 2));
                    contentDisplay = promptSymbol + cursorChar + theme.border(visiblePlaceholder.slice(1));
                }
                else {
                    const maxTextLen = Math.max(1, innerW - 2);
                    let startIdx = 0;
                    if (displayLine.length > maxTextLen) {
                        startIdx = Math.max(0, Math.min(cursorPos - Math.floor(maxTextLen / 2), displayLine.length - maxTextLen));
                    }
                    const visibleLine = displayLine.slice(startIdx, startIdx + maxTextLen);
                    const relativeCursorPos = cursorPos - startIdx;
                    const before = visibleLine.slice(0, Math.max(0, relativeCursorPos));
                    const atCursor = visibleLine[Math.max(0, relativeCursorPos)] || " ";
                    const after = visibleLine.slice(Math.max(0, relativeCursorPos) + 1);
                    const cursorChar = blinkOn
                        ? picocolors_1.default.bgWhite(picocolors_1.default.black(atCursor))
                        : (visibleLine[Math.max(0, relativeCursorPos)] ? atCursor : " ");
                    contentDisplay = promptSymbol + before + cursorChar + after;
                }
                const visLen = stripAnsi(contentDisplay).length;
                const padLen = Math.max(0, innerW - visLen);
                const padding = " ".repeat(padLen);
                const top = theme.border("┏" + "━".repeat(boxW - 2) + "┓");
                const mid = theme.border("┃") + " " + contentDisplay + padding + " " + theme.border("┃");
                const bot = theme.border("┗" + "━".repeat(boxW - 2) + "┛");
                output += top + "\n" + mid + "\n" + bot + "\n";
                // 2. Inline @ file autocomplete menu rendering
                const atMatch = getAtMatch();
                if (atMatch) {
                    const filterText = atMatch[1];
                    const matchingFiles = getFilteredFiles(filterText);
                    if (matchingFiles.length > 0) {
                        const maxItems = 5;
                        if (atSelectedIndex >= matchingFiles.length) {
                            atSelectedIndex = Math.max(0, matchingFiles.length - 1);
                        }
                        const dropTop = theme.primary("┌" + "─".repeat(boxW - 2) + "┐");
                        output += dropTop + "\n";
                        const visible = matchingFiles.slice(0, maxItems);
                        visible.forEach((file, idx) => {
                            const isSelected = idx === atSelectedIndex;
                            const cmdStr = `@${file}`;
                            const descStr = "📄 File";
                            const maxCmdLen = Math.max(10, innerW - descStr.length - 6);
                            let truncatedCmd = cmdStr;
                            if (cmdStr.length > maxCmdLen) {
                                truncatedCmd = cmdStr.slice(0, maxCmdLen - 1) + "…";
                            }
                            const prefix = isSelected ? " ❯ " : "   ";
                            const rawLen = prefix.length + truncatedCmd.padEnd(maxCmdLen).length + descStr.length;
                            const rPad = Math.max(0, innerW - rawLen);
                            if (isSelected) {
                                const rowStr = prefix + truncatedCmd.padEnd(maxCmdLen) + descStr + " ".repeat(rPad);
                                output += theme.primary("│") + picocolors_1.default.bgBlue(picocolors_1.default.white(rowStr)) + theme.primary("│") + "\n";
                            }
                            else {
                                const rowStr = prefix + theme.primary(truncatedCmd.padEnd(maxCmdLen)) + theme.border(descStr) + " ".repeat(rPad);
                                output += theme.primary("│") + rowStr + theme.primary("│") + "\n";
                            }
                        });
                        if (matchingFiles.length > maxItems) {
                            const hidden = matchingFiles.length - maxItems;
                            const moreStr = `  ▼ ${hidden} file lagi… (ketik untuk menyaring)`;
                            const rPad = Math.max(0, innerW - moreStr.length);
                            output += theme.primary("│") + picocolors_1.default.dim(moreStr) + " ".repeat(rPad) + theme.primary("│") + "\n";
                        }
                        const dropBot = theme.primary("└" + "─".repeat(boxW - 2) + "┘");
                        output += dropBot + "\n";
                    }
                }
                lastOutput = output;
                lastPromptOutput = output;
                process.stdout.write(output);
            };
            const blinkTimer = setInterval(() => {
                blinkOn = !blinkOn;
                render();
            }, 530);
            render();
            if (process.stdin.isTTY)
                process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdout.write("\x1b[?2004h"); // Enable bracketed paste mode in terminal
            const handleUp = () => {
                const atMatch = getAtMatch();
                if (atMatch) {
                    const filterText = atMatch[1];
                    const matchingFiles = getFilteredFiles(filterText);
                    if (matchingFiles.length > 0) {
                        atSelectedIndex = (atSelectedIndex - 1 + matchingFiles.length) % matchingFiles.length;
                    }
                }
            };
            const handleDown = () => {
                const atMatch = getAtMatch();
                if (atMatch) {
                    const filterText = atMatch[1];
                    const matchingFiles = getFilteredFiles(filterText);
                    if (matchingFiles.length > 0) {
                        atSelectedIndex = (atSelectedIndex + 1) % matchingFiles.length;
                    }
                }
            };
            const handleLeft = () => {
                if (cursorPos > 0) {
                    cursorPos--;
                }
            };
            const handleRight = () => {
                if (cursorPos < line.length) {
                    cursorPos++;
                }
            };
            const handleHome = () => {
                cursorPos = 0;
            };
            const handleEnd = () => {
                cursorPos = line.length;
            };
            const handleDelete = () => {
                if (cursorPos < line.length) {
                    line = line.slice(0, cursorPos) + line.slice(cursorPos + 1);
                }
            };
            const handleBackspace = () => {
                if (cursorPos > 0) {
                    line = line.slice(0, cursorPos - 1) + line.slice(cursorPos);
                    cursorPos--;
                    atMenuClosedExplicitly = false;
                }
            };
            const handleCtrlLeft = () => {
                const leftText = line.slice(0, cursorPos);
                const match = leftText.match(/(\s*\w+)$/);
                if (match) {
                    cursorPos -= match[0].length;
                }
                else {
                    cursorPos = 0;
                }
            };
            const handleCtrlRight = () => {
                const rightText = line.slice(cursorPos);
                const match = rightText.match(/^(\w+\s*)/);
                if (match) {
                    cursorPos += match[0].length;
                }
                else {
                    cursorPos = line.length;
                }
            };
            const handleEscape = () => {
                const atMatch = getAtMatch();
                if (atMatch) {
                    atMenuClosedExplicitly = true;
                    render();
                }
                else {
                    line = "";
                    cursorPos = 0;
                    atMenuClosedExplicitly = false;
                    atSelectedIndex = 0;
                    render();
                }
            };
            const handleCtrlC = () => {
                cleanup();
                console.log(picocolors_1.default.yellow("\nSampai jumpa kembali / Goodbye!\n"));
                process.exit(0);
            };
            const handleTab = () => {
                const atMatch = getAtMatch();
                if (atMatch) {
                    const filterText = atMatch[1];
                    const matchingFiles = getFilteredFiles(filterText);
                    const selectedFile = matchingFiles[atSelectedIndex];
                    if (selectedFile) {
                        const matchIndex = atMatch.index || 0;
                        const before = line.slice(0, matchIndex);
                        const after = line.slice(matchIndex + 1 + filterText.length);
                        line = before + "@" + selectedFile + " " + after;
                        cursorPos = matchIndex + 1 + selectedFile.length + 1;
                        atMenuClosedExplicitly = false;
                        atSelectedIndex = 0;
                    }
                }
            };
            const handleEnter = () => {
                const atMatch = getAtMatch();
                if (atMatch) {
                    const filterText = atMatch[1];
                    const matchingFiles = getFilteredFiles(filterText);
                    if (matchingFiles.length > 0) {
                        const selectedFile = matchingFiles[atSelectedIndex];
                        if (selectedFile) {
                            const matchIndex = atMatch.index || 0;
                            const before = line.slice(0, matchIndex);
                            const after = line.slice(matchIndex + 1 + filterText.length);
                            line = before + "@" + selectedFile + " " + after;
                            cursorPos = matchIndex + 1 + selectedFile.length + 1;
                            atMenuClosedExplicitly = false;
                            atSelectedIndex = 0;
                            render();
                            return;
                        }
                    }
                }
                cleanup();
                resolve(line);
            };
            const handleCharacter = (char) => {
                if (line.length === 0 && char === "/") {
                    cleanup();
                    resolve("/");
                    return;
                }
                line = line.slice(0, cursorPos) + char + line.slice(cursorPos);
                cursorPos += char.length;
                atMenuClosedExplicitly = false;
            };
            const insertText = (text) => {
                const cleanedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
                line = line.slice(0, cursorPos) + cleanedText + line.slice(cursorPos);
                cursorPos += cleanedText.length;
                atMenuClosedExplicitly = false;
                atSelectedIndex = 0;
            };
            const processInputString = (str) => {
                let i = 0;
                while (i < str.length) {
                    const char = str[i];
                    if (char === "\u001b") {
                        const remaining = str.slice(i);
                        if (remaining.startsWith("\u001b[A")) {
                            handleUp();
                            i += 3;
                            continue;
                        }
                        if (remaining.startsWith("\u001b[B")) {
                            handleDown();
                            i += 3;
                            continue;
                        }
                        if (remaining.startsWith("\u001b[C")) {
                            handleRight();
                            i += 3;
                            continue;
                        }
                        if (remaining.startsWith("\u001b[D")) {
                            handleLeft();
                            i += 3;
                            continue;
                        }
                        if (remaining.startsWith("\u001b[H") || remaining.startsWith("\u001bOH")) {
                            handleHome();
                            i += 3;
                            continue;
                        }
                        if (remaining.startsWith("\u001b[1~")) {
                            handleHome();
                            i += 4;
                            continue;
                        }
                        if (remaining.startsWith("\u001b[F") || remaining.startsWith("\u001bOF")) {
                            handleEnd();
                            i += 3;
                            continue;
                        }
                        if (remaining.startsWith("\u001b[4~")) {
                            handleEnd();
                            i += 4;
                            continue;
                        }
                        if (remaining.startsWith("\u001b[3~")) {
                            handleDelete();
                            i += 4;
                            continue;
                        }
                        if (remaining.startsWith("\u001b[1;5D")) {
                            handleCtrlLeft();
                            i += 6;
                            continue;
                        }
                        if (remaining.startsWith("\u001b[1;5C")) {
                            handleCtrlRight();
                            i += 6;
                            continue;
                        }
                        if (remaining === "\u001b") {
                            handleEscape();
                            i += 1;
                            continue;
                        }
                        const match = remaining.match(/^\u001b\[[0-9;]*[a-zA-Z~]/);
                        if (match) {
                            i += match[0].length;
                            continue;
                        }
                        i += 1;
                        continue;
                    }
                    if (char === "\u0003") {
                        handleCtrlC();
                        return;
                    }
                    if (char === "\r" || char === "\n") {
                        handleEnter();
                        return;
                    }
                    if (char === "\t" || char === "\u0009") {
                        handleTab();
                        i += 1;
                        continue;
                    }
                    if (char === "\u007f" || char === "\u0008") {
                        handleBackspace();
                        i += 1;
                        continue;
                    }
                    if (char.charCodeAt(0) >= 32) {
                        handleCharacter(char);
                    }
                    i += 1;
                }
                blinkOn = true;
                render();
            };
            const onData = (data) => {
                const str = data.toString("utf8");
                if (inBracketedPaste) {
                    const endIdx = str.indexOf("\x1b[201~");
                    if (endIdx !== -1) {
                        bracketedPasteBuffer += str.slice(0, endIdx);
                        inBracketedPaste = false;
                        insertText(bracketedPasteBuffer);
                        bracketedPasteBuffer = "";
                        const remaining = str.slice(endIdx + 6);
                        if (remaining.length > 0) {
                            processInputString(remaining);
                        }
                        else {
                            blinkOn = true;
                            render();
                        }
                    }
                    else {
                        bracketedPasteBuffer += str;
                    }
                    return;
                }
                if (str.startsWith("\x1b[200~")) {
                    inBracketedPaste = true;
                    const endIdx = str.indexOf("\x1b[201~");
                    if (endIdx !== -1) {
                        inBracketedPaste = false;
                        const pastedText = str.slice(6, endIdx);
                        insertText(pastedText);
                        const remaining = str.slice(endIdx + 6);
                        if (remaining.length > 0) {
                            processInputString(remaining);
                        }
                        else {
                            blinkOn = true;
                            render();
                        }
                    }
                    else {
                        bracketedPasteBuffer = str.slice(6);
                    }
                    return;
                }
                processInputString(str);
            };
            let cleanup = () => {
                done = true;
                clearInterval(blinkTimer);
                process.stdin.off("data", onData);
                if (process.stdin.isTTY)
                    process.stdin.setRawMode(false);
                process.stdout.write("\x1b[?2004l"); // Disable bracketed paste mode in terminal
                process.stdout.write("\x1b[?25h");
            };
            // Ubah cleanup untuk menghapus SIGWINCH listener
            const originalCleanup = cleanup;
            cleanup = () => {
                process.off('SIGWINCH', resizeHandler);
                originalCleanup();
            };
            process.stdin.on("data", onData);
        });
        if (!input) {
            if (lastPromptOutput.length > 0) {
                const cols = process.stdout.columns || 80;
                const previousLinesCount = countWrappedLines(lastPromptOutput, cols);
                process.stdout.write(`\r\x1b[${previousLinesCount}A\r\x1b[0J`);
                lastPromptOutput = "";
            }
            continue;
        }
        if (input.trim().startsWith("/")) {
            if (lastPromptOutput.length > 0) {
                const cols = process.stdout.columns || 80;
                const previousLinesCount = countWrappedLines(lastPromptOutput, cols);
                process.stdout.write(`\r\x1b[${previousLinesCount}A\r\x1b[0J`);
                lastPromptOutput = "";
            }
        }
        if (input.trim() === "/") {
            const selected = await showCustomDropdown("/", [
                { cmd: "/list", desc: "Lihat struktur project (tree view)" },
                { cmd: "/model", desc: "Pilih model OmniRoute" },
                { cmd: "/file", desc: "Lampirkan file konteks (@file)" },
                { cmd: "/theme", desc: "Ubah tema warna Terminal AI-CLI" },
                { cmd: "/izin", desc: "Mengatur hak akses file yang diizinkan" },
                { cmd: "/trust", desc: "Mengatur akses workspace" },
                { cmd: "/autofix", desc: `Auto-Fix ${isAutoFixEnabled ? "ON" : "OFF"})` },
                { cmd: "/undo", desc: "Batalkan perubahan file terakhir dari AI" },
                { cmd: "/clear", desc: "Menghapus seluruh riwayat percakapan" },
                { cmd: "/reset", desc: "Reset pengaturan & konfigurasi aplikasi" },
                { cmd: "/exit", desc: "Keluar dari AI CLI" }
            ]);
            if (!selected) {
                continue;
            }
            input = selected;
        }
        if (input.trim() === "/autofix") {
            isAutoFixEnabled = !isAutoFixEnabled;
            console.log(picocolors_1.default.green(`\n✔ Fitur Auto-Fix Build Errors berhasil diubah menjadi: ${isAutoFixEnabled ? picocolors_1.default.bold("ON (Aktif)") : picocolors_1.default.bold("OFF (Nonaktif)")}\n`));
            continue;
        }
        if (input.trim() === "/undo") {
            const lastChange = fileHistory.pop();
            if (!lastChange) {
                console.log(picocolors_1.default.yellow("\n⚠️ Tidak ada perubahan file dalam riwayat sesi ini untuk dibatalkan.\n"));
                continue;
            }
            const absPath = path_1.default.resolve(TRUSTED_WORKSPACE, lastChange.filePath);
            try {
                if (lastChange.action === "created") {
                    if (fs_1.default.existsSync(absPath)) {
                        fs_1.default.unlinkSync(absPath);
                    }
                    console.log(picocolors_1.default.green(`\n✔ Berhasil membatalkan pembuatan file: ${picocolors_1.default.cyan(lastChange.filePath)} (file dihapus).\n`));
                }
                else if (lastChange.action === "modified") {
                    fs_1.default.writeFileSync(absPath, lastChange.originalContent || "", "utf8");
                    console.log(picocolors_1.default.green(`\n✔ Berhasil memulihkan konten asli file: ${picocolors_1.default.cyan(lastChange.filePath)}.\n`));
                }
            }
            catch (err) {
                console.log(picocolors_1.default.red(`\n❌ Gagal melakukan undo pada file ${lastChange.filePath}: ${err.message}\n`));
                fileHistory.push(lastChange);
            }
            continue;
        }
        // --- HANDLER UNTUK /file atau @ DARI SLASH MENU ---
        if (input.trim() === "/file" || input.trim().startsWith("/file ")) {
            nextInitialLine = "@";
            continue;
        }
        // --- HANDLER UNTUK /list (LIHAT STRUKTUR PROJECT / FOLDER) ---
        // Mendukung berbagai format:
        //   /list              → workspace root
        //   /list src          → folder src
        //   /list src -s       → folder src dengan ukuran file
        //   /list-src          → folder src (auto-detect dari nama folder)
        //   /list-src -s       → folder src dengan ukuran file
        //   /list-<folder>     → folder <folder> (auto-detect)
        if (input.trim() === "/list" ||
            input.trim().startsWith("/list ") ||
            /^\/list-\S/.test(input.trim())) {
            const trimmed = input.trim();
            let rest = "";
            if (trimmed === "/list") {
                rest = "";
            }
            else if (trimmed.startsWith("/list ")) {
                // Format: /list <folder> [-s]
                rest = trimmed.slice(6).trim();
            }
            else {
                // Format: /list-<folder> [-s]  → strip "/list" dan dash pertama
                rest = trimmed.slice(5).trim(); // sisa setelah "/list", mis: "-src" atau "-src -s"
                if (rest.startsWith("-")) {
                    rest = rest.slice(1).trim(); // → "src" atau "src -s"
                }
            }
            const showSize = rest.includes("--size") || rest.includes("-s");
            // Ambil path folder dengan menghapus flag
            let folderArg = rest.replace(/--size/g, "").replace(/(^|\s)-s(\s|$)/g, " ").trim();
            folderArg = folderArg.replace(/\s+/g, " ").trim();
            let targetDir = process.cwd();
            if (folderArg) {
                const candidate = path_1.default.resolve(TRUSTED_WORKSPACE, folderArg);
                if (fs_1.default.existsSync(candidate) && fs_1.default.statSync(candidate).isDirectory()) {
                    targetDir = candidate;
                }
                else {
                    console.log(picocolors_1.default.red(`\n❌ Folder tidak ditemukan: ${folderArg}\n`));
                    continue;
                }
            }
            const folderName = path_1.default.basename(targetDir) || targetDir;
            const tree = buildProjectTree(targetDir, { showSize });
            const counts = countProjectItems(targetDir);
            const theme = (0, ui_1.getTheme)();
            console.log();
            (0, ui_1.printDivider)("─", theme.border);
            console.log(`  ${theme.primary("📂")} ${picocolors_1.default.bold("Project Structure:")} ${picocolors_1.default.cyan(folderName)}`);
            console.log(`  ${theme.border(`Path: ${targetDir}`)}`);
            console.log(`  ${theme.success(`📁 ${counts.dirs} folder`)}  ${theme.secondary(`📄 ${counts.files} file`)}`);
            (0, ui_1.printDivider)("─", theme.border);
            console.log();
            console.log(tree);
            console.log();
            (0, ui_1.printDivider)("─", theme.border);
            console.log(picocolors_1.default.gray(`  💡 Gunakan /list <folder> atau /list-<folder> untuk lihat folder lain. Tambah -s untuk ukuran file`));
            console.log();
            continue;
        }
        const trimmedCmd = input.trim().toLowerCase();
        if (trimmedCmd === "/exit" || trimmedCmd === "exit" || trimmedCmd === "/quit" || trimmedCmd === "quit") {
            console.log(picocolors_1.default.yellow("\nSampai jumpa kembali / Goodbye!\n"));
            break;
        }
        if (input.trim() === "/trust") {
            const currentPath = process.cwd();
            const statusStr = isWorkspaceTrusted ? picocolors_1.default.green("TRUSTED") : picocolors_1.default.red("RESTRICTED");
            console.log(`\nStatus Folder Workspace Saat Ini: ${statusStr}`);
            console.log(`Path: ${picocolors_1.default.cyan(currentPath)}\n`);
            const trustOption = await showCustomDropdown("/trust", [
                {
                    cmd: "trust_folder",
                    desc: "Tandai Folder Ini sebagai Trusted Workspace"
                },
                {
                    cmd: "untrust_folder",
                    desc: "Hapus status Trust dari Folder Ini (Restricted Mode)"
                },
                {
                    cmd: "list_trusted",
                    desc: "📂 Lihat Semua Trusted Folders"
                }
            ]);
            if (!trustOption) {
                continue;
            }
            if (trustOption === "trust_folder") {
                (0, trust_1.addTrustedFolder)(currentPath);
                isWorkspaceTrusted = true;
                refreshDashboard();
                console.log(picocolors_1.default.green(`✔ Folder ${currentPath} berhasil ditandai sebagai TRUSTED.\n`));
            }
            else if (trustOption === "untrust_folder") {
                (0, trust_1.removeTrustedFolder)(currentPath);
                isWorkspaceTrusted = false;
                refreshDashboard();
                console.log(picocolors_1.default.red(`✔ Status Trust dicabut. Folder sekarang dalam RESTRICTED mode.\n`));
            }
            else if (trustOption === "list_trusted") {
                const folders = (0, trust_1.getTrustedFolders)();
                console.log(picocolors_1.default.cyan("\n--- Daftar Folder Terpercaya (Trusted Folders) ---"));
                if (folders.length === 0) {
                    console.log(picocolors_1.default.gray(" Belum ada folder terpercaya."));
                }
                else {
                    folders.forEach((f, idx) => console.log(` ${idx + 1}. ${f}`));
                }
                console.log();
            }
            continue;
        }
        if (input.trim() === "/izin") {
            const currentMode = process.env.FILE_PERMISSION_MODE || "ask";
            const izinOption = await showCustomDropdown("/izin", [
                {
                    cmd: "ask",
                    desc: "Tanya setiap kali",
                    rightDesc: currentMode === "ask" ? picocolors_1.default.green("[Aktif]") : ""
                },
                {
                    cmd: "auto",
                    desc: "Izinkan otomatis",
                    rightDesc: currentMode === "auto" ? picocolors_1.default.green("[Aktif]") : ""
                },
                {
                    cmd: "off",
                    desc: "Matikan akses file",
                    rightDesc: currentMode === "off" ? picocolors_1.default.green("[Aktif]") : ""
                }
            ]);
            if (!izinOption) {
                continue;
            }
            saveToEnv("FILE_PERMISSION_MODE", izinOption);
            process.env.FILE_PERMISSION_MODE = izinOption;
            refreshDashboard();
            const theme = (0, ui_1.getTheme)();
            console.log(theme.success(`✔ Izin akses file berhasil diubah menjadi: ${izinOption.toUpperCase()}\n`));
            continue;
        }
        if (input.trim() === "/theme" || input.trim().startsWith("/theme ")) {
            const arg = input.trim().startsWith("/theme ") ? input.trim().slice(7).trim().toLowerCase() : "";
            let selectedTheme = null;
            if (arg && ui_1.themes[arg]) {
                selectedTheme = arg;
            }
            else {
                const themeOptions = Object.keys(ui_1.themes).map(key => ({
                    cmd: key,
                    desc: ui_1.themes[key].name
                }));
                selectedTheme = await showCustomDropdown("Pilih tema warna CLI:", themeOptions, arg, false);
            }
            if (!selectedTheme) {
                console.log(picocolors_1.default.yellow("Pemilihan tema dibatalkan.\n"));
                continue;
            }
            saveToEnv("CLI_THEME", selectedTheme);
            process.env.CLI_THEME = selectedTheme;
            refreshDashboard();
            const theme = (0, ui_1.getTheme)();
            console.log(theme.success(`✔ Tema warna berhasil diubah ke: ${theme.name.toUpperCase()}\n`));
            continue;
        }
        if (input.trim() === "/clear") {
            refreshDashboard();
            messages = [
                { role: "system", content: options.system },
            ];
            console.log(picocolors_1.default.green(`✔ Riwayat percakapan berhasil dibersihkan.\n`));
            continue;
        }
        if (input.trim() === "/reset") {
            const resetConfirm = await (0, prompts_1.confirm)({
                message: "Apakah Anda yakin ingin mereset konfigurasi dan menghapus file .env?"
            });
            if ((0, prompts_1.isCancel)(resetConfirm) || !resetConfirm) {
                console.log(picocolors_1.default.yellow("Reset dibatalkan.\n"));
                continue;
            }
            const envFile = path_1.default.resolve(process.cwd(), ".env");
            if (fs_1.default.existsSync(envFile)) {
                try {
                    fs_1.default.unlinkSync(envFile);
                }
                catch (err) {
                    console.log(picocolors_1.default.red(`Gagal menghapus file .env: ${err.message}`));
                }
            }
            delete process.env.OPENAI_BASE_URL;
            delete process.env.OPENAI_API_KEY;
            delete process.env.FILE_PERMISSION_MODE;
            delete process.env.OPENAI_MODEL;
            options.model = "gpt-3.5-turbo";
            baseUrl = undefined;
            apiKey = undefined;
            messages = [
                { role: "system", content: options.system },
            ];
            process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
            console.log(picocolors_1.default.green("✔ Konfigurasi berhasil direset. Silakan jalankan setup ulang di bawah ini.\n"));
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            const answerUrl = await rl.question(picocolors_1.default.cyan("🔑 Masukkan API Base URL (e.g. http://localhost:11434/v1): "));
            baseUrl = answerUrl.trim() || undefined;
            if (baseUrl) {
                saveToEnv("OPENAI_BASE_URL", baseUrl);
                process.env.OPENAI_BASE_URL = baseUrl;
            }
            const answerKey = await rl.question(picocolors_1.default.cyan("🔑 Masukkan API Key (e.g. sk-...): "));
            apiKey = answerKey.trim() || undefined;
            if (apiKey) {
                saveToEnv("OPENAI_API_KEY", apiKey);
                process.env.OPENAI_API_KEY = apiKey;
            }
            rl.close();
            openai = (0, api_1.getOpenAIClient)(apiKey, baseUrl);
            refreshDashboard();
            console.log(picocolors_1.default.green("✔ Aplikasi siap digunakan kembali dengan konfigurasi baru!\n"));
            continue;
        }
        if (input.trim() === "/model" || input.trim().startsWith("/model ")) {
            const arg = input.trim().startsWith("/model ") ? input.trim().slice(7).trim() : "";
            const spinner = new NpmSpinner();
            spinner.start(picocolors_1.default.yellow("Memuat daftar model yang tersedia dari OmniRoute..."));
            let modelOptions = [];
            try {
                const models = await openai.models.list();
                spinner.stop();
                const rawList = Array.isArray(models?.data) ? models.data : [];
                const activeModels = filterConfiguredModels(rawList);
                modelOptions = activeModels.map((m) => {
                    const isCurrent = m.id === options.model;
                    return {
                        cmd: m.id,
                        desc: isCurrent ? "⭐ Model Aktif Saat Ini" : "Configured & Tersedia"
                    };
                });
                if (modelOptions.length === 0) {
                    console.log(picocolors_1.default.yellow("\n⚠️ Tidak ada model yang configured & tersedia ditemukan di OmniRoute."));
                }
            }
            catch (err) {
                spinner.stop();
                console.log();
                (0, ui_1.printToolError)("Get Models", `Gagal memuat model dari OmniRoute: ${err.message}`);
            }
            let selectedModel = null;
            if (arg && modelOptions.length > 0) {
                const exact = modelOptions.find(m => m.cmd.toLowerCase() === arg.toLowerCase());
                if (exact) {
                    selectedModel = exact.cmd;
                }
                else {
                    selectedModel = await showCustomDropdown("Pilih model yang configured & tersedia:", modelOptions, arg, true);
                }
            }
            else {
                selectedModel = await showCustomDropdown("Pilih model yang configured & tersedia:", modelOptions, arg, true);
            }
            if (!selectedModel) {
                console.log(picocolors_1.default.yellow("Pemilihan model dibatalkan.\n"));
                continue;
            }
            // UPDATE MODEL OPTIONS
            options.model = selectedModel;
            saveToEnv("OPENAI_MODEL", options.model);
            process.env.OPENAI_MODEL = options.model;
            // RE-INITIALIZE OPENAI CLIENT
            openai = (0, api_1.getOpenAIClient)(apiKey, baseUrl);
            // REFRESH DASHBOARD
            refreshDashboard();
            console.log(picocolors_1.default.green(`✔ Berhasil mengubah model aktif ke: ${options.model}\n`));
            continue;
        }
        // --- AUTO CONTEXT INJECTION (FILE MENTIONING @file) ---
        const { finalPrompt, injectedFiles, warnings } = (0, context_1.processFileMentions)(input, process.cwd(), isWorkspaceTrusted);
        if (injectedFiles.length > 0) {
            (0, ui_1.printContextInjection)(injectedFiles);
        }
        if (warnings.length > 0) {
            warnings.forEach((w) => (0, ui_1.printContextWarning)(w));
        }
        messages.push({ role: "user", content: finalPrompt });
        let isAgentDone = false;
        let modifiedInTurn = false;
        let healingAttempts = 0;
        while (!isAgentDone) {
            const aiSpinner = new NpmSpinner();
            aiSpinner.start(`Generating...`);
            const loadingPhrases = ["Loading...", "Processing...", "Thinking...", "Analyzing...", "Generating..."];
            let phraseIdx = 0;
            const spinnerTimer = setInterval(() => {
                phraseIdx = (phraseIdx + 1) % loadingPhrases.length;
                aiSpinner.message = loadingPhrases[phraseIdx];
            }, 1500);
            const abortController = new AbortController();
            const onGenData = (chunk) => {
                const key = chunk.toString();
                if (key === "\u001b" || key === "\u0003") {
                    abortController.abort();
                }
            };
            if (process.stdin.isTTY)
                process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on("data", onGenData);
            try {
                const permissionMode = process.env.FILE_PERMISSION_MODE || "ask";
                // Disable tools if workspace is untrusted or file permission is off
                const activeTools = (!isWorkspaceTrusted || permissionMode === "off") ? undefined : tools;
                const stream = await openai.chat.completions.create({
                    model: options.model,
                    messages: messages,
                    stream: true,
                    tools: activeTools,
                }, { signal: abortController.signal });
                let fullResponse = "";
                let toolCalls = {};
                let headerPrinted = false;
                let lineBuffer = "";
                let inCodeBlock = false;
                let codeBlockLang = "";
                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta;
                    if (delta?.reasoning_content) {
                        if (!headerPrinted) {
                            clearInterval(spinnerTimer);
                            aiSpinner.stop('Respon didapatkan');
                            (0, ui_1.printAIHeader)(options.model);
                            headerPrinted = true;
                        }
                        process.stdout.write(picocolors_1.default.gray(delta.reasoning_content));
                    }
                    if (delta?.content) {
                        if (!headerPrinted) {
                            clearInterval(spinnerTimer);
                            aiSpinner.stop('Respon didapatkan');
                            (0, ui_1.printAIHeader)(options.model);
                            headerPrinted = true;
                        }
                        fullResponse += delta.content;
                        lineBuffer += delta.content;
                        if (lineBuffer.includes("\n")) {
                            const lines = lineBuffer.split("\n");
                            lineBuffer = lines.pop() || "";
                            for (const line of lines) {
                                if (line.trim().startsWith("```")) {
                                    inCodeBlock = !inCodeBlock;
                                    if (inCodeBlock) {
                                        codeBlockLang = line.trim().slice(3).trim().toLowerCase();
                                        const titleStr = codeBlockLang ? `Terminal Agent Code: ${codeBlockLang}` : "Terminal Agent Code";
                                        process.stdout.write(picocolors_1.default.cyan(`┌── [${titleStr}] ` + "─".repeat(Math.max(10, (process.stdout.columns || 80) - titleStr.length - 7))) + "\n");
                                    }
                                    else {
                                        codeBlockLang = "";
                                        process.stdout.write(picocolors_1.default.cyan("└" + "─".repeat(Math.max(10, (process.stdout.columns || 80) - 2))) + "\n");
                                    }
                                }
                                else {
                                    if (inCodeBlock) {
                                        if (codeBlockLang === "markdown" || codeBlockLang === "md") {
                                            process.stdout.write(picocolors_1.default.cyan("│  ") + formatMarkdownLineInside(line) + "\n");
                                        }
                                        else {
                                            process.stdout.write(picocolors_1.default.cyan("│  ") + highlightCodeLine(line) + "\n");
                                        }
                                    }
                                    else {
                                        process.stdout.write(formatMarkdownLine(line, inCodeBlock) + "\n");
                                    }
                                }
                            }
                        }
                    }
                    if (delta?.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            if (!toolCalls[tc.index]) {
                                toolCalls[tc.index] = {
                                    id: tc.id,
                                    type: "function",
                                    function: { name: tc.function?.name || "", arguments: "" }
                                };
                            }
                            if (tc.function?.arguments) {
                                toolCalls[tc.index].function.arguments += tc.function.arguments;
                            }
                        }
                    }
                }
                if (lineBuffer.length > 0) {
                    if (lineBuffer.trim().startsWith("```")) {
                        inCodeBlock = !inCodeBlock;
                        if (inCodeBlock) {
                            codeBlockLang = lineBuffer.trim().slice(3).trim().toLowerCase();
                            const titleStr = codeBlockLang ? `Terminal Agent Code: ${codeBlockLang}` : "Terminal Agent Code";
                            process.stdout.write(picocolors_1.default.cyan(`┌── [${titleStr}] ` + "─".repeat(Math.max(10, (process.stdout.columns || 80) - titleStr.length - 7))) + "\n");
                        }
                        else {
                            codeBlockLang = "";
                            process.stdout.write(picocolors_1.default.cyan("└" + "─".repeat(Math.max(10, (process.stdout.columns || 80) - 2))) + "\n");
                        }
                    }
                    else {
                        if (inCodeBlock) {
                            if (codeBlockLang === "markdown" || codeBlockLang === "md") {
                                process.stdout.write(picocolors_1.default.cyan("│  ") + formatMarkdownLineInside(lineBuffer) + "\n");
                            }
                            else {
                                process.stdout.write(picocolors_1.default.cyan("│  ") + highlightCodeLine(lineBuffer) + "\n");
                            }
                        }
                        else {
                            process.stdout.write(formatMarkdownLine(lineBuffer, inCodeBlock));
                        }
                    }
                    lineBuffer = "";
                }
                if (inCodeBlock) {
                    process.stdout.write(picocolors_1.default.cyan("└" + "─".repeat(Math.max(10, (process.stdout.columns || 80) - 2))) + "\n");
                    inCodeBlock = false;
                }
                if (!headerPrinted) {
                    clearInterval(spinnerTimer);
                    if (Object.keys(toolCalls).length > 0) {
                        aiSpinner.stop('Mempersiapkan tool...');
                    }
                    else {
                        aiSpinner.stop('Respon didapatkan');
                        (0, ui_1.printAIHeader)(options.model);
                    }
                }
                const tcArray = Object.values(toolCalls);
                if (fullResponse || tcArray.length === 0) {
                    console.log();
                    (0, ui_1.printDivider)("─", picocolors_1.default.gray);
                    console.log();
                }
                if (tcArray.length > 0) {
                    messages.push({ role: "assistant", content: fullResponse || null, tool_calls: tcArray });
                    for (const tc of tcArray) {
                        const funcCall = tc.function;
                        const funcName = funcCall.name;
                        let args;
                        try {
                            args = JSON.parse(funcCall.arguments);
                        }
                        catch (e) {
                            (0, ui_1.printToolError)(funcName, `Gagal memproses JSON arguments: ${e.message}`);
                            messages.push({
                                role: "tool",
                                tool_call_id: tc.id,
                                content: `Error parsing arguments JSON: ${e.message}`
                            });
                            continue;
                        }
                        const schema = toolSchemas[funcName];
                        if (schema) {
                            const validationResult = schema.safeParse(args);
                            if (!validationResult.success) {
                                const errorMsg = validationResult.error.issues
                                    .map((err) => `[Parameter ${err.path.join(".")}] - ${err.message}`)
                                    .join("; ");
                                (0, ui_1.printToolError)(funcName, `Argumen tidak valid: ${errorMsg}`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: `Error validation: ${errorMsg}`
                                });
                                continue;
                            }
                            args = validationResult.data;
                        }
                        const permissionMode = process.env.FILE_PERMISSION_MODE || "ask";
                        if (!isWorkspaceTrusted) {
                            (0, ui_1.printToolError)(funcName, `Akses ditolak: Folder ini tidak dipercayai (Restricted Mode). Gunakan /trust untuk memberikan izin.`);
                            messages.push({
                                role: "tool",
                                tool_call_id: tc.id,
                                content: "Error: Workspace folder is not trusted. Tool execution denied."
                            });
                            continue;
                        }
                        if (funcName === "write_file") {
                            let reqPath = args.filePath;
                            if (reqPath.startsWith("@")) {
                                reqPath = reqPath.slice(1);
                            }
                            const absPath = path_1.default.resolve(TRUSTED_WORKSPACE, reqPath);
                            if (!isPathTrusted(reqPath)) {
                                (0, ui_1.printToolError)("write_file", `Akses ditolak: Jalur folder di luar workspace (${reqPath})`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: Access denied. Path is outside trusted workspace."
                                });
                                continue;
                            }
                            if (permissionMode === "ask") {
                                const allowed = await (0, prompts_1.confirm)({
                                    message: `Izinkan AI menulis/mengedit file ke path: ${picocolors_1.default.yellow(reqPath)}?`
                                });
                                if (!allowed || (0, prompts_1.isCancel)(allowed)) {
                                    (0, ui_1.printToolError)("write_file", `Izin penulisan file ke ${reqPath} ditolak oleh pengguna.`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: "Error: User denied permission to write to this file."
                                    });
                                    continue;
                                }
                            }
                            try {
                                const dirName = path_1.default.dirname(absPath);
                                if (!fs_1.default.existsSync(dirName)) {
                                    fs_1.default.mkdirSync(dirName, { recursive: true });
                                }
                                const exists = fs_1.default.existsSync(absPath);
                                let oldContent = undefined;
                                if (exists) {
                                    try {
                                        oldContent = fs_1.default.readFileSync(absPath, "utf8");
                                    }
                                    catch (e) {
                                        // ignore
                                    }
                                }
                                (0, ui_1.printToolStart)("write_file", `Menulis file ke ${reqPath}...`);
                                fs_1.default.writeFileSync(absPath, args.content, "utf8");
                                fileHistory.push({
                                    filePath: reqPath,
                                    action: exists ? "modified" : "created",
                                    originalContent: oldContent
                                });
                                modifiedInTurn = true;
                                (0, ui_1.printToolSuccess)("write_file", `File berhasil ditulis/diupdate (${args.content.length} karakter)`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Success"
                                });
                            }
                            catch (e) {
                                (0, ui_1.printToolError)("write_file", `Gagal menulis file: ${e.message}`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: " + e.message
                                });
                            }
                        }
                        else if (funcName === "read_file") {
                            let reqPath = args.filePath;
                            if (reqPath.startsWith("@")) {
                                reqPath = reqPath.slice(1);
                            }
                            const absPath = path_1.default.resolve(TRUSTED_WORKSPACE, reqPath);
                            if (!isPathTrusted(reqPath)) {
                                (0, ui_1.printToolError)("read_file", `Akses ditolak: Jalur folder di luar workspace (${reqPath})`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: Access denied. Path is outside trusted workspace."
                                });
                                continue;
                            }
                            if (permissionMode === "ask") {
                                const allowed = await (0, prompts_1.confirm)({
                                    message: `Izinkan AI membaca isi file: ${picocolors_1.default.yellow(reqPath)}?`
                                });
                                if (!allowed || (0, prompts_1.isCancel)(allowed)) {
                                    (0, ui_1.printToolError)("read_file", `Izin membaca file ${reqPath} ditolak oleh pengguna.`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: "Error: User denied permission to read this file."
                                    });
                                    continue;
                                }
                            }
                            (0, ui_1.printToolStart)("read_file", `Membaca file ${reqPath}...`);
                            if (fs_1.default.existsSync(absPath)) {
                                try {
                                    const content = fs_1.default.readFileSync(absPath, "utf8");
                                    (0, ui_1.printToolSuccess)("read_file", `Berhasil membaca isi file (${content.length} karakter)`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: content
                                    });
                                }
                                catch (err) {
                                    (0, ui_1.printToolError)("read_file", `Gagal membaca file: ${err.message}`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: "Error: " + err.message
                                    });
                                }
                            }
                            else {
                                (0, ui_1.printToolError)("read_file", `File tidak ditemukan pada path: ${reqPath}`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: File not found"
                                });
                            }
                        }
                        else if (funcName === "list_dir") {
                            let reqPath = args.dirPath;
                            if (reqPath.startsWith("@")) {
                                reqPath = reqPath.slice(1);
                            }
                            const absPath = path_1.default.resolve(TRUSTED_WORKSPACE, reqPath);
                            if (!isPathTrusted(reqPath)) {
                                (0, ui_1.printToolError)("list_dir", `Akses ditolak: Jalur folder di luar workspace (${reqPath})`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: Access denied. Path is outside trusted workspace."
                                });
                                continue;
                            }
                            if (permissionMode === "ask") {
                                const allowed = await (0, prompts_1.confirm)({
                                    message: `Izinkan AI membaca isi folder: ${picocolors_1.default.yellow(reqPath)}?`
                                });
                                if (!allowed || (0, prompts_1.isCancel)(allowed)) {
                                    (0, ui_1.printToolError)("list_dir", `Izin membaca folder ${reqPath} ditolak oleh pengguna.`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: "Error: User denied permission to read this directory."
                                    });
                                    continue;
                                }
                            }
                            (0, ui_1.printToolStart)("list_dir", `Membaca folder ${reqPath}...`);
                            if (fs_1.default.existsSync(absPath)) {
                                const stat = fs_1.default.statSync(absPath);
                                if (stat.isDirectory()) {
                                    const items = fs_1.default.readdirSync(absPath);
                                    const resultStr = items.length > 0 ? items.join("\n") : "(Empty Directory)";
                                    (0, ui_1.printToolSuccess)("list_dir", `Berhasil membaca isi folder (${items.length} item)`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: resultStr
                                    });
                                }
                                else {
                                    (0, ui_1.printToolError)("list_dir", `Path bukan sebuah folder: ${reqPath}`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: "Error: Path is not a directory"
                                    });
                                }
                            }
                            else {
                                (0, ui_1.printToolError)("list_dir", `Folder tidak ditemukan pada path: ${reqPath}`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: Directory not found"
                                });
                            }
                        }
                        else if (funcName === "grep_search") {
                            let reqPath = args.dirPath;
                            if (reqPath.startsWith("@")) {
                                reqPath = reqPath.slice(1);
                            }
                            const absPath = path_1.default.resolve(TRUSTED_WORKSPACE, reqPath);
                            const keyword = args.keyword || "";
                            if (!isPathTrusted(reqPath)) {
                                (0, ui_1.printToolError)("grep_search", `Akses ditolak: Jalur folder di luar workspace (${reqPath})`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: Access denied. Path is outside trusted workspace."
                                });
                                continue;
                            }
                            if (permissionMode === "ask") {
                                const allowed = await (0, prompts_1.confirm)({
                                    message: `Izinkan AI mencari kata kunci "${keyword}" di folder: ${picocolors_1.default.yellow(reqPath)}?`
                                });
                                if (!allowed || (0, prompts_1.isCancel)(allowed)) {
                                    (0, ui_1.printToolError)("grep_search", `Izin pencarian folder ${reqPath} ditolak oleh pengguna.`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: "Error: User denied permission to search this directory."
                                    });
                                    continue;
                                }
                            }
                            (0, ui_1.printToolStart)("grep_search", `Mencari kata kunci "${keyword}" di folder ${reqPath}...`);
                            if (fs_1.default.existsSync(absPath)) {
                                const stat = fs_1.default.statSync(absPath);
                                if (stat.isDirectory()) {
                                    const files = (0, context_1.getWorkspaceFiles)(absPath);
                                    const results = [];
                                    let matchCount = 0;
                                    const maxMatches = 50;
                                    for (const fileRel of files) {
                                        if (matchCount >= maxMatches)
                                            break;
                                        const fileAbs = path_1.default.join(absPath, fileRel);
                                        try {
                                            const content = fs_1.default.readFileSync(fileAbs, "utf8");
                                            const lines = content.split("\n");
                                            lines.forEach((lineText, idx) => {
                                                if (matchCount >= maxMatches)
                                                    return;
                                                if (lineText.toLowerCase().includes(keyword.toLowerCase())) {
                                                    const displayPath = reqPath === "." ? fileRel : path_1.default.join(reqPath, fileRel);
                                                    results.push(`[${displayPath}] [Baris:${idx + 1}] - ${lineText.trim()}`);
                                                    matchCount++;
                                                }
                                            });
                                        }
                                        catch (e) {
                                            // skip unreadable files
                                        }
                                    }
                                    const resultStr = results.length > 0 ? results.join("\n") : "(Tidak ada kecocokan ditemukan)";
                                    (0, ui_1.printToolSuccess)("grep_search", `Pencarian selesai (${matchCount} kecocokan ditemukan)`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: resultStr
                                    });
                                }
                                else {
                                    (0, ui_1.printToolError)("grep_search", `Path bukan sebuah folder: ${reqPath}`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: "Error: Path is not a directory"
                                    });
                                }
                            }
                            else {
                                (0, ui_1.printToolError)("grep_search", `Folder tidak ditemukan pada path: ${reqPath}`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: Directory not found"
                                });
                            }
                        }
                        else if (funcName === "patch_file") {
                            let reqPath = args.filePath;
                            if (reqPath.startsWith("@")) {
                                reqPath = reqPath.slice(1);
                            }
                            const absPath = path_1.default.resolve(TRUSTED_WORKSPACE, reqPath);
                            const targetContent = args.targetContent;
                            const replacementContent = args.replacementContent;
                            if (!isPathTrusted(reqPath)) {
                                (0, ui_1.printToolError)("patch_file", `Akses ditolak: Jalur folder di luar workspace (${reqPath})`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: Access denied. Path is outside trusted workspace."
                                });
                                continue;
                            }
                            if (permissionMode === "ask") {
                                const allowed = await (0, prompts_1.confirm)({
                                    message: `Izinkan AI mengubah isi file secara parsial: ${picocolors_1.default.yellow(reqPath)}?`
                                });
                                if (!allowed || (0, prompts_1.isCancel)(allowed)) {
                                    (0, ui_1.printToolError)("patch_file", `Izin mengedit file ${reqPath} ditolak oleh pengguna.`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: "Error: User denied permission to edit this file."
                                    });
                                    continue;
                                }
                            }
                            (0, ui_1.printToolStart)("patch_file", `Mengedit file ${reqPath}...`);
                            if (fs_1.default.existsSync(absPath)) {
                                try {
                                    const content = fs_1.default.readFileSync(absPath, "utf8");
                                    const firstIndex = content.indexOf(targetContent);
                                    if (firstIndex === -1) {
                                        (0, ui_1.printToolError)("patch_file", `Kode target tidak ditemukan secara persis di dalam file.`);
                                        messages.push({
                                            role: "tool",
                                            tool_call_id: tc.id,
                                            content: "Error: targetContent was not found in the file. Make sure it matches character-for-character including spaces/indentation."
                                        });
                                    }
                                    else {
                                        const lastIndex = content.lastIndexOf(targetContent);
                                        if (firstIndex !== lastIndex) {
                                            (0, ui_1.printToolError)("patch_file", `Ditemukan lebih dari satu kemunculan kode target.`);
                                            messages.push({
                                                role: "tool",
                                                tool_call_id: tc.id,
                                                content: "Error: targetContent matches multiple locations in the file. Please provide a larger unique context block."
                                            });
                                        }
                                        else {
                                            fileHistory.push({
                                                filePath: reqPath,
                                                action: "modified",
                                                originalContent: content
                                            });
                                            modifiedInTurn = true;
                                            const newContent = content.substring(0, firstIndex) + replacementContent + content.substring(firstIndex + targetContent.length);
                                            fs_1.default.writeFileSync(absPath, newContent, "utf8");
                                            (0, ui_1.printToolSuccess)("patch_file", `Berhasil memperbarui file secara parsial.`);
                                            messages.push({
                                                role: "tool",
                                                tool_call_id: tc.id,
                                                content: "Success"
                                            });
                                        }
                                    }
                                }
                                catch (e) {
                                    (0, ui_1.printToolError)("patch_file", `Gagal membaca/menulis file: ${e.message}`);
                                    messages.push({
                                        role: "tool",
                                        tool_call_id: tc.id,
                                        content: "Error: " + e.message
                                    });
                                }
                            }
                            else {
                                (0, ui_1.printToolError)("patch_file", `File tidak ditemukan pada path: ${reqPath}`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: File not found"
                                });
                            }
                        }
                        else if (funcName === "run_command") {
                            const command = args.command;
                            // Pengawasan keamanan ketat 1: Blocklist perintah berbahaya
                            const dangerousPatterns = [
                                "rm -rf", "rm -f", "mkfs", "dd ", "chmod -R", "chown -R",
                                ">/dev/null", "> /dev/null", ":(){:|:&};:", "forkbomb",
                                "shutdown", "reboot", "poweroff", "init 0"
                            ];
                            const isDangerous = dangerousPatterns.some(pattern => command.includes(pattern));
                            if (isDangerous) {
                                (0, ui_1.printToolError)("run_command", `Pernyataan perintah diblokir karena berpotensi berbahaya: ${command}`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: Security block. Command contains dangerous patterns."
                                });
                                continue;
                            }
                            // Pengawasan keamanan ketat 2: Selalu konfirmasi pengguna (Wajib)
                            const allowed = await (0, prompts_1.confirm)({
                                message: `⚠️  AI ingin menjalankan perintah terminal berikut:\n   ${picocolors_1.default.yellow(picocolors_1.default.bold(command))}\n\nApakah Anda yakin mengizinkan eksekusi perintah ini?`
                            });
                            if (!allowed || (0, prompts_1.isCancel)(allowed)) {
                                (0, ui_1.printToolError)("run_command", `Eksekusi perintah ditolak oleh pengguna: ${command}`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: User denied execution permission for this command."
                                });
                                continue;
                            }
                            (0, ui_1.printToolStart)("run_command", `Menjalankan perintah: ${command}...`);
                            // Eksekusi asinkron dengan Promise untuk mendukung timeout
                            const runPromise = new Promise((resolveExec) => {
                                const child = (0, child_process_1.exec)(command, { cwd: TRUSTED_WORKSPACE }, (error, stdout, stderr) => {
                                    resolveExec({
                                        stdout: stdout || "",
                                        stderr: stderr || "",
                                        exitCode: error ? error.code || 1 : 0
                                    });
                                });
                                // Timeout 30 detik
                                setTimeout(() => {
                                    child.kill("SIGKILL");
                                    resolveExec({
                                        stdout: "",
                                        stderr: "Error: Command execution timed out (limit 30 seconds). Process was killed.",
                                        exitCode: -1
                                    });
                                }, 30000);
                            });
                            try {
                                const execResult = await runPromise;
                                const totalOutput = `[Exit Code: ${execResult.exitCode}]\n\nStdout:\n${execResult.stdout}\n\nStderr:\n${execResult.stderr}`;
                                // Batasi output teks maksimal 10.000 karakter demi efisiensi token
                                const truncatedOutput = totalOutput.length > 10000
                                    ? totalOutput.slice(0, 10000) + "\n\n[Output truncated due to context limit...]"
                                    : totalOutput;
                                if (execResult.exitCode === 0) {
                                    (0, ui_1.printToolSuccess)("run_command", `Perintah berhasil dijalankan dengan kode keluar 0`);
                                }
                                else {
                                    (0, ui_1.printToolError)("run_command", `Perintah gagal dengan kode keluar ${execResult.exitCode}`);
                                }
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: truncatedOutput
                                });
                            }
                            catch (err) {
                                (0, ui_1.printToolError)("run_command", `Kesalahan saat mengeksekusi perintah: ${err.message}`);
                                messages.push({
                                    role: "tool",
                                    tool_call_id: tc.id,
                                    content: "Error: " + err.message
                                });
                            }
                        }
                        else {
                            (0, ui_1.printToolError)(funcName, "Fungsi tool tidak dikenal.");
                            messages.push({
                                role: "tool",
                                tool_call_id: tc.id,
                                content: "Error: Unknown function " + funcName
                            });
                        }
                    }
                }
                else {
                    if (modifiedInTurn && healingAttempts < 3) {
                        const detectCommand = () => {
                            if (fs_1.default.existsSync(path_1.default.join(TRUSTED_WORKSPACE, "package.json"))) {
                                try {
                                    const pkg = JSON.parse(fs_1.default.readFileSync(path_1.default.join(TRUSTED_WORKSPACE, "package.json"), "utf8"));
                                    if (pkg.scripts?.build)
                                        return "npm run build";
                                    if (pkg.scripts?.test)
                                        return "npm run test";
                                }
                                catch (e) { }
                                return "npx tsc";
                            }
                            if (fs_1.default.existsSync(path_1.default.join(TRUSTED_WORKSPACE, "Cargo.toml")))
                                return "cargo check";
                            return null;
                        };
                        const verifyCmd = detectCommand();
                        if (verifyCmd) {
                            let allowed = true;
                            if (permissionMode === "ask") {
                                const confirmRes = await (0, prompts_1.confirm)({
                                    message: `Izinkan menjalankan perintah verifikasi otomatis: ${picocolors_1.default.yellow(verifyCmd)}?`
                                });
                                allowed = !!confirmRes && !(0, prompts_1.isCancel)(confirmRes);
                            }
                            if (allowed) {
                                healingAttempts++;
                                (0, ui_1.printToolStart)("Self-Healing", `Verifikasi dengan perintah: ${verifyCmd}...`);
                                const runPromise = new Promise((resolveExec) => {
                                    const child = (0, child_process_1.exec)(verifyCmd, { cwd: TRUSTED_WORKSPACE }, (error, stdout, stderr) => {
                                        resolveExec({
                                            stdout: stdout || "",
                                            stderr: stderr || "",
                                            exitCode: error ? error.code || 1 : 0
                                        });
                                    });
                                    setTimeout(() => {
                                        child.kill("SIGKILL");
                                        resolveExec({
                                            stdout: "",
                                            stderr: "Verification command timed out after 30 seconds.",
                                            exitCode: -1
                                        });
                                    }, 30000);
                                });
                                try {
                                    const res = await runPromise;
                                    if (res.exitCode === 0) {
                                        (0, ui_1.printToolSuccess)("Self-Healing", `Verifikasi sukses (Exit Code 0).`);
                                        modifiedInTurn = false;
                                        if (fullResponse) {
                                            messages.push({ role: "assistant", content: fullResponse });
                                        }
                                        isAgentDone = true;
                                    }
                                    else {
                                        (0, ui_1.printToolError)("Self-Healing", `Verifikasi gagal (Exit Code ${res.exitCode}). Mengirimkan log error ke AI...`);
                                        const errorContext = `[Exit Code: ${res.exitCode}]\n\nStdout:\n${res.stdout}\n\nStderr:\n${res.stderr}`;
                                        messages.push({
                                            role: "user",
                                            content: `SYSTEM WARNING: Perubahan file menyebabkan build/compile error pada proyek. Silakan perbaiki error berikut:\n\n${errorContext}`
                                        });
                                    }
                                }
                                catch (e) {
                                    (0, ui_1.printToolError)("Self-Healing", `Kesalahan saat menjalankan verifikasi: ${e.message}`);
                                    modifiedInTurn = false;
                                    if (fullResponse) {
                                        messages.push({ role: "assistant", content: fullResponse });
                                    }
                                    isAgentDone = true;
                                }
                            }
                            else {
                                (0, ui_1.printToolError)("Self-Healing", `Verifikasi otomatis dibatalkan oleh pengguna.`);
                                modifiedInTurn = false;
                                if (fullResponse) {
                                    messages.push({ role: "assistant", content: fullResponse });
                                }
                                isAgentDone = true;
                            }
                        }
                        else {
                            modifiedInTurn = false;
                            if (fullResponse) {
                                messages.push({ role: "assistant", content: fullResponse });
                            }
                            isAgentDone = true;
                        }
                    }
                    else {
                        if (modifiedInTurn && healingAttempts >= 3) {
                            console.log(picocolors_1.default.yellow(`\n⚠️  [Self-Healing] Batas maksimum perbaikan otomatis (3 kali) tercapai.`));
                        }
                        modifiedInTurn = false;
                        if (fullResponse) {
                            messages.push({ role: "assistant", content: fullResponse });
                        }
                        isAgentDone = true;
                    }
                }
            }
            catch (error) {
                clearInterval(spinnerTimer);
                aiSpinner.stop();
                if (error.name === "AbortError" || error.message?.includes("aborted") || abortController.signal.aborted) {
                    console.log(picocolors_1.default.yellow(`\n◇  Canceled\n`));
                    if (messages.length > 0) {
                        messages.pop(); // remove user message so we don't send it again when they retry
                    }
                    break; // break the agent loop to return to main input prompt loop
                }
                else {
                    (0, ui_1.printToolError)("AI Completion System", error.message);
                    console.log();
                    isAgentDone = true;
                }
            }
            finally {
                clearInterval(spinnerTimer);
                aiSpinner.stop();
                process.stdin.off("data", onGenData);
                if (process.stdin.isTTY)
                    process.stdin.setRawMode(false);
            }
        }
    }
    activeRedrawDashboard = null;
}
