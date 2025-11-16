
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
): Promise<{ summary: { en: string; es: string }; fields: FormField[] }> => {
    const model = 'gemini-2.5-flash';
    const base64Data = imageDataUrl.split(',')[1];
    const mimeType = imageDataUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';

    const imagePart = fileToGenerativePart(base64Data, mimeType);
    const kidProfileString = JSON.stringify(kidProfile, null, 2);

    const prompt = `
      You are an expert at reading forms and extracting information.
      Analyze the provided form image and the child's data. 
      
      First, provide a brief, one-sentence summary of what this form is for and what action the parent needs to take (e.g., "Field trip permission slip, requires parent signature.").
      **Provide this summary in both English and Spanish.**

      Second, identify all input fields on the form and fill them with the corresponding data from the child's profile JSON.
      Only return fields for which you found a match in the child's profile.

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
                            description: "A brief, one-sentence summary of the form's purpose in both English and Spanish.",
                            properties: {
                                en: {
                                    type: Type.STRING,
                                    description: "The summary in English."
                                },
                                es: {
                                    type: Type.STRING,
                                    description: "The summary in Spanish."
                                }
                            },
                            required: ['en', 'es']
                        },
                        fields: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: {
                                        type: Type.STRING,
                                        description: 'The label of the form field (e.g., "Full Name", "Date of Birth").'
                                    },
                                    value: {
                                        type: Type.STRING,
                                        description: 'The corresponding value from the child\'s profile.'
                                    }
                                },
                                required: ['label', 'value']
                            }
                        }
                    },
                    required: ['summary', 'fields']
                },
            }
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        
        const defaultSummary = {
            en: 'No summary generated.',
            es: 'No se generó ningún resumen.'
        };

        return {
            summary: parsedJson.summary || defaultSummary,
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
): Promise<{ label: string; summary: string; dueDate: string | null }> => {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are an expert at analyzing communications for parents.
      Analyze the following email content which is for a child named ${kidName}.

      First, create a short, descriptive label for the email (max 10 words). Example: "Permission Slip for Zoo Field Trip".
      
      Second, provide a concise summary of the key information and any actions the parent needs to take.
      
      Third, identify if there is a specific due date or event date mentioned. If so, return it in YYYY-MM-DD format. If not, return null.

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
                        summary: { type: Type.STRING, description: "A concise summary of the email's content and required actions." },
                        dueDate: { type: Type.STRING, description: "The due date or event date in YYYY-MM-DD format, or null if not present." }
                    },
                    required: ['label', 'summary']
                }
            }
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        
        return {
            label: parsedJson.label || 'Untitled Email',
            summary: parsedJson.summary || 'No summary could be generated.',
            dueDate: parsedJson.dueDate || null
        };
    } catch (error) {
        console.error("Error processing email with Gemini:", error);
        throw new Error("Failed to analyze the email. The AI model might be busy or the content could not be processed. Please try again.");
    }
};