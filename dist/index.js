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
const chat_1 = require("./chat");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
// Clear terminal segera saat aicli dijalankan
process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
dotenv.config();
const globalEnvPath = path_1.default.join(os_1.default.homedir(), ".aicli", ".env");
if (fs_1.default.existsSync(globalEnvPath)) {
    dotenv.config({ path: globalEnvPath });
}
commander_1.program
    .name("aicli")
    .description("AI CLI built with Node.js, compatible with OpenAI API")
    .version("1.0.0");
commander_1.program
    .command("chat", { isDefault: true })
    .description("Start an interactive chat session with the AI agent")
    .option("-m, --model <model>", "Model to use", process.env.OPENAI_MODEL || "gpt-3.5-turbo")
    .option("-s, --system <prompt>", "System prompt", "You are a helpful AI assistant.")
    .option("-b, --base-url <url>", "Base URL for OpenAI-compatible API")
    .option("-k, --api-key <key>", "API Key for the service")
    .action(async (options) => {
    await (0, chat_1.startChat)(options);
});
commander_1.program.parse(process.argv);
