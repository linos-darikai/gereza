
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    try {
        const modelResponse = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Just to initialize, looking for list logic if available or just testing specific models
        // actually the SDK has a listModels method on the client usually, let's check documentation or try it.
        // The google-generative-ai Node SDK doesn't expose listModels directly on the top class in all versions.
        // But we can try the specific newer model name "imagen-3.0-generate-001" to see if it throws 404.

        const imageModel = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
        console.log("Model initialized: imagen-3.0-generate-001");
        // Try a dummy generation to see if it's accessible/exists
        // Note: Image generation usually doesn't use generateContent the same way, but let's see.
        // Actually, for Imagen, we might need to use a different method or it might not be in this SDK yet?
        // The search said it IS in the API. 
    } catch (error) {
        console.error("Error:", error.message);
    }
}

// Better approach: just try to generate an image with the model.
// If it fails with "User has no access" or "Model not found", we know.

async function testImagen() {
    if (!process.env.GEMINI_KEY) {
        console.error("No GEMINI_KEY found");
        return;
    }
    console.log("Testing Imagen 3 accessibility...");
    // There is no direct 'generateImage' method on the generic client yet in all versions. 
    // It is often accessed via specific 'imagen' endpoints or strict REST.
    // Let's try to see if we can use the model name.

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    try {
        // This is a guess at the API, as the search result wasn't specific on the method signature for Node.
        // Usually it's model.generateImages() or similar if using the specific vertex wrapper, 
        // but for @google/generative-ai it might be just generateContent with a specific Prompt?
        // No, Imagen models usually have a different schema.

        console.log("Attempting to get model info...");
    } catch (e) {
        console.log("Error:", e);
    }
}

testImagen();
