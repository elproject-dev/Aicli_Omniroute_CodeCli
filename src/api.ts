import OpenAI from "openai";

export function getOpenAIClient(apiKey?: string, customBaseUrl?: string, isOpenRouter: boolean = false): OpenAI {
  const finalApiKey = apiKey || (isOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY);
  
  // Use OpenRouter base URL if not provided, otherwise use provided base URL
  const finalBaseUrl = customBaseUrl || (isOpenRouter ? "https://openrouter.ai/api/v1" : process.env.OPENAI_BASE_URL);

  return new OpenAI({
    apiKey: finalApiKey || "dummy-key",
    baseURL: finalBaseUrl,
    defaultHeaders: isOpenRouter ? {
      "HTTP-Referer": "https://github.com/your-repo", // Replace with your actual repo
      "X-Title": "Your App Name",
    } : undefined,
  });
}
