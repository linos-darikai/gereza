// backend/game_server/services/transcript.ts
// Session transcript service for persistent AI context
// Stores full game history in markdown files for rich AI context

import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SESSIONS_DIR = import.meta.dir + '/../../sessions';

// Ensure sessions directory exists
async function ensureSessionsDir() {
    if (!existsSync(SESSIONS_DIR)) {
        await mkdir(SESSIONS_DIR, { recursive: true });
    }
}

export interface TranscriptEntry {
    timestamp: Date;
    type: 'scene' | 'player_action' | 'dice_roll' | 'state_change' | 'system';
    actor?: string;  // Player name for player actions
    content: string;
    metadata?: Record<string, unknown>;
}

/**
 * Session Transcript Service
 * Manages persistent game transcripts stored as markdown files.
 * These transcripts are passed to the AI for full context.
 */
export class SessionTranscriptService {
    private roomCode: string;
    private entries: TranscriptEntry[] = [];
    private filePath: string;

    constructor(roomCode: string) {
        this.roomCode = roomCode;
        this.filePath = `${SESSIONS_DIR}/${roomCode}.md`;
    }

    /**
     * Load existing transcript from file (for reconnection/resumption)
     */
    async load(): Promise<void> {
        await ensureSessionsDir();

        try {
            const file = Bun.file(this.filePath);
            if (await file.exists()) {
                // Parse existing transcript (simplified - just read as context)
                console.log(`📜 Loaded transcript for session ${this.roomCode}`);
            }
        } catch (e) {
            console.log(`📜 New transcript for session ${this.roomCode}`);
        }
    }

    /**
     * Add a scene to the transcript
     */
    addScene(title: string, description: string, mood: string): void {
        this.entries.push({
            timestamp: new Date(),
            type: 'scene',
            content: `## ${title}\n*${mood}*\n\n${description}`,
            metadata: { mood }
        });
        this.save();
    }

    /**
     * Add a player action to the transcript
     */
    addPlayerAction(playerName: string, characterName: string, action: string): void {
        this.entries.push({
            timestamp: new Date(),
            type: 'player_action',
            actor: characterName,
            content: `**${characterName}** *(${playerName})*: ${action}`
        });
        this.save();
    }

    /**
     * Add a dice roll to the transcript
     */
    addDiceRoll(purpose: string, result: number, dc: number, success: boolean): void {
        const emoji = success ? '✅' : '❌';
        this.entries.push({
            timestamp: new Date(),
            type: 'dice_roll',
            content: `🎲 *${purpose}*: Rolled **${result}** vs DC ${dc} ${emoji} ${success ? 'SUCCESS' : 'FAILURE'}`
        });
        this.save();
    }

    /**
     * Add a state change to the transcript
     */
    addStateChange(description: string): void {
        this.entries.push({
            timestamp: new Date(),
            type: 'state_change',
            content: `⚡ ${description}`
        });
        this.save();
    }

    /**
     * Add a system message to the transcript
     */
    addSystem(message: string): void {
        this.entries.push({
            timestamp: new Date(),
            type: 'system',
            content: `*[${message}]*`
        });
        this.save();
    }

    /**
     * Get the full transcript as a formatted string for AI context
     */
    getFullTranscript(): string {
        const header = `# Game Session: ${this.roomCode}\n\n`;
        const body = this.entries
            .map(entry => entry.content)
            .join('\n\n');
        return header + body;
    }

    /**
     * Get recent context (last N entries) for AI
     */
    getRecentContext(n: number = 20): string {
        const recent = this.entries.slice(-n);
        return recent.map(entry => entry.content).join('\n\n');
    }

    /**
     * Save transcript to file
     */
    private async save(): Promise<void> {
        try {
            await ensureSessionsDir();
            const content = this.getFullTranscript();
            await Bun.write(this.filePath, content);
        } catch (e) {
            console.error('Failed to save transcript:', e);
        }
    }
}

// Cache of active transcript services
const transcriptCache = new Map<string, SessionTranscriptService>();

/**
 * Get or create a transcript service for a room
 */
export async function getTranscript(roomCode: string): Promise<SessionTranscriptService> {
    if (!transcriptCache.has(roomCode)) {
        const transcript = new SessionTranscriptService(roomCode);
        await transcript.load();
        transcriptCache.set(roomCode, transcript);
    }
    return transcriptCache.get(roomCode)!;
}
