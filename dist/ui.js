"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.themes = void 0;
exports.getTheme = getTheme;
exports.terminalLink = terminalLink;
exports.printBanner = printBanner;
exports.printDashboard = printDashboard;
exports.printHelp = printHelp;
exports.printDivider = printDivider;
exports.printAIHeader = printAIHeader;
exports.printUserHeader = printUserHeader;
exports.printToolStart = printToolStart;
exports.printToolSuccess = printToolSuccess;
exports.printToolError = printToolError;
exports.printContextInjection = printContextInjection;
exports.printContextWarning = printContextWarning;
const picocolors_1 = __importDefault(require("picocolors"));
exports.themes = {
    default: {
        name: "Default (Cyan & Gray)",
        primary: picocolors_1.default.cyan,
        secondary: picocolors_1.default.yellow,
        success: picocolors_1.default.green,
        warning: picocolors_1.default.yellow,
        error: picocolors_1.default.red,
        border: picocolors_1.default.gray,
        accent: picocolors_1.default.magenta
    },
    magenta: {
        name: "Neon Magenta (Magenta & Blue)",
        primary: picocolors_1.default.magenta,
        secondary: picocolors_1.default.cyan,
        success: picocolors_1.default.green,
        warning: picocolors_1.default.yellow,
        error: picocolors_1.default.red,
        border: picocolors_1.default.blue,
        accent: picocolors_1.default.cyan
    },
    emerald: {
        name: "Emerald Garden (Green & Gray)",
        primary: picocolors_1.default.green,
        secondary: picocolors_1.default.yellow,
        success: picocolors_1.default.green,
        warning: picocolors_1.default.yellow,
        error: picocolors_1.default.red,
        border: picocolors_1.default.gray,
        accent: picocolors_1.default.cyan
    },
    sunset: {
        name: "Sunset Glow (Yellow & Red)",
        primary: picocolors_1.default.yellow,
        secondary: picocolors_1.default.red,
        success: picocolors_1.default.green,
        warning: picocolors_1.default.yellow,
        error: picocolors_1.default.red,
        border: picocolors_1.default.red,
        accent: picocolors_1.default.magenta
    },
    ocean: {
        name: "Cool Ocean (Blue & Cyan)",
        primary: picocolors_1.default.blue,
        secondary: picocolors_1.default.cyan,
        success: picocolors_1.default.green,
        warning: picocolors_1.default.yellow,
        error: picocolors_1.default.red,
        border: picocolors_1.default.cyan,
        accent: picocolors_1.default.magenta
    },
    monochrome: {
        name: "Monochrome (White & Gray)",
        primary: picocolors_1.default.white,
        secondary: picocolors_1.default.white,
        success: picocolors_1.default.white,
        warning: picocolors_1.default.white,
        error: picocolors_1.default.white,
        border: picocolors_1.default.gray,
        accent: picocolors_1.default.white
    }
};
function getTheme() {
    const selected = process.env.CLI_THEME || "default";
    return exports.themes[selected] || exports.themes.default;
}
/**
 * Membuat teks terminal yang bisa diklik untuk membuka URL di browser.
 * Menggunakan escape sequence hyperlink OSC 8 (\x1B]8;;URL\x07 ... \x1B]8;;\x07).
 * Bekerja di terminal yang mendukung hyperlinks (iTerm2, VSCode, Windows Terminal,
 * GNOME Terminal, WezTerm, Hyper, dll).
 */
function terminalLink(text, url) {
    return `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`;
}
function printBanner() { }
function lolcatText(text, frequency = 0.1, seed = 0) {
    let result = "";
    let visibleIndex = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === " ") {
            result += " ";
            continue;
        }
        const r = Math.round(Math.sin(frequency * visibleIndex + seed + 0) * 127 + 128);
        const g = Math.round(Math.sin(frequency * visibleIndex + seed + (2 * Math.PI / 3)) * 127 + 128);
        const b = Math.round(Math.sin(frequency * visibleIndex + seed + (4 * Math.PI / 3)) * 127 + 128);
        result += `\x1b[38;2;${r};${g};${b}m${char}`;
        visibleIndex++;
    }
    result += "\x1b[0m";
    return result;
}
function printDashboard(config) {
    const terminalWidth = process.stdout.columns || 80;
    const theme = getTheme();
    const trustStatusStr = config.isTrusted ? "TRUSTED" : "RESTRICTED";
    const activePath = config.activePath || process.cwd();
    const permMode = config.permissionMode || "ask";
    if (terminalWidth < 50) {
        console.log();
        console.log(theme.primary(picocolors_1.default.bold("  AI OMNIROUTE CLI")));
        console.log(theme.secondary("  OpenAi Compatible API - OmniRoute Open Source"));
        printDivider("─", theme.border);
        const printLine = (label, value, colorVal = picocolors_1.default.white) => {
            console.log(`  ${theme.primary(label + ":")} ${colorVal(value)}`);
        };
        printLine("Model", config.model, theme.success);
        printLine("API Base URL", config.baseUrl || "Default (OpenAI)", theme.secondary);
        printLine("Active Path", activePath, theme.primary);
        printLine("Workspace Trust", trustStatusStr, config.isTrusted ? theme.success : theme.error);
        printLine("File Access", permMode.toUpperCase(), permMode === "auto" ? theme.error : permMode === "ask" ? theme.secondary : theme.border);
        if (config.skillsCount !== undefined) {
            printLine("Skills", `${config.skillsCount} Aktif`, theme.success);
        }
        printLine("Platform", terminalLink(theme.primary("www.elproject.studio"), "https://www.elproject.studio"), picocolors_1.default.white);
        printDivider("─", theme.border);
        console.log();
        return;
    }
    const boxWidth = Math.max(40, terminalWidth - 4);
    const innerWidth = boxWidth - 2;
    const borderTop = theme.border("┏" + "━".repeat(innerWidth) + "┓");
    const borderMid = theme.border("┣" + "━".repeat(innerWidth) + "┫");
    const borderBottom = theme.border("┗" + "━".repeat(innerWidth) + "┛");
    const centerText = (text) => {
        const leftPadding = Math.floor((innerWidth - text.length) / 2);
        const rightPadding = innerWidth - text.length - leftPadding;
        return " ".repeat(Math.max(0, leftPadding)) + text + " ".repeat(Math.max(0, rightPadding));
    };
    /**
     * Format satu baris dashboard dengan font/ukuran yang konsisten.
     * Label & value memakai weight yang sama (tanpa bold berlebih)
     * agar tampilan monospaced terminal tetap rapi.
     */
    const visibleLength = (s) => s.replace(/\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*\x07)/g, "").length;
    const formatLine = (label, value, colorVal = picocolors_1.default.white) => {
        const labelPadWidth = 16;
        const maxValLen = Math.max(10, innerWidth - (labelPadWidth + 4));
        let displayValue = value;
        if (visibleLength(displayValue) > maxValLen) {
            if (displayValue.includes("/") || displayValue.includes("\\")) {
                displayValue = "…" + displayValue.slice(-(maxValLen - 1));
            }
            else {
                displayValue = displayValue.slice(0, maxValLen - 1) + "…";
            }
        }
        const labelPart = theme.primary(label.padEnd(labelPadWidth));
        const valuePart = colorVal(displayValue);
        const leftContent = ` ${labelPart} ${theme.border("┃")} ${valuePart}`;
        const rawLabel = label.padEnd(labelPadWidth);
        const rawContent = ` ${rawLabel} ┃ ${displayValue}`;
        const padding = Math.max(0, innerWidth - visibleLength(rawContent));
        return theme.border("┃") + leftContent + " ".repeat(padding) + theme.border("┃");
    };
    const bannerLines = [
        "    ________    ____  ____  ____      ____________________",
        "   / ____/ /   / __ \\/ __ \\/ __ \\    / / ____/ ____/_  __/",
        "  / __/ / /   / /_/ / /_/ / / / /_  / / __/ / /     / /   ",
        " / /___/ /___/ ____/ _, _/ /_/ / /_/ / /___/ /___  / /    ",
        "/_____/_____/_/   /_/ |_|\\____/\\____/_____/\\____/ /_/     "
    ];
    const developer = "Open Source - Developement - OmniRoute - Openai Compatible API";
    const padBanner = bannerLines.map((line, lineIdx) => {
        const centered = centerText(line);
        const colored = lolcatText(centered, 0.12, lineIdx * 0.45);
        return theme.border("┃") + colored + theme.border("┃");
    });
    const padDev = theme.border("┃") + picocolors_1.default.dim(theme.secondary(centerText(developer))) + theme.border("┃");
    console.log();
    console.log(borderTop);
    padBanner.forEach(line => console.log(line));
    console.log(padDev);
    console.log(borderMid);
    console.log(formatLine("Model", config.model, theme.success));
    console.log(formatLine("API Base URL", config.baseUrl || "Default (OpenAI)", theme.secondary));
    console.log(formatLine("Active Path", activePath, theme.primary));
    console.log(formatLine("Workspace Trust", trustStatusStr, config.isTrusted ? theme.success : theme.error));
    console.log(formatLine("File Access", permMode.toUpperCase(), permMode === "auto"
        ? theme.error
        : permMode === "ask"
            ? theme.secondary
            : theme.border));
    if (config.skillsCount !== undefined) {
        console.log(formatLine("Skills", `${config.skillsCount} Aktif`, theme.success));
    }
    console.log(formatLine("Platform", terminalLink(theme.primary("www.elproject.studio"), "https://www.elproject.studio"), picocolors_1.default.white));
    console.log(borderBottom);
    console.log();
}
function printHelp() {
    const theme = getTheme();
    const width = process.stdout.columns || 80;
    if (width < 50) {
        console.log(`  ${theme.primary("(@)")} ${theme.border("mention file")}`);
        console.log(`  ${theme.primary("(/)")} ${theme.border("menu utama")}`);
        console.log(`  ${theme.primary("(/skills)")} ${theme.border("kelola skill")}`);
        console.log(`  ${theme.secondary("(esc)")} ${theme.border("batal")}`);
    }
    else {
        console.log(picocolors_1.default.gray("  ") +
            theme.primary("(@)") + theme.border(" mention file ") +
            theme.primary("(/)") + theme.border(" menu utama ") +
            theme.primary("(/skills)") + theme.border(" kelola skill ") +
            theme.secondary("(esc)") + theme.border(" batal"));
    }
    console.log();
}
function printDivider(char = "─", color) {
    const theme = getTheme();
    const width = process.stdout.columns ? process.stdout.columns - 1 : 79;
    const col = color || theme.border;
    console.log(col(char.repeat(width)));
}
function printAIHeader(modelName) {
    const theme = getTheme();
    console.log();
    printDivider("┄", theme.border);
}
function printUserHeader() {
    const theme = getTheme();
    console.log();
    console.log(theme.primary(" You"));
    printDivider("┄", theme.border);
}
function printToolStart(toolName, details) {
    const theme = getTheme();
    console.log(`\n⚙️  ${theme.secondary(toolName)} ${picocolors_1.default.dim(details)}`);
}
function printToolSuccess(toolName, details) {
    const theme = getTheme();
    console.log(`✔️  ${theme.success(toolName)} ${theme.border(details)}`);
}
function printToolError(toolName, error) {
    const theme = getTheme();
    console.log(`❌  ${theme.error(toolName)} ${theme.error(error)}`);
}
function printContextInjection(files) {
    const theme = getTheme();
    const fileSummary = files
        ? files.map(f => `${theme.primary("@" + f.relativePath)} ${theme.border("(" + (f.sizeBytes < 1024 ? f.sizeBytes + "B" : (f.sizeBytes / 1024).toFixed(1) + "KB") + ")")}`).join(", ")
        : "";
    console.log(`📎 ${picocolors_1.default.bold(theme.accent("Context Injected"))} [${files.length} file]: ${fileSummary}`);
}
function printContextWarning(warning) {
    const theme = getTheme();
    console.log(`⚠️  ${theme.secondary("Context Notice:")} ${theme.border(warning)}`);
}
