"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_SKILLS_DIR = void 0;
exports.parseSkillFile = parseSkillFile;
exports.scanDirForSkills = scanDirForSkills;
exports.ensureDefaultSkills = ensureDefaultSkills;
exports.loadAllSkills = loadAllSkills;
exports.isPathInsideInstalledSkill = isPathInsideInstalledSkill;
exports.formatSkillsForSystemPrompt = formatSkillsForSystemPrompt;
exports.readSkillContent = readSkillContent;
exports.formatActivatedSkillOutput = formatActivatedSkillOutput;
exports.createSkillTemplate = createSkillTemplate;
exports.installSkill = installSkill;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const HOME_DIR = os_1.default.homedir();
exports.GLOBAL_SKILLS_DIR = path_1.default.join(HOME_DIR, ".aicli", "skills");
/**
 * Daftar direktori global tempat skill biasanya diinstal oleh berbagai ekosistem AI Agent
 */
function getGlobalSkillSources() {
    return [
        { dir: path_1.default.join(HOME_DIR, ".gemini", "antigravity-cli", "builtin", "skills"), source: "Antigravity Builtin" },
        { dir: path_1.default.join(HOME_DIR, ".gemini", "antigravity-cli", "skills"), source: "Antigravity CLI" },
        { dir: path_1.default.join(HOME_DIR, ".gemini", "antigravity", "skills"), source: "Antigravity" },
        { dir: path_1.default.join(HOME_DIR, ".gemini", "skills"), source: "Gemini Global" },
        { dir: path_1.default.join(HOME_DIR, ".claude", "skills"), source: "Claude Global" },
        { dir: path_1.default.join(HOME_DIR, ".cursor", "skills"), source: "Cursor Global" },
        { dir: path_1.default.join(HOME_DIR, ".codex", "skills"), source: "Codex Global" },
        { dir: path_1.default.join(HOME_DIR, ".windsurf", "skills"), source: "Windsurf Global" },
        { dir: path_1.default.join(HOME_DIR, ".roo", "skills"), source: "Roo Global" },
        { dir: path_1.default.join(HOME_DIR, ".agents", "skills"), source: "Agents Global" },
        { dir: path_1.default.join(HOME_DIR, ".agent", "skills"), source: "Agent Global" },
        { dir: exports.GLOBAL_SKILLS_DIR, source: "AICLI Global" }
    ];
}
/**
 * Daftar direktori workspace lokal tempat skill proyek disimpan
 */
function getWorkspaceSkillSources(workspaceDir) {
    return [
        { dir: path_1.default.join(workspaceDir, ".gemini", "skills"), source: "Workspace (.gemini)" },
        { dir: path_1.default.join(workspaceDir, ".claude", "skills"), source: "Workspace (.claude)" },
        { dir: path_1.default.join(workspaceDir, ".cursor", "skills"), source: "Workspace (.cursor)" },
        { dir: path_1.default.join(workspaceDir, ".codex", "skills"), source: "Workspace (.codex)" },
        { dir: path_1.default.join(workspaceDir, ".windsurf", "skills"), source: "Workspace (.windsurf)" },
        { dir: path_1.default.join(workspaceDir, ".roo", "skills"), source: "Workspace (.roo)" },
        { dir: path_1.default.join(workspaceDir, ".github", "skills"), source: "Workspace (.github)" },
        { dir: path_1.default.join(workspaceDir, ".agents", "skills"), source: "Workspace (.agents)" },
        { dir: path_1.default.join(workspaceDir, ".agent", "skills"), source: "Workspace (.agent)" },
        { dir: path_1.default.join(workspaceDir, ".aicli", "skills"), source: "Workspace (.aicli)" },
        { dir: path_1.default.join(workspaceDir, "skills"), source: "Workspace (./skills)" }
    ];
}
/**
 * Mendapatkan daftar file pendukung di dalam folder skill (scripts, references, docs, examples, dll)
 */
function listSkillResources(skillDir, mainSkillFile, maxFiles = 40) {
    const resources = [];
    const mainFileAbs = path_1.default.resolve(mainSkillFile);
    function walk(currentDir, depth) {
        if (depth > 4 || resources.length >= maxFiles)
            return;
        let entries = [];
        try {
            entries = fs_1.default.readdirSync(currentDir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (resources.length >= maxFiles)
                break;
            if (entry.name.startsWith(".") || entry.name === "node_modules")
                continue;
            const fullPath = path_1.default.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath, depth + 1);
            }
            else if (entry.isFile() && path_1.default.resolve(fullPath) !== mainFileAbs) {
                resources.push(path_1.default.relative(skillDir, fullPath));
            }
        }
    }
    walk(skillDir, 1);
    return resources;
}
/**
 * Parsing file SKILL.md untuk mengekstrak metadata (nama, deskripsi) dan konten.
 * Mendukung format YAML Frontmatter (termasuk multiline description dengan > atau |):
 * ---
 * name: my-skill
 * description: Penjelasan skill
 * ---
 */
function parseSkillFile(filePath, isGlobal, source = isGlobal ? "Global" : "Workspace") {
    try {
        if (!fs_1.default.existsSync(filePath))
            return null;
        const raw = fs_1.default.readFileSync(filePath, "utf8");
        const dirPath = path_1.default.dirname(path_1.default.resolve(filePath));
        let name = path_1.default.basename(dirPath);
        if (name === "." ||
            name === "skills" ||
            (filePath.endsWith(".md") && !/^(SKILL|skill|README)\.md$/.test(path_1.default.basename(filePath)))) {
            name = path_1.default.basename(filePath, path_1.default.extname(filePath));
        }
        let description = "Keahlian kustom AI";
        let body = raw;
        // Cek YAML frontmatter
        const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            body = frontmatterMatch[2].trim();
            const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
            if (nameMatch) {
                const parsedName = nameMatch[1].trim().replace(/^["']|["']$/g, "");
                if (parsedName && !parsedName.startsWith(">") && !parsedName.startsWith("|")) {
                    name = parsedName;
                }
            }
            // Cek apakah description menggunakan multiline YAML (> atau |) atau satu baris
            const descLineMatch = frontmatter.match(/^description:\s*(.*)$/m);
            if (descLineMatch) {
                const firstPart = descLineMatch[1].trim();
                if (firstPart === ">" || firstPart === "|" || firstPart === ">-" || firstPart === "|-") {
                    const afterDesc = frontmatter.slice((descLineMatch.index || 0) + descLineMatch[0].length);
                    const multilineParts = [];
                    for (const line of afterDesc.split(/\r?\n/)) {
                        if (/^\s+\S/.test(line)) {
                            multilineParts.push(line.trim());
                        }
                        else if (line.trim() === "") {
                            continue;
                        }
                        else {
                            break;
                        }
                    }
                    if (multilineParts.length > 0) {
                        description = multilineParts.join(" ").trim();
                    }
                }
                else if (firstPart.length > 0) {
                    description = firstPart.replace(/^["']|["']$/g, "");
                }
            }
        }
        else {
            // Ambil baris teks deskriptif pertama setelah heading
            const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
                if (!line.startsWith("#")) {
                    description = line.slice(0, 150);
                    break;
                }
            }
        }
        const resources = listSkillResources(dirPath, filePath);
        return {
            name,
            description,
            path: path_1.default.resolve(filePath),
            dirPath,
            isGlobal,
            source,
            content: body,
            resources
        };
    }
    catch {
        return null;
    }
}
/**
 * Scan folder untuk menemukan skills (bisa berupa subfolder berisi SKILL.md atau file .md langsung)
 */
function scanDirForSkills(dirPath, isGlobal, source) {
    const skills = [];
    if (!fs_1.default.existsSync(dirPath))
        return skills;
    try {
        const entries = fs_1.default.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith("."))
                continue;
            const fullPath = path_1.default.join(dirPath, entry.name);
            let isDir = entry.isDirectory();
            let isFile = entry.isFile();
            // Dukung symlink ke direktori atau file skill (misalnya dari npx skills)
            if (entry.isSymbolicLink()) {
                try {
                    const targetStat = fs_1.default.statSync(fullPath);
                    isDir = targetStat.isDirectory();
                    isFile = targetStat.isFile();
                }
                catch {
                    continue;
                }
            }
            if (isDir) {
                const candidateFiles = ["SKILL.md", "skill.md", "README.md"];
                for (const candidate of candidateFiles) {
                    const candidatePath = path_1.default.join(fullPath, candidate);
                    if (fs_1.default.existsSync(candidatePath)) {
                        const parsed = parseSkillFile(candidatePath, isGlobal, source);
                        if (parsed) {
                            skills.push(parsed);
                            break;
                        }
                    }
                }
            }
            else if (isFile && entry.name.endsWith(".md")) {
                const parsed = parseSkillFile(fullPath, isGlobal, source);
                if (parsed) {
                    skills.push(parsed);
                }
            }
        }
    }
    catch { }
    return skills;
}
/**
 * Scan node_modules di workspace untuk menemukan paket NPM yang menyertakan folder `skills/`
 * (contoh: paket seperti `dotenv` yang mendistribusikan `node_modules/dotenv/skills/<name>/SKILL.md`)
 */
function scanNodeModulesForSkills(workspaceDir) {
    const skills = [];
    const nodeModulesDir = path_1.default.join(workspaceDir, "node_modules");
    if (!fs_1.default.existsSync(nodeModulesDir))
        return skills;
    try {
        const entries = fs_1.default.readdirSync(nodeModulesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith(".") && entry.name !== ".pnpm")
                continue;
            if (entry.name === ".pnpm")
                continue; // Hindari duplikasi, baca dari top-level node_modules
            const fullPath = path_1.default.join(nodeModulesDir, entry.name);
            if (entry.name.startsWith("@")) {
                // Scoped package: @scope/pkg/skills
                try {
                    const scopedEntries = fs_1.default.readdirSync(fullPath, { withFileTypes: true });
                    for (const sub of scopedEntries) {
                        const pkgSkillsDir = path_1.default.join(fullPath, sub.name, "skills");
                        if (fs_1.default.existsSync(pkgSkillsDir)) {
                            const found = scanDirForSkills(pkgSkillsDir, false, `NPM (${entry.name}/${sub.name})`);
                            skills.push(...found);
                        }
                    }
                }
                catch { }
            }
            else {
                const pkgSkillsDir = path_1.default.join(fullPath, "skills");
                if (fs_1.default.existsSync(pkgSkillsDir)) {
                    const found = scanDirForSkills(pkgSkillsDir, false, `NPM (${entry.name})`);
                    skills.push(...found);
                }
            }
        }
    }
    catch { }
    return skills;
}
/**
 * Menyiapkan skill default bawaan jika belum ada di ~/.aicli/skills
 */
function ensureDefaultSkills() {
    try {
        if (!fs_1.default.existsSync(exports.GLOBAL_SKILLS_DIR)) {
            fs_1.default.mkdirSync(exports.GLOBAL_SKILLS_DIR, { recursive: true });
        }
        // 1. Skill Code Review
        const reviewDir = path_1.default.join(exports.GLOBAL_SKILLS_DIR, "code-review");
        const reviewFile = path_1.default.join(reviewDir, "SKILL.md");
        if (!fs_1.default.existsSync(reviewFile)) {
            fs_1.default.mkdirSync(reviewDir, { recursive: true });
            fs_1.default.writeFileSync(reviewFile, `---
name: code-review
description: Lakukan audit dan review kode secara mendalam untuk menemukan bug, celah keamanan, dan perbaikan performa
---
# Panduan Skill: Code Review
Ketika pengguna meminta review atau evaluasi kode:
1. Periksa struktur arsitektur, clean code, dan keterbacaan (maintainability).
2. Cari potensi bug (edge cases, unhandled promises, memory leak).
3. Evaluasi keamanan (validasi input, sanitisasi, kebocoran secret).
4. Berikan saran konkret dengan contoh potongan kode sebelum dan sesudah.
`);
        }
        // 2. Skill Git Workflow
        const gitDir = path_1.default.join(exports.GLOBAL_SKILLS_DIR, "git-workflow");
        const gitFile = path_1.default.join(gitDir, "SKILL.md");
        if (!fs_1.default.existsSync(gitFile)) {
            fs_1.default.mkdirSync(gitDir, { recursive: true });
            fs_1.default.writeFileSync(gitFile, `---
name: git-workflow
description: Panduan pembuatan commit konvensional, pengelolaan branch, dan penyusunan ringkasan perubahan
---
# Panduan Skill: Git Workflow
Ketika membantu pengguna dengan git:
1. Gunakan Conventional Commits: \`feat:\`, \`fix:\`, \`refactor:\`, \`docs:\`, \`chore:\`, \`test:\`.
2. Pastikan pesan commit ringkas dan menjelaskan 'mengapa' bukan hanya 'apa'.
3. Sebelum commit, sarankan untuk memverifikasi diff terlebih dahulu.
`);
        }
    }
    catch { }
}
/**
 * Mengambil seluruh skill yang sudah diinstal dari berbagai lokasi:
 * 1. Global Ecosystem (Antigravity, Gemini, Claude, Cursor, Agents, AICLI Global)
 * 2. NPM Packages di node_modules yang menyediakan skills
 * 3. Workspace project (.gemini/skills, .claude/skills, .agents/skills, .aicli/skills, ./skills)
 * 4. Custom directory (via opsi CLI --skills-dir atau env AICLI_SKILLS_DIR)
 */
function loadAllSkills(workspaceDir = process.cwd(), customDir) {
    ensureDefaultSkills();
    const skillsMap = new Map();
    // 1. Global sources
    for (const src of getGlobalSkillSources()) {
        const found = scanDirForSkills(src.dir, true, src.source);
        for (const s of found) {
            skillsMap.set(s.name.toLowerCase(), s);
        }
    }
    // 2. NPM Package skills in workspace node_modules
    const npmSkills = scanNodeModulesForSkills(workspaceDir);
    for (const s of npmSkills) {
        skillsMap.set(s.name.toLowerCase(), s);
    }
    // 3. Workspace sources (override global jika nama sama)
    for (const src of getWorkspaceSkillSources(workspaceDir)) {
        const found = scanDirForSkills(src.dir, false, src.source);
        for (const s of found) {
            skillsMap.set(s.name.toLowerCase(), s);
        }
    }
    // 4. Custom directory (override semua jika ditentukan)
    const finalCustomDir = customDir || process.env.AICLI_SKILLS_DIR;
    if (finalCustomDir) {
        const customPath = path_1.default.resolve(workspaceDir, finalCustomDir);
        const customSkills = scanDirForSkills(customPath, false, `Custom (${finalCustomDir})`);
        for (const s of customSkills) {
            skillsMap.set(s.name.toLowerCase(), s);
        }
    }
    return Array.from(skillsMap.values());
}
/**
 * Mengecek apakah sebuah path file berada di dalam direktori salah satu skill yang terinstal.
 * Digunakan agar tool `read_file` dan `list_dir` diizinkan membaca file referensi/dokumen skill.
 */
function isPathInsideInstalledSkill(targetPath, workspaceDir = process.cwd(), customDir) {
    const resolvedTarget = path_1.default.resolve(workspaceDir, targetPath);
    const allSkills = loadAllSkills(workspaceDir, customDir);
    for (const skill of allSkills) {
        const skillDir = path_1.default.resolve(skill.dirPath);
        if (resolvedTarget === skillDir ||
            resolvedTarget.startsWith(skillDir + path_1.default.sep) ||
            resolvedTarget === path_1.default.resolve(skill.path)) {
            return true;
        }
    }
    return false;
}
/**
 * Format daftar skills untuk disisipkan ke dalam System Prompt
 */
function formatSkillsForSystemPrompt(skills, activeSkillNames = []) {
    if (skills.length === 0)
        return "";
    let prompt = `\n\n<available_skills>\n`;
    prompt += `Anda memiliki akses ke ${skills.length} Keahlian Khusus (Installed Skills).\n`;
    prompt += `ATURAN PENGGUNAAN SKILL:\n`;
    prompt += `1. Jika permintaan pengguna berkaitan dengan salah satu skill di bawah ini, Anda WAJIB memanggil tool \`activate_skill\` dengan parameter \`skillName\` yang sesuai terlebih dahulu untuk membaca instruksi lengkapnya sebelum mengeksekusi tugas.\n`;
    prompt += `2. Jika sebuah skill memiliki file referensi atau skrip tambahan di dalam foldernya, Anda dapat membacanya menggunakan \`read_file\` atau melihat isinya dengan \`list_dir\`.\n\n`;
    prompt += `Daftar Skill yang Tersedia:\n`;
    for (const s of skills) {
        const shortDesc = s.description.length > 180 ? s.description.slice(0, 177) + "..." : s.description;
        prompt += `- **${s.name}** [${s.source}]: ${shortDesc}\n`;
    }
    prompt += `</available_skills>\n`;
    // Jika ada skill yang sedang di-pin / diaktifkan secara eksplisit oleh user
    if (activeSkillNames.length > 0) {
        for (const activeName of activeSkillNames) {
            const skill = skills.find(s => s.name.toLowerCase() === activeName.toLowerCase());
            if (skill && skill.content) {
                prompt += `\n<active_skill name="${skill.name}" path="${skill.dirPath}">\n`;
                prompt += `Instruksi Skill Aktif (${skill.name}):\n${skill.content}\n`;
                if (skill.resources && skill.resources.length > 0) {
                    prompt += `\nFile Referensi/Pendukung di ${skill.dirPath}:\n`;
                    for (const res of skill.resources) {
                        prompt += `- ${path_1.default.join(skill.dirPath, res)}\n`;
                    }
                }
                prompt += `</active_skill>\n`;
            }
        }
    }
    return prompt;
}
/**
 * Membaca konten instruksi lengkap dari skill berdasarkan namanya
 */
function readSkillContent(skillName, workspaceDir = process.cwd(), customDir) {
    const all = loadAllSkills(workspaceDir, customDir);
    const cleanQuery = skillName.trim().toLowerCase();
    // Cari kecocokan persis terlebih dahulu, lalu partial match jika tidak ketemu
    let found = all.find(s => s.name.toLowerCase() === cleanQuery);
    if (!found) {
        found = all.find(s => s.name.toLowerCase().replace(/[-_]/g, "") === cleanQuery.replace(/[-_]/g, "") ||
            s.name.toLowerCase().includes(cleanQuery));
    }
    if (!found)
        return null;
    if (!found.content && fs_1.default.existsSync(found.path)) {
        const reparsed = parseSkillFile(found.path, found.isGlobal, found.source);
        if (reparsed) {
            found = reparsed;
        }
        else {
            found.content = fs_1.default.readFileSync(found.path, "utf8");
        }
    }
    return found;
}
/**
 * Format payload hasil aktivasi skill untuk dikirim ke AI melalui tool `activate_skill`
 */
function formatActivatedSkillOutput(skill) {
    let out = `# Skill Activated: ${skill.name}\n`;
    out += `- **Source**: ${skill.source}\n`;
    out += `- **Skill File**: ${skill.path}\n`;
    out += `- **Skill Directory**: ${skill.dirPath}\n`;
    out += `- **Description**: ${skill.description}\n\n`;
    out += `## Instructions (SKILL.md)\n\n${skill.content || "(No content)"}\n`;
    if (skill.resources && skill.resources.length > 0) {
        out += `\n## Companion Files in Skill Directory\n`;
        out += `You can read any of these files using \`read_file\` with their full path:\n`;
        for (const res of skill.resources) {
            out += `- \`${path_1.default.join(skill.dirPath, res)}\`\n`;
        }
    }
    return out;
}
/**
 * Membuat skill baru dengan template SKILL.md
 */
function createSkillTemplate(name, description, isGlobal, workspaceDir = process.cwd()) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/^-+|-+$/g, "") || "custom-skill";
    const targetParent = isGlobal ? exports.GLOBAL_SKILLS_DIR : path_1.default.join(workspaceDir, "skills");
    const skillFolder = path_1.default.join(targetParent, cleanName);
    const skillFile = path_1.default.join(skillFolder, "SKILL.md");
    if (!fs_1.default.existsSync(skillFolder)) {
        fs_1.default.mkdirSync(skillFolder, { recursive: true });
    }
    const template = `---
name: ${cleanName}
description: ${description || "Deskripsi kemampuan khusus"}
---

# Panduan Skill: ${cleanName}

## Deskripsi
${description || "Jelaskan tujuan dan fungsi skill ini."}

## Prosedur & Langkah Kerja
1. Langkah pertama yang harus dilakukan AI.
2. Langkah kedua dalam mengeksekusi tugas.
3. Kriteria penyelesaian tugas.

## Contoh Penggunaan
Contoh perintah atau skenario yang cocok untuk skill ini.
`;
    fs_1.default.writeFileSync(skillFile, template, "utf8");
    return skillFile;
}
/**
 * Menyalin direktori secara rekursif
 */
function copyDirRecursive(src, dest) {
    if (!fs_1.default.existsSync(dest)) {
        fs_1.default.mkdirSync(dest, { recursive: true });
    }
    const entries = fs_1.default.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === ".git" || entry.name === "node_modules")
            continue;
        const srcPath = path_1.default.join(src, entry.name);
        const destPath = path_1.default.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        }
        else if (entry.isFile()) {
            fs_1.default.copyFileSync(srcPath, destPath);
        }
    }
}
/**
 * Menginstal skill dari path lokal, repositori GitHub (owner/repo atau URL), atau via npx skills
 */
function installSkill(sourceInput, isGlobal = true, workspaceDir = process.cwd()) {
    const targetBaseDir = isGlobal ? exports.GLOBAL_SKILLS_DIR : path_1.default.join(workspaceDir, "skills");
    if (!fs_1.default.existsSync(targetBaseDir)) {
        fs_1.default.mkdirSync(targetBaseDir, { recursive: true });
    }
    const trimmed = sourceInput.trim();
    const localCandidate = path_1.default.resolve(workspaceDir, trimmed);
    // 1. Cek apakah source adalah path lokal yang ada di sistem
    if (fs_1.default.existsSync(localCandidate)) {
        try {
            const stat = fs_1.default.statSync(localCandidate);
            if (stat.isFile() && localCandidate.endsWith(".md")) {
                const parsed = parseSkillFile(localCandidate, isGlobal);
                const skillName = parsed?.name || path_1.default.basename(localCandidate, ".md");
                const destDir = path_1.default.join(targetBaseDir, skillName);
                fs_1.default.mkdirSync(destDir, { recursive: true });
                fs_1.default.copyFileSync(localCandidate, path_1.default.join(destDir, "SKILL.md"));
                return {
                    success: true,
                    message: `Skill '${skillName}' berhasil diinstal ke ${destDir}`,
                    installedSkills: [skillName]
                };
            }
            else if (stat.isDirectory()) {
                // Cek apakah direktori ini sendiri adalah sebuah skill (punya SKILL.md) atau kumpulan folder skill
                const directSkillMd = path_1.default.join(localCandidate, "SKILL.md");
                if (fs_1.default.existsSync(directSkillMd)) {
                    const parsed = parseSkillFile(directSkillMd, isGlobal);
                    const skillName = parsed?.name || path_1.default.basename(localCandidate);
                    const destDir = path_1.default.join(targetBaseDir, skillName);
                    copyDirRecursive(localCandidate, destDir);
                    return {
                        success: true,
                        message: `Skill '${skillName}' berhasil diinstal ke ${destDir}`,
                        installedSkills: [skillName]
                    };
                }
                else {
                    const subSkills = scanDirForSkills(localCandidate, isGlobal, "Local");
                    if (subSkills.length === 0) {
                        return {
                            success: false,
                            message: `Tidak ditemukan file SKILL.md di dalam folder: ${localCandidate}`
                        };
                    }
                    const installedNames = [];
                    for (const s of subSkills) {
                        const destDir = path_1.default.join(targetBaseDir, s.name);
                        copyDirRecursive(s.dirPath, destDir);
                        installedNames.push(s.name);
                    }
                    return {
                        success: true,
                        message: `Berhasil menginstal ${installedNames.length} skill (${installedNames.join(", ")}) ke ${targetBaseDir}`,
                        installedSkills: installedNames
                    };
                }
            }
        }
        catch (err) {
            return { success: false, message: `Gagal menyalin skill lokal: ${err.message}` };
        }
    }
    // 2. Jika berupa GitHub shorthand (owner/repo) atau URL git
    const isGitUrl = /^https?:\/\/|^git@/.test(trimmed);
    const isGitHubShorthand = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed);
    if (isGitUrl || isGitHubShorthand) {
        const repoUrl = isGitUrl ? trimmed : `https://github.com/${trimmed}.git`;
        const tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), "aicli-skill-"));
        try {
            (0, child_process_1.execSync)(`git clone --depth 1 "${repoUrl}" "${tempDir}"`, { stdio: "pipe" });
            // Cari SKILL.md di root, di subfolder skills/, atau di subfolder langsung
            const discovered = [];
            const rootSkillMd = path_1.default.join(tempDir, "SKILL.md");
            if (fs_1.default.existsSync(rootSkillMd)) {
                const parsed = parseSkillFile(rootSkillMd, isGlobal, "Git");
                if (parsed) {
                    if (parsed.name.startsWith("aicli-skill-")) {
                        parsed.name = path_1.default.basename(trimmed.replace(/\.git$/, ""));
                    }
                    discovered.push(parsed);
                }
            }
            const skillsSubdir = path_1.default.join(tempDir, "skills");
            if (fs_1.default.existsSync(skillsSubdir)) {
                discovered.push(...scanDirForSkills(skillsSubdir, isGlobal, "Git"));
            }
            if (discovered.length === 0) {
                discovered.push(...scanDirForSkills(tempDir, isGlobal, "Git"));
            }
            if (discovered.length === 0) {
                fs_1.default.rmSync(tempDir, { recursive: true, force: true });
                return {
                    success: false,
                    message: `Repositori berhasil diunduh, namun tidak ditemukan file SKILL.md di dalamnya.`
                };
            }
            const installedNames = [];
            for (const s of discovered) {
                const destDir = path_1.default.join(targetBaseDir, s.name);
                copyDirRecursive(s.dirPath, destDir);
                installedNames.push(s.name);
            }
            fs_1.default.rmSync(tempDir, { recursive: true, force: true });
            return {
                success: true,
                message: `Berhasil menginstal ${installedNames.length} skill (${installedNames.join(", ")}) ke ${targetBaseDir}`,
                installedSkills: installedNames
            };
        }
        catch (err) {
            try {
                fs_1.default.rmSync(tempDir, { recursive: true, force: true });
            }
            catch { }
            return {
                success: false,
                message: `Gagal mengunduh skill dari ${repoUrl}: ${err.message}`
            };
        }
    }
    return {
        success: false,
        message: `Sumber skill '${trimmed}' tidak ditemukan sebagai path lokal maupun repositori GitHub (format: owner/repo atau path folder).`
    };
}
