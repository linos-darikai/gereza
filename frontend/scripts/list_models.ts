
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY || '');

async function listModels() {
    try {
        const models = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Dummy init to get client? 
        // Actually the SDK might handle it differently. Let's trying accessing via the API directly if SDK doesn't have listModels easily exposed on the instance?
        // Wait, typical usage:
        // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // But to list...

        // Actually, let's just use a simple fetch to the endpoint if the SDK doesn't make it obvious.
        // GET https://generativelanguage.googleapis.com/v1beta/models?key=API_KEY

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_KEY}`);
        const data = await response.json();
        console.log('Available Models:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
