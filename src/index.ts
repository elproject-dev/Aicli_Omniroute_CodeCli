#!/usr/bin/env node

import { program } from "commander";
import * as dotenv from "dotenv";
import { startChat } from "./chat";
import fs from "fs";
import path from "path";
import os from "os";

// Clear terminal segera saat aicli dijalankan
process.stdout.write("\x1b[2J\x1b[3J\x1b[H");

dotenv.config();
const globalEnvPath = path.join(os.homedir(), ".aicli", ".env");
if (fs.existsSync(globalEnvPath)) {
  dotenv.config({ path: globalEnvPath });
}

program
  .name("aicli")
  .description("AI CLI built with Node.js, compatible with OpenAI API")
  .version("1.0.0");

program
  .command("chat", { isDefault: true })
  .description("Start an interactive chat session with the AI agent")
  .option("-m, --model <model>", "Model to use", process.env.OPENAI_MODEL || "gpt-3.5-turbo")
  .option("-s, --system <prompt>", "System prompt", "You are a helpful AI assistant.")
  .option("-b, --base-url <url>", "Base URL for OpenAI-compatible API")
  .option("-k, --api-key <key>", "API Key for the service")
  .action(async (options) => {
    await startChat(options);
  });

program.parse(process.argv);