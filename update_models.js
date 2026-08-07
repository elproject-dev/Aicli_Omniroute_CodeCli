const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'src/chat.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `{ cmd: "/model", desc: "Switch model or provider" },\n        { cmd: "/izin", desc: "File access configuration" },`,
  `{ cmd: "/model", desc: "Switch model or provider" },\n        { cmd: "/models", desc: "Lihat daftar model tersedia yg sudah disetup" },\n        { cmd: "/izin", desc: "File access configuration" },`
);

content = content.replace(
  `if (input.trim().startsWith("/model")) {`,
  `if (input.trim() === "/model" || input.trim().startsWith("/model ")) {`
);

const insertModelsBlock = `      console.log(pc.green(\`✔ Berhasil mengubah model aktif ke: \${options.model}\\n\`));
      continue;
    }

    if (input.trim() === "/models") {
      const spinner = new NpmSpinner();
      spinner.start(pc.yellow("Memuat daftar model tersedia dari OmniRoute..."));

      try {
        const models = await openai.models.list();
        spinner.stop();

        console.log(pc.cyan("\\n--- Daftar Model Tersedia (OmniRoute) ---"));
        if (models.data.length === 0) {
          console.log(pc.gray(" Belum ada model yang di-set up atau tersedia."));
        } else {
          models.data.forEach((m: any, idx: number) => {
            const isActive = (m.id === options.model) ? pc.green(" (Sedang Aktif)") : "";
            console.log(\` \${idx + 1}. \${pc.white(m.id)}\${isActive}\`);
          });
        }
        console.log();
      } catch (err: any) {
        spinner.stop();
        console.log();
        printToolError("Get Models", \`Gagal memuat daftar model: \${err.message}\`);
      }
      continue;
    }

    messages.push({ role: "user", content: input });`;

content = content.replace(
  `      console.log(pc.green(\`✔ Berhasil mengubah model aktif ke: \${options.model}\\n\`));\n      continue;\n    }\n\n    messages.push({ role: "user", content: input });`,
  insertModelsBlock
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated src/chat.ts');