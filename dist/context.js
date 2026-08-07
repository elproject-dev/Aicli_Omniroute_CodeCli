"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguageFromPath = getLanguageFromPath;
exports.getWorkspaceFiles = getWorkspaceFiles;
exports.processFileMentions = processFileMentions;
exports.formatFileSize = formatFileSize;
exports.getWorkspaceDirs = getWorkspaceDirs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const IGNORE_DIRS = new Set([
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "coverage",
    ".cache",
    ".turbo",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    ".pytest_cache",
    "__pycache__"
]);
/**
 * Get language identifier for markdown codeblock from file extension.
 */
function getLanguageFromPath(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    switch (ext) {
        case ".ts":
        case ".tsx":
            return "typescript";
        case ".js":
        case ".jsx":
        case ".mjs":
        case ".cjs":
            return "javascript";
        case ".json":
        case ".jsonc":
        case ".json5":
            return "json";
        case ".md":
        case ".mdx":
            return "markdown";
        case ".py":
            return "python";
        case ".java":
            return "java";
        case ".c":
        case ".h":
            return "c";
        case ".cpp":
        case ".hpp":
        case ".cc":
            return "cpp";
        case ".go":
            return "go";
        case ".rs":
            return "rust";
        case ".html":
        case ".htm":
            return "html";
        case ".css":
        case ".scss":
        case ".less":
            return "css";
        case ".yaml":
        case ".yml":
            return "yaml";
        case ".sh":
        case ".bash":
        case ".zsh":
            return "bash";
        case ".env":
        case ".env.local":
        case ".env.development":
            return "dotenv";
        case ".sql":
            return "sql";
        case ".php":
            return "php";
        case ".rb":
            return "ruby";
        case ".kt":
        case ".kts":
            return "kotlin";
        case ".cs":
            return "csharp";
        case ".vue":
            return "vue";
        case ".svelte":
            return "svelte";
        case ".toml":
            return "toml";
        default:
            return "";
    }
}
/**
 * Scan workspace to list relative file paths for dropdown selection.
 */
function getWorkspaceFiles(dirPath = process.cwd(), maxFiles = 500) {
    const files = [];
    function scan(currentDir, relativeBase = "") {
        if (files.length >= maxFiles)
            return;
        let entries = [];
        try {
            entries = fs_1.default.readdirSync(currentDir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (files.length >= maxFiles)
                break;
            const name = entry.name;
            if (IGNORE_DIRS.has(name) || (name.startsWith(".") && name !== ".env")) {
                continue;
            }
            const relPath = relativeBase ? `${relativeBase}/${name}` : name;
            const fullPath = path_1.default.join(currentDir, name);
            if (entry.isDirectory()) {
                scan(fullPath, relPath);
            }
            else if (entry.isFile()) {
                files.push(relPath);
            }
        }
    }
    scan(dirPath);
    return files;
}
/**
 * Parse input string to find all valid @file mentions and resolve their contents.
 */
function processFileMentions(userInput, workspacePath = process.cwd(), isTrusted = true) {
    const mentionsRegex = /@([a-zA-Z0-9_\-\.\/\\~]+)/g;
    const matches = [...userInput.matchAll(mentionsRegex)];
    if (matches.length === 0) {
        return { finalPrompt: userInput, injectedFiles: [], warnings: [] };
    }
    const injectedFiles = [];
    const warnings = [];
    const processedPaths = new Set();
    let fileContextBlocks = "";
    for (const match of matches) {
        const rawMention = match[0];
        let cleanedPath = match[1];
        // Strip trailing punctuation like comma, period, question mark, etc.
        cleanedPath = cleanedPath.replace(/[\.,!\?:;"'\)\}\]]+$/, "");
        // Normalize relative path prefix (avoid stripping leading dot for dotfiles)
        if (cleanedPath.startsWith("./")) {
            cleanedPath = cleanedPath.slice(2);
        }
        else if (cleanedPath.startsWith("/")) {
            cleanedPath = cleanedPath.slice(1);
        }
        if (!cleanedPath)
            continue;
        const absPath = path_1.default.resolve(workspacePath, cleanedPath);
        const relPath = path_1.default.relative(workspacePath, absPath);
        // Prevent duplicate injection of same file in one prompt
        if (processedPaths.has(absPath))
            continue;
        // Safety check: ensure file is inside workspace
        if (!absPath.startsWith(workspacePath)) {
            warnings.push(`File di luar workspace ditolak: ${cleanedPath}`);
            continue;
        }
        if (!fs_1.default.existsSync(absPath)) {
            // If it looks like a path or has an extension, add warning
            if (cleanedPath.includes("/") || cleanedPath.includes(".")) {
                warnings.push(`File tidak ditemukan: ${cleanedPath}`);
            }
            continue;
        }
        const stat = fs_1.default.statSync(absPath);
        if (!stat.isFile()) {
            continue;
        }
        if (!isTrusted) {
            warnings.push(`@${relPath} tidak divalidasi (Workspace Restricted Mode - gunakan /trust)`);
            continue;
        }
        // Limit maximum file size to inject (500 KB to avoid blowing token context)
        if (stat.size > 500 * 1024) {
            warnings.push(`File terlalu besar untuk diinjeksi (>500KB): ${relPath}`);
            continue;
        }
        try {
            const content = fs_1.default.readFileSync(absPath, "utf8");
            const lang = getLanguageFromPath(absPath);
            processedPaths.add(absPath);
            injectedFiles.push({
                rawMention,
                relativePath: relPath,
                absolutePath: absPath,
                sizeBytes: stat.size
            });
            fileContextBlocks += `\n\n--- Content of file: @${relPath} ---\n\`\`\`${lang}\n${content}\n\`\`\``;
        }
        catch (err) {
            warnings.push(`Gagal membaca @${relPath}: ${err.message}`);
        }
    }
    let finalPrompt = userInput;
    if (injectedFiles.length > 0) {
        finalPrompt = `${userInput}\n\n[Auto-Injected Context via File Mentioning]${fileContextBlocks}`;
    }
    return { finalPrompt, injectedFiles, warnings };
}
/**
 * Format human readable file size.
 */
function formatFileSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
/**
 * Scan workspace to list relative directory paths for dropdown selection.
 * Returns folder paths (not files) recursively, excluding ignored dirs.
 */
function getWorkspaceDirs(dirPath = process.cwd(), maxDirs = 300) {
    const dirs = [];
    function scan(currentDir, relativeBase = "") {
        if (dirs.length >= maxDirs)
            return;
        let entries = [];
        try {
            entries = fs_1.default.readdirSync(currentDir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (dirs.length >= maxDirs)
                break;
            const name = entry.name;
            if (IGNORE_DIRS.has(name) || (name.startsWith(".") && name !== ".env")) {
                continue;
            }
            const relPath = relativeBase ? `${relativeBase}/${name}` : name;
            const fullPath = path_1.default.join(currentDir, name);
            if (entry.isDirectory()) {
                dirs.push(relPath);
                scan(fullPath, relPath);
            }
        }
    }
    scan(dirPath);
    return dirs;
}
