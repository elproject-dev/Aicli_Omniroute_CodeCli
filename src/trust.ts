import fs from "fs";
import path from "path";
import os from "os";
import pc from "picocolors";
import { select, isCancel } from "@clack/prompts";

const CONFIG_DIR = path.join(os.homedir(), ".aicli");
const TRUST_FILE = path.join(CONFIG_DIR, "trusted_folders.json");

export interface TrustConfig {
  trustedFolders: string[];
}

export function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadTrustConfig(): TrustConfig {
  ensureConfigDir();
  if (fs.existsSync(TRUST_FILE)) {
    try {
      const data = fs.readFileSync(TRUST_FILE, "utf8");
      return JSON.parse(data);
    } catch {
      return { trustedFolders: [] };
    }
  }
  return { trustedFolders: [] };
}

export function saveTrustConfig(config: TrustConfig) {
  ensureConfigDir();
  fs.writeFileSync(TRUST_FILE, JSON.stringify(config, null, 2), "utf8");
}

export function isDirectoryTrusted(targetPath: string = process.cwd()): boolean {
  const normalizedTarget = path.resolve(targetPath);
  const config = loadTrustConfig();

  return config.trustedFolders.some((folder) => {
    const normalizedFolder = path.resolve(folder);
    return (
      normalizedTarget === normalizedFolder ||
      normalizedTarget.startsWith(normalizedFolder + path.sep)
    );
  });
}

export function addTrustedFolder(folderPath: string = process.cwd()): void {
  const normalizedFolder = path.resolve(folderPath);
  const config = loadTrustConfig();
  if (!config.trustedFolders.includes(normalizedFolder)) {
    config.trustedFolders.push(normalizedFolder);
    saveTrustConfig(config);
  }
}

export function removeTrustedFolder(folderPath: string = process.cwd()): void {
  const normalizedFolder = path.resolve(folderPath);
  const config = loadTrustConfig();
  config.trustedFolders = config.trustedFolders.filter(
    (f) => path.resolve(f) !== normalizedFolder
  );
  saveTrustConfig(config);
}

export function getTrustedFolders(): string[] {
  return loadTrustConfig().trustedFolders;
}

export async function promptWorkspaceTrust(currentPath: string = process.cwd()): Promise<boolean> {
  const resolvedPath = path.resolve(currentPath);

  console.log();
  console.log(pc.yellow("KONSEP WORKSPACE TRUST (KEAMANAN FOLDER)"));
  console.log(pc.gray("─".repeat(65)));
  console.log(
    pc.bold("Apakah Anda mempercayai penulis file di folder proyek ini?")
  );
  console.log(pc.gray(`Path: ${pc.cyan(resolvedPath)}`));
  console.log();
  console.log(
    pc.dim(
      "Memberikan kepercayaan pada folder ini memungkinkan AI untuk membaca,\n" +
      "meninjau, dan mengedit file di dalam direktori workspace ini secara aman."
    )
  );
  console.log(pc.gray("─".repeat(65)));
  console.log();

  const answer = await select({
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

  if (isCancel(answer) || answer === "untrust") {
    console.log(pc.red("\nFolder ditandai sebagai TIDAK DIPERCAYAI (Restricted Mode).\n"));
    return false;
  }

  if (answer === "trust") {
    addTrustedFolder(resolvedPath);
    console.log(pc.green(`\nFolder ${resolvedPath} berhasil ditambahkan ke daftar Trusted Folders!\n`));
    return true;
  }

  if (answer === "session") {
    console.log(pc.yellow(`\nFolder dipercayai khusus untuk sesi saat ini.\n`));
    return true;
  }

  return false;
}
