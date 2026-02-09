// Backend Environment Variables
const apiKey = "AIzaSyCj4gYnLHgQruCvGROauCtOADO5FcCmuV0"; // Hardcoded for testing
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error("List models failed:", response.status, await response.text());
            return;
        }
        const data = await response.json() as any;
        console.log("Available Models:");
        if (data.models) {
            data.models.forEach((m: any) => {
                if (m.name.includes("banana") || m.name.includes("imagen")) {
                    console.log(`- ${m.name} [Methods: ${m.supportedGenerationMethods}]`);
                }
            });
        } else {
            console.log("No models found:", data);
        }
    } catch (e) {
        console.error(e);
    }
}

listModels();
