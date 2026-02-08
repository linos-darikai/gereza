import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:3000/api';

// --- Types ---

export interface Player {
    id: number;
    user_id: string;
    username: string;
    character_name?: string;
    created_at: number;
    updated_at: number;
}

export interface GameSession {
    id: number;
    room_id: string;
    room_type: 'lobby' | 'game';
    room_code: string;
    dm_id: string;
    status: 'active' | 'completed' | 'abandoned';
    max_players: number;
    currentPlayers?: number;
    created_at: number;
    started_at?: number;
    ended_at?: number;
    metadata?: string;
}

export interface PlayerSession {
    id: number;
    game_session_id: number;
    player_id: number;
    session_id: string;
    status: 'connected' | 'disconnected' | 'left' | 'kicked';
    approved: boolean;
    health: number;
    joined_at: number;
    last_seen: number;
    player?: Player;
}

export interface GameEvent {
    id: number;
    game_session_id: number;
    event_type: string;
    player_id?: number;
    event_data?: any;
    created_at: number;
    player?: Player;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
}

// --- Helper Hook for API Calls ---

function useGameServerApi() {
    const request = useCallback(async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });

            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Server returned ${response.status}: Expected JSON but got ${contentType}. Is the backend server running?`);
            }

            const result: ApiResponse<T> = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'API request failed');
            }

            return result.data;
        } catch (error: any) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }, []);

    return { request };
}

// --- Hooks ---

/**
 * Hook to fetch active lobbies and manage lobby list
 */
export function useLobby() {
    const { request } = useGameServerApi();
    const [lobbies, setLobbies] = useState<GameSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLobbies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await request<GameSession[]>('/games');
            // Filter for only 'lobby' type and 'active' status if needed, 
            // but the API currently returns all active games. 
            // We might want to filter client-side or assume API does it.
            // For now, let's just return what the API gives, maybe filtering for active lobbies.
            const activeLobbies = data.filter(g => g.room_type === 'lobby' && g.status === 'active');
            setLobbies(activeLobbies);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [request]);

    // Auto-fetch on mount
    useEffect(() => {
        fetchLobbies();

        // Poll every 5 seconds
        const interval = setInterval(fetchLobbies, 5000);
        return () => clearInterval(interval);
    }, [fetchLobbies]);

    return { lobbies, loading, error, refresh: fetchLobbies };
}

/**
 * Hook to manage a specific game's state (Lobby or Game Room)
 */
export function useGame(roomId?: string) {
    const { request } = useGameServerApi();
    const [game, setGame] = useState<GameSession | null>(null);
    const [players, setPlayers] = useState<PlayerSession[]>([]);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGameData = useCallback(async () => {
        if (!roomId) return;

        setLoading(true);
        setError(null);
        try {
            const [gameData, playersData, eventsData] = await Promise.all([
                request<GameSession>(`/games/${roomId}`),
                request<PlayerSession[]>(`/games/${roomId}/players`),
                request<GameEvent[]>(`/games/${roomId}/events`)
            ]);

            setGame(gameData);
            setPlayers(playersData);
            setEvents(eventsData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [roomId, request]);

    useEffect(() => {
        if (roomId) {
            fetchGameData();
            // Poll every 2 seconds for active game data
            const interval = setInterval(fetchGameData, 2000);
            return () => clearInterval(interval);
        }
    }, [roomId, fetchGameData]);

    return { game, players, events, loading, error, refresh: fetchGameData };
}

/**
 * Hook to manage player data
 */
export function usePlayer(userId?: string) {
    const { request } = useGameServerApi();
    const [player, setPlayer] = useState<Player | null>(null);
    const [history, setHistory] = useState<any[]>([]); // Define specific history type if known
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPlayerData = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        setError(null);
        try {
            const [playerData, historyData] = await Promise.all([
                request<Player>(`/players/${userId}`),
                request<any[]>(`/players/${userId}/history`)
            ]);

            setPlayer(playerData);
            setHistory(historyData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, request]);

    useEffect(() => {
        if (userId) {
            fetchPlayerData();
        }
    }, [userId, fetchPlayerData]);

    return { player, history, loading, error, refresh: fetchPlayerData };
}
