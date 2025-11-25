
import { GoogleGenAI, Type } from "@google/genai";
import type { KidProfile, FormField } from '../types';

if (!process.env.API_KEY) {
  // In a real app, you'd show a user-friendly error or disable the feature.
  // For this example, we'll log a warning.
  console.warn(
    "Gemini API key not found. Please set the API_KEY environment variable."
  );
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

function fileToGenerativePart(base64: string, mimeType: string) {
    return {
      inlineData: {
        data: base64,
        mimeType,
      },
    };
}

export const processFormWithGemini = async (
    imageDataUrl: string, 
    kidProfile: KidProfile
): Promise<{ 
    summary: { en: string; es: string }; 
    actionItems: { en: string[]; es: string[] };
    keyDates: string[];
    fields: FormField[] 
}> => {
    const model = 'gemini-2.5-flash';
    const base64Data = imageDataUrl.split(',')[1];
    const mimeType = imageDataUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';

    const imagePart = fileToGenerativePart(base64Data, mimeType);
    const kidProfileString = JSON.stringify(kidProfile, null, 2);

    const prompt = `
      You are an expert at reading forms and extracting information.
      Analyze the provided form image and the child's data. 
      
      1. **Summary**: Provide a detailed summary of the form's purpose.
         - Return this in both English ('en') and Spanish ('es').

      2. **Action Items**: Identify specific actions the parent needs to take (e.g., "Sign at the bottom", "Attach payment", "Return by Friday").
         - Return a list of strings in both English ('en') and Spanish ('es').

      3. **Key Dates**: Extract any specific dates mentioned in the form (due dates, event dates) in YYYY-MM-DD format.

      4. **Form Filling**: Identify all input fields on the form and fill them with the corresponding data from the child's profile JSON.
         - Only return fields for which you found a match in the child's profile.

      The child's profile data is:
      ${kidProfileString}
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: {
                            type: Type.OBJECT,
                            description: "A detailed summary of the form.",
                            properties: {
                                en: { type: Type.STRING },
                                es: { type: Type.STRING }
                            },
                            required: ['en', 'es']
                        },
                        actionItems: {
                            type: Type.OBJECT,
                            description: "List of actions required from the parent.",
                            properties: {
                                en: { type: Type.ARRAY, items: { type: Type.STRING } },
                                es: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ['en', 'es']
                        },
                        keyDates: {
                            type: Type.ARRAY,
                            description: "List of dates found in YYYY-MM-DD format.",
                            items: { type: Type.STRING }
                        },
                        fields: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    value: { type: Type.STRING }
                                },
                                required: ['label', 'value']
                            }
                        }
                    },
                    required: ['summary', 'actionItems', 'keyDates', 'fields']
                },
            }
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        
        const defaultSummary = {
            en: 'No summary generated.',
            es: 'No se generó ningún resumen.'
        };

        const defaultActions = { en: [], es: [] };

        return {
            summary: parsedJson.summary || defaultSummary,
            actionItems: parsedJson.actionItems || defaultActions,
            keyDates: parsedJson.keyDates || [],
            fields: parsedJson.fields || []
        };

    } catch (error) {
        console.error("Error processing form with Gemini:", error);
        throw new Error("Failed to analyze the form. The AI model might be busy or the image could not be processed. Please try again.");
    }
};


export const processEmailWithGemini = async (
    emailContent: string,
    kidName: string
): Promise<{ label: string; summary: string; actionItems: string[]; dueDate: string | null }> => {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are an expert at analyzing communications for parents.
      Analyze the following email content which is for a child named ${kidName}.

      First, create a short, descriptive label for the email (max 10 words). Example: "Permission Slip for Zoo Field Trip".
      
      Second, provide a concise summary of the key information.
      
      Third, extract a list of specific action items or instructions the parent needs to follow (e.g., "Sign permission slip", "Send $5 cash", "Wear blue shirt").

      Fourth, identify if there is a specific due date or event date mentioned. If so, return it in YYYY-MM-DD format. If not, return null.

      Email content:
      """
      ${emailContent}
      """
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        label: { type: Type.STRING, description: "A short, descriptive label for the email." },
                        summary: { type: Type.STRING, description: "A concise summary of the email's content." },
                        actionItems: { 
                            type: Type.ARRAY, 
                            description: "A list of specific actions the parent needs to take.",
                            items: { type: Type.STRING }
                        },
                        dueDate: { type: Type.STRING, description: "The due date or event date in YYYY-MM-DD format, or null if not present." }
                    },
                    required: ['label', 'summary', 'actionItems']
                }
            }
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        
        return {
            label: parsedJson.label || 'Untitled Email',
            summary: parsedJson.summary || 'No summary could be generated.',
            actionItems: parsedJson.actionItems || [],
            dueDate: parsedJson.dueDate || null
        };
    } catch (error) {
        console.error("Error processing email with Gemini:", error);
        throw new Error("Failed to analyze the email. The AI model might be busy or the content could not be processed. Please try again.");
    }
};
