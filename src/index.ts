#!/usr/bin/env node

import { program } from "commander";
import * as dotenv from "dotenv";
import pc from "picocolors";
import { startChat } from "./chat";
import {
  loadAllSkills,
  readSkillContent,
  createSkillTemplate,
  installSkill
} from "./skills";
import fs from "fs";
import path from "path";
import os from "os";

dotenv.config({ quiet: true });
const globalEnvPath = path.join(os.homedir(), ".aicli", ".env");
if (fs.existsSync(globalEnvPath)) {
  dotenv.config({ path: globalEnvPath, quiet: true });
}

const pkgPath = path.resolve(__dirname, "..", "package.json");
let pkgVersion = "1.1.0";
try {
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.version) pkgVersion = pkg.version;
  }
} catch {}

program
  .name("aicli")
  .description("AI CLI built with Node.js, compatible with OpenAI API")
  .version(pkgVersion);

program
  .command("init [folder]")
  .description("Inisialisasi folder kerja terisolasi untuk AICLI (default: ai-cli)")
  .action((folder = "ai-cli") => {
    const targetPath = path.resolve(process.cwd(), folder);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log(`\x1b[32m✓ Berhasil membuat folder: ${folder}\x1b[0m`);
    } else {
      console.log(`\x1b[33mℹ Folder '${folder}' sudah ada.\x1b[0m`);
    }

    const envSample = path.join(targetPath, ".env.example");
    if (!fs.existsSync(envSample)) {
      fs.writeFileSync(
        envSample,
        `OPENAI_API_KEY=""\nOPENAI_BASE_URL="https://api.openai.com/v1"\nOPENAI_MODEL="gpt-4o"\n`
      );
    }

    const readmeSample = path.join(targetPath, "README.md");
    if (!fs.existsSync(readmeSample)) {
      fs.writeFileSync(
        readmeSample,
        `# Workspace AI-CLI\n\nDirektori kerja terisolasi untuk sesi AICLI.\n`
      );
    }

    console.log(`\x1b[36m📁 Folder ${folder} siap digunakan!\x1b[0m`);
    console.log(`Jalankan perintah berikut untuk mulai:\n  cd ${folder} && aicli\n`);
  });

program
  .command("skills [action] [target] [description]")
  .alias("skill")
  .description("Kelola skill AI (list | info <nama> | install <source> | create <nama> [deskripsi])")
  .option("-g, --global", "Simpan di direktori global (~/.aicli/skills)")
  .option("-d, --skills-dir <dir>", "Direktori skill tambahan")
  .action((action = "list", target?: string, description?: string, cmdOpts?: { global?: boolean; skillsDir?: string }) => {
    const act = action.toLowerCase();

    if (act === "list" || act === "ls") {
      const skills = loadAllSkills(process.cwd(), cmdOpts?.skillsDir);
      console.log(pc.bold(pc.cyan(`\nDAFTAR SKILL (${skills.length} terinstal)\n`)));
      if (skills.length === 0) {
        console.log(pc.gray("  Belum ada skill yang terinstal."));
      } else {
        const maxNameWidth = Math.min(26, Math.max(...skills.map(s => s.name.length), 12));
        skills.forEach((s, i) => {
          const numStr = String(i + 1).padStart(2, " ") + ".";
          const nameStr = s.name.padEnd(maxNameWidth, " ");
          const shortDesc = s.description.length > 85 ? s.description.slice(0, 82) + "..." : s.description;
          console.log(`  ${pc.gray(numStr)} ${pc.cyan(nameStr)}  ${pc.dim(`[${s.source}]`)}`);
          console.log(`      ${pc.gray(shortDesc)}`);
        });
        console.log();
      }
      return;
    }

    if (act === "info" || act === "show") {
      if (!target) {
        console.log(pc.yellow("\nContoh: aicli skills info code-review\n"));
        return;
      }
      const skill = readSkillContent(target, process.cwd(), cmdOpts?.skillsDir);
      if (!skill) {
        console.log(pc.red(`\nSkill '${target}' tidak ditemukan.\n`));
        return;
      }
      console.log(pc.bold(pc.cyan(`\n${skill.name}`)), pc.dim(`[${skill.source}]`));
      console.log(pc.gray(`Lokasi : ${skill.path}`));
      if (skill.resources && skill.resources.length > 0) {
        console.log(pc.gray(`File   : ${skill.resources.join(", ")}`));
      }
      console.log(pc.gray("─".repeat(60)));
      console.log(skill.content || "(Kosong)");
      console.log(pc.gray("─".repeat(60)) + "\n");
      return;
    }

    if (act === "install" || act === "add") {
      if (!target) {
        console.log(pc.yellow("\nContoh: aicli skills install owner/repo\n"));
        return;
      }
      const isGlobal = cmdOpts?.global !== undefined ? cmdOpts.global : true;
      console.log(pc.cyan(`\nMenginstal skill dari '${target}'...`));
      const res = installSkill(target, isGlobal, process.cwd());
      if (res.success) {
        console.log(pc.green(`${res.message}\n`));
      } else {
        console.log(pc.red(`${res.message}\n`));
      }
      return;
    }

    if (act === "create" || act === "new") {
      if (!target) {
        console.log(pc.yellow("\nContoh: aicli skills create api-test \"Panduan testing API\"\n"));
        return;
      }
      const isGlobal = Boolean(cmdOpts?.global);
      const created = createSkillTemplate(target, description || "", isGlobal, process.cwd());
      console.log(pc.green(`\nSkill dibuat di: ${pc.cyan(created)}\n`));
      return;
    }

    const skill = readSkillContent(action, process.cwd(), cmdOpts?.skillsDir);
    if (skill) {
      console.log(pc.bold(pc.cyan(`\n${skill.name}`)), pc.dim(`[${skill.source}]`));
      console.log(pc.gray(`Lokasi : ${skill.path}`));
      console.log(pc.gray("─".repeat(60)));
      console.log(skill.content || "(Kosong)");
      console.log(pc.gray("─".repeat(60)) + "\n");
    } else {
      console.log(pc.yellow(`\nPerintah tidak dikenal: ${action}. Gunakan: list, info, install, atau create.\n`));
    }
  });

program
  .command("chat", { isDefault: true })
  .description("Start an interactive chat session with the AI agent")
  .option("-m, --model <model>", "Model to use", process.env.OPENAI_MODEL || "gpt-3.5-turbo")
  .option("-s, --system <prompt>", "System prompt", "You are a helpful AI assistant.")
  .option("-b, --base-url <url>", "Base URL for OpenAI-compatible API")
  .option("-k, --api-key <key>", "API Key for the service")
  .option("-d, --skills-dir <dir>", "Custom directory to load additional AI skills from")
  .action(async (options) => {
    await startChat(options);
  });

program.parse(process.argv);
