// backend/game_server/ai/gemini.ts
// AI service for generating game narratives using Google Gemini

import { GoogleGenerativeAI } from '@google/generative-ai';

// 🔥 Load .env file explicitly for Bun
const envFile = Bun.file(import.meta.dir + '/../../.env');
if (await envFile.exists()) {
    const text = await envFile.text();
    for (const line of text.split('\n')) {
        if (line.startsWith('#') || !line.includes('=')) continue;
        const [key, ...valueParts] = line.split('=');
        process.env[key.trim()] = valueParts.join('=').trim();
    }
}

// Initialize with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY || '');

// System prompt for the AI game master
const SYSTEM_PROMPT = `You are the dungeon master for GEREZA, a dark medieval prison escape adventure game.

SETTING:
- Players are trapped in a mysterious medieval prison called "Gereza"
- Strange magic permeates the walls
- Guards are ruthless but can be outsmarted
- The prison has multiple levels: cells, corridors, guard quarters, sewers, and escape routes

YOUR ROLE:
1. Describe scenes vividly with atmosphere and tension
2. Respond to player actions with consequences
3. Roll dice for risky actions (d20 vs DC)
4. Track HP changes, items found/lost
5. Create a collaborative narrative for ALL players

RESPONSE FORMAT (JSON):
You must respond with a valid JSON object containing:
{
  "scene": {
    "title": "Short scene title",
    "description": "Vivid 2-3 sentence description",
    "mood": "mysterious" | "dangerous" | "peaceful" | "tense"
  },
  "diceRoll": null | {
    "result": 1-20,
    "dc": difficulty class,
    "purpose": "what the roll was for",
    "success": true/false
  },
  "stateChanges": [
    {
      "playerId": "sessionId of affected player",
      "hpChange": number (negative for damage, positive for healing, 0 for none),
      "addItem": null | { "name": "item name", "description": "item description", "icon": "emoji" },
      "removeItem": null | "item name to remove",
      "newStatus": "" | "status effect"
    }
  ],
  "suggestedActions": [
    { "label": "Action text", "description": "What might happen" }
  ],
  "nextTurn": {
    "playerId": "sessionId of player who should act next",
    "characterName": "character name for display",
    "reason": "Brief narrative reason (e.g., 'The guard's attention turns to you')"
  }
}

RULES:
- Always respond as the dungeon master narrating events
- Make consequences meaningful but fair
- Keep the party together narratively
- Reference other players when appropriate
- Be creative but stay in character
- IMPORTANT: Choose who acts next based on the NARRATIVE. If someone is in danger, they act. If there's a natural follow-up, that player acts. Rotate fairly but let the story guide turns.`;

export interface AISceneResponse {
    scene: {
        title: string;
        description: string;
        mood: 'mysterious' | 'dangerous' | 'peaceful' | 'tense';
    };
    diceRoll: {
        result: number;
        dc: number;
        purpose: string;
        success: boolean;
    } | null;
    stateChanges: Array<{
        playerId: string;
        hpChange: number;
        addItem: { name: string; description: string; icon: string } | null;
        removeItem: string | null;
        newStatus: string;
    }>;
    suggestedActions: Array<{
        label: string;
        description: string;
    }>;
    // 🔥 AI determines who should act next based on the narrative
    nextTurn: {
        playerId: string;  // sessionId of who should go next
        characterName: string;
        reason: string;  // Why this player should act (for display)
    };
}

interface PlayerContext {
    sessionId: string;
    username: string;
    characterName: string;
    health: number;
    maxHealth: number;
    inventory: string[];
}

interface GameContext {
    currentScene: string;
    players: PlayerContext[];
    messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    transcript?: string; // Full game history for context
}

export async function generateGameResponse(
    playerAction: string,
    actingPlayer: PlayerContext,
    gameContext: GameContext
): Promise<AISceneResponse> {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    // Build context for the AI
    const playerList = gameContext.players
        .map(p => `- ${p.characterName} (${p.username}) [ID:${p.sessionId}]: HP ${p.health}/${p.maxHealth}, Items: ${p.inventory.join(', ') || 'none'}`)
        .join('\n');

    // Use full transcript if available, otherwise fall back to recent history (legacy)
    const historyContext = gameContext.transcript || gameContext.messageHistory.slice(-10)
        .map(m => `${m.role === 'user' ? 'PLAYER' : 'DM'}: ${m.content}`)
        .join('\n');

    const prompt = `${SYSTEM_PROMPT}

CURRENT GAME STATE:
Scene: ${gameContext.currentScene || 'Game just started'}
Players:
${playerList}

GAME HISTORY:
${historyContext}

NOW: ${actingPlayer.characterName} (played by ${actingPlayer.username}) says: "${playerAction}"

Respond with the JSON format specified above. Make state changes affect ${actingPlayer.sessionId} if the action is risky.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr.trim()) as AISceneResponse;
        return parsed;
    } catch (error) {
        console.error('AI generation error:', error);
        // Return a fallback response - next turn goes back to acting player
        return {
            scene: {
                title: 'The Story Continues',
                description: 'The dungeon master contemplates your action...',
                mood: 'mysterious' as const
            },
            diceRoll: null,
            stateChanges: [],
            suggestedActions: [
                { label: 'Wait patiently', description: 'See what happens' },
                { label: 'Look around', description: 'Observe your surroundings' }
            ],
            nextTurn: {
                playerId: actingPlayer.sessionId,
                characterName: actingPlayer.characterName,
                reason: 'You may continue your action'
            }
        };
    }
}

// Generate introduction scene when game starts
export async function generateIntroScene(players: PlayerContext[]): Promise<AISceneResponse> {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const playerList = players
        .map(p => `- ${p.characterName} (${p.username}) [ID:${p.sessionId}]`)
        .join('\n');

    const prompt = `${SYSTEM_PROMPT}

NEW GAME STARTING!
Players:
${playerList}

Generate an opening scene where all players wake up in a dark prison cell together. Set the mood, describe the environment, and give them their first choices. Use the JSON format specified above.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        return JSON.parse(jsonStr.trim()) as AISceneResponse;
    } catch (error) {
        console.error('Intro generation error:', error);
        // Fallback - first player acts first
        const firstPlayer = players[0];
        return {
            scene: {
                title: 'Awakening in Darkness',
                description: 'You wake up on cold stone, the air thick with the smell of damp and despair. Iron bars cage you in a cramped cell. Somewhere in the darkness, other prisoners stir.',
                mood: 'mysterious' as const
            },
            diceRoll: null,
            stateChanges: [],
            suggestedActions: [
                { label: 'Look around the cell', description: 'Search for anything useful' },
                { label: 'Call out to others', description: 'See who else is here' },
                { label: 'Check the cell door', description: 'Test if it is locked' }
            ],
            nextTurn: {
                playerId: firstPlayer?.sessionId || '',
                characterName: firstPlayer?.characterName || 'Adventurer',
                reason: 'You sense something in the darkness...'
            }
        };
    }
}
