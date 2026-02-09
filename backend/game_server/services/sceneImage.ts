
// We use direct REST API for Imagen as SDK support varies
const IMAGEN_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict";

export class SceneImageService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generate(sceneDescription: string, mood: string): Promise<string | null> {
        try {
            if (!this.apiKey) {
                console.warn("⚠️ No GEMINI_KEY provided for image generation");
                return null;
            }

            console.log(`🎨 Generating image for scene: "${sceneDescription.substring(0, 50)}..." [Mood: ${mood}]`);

            // Construct prompt for comic book style
            const prompt = `
        Comic book art style, vibrant colors, dramatic lighting, high quality, detailed.
        Scene description: ${sceneDescription}
        Mood: ${mood}.
        Visual style: Modern graphic novel, cel-shaded, bold outlines, atmospheric.
        No text bubbles, no dialogue.
      `.trim();

            // REST call to Imagen 3 on AI Studio
            const response = await fetch(`${IMAGEN_ENDPOINT}?key=${this.apiKey}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    instances: [
                        { prompt: prompt }
                    ],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "16:9" // or "1:1"
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Image generation failed: ${response.status} ${response.statusText}`, errorText);

                // Fallback: If 404, maybe model name is different?
                // Try 'gemini-3.0-generate-001' or just log error
                return null;
            }

            const data = await response.json() as any;

            // Parse response - format depends on specific endpoint version
            // Usually { predictions: [ { bytesBase64Encoded: "..." } ] } 
            // or { predictions: [ { mimeType: "image/png", bytesBase64Encoded: "..." } ] }

            if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                console.log("✅ Image generated successfully!");
                return data.predictions[0].bytesBase64Encoded;
            } else if (data.predictions && data.predictions[0]) {
                // Some versions return raw base64 string in the array
                if (typeof data.predictions[0] === 'string') {
                    return data.predictions[0];
                }
            }

            console.warn("⚠️ Unexpected response format from image generation:", JSON.stringify(data).substring(0, 200));
            return null;

        } catch (error) {
            console.error("❌ Error generating scene image:", error);
            return null;
        }
    }
}
