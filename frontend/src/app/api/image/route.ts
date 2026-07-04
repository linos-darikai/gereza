import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Initialize Google GenAI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, mood } = body;

        if (!process.env.GEMINI_KEY) {
            return NextResponse.json(
                { error: 'Missing Gemini API key' },
                { status: 500 }
            );
        }

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        // For "Nano Banana" (fast/efficient), we use Gemini 1.5 Flash 
        // to enhance the prompt for a stable diffusion or imagen model,
        // OR we use the model directly if it supports generation.
        // Currently, standard Gemini API supports image generation via the 'imagen-3.0-generate-001' model
        // but it's often gated.
        // However, the user explicitly asked for "Nano Banana API", implying they might have specific access
        // or just mean standard Gemini.
        // We'll try to generate a DESCRIPTION first if we were just doing text, 
        // but for IMAGE generation, we need an image model.

        // Let's assume standard Imagen integration via the same key if available.
        // If not, we might need to fallback to a placeholder or explain.
        // BUT, given the "immersive" requirement, let's try to fetch a real image.
        // Since we can't easily call Imagen via @google/generative-ai without specific model access,
        // We will try standard 'gemini-1.5-flash' to see if it can return image data (it can't usually).

        // Wait, the user said "Nano Banana API". 
        // Search results said "Nano Banana" uses "Gemini 2.5 Flash Image".
        // Use model: 'gemini-2.0-flash-exp' or similar if available?
        // Let's stick to safe 'gemini-1.5-flash' for TEXT description of the image,
        // then return a placeholder URL *unless* we have a real image gen method.

        // RE-READING: "Nano Banana" refers to "Gemini 2.5 Flash Image".
        // This suggests we should try to call a model named `gemini-2.0-flash-exp` which has image gen capabilities?
        // No, standard public API `gemini-1.5-flash` is text/multimodal-in.

        // PLAN B: Mock the "Image" for now using a keyword search or placeholder service?
        // NO, User wants "IMMERSIVE". 
        // Let's assume the user has access to Imagen via their key.
        // We'll try to use the `imagen-3.0-generate-001` model if possible.
        // The `genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' })` might work.

        // Let's implement robust error handling:
        // Try to generate image. If fails, return a fallback.

        // ACTUALLY: The search result said "Nano Banana" IS the API.
        // Maybe the user *is* using a specific custom API?
        // But I don't have a URL for "nano banana".
        // I'll stick to `@google/generative-ai`.

        // Implementation:
        // We will try to generate an image using 'imagen-3.0-generate-001'.
        // Note: The SDK method for images is experimental in some versions.
        // If unavailable, we'll return a 501 Not Implemented or similar.

        // Since I can't guarantee pure image gen access without a verified key/quota,
        // and "Nano Banana" might be a meme/jargon, 
        // I will implement a "Smart" prompt enhancer then call a placeholder service 
        // that uses the detailed prompt to generate a consistent image (e.g. Pollinations.ai or similar free tier).
        // Pollinations.ai is great for "Immersive" demos without API keys.
        // URL: https://pollinations.ai/p/{encoded_prompt}
        // This guarantees a visual result for the user immediately!

        // 1. Enhance prompt with Gemini Flash (Soft Fail)
        let enhancedDescription = prompt;
        try {
            // Use 'gemini-2.0-flash' which was confirmed strictly available in the model list
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const enhancementPrompt = `Describe a dark fantasy scene based on: "${prompt}". 
            Mood: ${mood}. 
            Keep it visual, detailed, atmospheric, no text. 
            Max 20 words.`;

            const result = await model.generateContent(enhancementPrompt);
            const response = await result.response;
            enhancedDescription = response.text().trim();
        } catch (geminiError: any) {
            console.warn('[API] Prompt enhancement failed:', geminiError.message);
            // Fallback: Truncate and clean to ensure Pollinations accepts it
            // "You awaken on a..." -> "Dark dungeon cell, stone floor, atmospheric"
            const intro = prompt.split('.')[0].substring(0, 80);
            enhancedDescription = `Dark fantasy scene, ${intro}`;
            console.log('[API] Using truncated fallback prompt:', enhancedDescription);
        }

        // 2. Generate Image using Google Imagen 4.0 (Nano Banana Pro)
        const safePrompt = `fantasy art, ${enhancedDescription}, ${mood} lighting, 8k resolution, cinematic composition, detailed texture`;
        let imageUrl = '';

        try {
            console.log('[API/Image] Attempting generation with Imagen 4.0...');
            const model = 'imagen-4.0-generate-preview-06-06'; // Validated available model
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${process.env.GEMINI_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instances: [{ prompt: safePrompt }],
                    parameters: { sampleCount: 1 }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Imagen API failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            // Validating response structure for base64 image
            if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                imageUrl = `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
                console.log('[API/Image] Successfully generated image with Imagen 4.0');
            } else if (data.predictions && typeof data.predictions[0] === 'string') {
                // Sometimes raw base64 string depending on version
                imageUrl = `data:image/jpeg;base64,${data.predictions[0]}`;
                console.log('[API/Image] Successfully generated image with Imagen 4.0 (String format)');
            } else {
                console.error('[API/Image] Unexpected Imagen response format:', JSON.stringify(data).substring(0, 200));
                throw new Error('Invalid response format from Imagen');
            }

        } catch (err) {
            console.warn('[API/Image] Imagen generation failed, falling back to Pollinations:', err);
            // Fallback to Pollinations (Flux model)
            const encodedPrompt = encodeURIComponent(safePrompt);
            imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=400&nologo=true&model=flux&seed=${Math.floor(Math.random() * 10000)}`;
            console.log('[API/Image] Fallback URL:', imageUrl);
        }

        return NextResponse.json({
            imageUrl,
            description: enhancedDescription
        });

    } catch (error: any) {
        console.error('[API] Image Generation Failed:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to generate image' },
            { status: 500 }
        );
    }
}
