"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureConfigDir = ensureConfigDir;
exports.loadTrustConfig = loadTrustConfig;
exports.saveTrustConfig = saveTrustConfig;
exports.isDirectoryTrusted = isDirectoryTrusted;
exports.addTrustedFolder = addTrustedFolder;
exports.removeTrustedFolder = removeTrustedFolder;
exports.getTrustedFolders = getTrustedFolders;
exports.promptWorkspaceTrust = promptWorkspaceTrust;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const picocolors_1 = __importDefault(require("picocolors"));
const prompts_1 = require("@clack/prompts");
const CONFIG_DIR = path_1.default.join(os_1.default.homedir(), ".aicli");
const TRUST_FILE = path_1.default.join(CONFIG_DIR, "trusted_folders.json");
function ensureConfigDir() {
    if (!fs_1.default.existsSync(CONFIG_DIR)) {
        fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}
function loadTrustConfig() {
    ensureConfigDir();
    if (fs_1.default.existsSync(TRUST_FILE)) {
        try {
            const data = fs_1.default.readFileSync(TRUST_FILE, "utf8");
            return JSON.parse(data);
        }
        catch {
            return { trustedFolders: [] };
        }
    }
    return { trustedFolders: [] };
}
function saveTrustConfig(config) {
    ensureConfigDir();
    fs_1.default.writeFileSync(TRUST_FILE, JSON.stringify(config, null, 2), "utf8");
}
function isDirectoryTrusted(targetPath = process.cwd()) {
    const normalizedTarget = path_1.default.resolve(targetPath);
    const config = loadTrustConfig();
    return config.trustedFolders.some((folder) => {
        const normalizedFolder = path_1.default.resolve(folder);
        return (normalizedTarget === normalizedFolder ||
            normalizedTarget.startsWith(normalizedFolder + path_1.default.sep));
    });
}
function addTrustedFolder(folderPath = process.cwd()) {
    const normalizedFolder = path_1.default.resolve(folderPath);
    const config = loadTrustConfig();
    if (!config.trustedFolders.includes(normalizedFolder)) {
        config.trustedFolders.push(normalizedFolder);
        saveTrustConfig(config);
    }
}
function removeTrustedFolder(folderPath = process.cwd()) {
    const normalizedFolder = path_1.default.resolve(folderPath);
    const config = loadTrustConfig();
    config.trustedFolders = config.trustedFolders.filter((f) => path_1.default.resolve(f) !== normalizedFolder);
    saveTrustConfig(config);
}
function getTrustedFolders() {
    return loadTrustConfig().trustedFolders;
}
async function promptWorkspaceTrust(currentPath = process.cwd()) {
    const resolvedPath = path_1.default.resolve(currentPath);
    console.log();
    console.log(picocolors_1.default.yellow("KONSEP WORKSPACE TRUST (KEAMANAN FOLDER)"));
    console.log(picocolors_1.default.gray("─".repeat(65)));
    console.log(picocolors_1.default.bold("Apakah Anda mempercayai penulis file di folder proyek ini?"));
    console.log(picocolors_1.default.gray(`Path: ${picocolors_1.default.cyan(resolvedPath)}`));
    console.log();
    console.log(picocolors_1.default.dim("Memberikan kepercayaan pada folder ini memungkinkan AI untuk membaca,\n" +
        "meninjau, dan mengedit file di dalam direktori workspace ini secara aman."));
    console.log(picocolors_1.default.gray("─".repeat(65)));
    console.log();
    const answer = await (0, prompts_1.select)({
        message: "Pilih status kepercayaan folder ini:",
        options: [
            {
                value: "trust",
                label: "Percayai folder ini (Trust Folder)",
                hint: "Simpan folder ini sebagai trusted workspace permanen"
            },
            {
                value: "untrust",
                label: "Jangan percayai (Restricted Mode)",
                hint: "AI tidak diizinkan membaca/menulis file di folder ini"
            },
            {
                value: "session",
                label: "Percayai hanya untuk sesi ini saja",
                hint: "Tanya lagi saat membuka CLI berikutnya"
            }
        ]
    });
    if ((0, prompts_1.isCancel)(answer) || answer === "untrust") {
        console.log(picocolors_1.default.red("\nFolder ditandai sebagai TIDAK DIPERCAYAI (Restricted Mode).\n"));
        return false;
    }
    if (answer === "trust") {
        addTrustedFolder(resolvedPath);
        console.log(picocolors_1.default.green(`\nFolder ${resolvedPath} berhasil ditambahkan ke daftar Trusted Folders!\n`));
        return true;
    }
    if (answer === "session") {
        console.log(picocolors_1.default.yellow(`\nFolder dipercayai khusus untuk sesi saat ini.\n`));
        return true;
    }
    return false;
}
