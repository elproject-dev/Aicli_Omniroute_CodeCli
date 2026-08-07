import pc from "picocolors";

export interface Theme {
  name: string;
  primary: (s: string) => string;
  secondary: (s: string) => string;
  success: (s: string) => string;
  warning: (s: string) => string;
  error: (s: string) => string;
  border: (s: string) => string;
  accent: (s: string) => string;
}

export const themes: Record<string, Theme> = {
  default: {
    name: "Default (Cyan & Gray)",
    primary: pc.cyan,
    secondary: pc.yellow,
    success: pc.green,
    warning: pc.yellow,
    error: pc.red,
    border: pc.gray,
    accent: pc.magenta
  },
  magenta: {
    name: "Neon Magenta (Magenta & Blue)",
    primary: pc.magenta,
    secondary: pc.cyan,
    success: pc.green,
    warning: pc.yellow,
    error: pc.red,
    border: pc.blue,
    accent: pc.cyan
  },
  emerald: {
    name: "Emerald Garden (Green & Gray)",
    primary: pc.green,
    secondary: pc.yellow,
    success: pc.green,
    warning: pc.yellow,
    error: pc.red,
    border: pc.gray,
    accent: pc.cyan
  },
  sunset: {
    name: "Sunset Glow (Yellow & Red)",
    primary: pc.yellow,
    secondary: pc.red,
    success: pc.green,
    warning: pc.yellow,
    error: pc.red,
    border: pc.red,
    accent: pc.magenta
  },
  ocean: {
    name: "Cool Ocean (Blue & Cyan)",
    primary: pc.blue,
    secondary: pc.cyan,
    success: pc.green,
    warning: pc.yellow,
    error: pc.red,
    border: pc.cyan,
    accent: pc.magenta
  },
  monochrome: {
    name: "Monochrome (White & Gray)",
    primary: pc.white,
    secondary: pc.white,
    success: pc.white,
    warning: pc.white,
    error: pc.white,
    border: pc.gray,
    accent: pc.white
  }
};

export function getTheme(): Theme {
  const selected = process.env.CLI_THEME || "default";
  return themes[selected] || themes.default;
}

/**
 * Membuat teks terminal yang bisa diklik untuk membuka URL di browser.
 * Menggunakan escape sequence hyperlink OSC 8 (\x1B]8;;URL\x07 ... \x1B]8;;\x07).
 * Bekerja di terminal yang mendukung hyperlinks (iTerm2, VSCode, Windows Terminal,
 * GNOME Terminal, WezTerm, Hyper, dll).
 */
export function terminalLink(text: string, url: string): string {
  return `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`;
}

export function printBanner() {}

function lolcatText(text: string, frequency: number = 0.1, seed: number = 0): string {
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

export function printDashboard(config: {
  model: string;
  baseUrl?: string;
  permissionMode?: string;
  isTrusted?: boolean;
  isCustomUrl?: boolean;
  activePath?: string;
}) {
  const terminalWidth = process.stdout.columns || 80;
  const theme = getTheme();

  const trustStatusStr = config.isTrusted ? "TRUSTED" : "RESTRICTED";
  const activePath = config.activePath || process.cwd();
  const permMode = config.permissionMode || "ask";

  if (terminalWidth < 50) {
    console.log();
    console.log(theme.primary(pc.bold("  AI OMNIROUTE CLI")));
    console.log(theme.secondary("  OpenAi Compatible API - OmniRoute Open Source"));
    printDivider("─", theme.border);

    const printLine = (label: string, value: string, colorVal: (s: string) => string = pc.white) => {
      console.log(`  ${theme.primary(label + ":")} ${colorVal(value)}`);
    };

    printLine("Model", config.model, theme.success);
    printLine("API Base URL", config.baseUrl || "Default (OpenAI)", theme.secondary);
    printLine("Active Path", activePath, theme.primary);
    printLine("Workspace Trust", trustStatusStr, config.isTrusted ? theme.success : theme.error);
    printLine("File Access", permMode.toUpperCase(), permMode === "auto" ? theme.error : permMode === "ask" ? theme.secondary : theme.border);
    printLine("Platform", terminalLink(theme.primary("www.elproject.studio"), "https://www.elproject.studio"), pc.white);
    printDivider("─", theme.border);
    console.log();
    return;
  }

  const boxWidth = Math.max(40, terminalWidth - 4);
  const innerWidth = boxWidth - 2;

  const borderTop = theme.border("┏" + "━".repeat(innerWidth) + "┓");
  const borderMid = theme.border("┣" + "━".repeat(innerWidth) + "┫");
  const borderBottom = theme.border("┗" + "━".repeat(innerWidth) + "┛");

  const centerText = (text: string) => {
    const leftPadding = Math.floor((innerWidth - text.length) / 2);
    const rightPadding = innerWidth - text.length - leftPadding;
    return " ".repeat(Math.max(0, leftPadding)) + text + " ".repeat(Math.max(0, rightPadding));
  };

  /**
   * Format satu baris dashboard dengan font/ukuran yang konsisten.
   * Label & value memakai weight yang sama (tanpa bold berlebih)
   * agar tampilan monospaced terminal tetap rapi.
   */
  const visibleLength = (s: string) =>
    s.replace(/\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*\x07)/g, "").length;

  const formatLine = (label: string, value: string, colorVal: (s: string) => string = pc.white) => {
    const labelPadWidth = 16;
    const maxValLen = Math.max(10, innerWidth - (labelPadWidth + 4));

    let displayValue = value;
    if (visibleLength(displayValue) > maxValLen) {
      if (displayValue.includes("/") || displayValue.includes("\\")) {
        displayValue = "…" + displayValue.slice(-(maxValLen - 1));
      } else {
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
  const padDev = theme.border("┃") + pc.dim(theme.secondary(centerText(developer))) + theme.border("┃");

  console.log();
  console.log(borderTop);
  padBanner.forEach(line => console.log(line));
  console.log(padDev);
  console.log(borderMid);
  console.log(formatLine("Model", config.model, theme.success));
  console.log(formatLine("API Base URL", config.baseUrl || "Default (OpenAI)", theme.secondary));
  console.log(formatLine("Active Path", activePath, theme.primary));
  console.log(
    formatLine(
      "Workspace Trust",
      trustStatusStr,
      config.isTrusted ? theme.success : theme.error
    )
  );
  console.log(
    formatLine(
      "File Access",
      permMode.toUpperCase(),
      permMode === "auto"
        ? theme.error
        : permMode === "ask"
          ? theme.secondary
          : theme.border
    )
  );
  console.log(formatLine("Platform", terminalLink(theme.primary("www.elproject.studio"), "https://www.elproject.studio"), pc.white));
  console.log(borderBottom);
  console.log();
}

export function printHelp() {
  const theme = getTheme();
  const width = process.stdout.columns || 80;
  if (width < 50) {
    console.log(`  ${theme.primary("(@)")} ${theme.border("mention file")}`);
    console.log(`  ${theme.primary("(/)")} ${theme.border("menu utama")}`);
    console.log(`  ${theme.secondary("(esc)")} ${theme.border("batal")}`);
  } else {
    console.log(
      pc.gray("  ") +
      theme.primary("(@)") + theme.border(" mention file ") +
      theme.primary("(/)") + theme.border(" menu utama ") +
      theme.secondary("(esc)") + theme.border(" batal")
    );
  }
  console.log();
}

export function printDivider(char = "─", color?: (s: string) => string) {
  const theme = getTheme();
  const width = process.stdout.columns ? process.stdout.columns - 1 : 79;
  const col = color || theme.border;
  console.log(col(char.repeat(width)));
}

export function printAIHeader(modelName: string) {
  const theme = getTheme();
  console.log();
  printDivider("┄", theme.border);
}

export function printUserHeader() {
  const theme = getTheme();
  console.log();
  console.log(theme.primary(" You"));
  printDivider("┄", theme.border);
}

export function printToolStart(toolName: string, details: string) {
  const theme = getTheme();
  console.log(`\n⚙️  ${theme.secondary(toolName)} ${pc.dim(details)}`);
}

export function printToolSuccess(toolName: string, details: string) {
  const theme = getTheme();
  console.log(`✔️  ${theme.success(toolName)} ${theme.border(details)}`);
}

export function printToolError(toolName: string, error: string) {
  const theme = getTheme();
  console.log(`❌  ${theme.error(toolName)} ${theme.error(error)}`);
}

export function printContextInjection(files: Array<{ relativePath: string; sizeBytes: number }>) {
  const theme = getTheme();
  const fileSummary = files
    ? files.map(f => `${theme.primary("@" + f.relativePath)} ${theme.border("(" + (f.sizeBytes < 1024 ? f.sizeBytes + "B" : (f.sizeBytes / 1024).toFixed(1) + "KB") + ")")}`).join(", ")
    : "";
  console.log(`📎 ${pc.bold(theme.accent("Context Injected"))} [${files.length} file]: ${fileSummary}`);
}

export function printContextWarning(warning: string) {
  const theme = getTheme();
  console.log(`⚠️  ${theme.secondary("Context Notice:")} ${theme.border(warning)}`);
}
