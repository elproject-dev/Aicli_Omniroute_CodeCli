#!/usr/bin/env node
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
const commander_1 = require("commander");
const dotenv = __importStar(require("dotenv"));
const picocolors_1 = __importDefault(require("picocolors"));
const chat_1 = require("./chat");
const skills_1 = require("./skills");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
dotenv.config({ quiet: true });
const globalEnvPath = path_1.default.join(os_1.default.homedir(), ".aicli", ".env");
if (fs_1.default.existsSync(globalEnvPath)) {
    dotenv.config({ path: globalEnvPath, quiet: true });
}
const pkgPath = path_1.default.resolve(__dirname, "..", "package.json");
let pkgVersion = "1.1.0";
try {
    if (fs_1.default.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, "utf8"));
        if (pkg.version)
            pkgVersion = pkg.version;
    }
}
catch { }
commander_1.program
    .name("aicli")
    .description("AI CLI built with Node.js, compatible with OpenAI API")
    .version(pkgVersion);
commander_1.program
    .command("init [folder]")
    .description("Inisialisasi folder kerja terisolasi untuk AICLI (default: ai-cli)")
    .action((folder = "ai-cli") => {
    const targetPath = path_1.default.resolve(process.cwd(), folder);
    if (!fs_1.default.existsSync(targetPath)) {
        fs_1.default.mkdirSync(targetPath, { recursive: true });
        console.log(`\x1b[32m✓ Berhasil membuat folder: ${folder}\x1b[0m`);
    }
    else {
        console.log(`\x1b[33mℹ Folder '${folder}' sudah ada.\x1b[0m`);
    }
    const envSample = path_1.default.join(targetPath, ".env.example");
    if (!fs_1.default.existsSync(envSample)) {
        fs_1.default.writeFileSync(envSample, `OPENAI_API_KEY=""\nOPENAI_BASE_URL="https://api.openai.com/v1"\nOPENAI_MODEL="gpt-4o"\n`);
    }
    const readmeSample = path_1.default.join(targetPath, "README.md");
    if (!fs_1.default.existsSync(readmeSample)) {
        fs_1.default.writeFileSync(readmeSample, `# Workspace AI-CLI\n\nDirektori kerja terisolasi untuk sesi AICLI.\n`);
    }
    console.log(`\x1b[36m📁 Folder ${folder} siap digunakan!\x1b[0m`);
    console.log(`Jalankan perintah berikut untuk mulai:\n  cd ${folder} && aicli\n`);
});
commander_1.program
    .command("skills [action] [target] [description]")
    .alias("skill")
    .description("Kelola skill AI (list | info <nama> | install <source> | create <nama> [deskripsi])")
    .option("-g, --global", "Simpan di direktori global (~/.aicli/skills)")
    .option("-d, --skills-dir <dir>", "Direktori skill tambahan")
    .action((action = "list", target, description, cmdOpts) => {
    const act = action.toLowerCase();
    if (act === "list" || act === "ls") {
        const skills = (0, skills_1.loadAllSkills)(process.cwd(), cmdOpts?.skillsDir);
        console.log(picocolors_1.default.bold(picocolors_1.default.cyan(`\nDAFTAR SKILL (${skills.length} terinstal)\n`)));
        if (skills.length === 0) {
            console.log(picocolors_1.default.gray("  Belum ada skill yang terinstal."));
        }
        else {
            const maxNameWidth = Math.min(26, Math.max(...skills.map(s => s.name.length), 12));
            skills.forEach((s, i) => {
                const numStr = String(i + 1).padStart(2, " ") + ".";
                const nameStr = s.name.padEnd(maxNameWidth, " ");
                const shortDesc = s.description.length > 85 ? s.description.slice(0, 82) + "..." : s.description;
                console.log(`  ${picocolors_1.default.gray(numStr)} ${picocolors_1.default.cyan(nameStr)}  ${picocolors_1.default.dim(`[${s.source}]`)}`);
                console.log(`      ${picocolors_1.default.gray(shortDesc)}`);
            });
            console.log();
        }
        return;
    }
    if (act === "info" || act === "show") {
        if (!target) {
            console.log(picocolors_1.default.yellow("\nContoh: aicli skills info code-review\n"));
            return;
        }
        const skill = (0, skills_1.readSkillContent)(target, process.cwd(), cmdOpts?.skillsDir);
        if (!skill) {
            console.log(picocolors_1.default.red(`\nSkill '${target}' tidak ditemukan.\n`));
            return;
        }
        console.log(picocolors_1.default.bold(picocolors_1.default.cyan(`\n${skill.name}`)), picocolors_1.default.dim(`[${skill.source}]`));
        console.log(picocolors_1.default.gray(`Lokasi : ${skill.path}`));
        if (skill.resources && skill.resources.length > 0) {
            console.log(picocolors_1.default.gray(`File   : ${skill.resources.join(", ")}`));
        }
        console.log(picocolors_1.default.gray("─".repeat(60)));
        console.log(skill.content || "(Kosong)");
        console.log(picocolors_1.default.gray("─".repeat(60)) + "\n");
        return;
    }
    if (act === "install" || act === "add") {
        if (!target) {
            console.log(picocolors_1.default.yellow("\nContoh: aicli skills install owner/repo\n"));
            return;
        }
        const isGlobal = cmdOpts?.global !== undefined ? cmdOpts.global : true;
        console.log(picocolors_1.default.cyan(`\nMenginstal skill dari '${target}'...`));
        const res = (0, skills_1.installSkill)(target, isGlobal, process.cwd());
        if (res.success) {
            console.log(picocolors_1.default.green(`${res.message}\n`));
        }
        else {
            console.log(picocolors_1.default.red(`${res.message}\n`));
        }
        return;
    }
    if (act === "create" || act === "new") {
        if (!target) {
            console.log(picocolors_1.default.yellow("\nContoh: aicli skills create api-test \"Panduan testing API\"\n"));
            return;
        }
        const isGlobal = Boolean(cmdOpts?.global);
        const created = (0, skills_1.createSkillTemplate)(target, description || "", isGlobal, process.cwd());
        console.log(picocolors_1.default.green(`\nSkill dibuat di: ${picocolors_1.default.cyan(created)}\n`));
        return;
    }
    const skill = (0, skills_1.readSkillContent)(action, process.cwd(), cmdOpts?.skillsDir);
    if (skill) {
        console.log(picocolors_1.default.bold(picocolors_1.default.cyan(`\n${skill.name}`)), picocolors_1.default.dim(`[${skill.source}]`));
        console.log(picocolors_1.default.gray(`Lokasi : ${skill.path}`));
        console.log(picocolors_1.default.gray("─".repeat(60)));
        console.log(skill.content || "(Kosong)");
        console.log(picocolors_1.default.gray("─".repeat(60)) + "\n");
    }
    else {
        console.log(picocolors_1.default.yellow(`\nPerintah tidak dikenal: ${action}. Gunakan: list, info, install, atau create.\n`));
    }
});
commander_1.program
    .command("chat", { isDefault: true })
    .description("Start an interactive chat session with the AI agent")
    .option("-m, --model <model>", "Model to use", process.env.OPENAI_MODEL || "gpt-3.5-turbo")
    .option("-s, --system <prompt>", "System prompt", "You are a helpful AI assistant.")
    .option("-b, --base-url <url>", "Base URL for OpenAI-compatible API")
    .option("-k, --api-key <key>", "API Key for the service")
    .option("-d, --skills-dir <dir>", "Custom directory to load additional AI skills from")
    .action(async (options) => {
    await (0, chat_1.startChat)(options);
});
commander_1.program.parse(process.argv);
