"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpenAIClient = getOpenAIClient;
const openai_1 = __importDefault(require("openai"));
function getOpenAIClient(apiKey, customBaseUrl, isOpenRouter = false) {
    const finalApiKey = apiKey || (isOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY);
    // Use OpenRouter base URL if not provided, otherwise use provided base URL
    const finalBaseUrl = customBaseUrl || (isOpenRouter ? "https://openrouter.ai/api/v1" : process.env.OPENAI_BASE_URL);
    return new openai_1.default({
        apiKey: finalApiKey || "dummy-key",
        baseURL: finalBaseUrl,
        defaultHeaders: isOpenRouter ? {
            "HTTP-Referer": "https://github.com/your-repo", // Replace with your actual repo
            "X-Title": "Your App Name",
        } : undefined,
    });
}
