import { GoogleGenAI } from '@google/genai';

// API Key - In production, use environment variables
const API_KEY = 'AIzaSyCHXMz_haEzkqEGyzmZ2BpMSHT5aTKo4L8';

const genAI = new GoogleGenAI({ apiKey: API_KEY });

export const SUPPORTED_LANGUAGES = [
    { code: 'auto', name: 'Auto-detect', flag: '🌐' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
    { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'zh', name: 'Chinese (Mandarin)', flag: '🇨🇳' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
    { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
    { code: 'th', name: 'Thai', flag: '🇹🇭' },
    { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
    { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
    { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
    { code: 'am', name: 'Amharic', flag: '🇪🇹' },
    { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
];

export const TARGET_LANGUAGES = SUPPORTED_LANGUAGES.filter(lang => lang.code !== 'auto');

/**
 * Extract text from Gemini response - handles different SDK response structures
 */
function extractResponseText(result) {
    // Try different response structures
    if (result?.text) {
        return typeof result.text === 'function' ? result.text() : result.text;
    }
    if (result?.response?.text) {
        return typeof result.response.text === 'function' ? result.response.text() : result.response.text;
    }
    if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return result.candidates[0].content.parts[0].text;
    }
    if (result?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return result.response.candidates[0].content.parts[0].text;
    }

    console.log('Full response structure:', JSON.stringify(result, null, 2));
    throw new Error('Unable to extract text from response');
}

/**
 * Transcribe and translate audio using Gemini
 */
export async function transcribeAudio(audioBlob, targetLanguage = 'en') {
    try {
        // Convert blob to base64
        const base64Audio = await blobToBase64(audioBlob);
        const mimeType = audioBlob.type || 'audio/webm';

        const targetLang = TARGET_LANGUAGES.find(l => l.code === targetLanguage)?.name || 'English';

        const prompt = `You are an expert multilingual transcription and translation assistant.

TASK: Analyze the following audio and provide:
1. TRANSCRIPTION: Accurately transcribe the spoken words in their original language
2. DETECTED LANGUAGE: Identify the language being spoken
3. TRANSLATION: Provide a natural ${targetLang} translation
4. EMOTION: Detect the speaker's emotional tone (happy, sad, angry, neutral, excited, concerned)
5. FOOTNOTES: If there are local idioms, slang, cultural expressions, or regional dialect features, explain them in footnotes

FORMAT YOUR RESPONSE AS JSON:
{
  "originalText": "the exact transcription in the original language",
  "detectedLanguage": "the name of the detected language",
  "translation": "natural translation in ${targetLang}",
  "emotion": "detected emotion",
  "footnotes": ["array of footnote explanations for idioms/cultural context, or empty array if none"]
}

IMPORTANT NOTES:
- Prioritize phonetic accuracy for regional dialects
- If the audio is unclear, indicate that in the response
- Preserve the speaker's intended meaning, not just literal word-for-word translation`;

        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Audio.split(',')[1] // Remove data URL prefix
                            }
                        }
                    ]
                }
            ]
        });

        const responseText = extractResponseText(result);

        // Try to parse as JSON
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
                responseText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
            return JSON.parse(jsonStr);
        } catch {
            // If not valid JSON, return structured response
            return {
                originalText: responseText,
                detectedLanguage: 'Unknown',
                translation: responseText,
                emotion: 'neutral',
                footnotes: []
            };
        }
    } catch (error) {
        console.error('Transcription error:', error);
        throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
}

/**
 * Translate text using Gemini
 */
export async function translateText(text, sourceLanguage = 'auto', targetLanguage = 'en') {
    try {
        const sourceLang = sourceLanguage === 'auto'
            ? 'the detected language'
            : SUPPORTED_LANGUAGES.find(l => l.code === sourceLanguage)?.name || sourceLanguage;
        const targetLang = TARGET_LANGUAGES.find(l => l.code === targetLanguage)?.name || 'English';

        const prompt = `You are an expert translator specializing in local languages and dialects.

TASK: Translate the following text from ${sourceLang} to ${targetLang}.

TEXT TO TRANSLATE:
"${text}"

PROVIDE YOUR RESPONSE AS JSON:
{
  "sourceLanguage": "the detected or specified source language",
  "originalText": "the original text",
  "translation": "natural, fluent translation in ${targetLang}",
  "footnotes": ["array of explanations for any idioms, slang, or cultural context that don't translate directly"]
}

TRANSLATION GUIDELINES:
- Produce a natural, fluent translation that reads well in ${targetLang}
- Preserve the original tone and intent
- For idioms or slang, translate the meaning, then explain in footnotes
- If the source language is unclear, make your best determination`;

        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }]
        });

        const responseText = extractResponseText(result);

        try {
            const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
                responseText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
            return JSON.parse(jsonStr);
        } catch {
            return {
                sourceLanguage: sourceLang,
                originalText: text,
                translation: responseText,
                footnotes: []
            };
        }
    } catch (error) {
        console.error('Translation error:', error);
        throw new Error(`Failed to translate text: ${error.message}`);
    }
}

/**
 * Convert Blob to base64 data URL
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
