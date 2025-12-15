
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse, Tool, HarmCategory, HarmBlockThreshold, Content, Part } from "@google/genai";
import { UrlContextMetadataItem } from '../types';

// IMPORTANT: The API key MUST be set as an environment variable `process.env.API_KEY`
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI;

// Model supporting URL context, consistent with user examples and documentation.
const MODEL_NAME = "gemini-2.5-flash"; 

const getAiInstance = (): GoogleGenAI => {
  if (!API_KEY) {
    console.error("API_KEY is not set in environment variables. Please set process.env.API_KEY.");
    throw new Error("Gemini API Key not configured. Please check your environment settings.");
  }
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return ai;
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

interface GeminiResponse {
  text: string;
  urlContextMetadata?: UrlContextMetadataItem[];
}

// Helper to format errors into user-friendly messages
const formatGeminiError = (error: any): string => {
  console.error("Gemini API Error Details:", error);
  
  if (error instanceof Error) {
    const msg = error.message;
    const lowerMsg = msg.toLowerCase();

    if (lowerMsg.includes('403') || lowerMsg.includes('api key')) {
      return 'Authentication failed. Please verify your API Key.';
    }
    if (lowerMsg.includes('429') || lowerMsg.includes('quota')) {
      return 'Usage limit exceeded. Please try again later.';
    }
    if (lowerMsg.includes('503') || lowerMsg.includes('service unavailable') || lowerMsg.includes('overloaded')) {
      return 'The AI service is temporarily unavailable. Please try again in a few moments.';
    }
    if (lowerMsg.includes('network') || lowerMsg.includes('fetch failed') || lowerMsg.includes('failed to fetch')) {
      return 'Network connection failed. Please check your internet connection.';
    }
    if (lowerMsg.includes('safety') || lowerMsg.includes('blocked')) {
      return 'The content was blocked due to safety policies. Please try a different prompt.';
    }
    if (lowerMsg.includes('candidate')) {
        return 'The model could not generate a valid response for this request.';
    }
    
    // Clean up generic GoogleGenAIError prefixes if present
    return msg.replace(/\[.*?\]\s*/, '').replace(/^GoogleGenAIError:\s*/, '');
  }
  
  return 'An unexpected error occurred while communicating with the AI service.';
};

export const generateContentWithContext = async (
  prompt: string,
  urls: string[],
  fileParts: Part[] = []
): Promise<GeminiResponse> => {
  const currentAi = getAiInstance();
  
  let fullPrompt = prompt;
  if (urls.length > 0) {
    const urlList = urls.join('\n');
    fullPrompt = `${prompt}\n\nRelevant URLs for context:\n${urlList}`;
  }

  // Configure tools only if URLs are present (URL Context tool)
  // If we have fileParts, we pass them in contents.
  const tools: Tool[] | undefined = urls.length > 0 ? [{ urlContext: {} }] : undefined;

  const parts: Part[] = [];
  
  // Add file parts (images, pdfs, text files)
  if (fileParts.length > 0) {
    parts.push(...fileParts);
  }

  // Add the prompt
  parts.push({ text: fullPrompt });

  const contents: Content[] = [{ role: "user", parts: parts }];

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: { 
        tools: tools,
        safetySettings: safetySettings,
      },
    });

    const text = response.text || ""; 
    // Check if text is empty but no error thrown (e.g. strict safety filter on output)
    if (!text && response.candidates && response.candidates.length > 0 && response.candidates[0].finishReason !== "STOP") {
         throw new Error(`Response stopped due to: ${response.candidates[0].finishReason}`);
    }

    const candidate = response.candidates?.[0];
    let extractedUrlContextMetadata: UrlContextMetadataItem[] | undefined = undefined;

    if (candidate && candidate.urlContextMetadata && candidate.urlContextMetadata.urlMetadata) {
       extractedUrlContextMetadata = candidate.urlContextMetadata.urlMetadata as UrlContextMetadataItem[];
    }
    
    return { text, urlContextMetadata: extractedUrlContextMetadata };

  } catch (error) {
    throw new Error(formatGeminiError(error));
  }
};

// Kept for backward compatibility if needed, but App.tsx will switch to generateContentWithContext
export const generateContentWithUrlContext = (prompt: string, urls: string[]) => {
  return generateContentWithContext(prompt, urls, []);
}

export const getSummaryForUrls = async (urls: string[]): Promise<string> => {
  try {
    const prompt = "Please provide a concise and clear summary of the key information contained in the following URLs. Focus on the main topics and takeaways.";
    const response = await generateContentWithContext(prompt, urls);
    return response.text || "No summary available.";
  } catch (error) {
     throw new Error(formatGeminiError(error));
  }
};

export const getInitialSuggestions = async (urls: string[]): Promise<GeminiResponse> => {
  if (urls.length === 0) {
    return { text: JSON.stringify({ suggestions: ["Add some URLs or Files to get topic suggestions."] }) };
  }
  const currentAi = getAiInstance();
  const urlList = urls.join('\n');
  
  const promptText = `Based on the content of the following documentation URLs, provide 3-4 concise and actionable questions a developer might ask to explore these documents. Return ONLY a JSON object with a key "suggestions".

Relevant URLs:
${urlList}`;

  const contents: Content[] = [{ role: "user", parts: [{ text: promptText }] }];

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        safetySettings: safetySettings,
        responseMimeType: "application/json", 
      },
    });

    return { text: response.text }; 

  } catch (error) {
     // Log the error but throw a friendly one
    console.warn("Failed to fetch suggestions:", error);
    // Suggestions are non-critical, so we might want to return a fallback or throw a soft error
    throw new Error(formatGeminiError(error));
  }
};
