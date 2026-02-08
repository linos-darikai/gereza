'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { client } from '../../lib/colyseus';
import { Room, getStateCallbacks } from 'colyseus.js';
import { MapSchema } from '@colyseus/schema';
import { LobbyState, Player } from '../../schemas/LobbyState';

interface PlayerData {
    sessionId: string;
    username: string;
    characterName: string;
    status: string;
}

function LobbyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [room, setRoom] = useState<Room<LobbyState> | null>(null);
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [roomCode, setRoomCode] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [connecting, setConnecting] = useState(true);

    const username = searchParams.get('username');
    const characterName = searchParams.get('characterName');
    const createMode = searchParams.get('create');
    const targetRoomCode = searchParams.get('roomCode');

    const runOnce = useRef(false);

    useEffect(() => {
        if (!username || !characterName) {
            router.push('/join');
            return;
        }

        if (runOnce.current) return;
        runOnce.current = true;

        let currentRoom: Room<LobbyState> | null = null;

        const connect = async () => {
            try {
                let newRoom: Room<LobbyState>;
                const options: any = { username, characterName };

                if (createMode) {
                    options.isDM = true;
                    // If we passed a roomCode from frontend, use it
                    if (targetRoomCode) {
                        options.roomCode = targetRoomCode;
                    }
                    newRoom = await client.create('lobby', options, LobbyState);
                } else if (targetRoomCode) {
                    newRoom = await client.joinById(targetRoomCode, options, LobbyState);
                } else {
                    throw new Error("No room code provided");
                }

                currentRoom = newRoom;
                setRoom(newRoom);
                setRoomCode(newRoom.state.roomCode || newRoom.roomId);

                // Helper to convert Schema Player to POJO
                const getPlayerPOJO = (p: Player): PlayerData => ({
                    sessionId: p.sessionId,
                    username: p.username || "Unknown",
                    characterName: p.characterName || "Unknown",
                    status: p.status || "pending"
                });

                // Initial players
                const initialPlayers: PlayerData[] = [];
                if (newRoom.state.players) {
                    // Use any cast to avoid version mismatch issues with MapSchema/ArraySchema types
                    (newRoom.state.players as any).forEach((player: Player) => {
                        initialPlayers.push(getPlayerPOJO(player));
                    });
                }
                setPlayers(initialPlayers);

                // Listen for changes
                // Listen for changes
                // Listen for changes
                // Listen for changes via onStateChange (Robust fallback for all changes including nested updates)
                newRoom.onStateChange((state) => {
                    console.log("State changed:", state);
                    const currentPlayers: PlayerData[] = [];
                    if (state.players) {
                        (state.players as any).forEach((player: Player) => {
                            currentPlayers.push(getPlayerPOJO(player));
                        });
                    }
                    setPlayers(currentPlayers);

                    if (state.gameStarted) {
                        router.push('/game');
                    }
                });

                // We can keep specific gameStarted listener if we want instant reaction, 
                // but onStateChange covers it.

                // Still try to attach gameStarted explicitly if possible for faster response, 
                // but simpler to just rely on onStateChange for everything in this version.

                // Remove the old complex callback logic to avoid confusion.

            } catch (e: any) {
                console.error("Join error:", e);
                // reset runOnce if connection failed so we can retry? 
                // typically if it fails immediately in useEffect we might want to allow user to retry manually
                // runOnce.current = false; 
                setError(e.message || "Failed to join room");
            } finally {
                setConnecting(false);
            }
        };

        connect();

        return () => {
            if (currentRoom) {
                currentRoom.leave();
            }
            // Strict mode hack: if we unmount immediately, we might want to reset runOnce?
            // Actually no, for strict mode we want to KEEP runOnce true so the second mount DOESNT run.
        }
    }, [createMode, targetRoomCode, username, characterName, router]);

    if (connecting) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-black text-amber-500 font-mono">
                <div className="animate-pulse">CONNECTING TO MAINFRAME...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-black text-red-500 font-mono gap-4">
                <div className="text-xl">ERROR: {error}</div>
                <button onClick={() => router.push('/')} className="hover:underline">RETURN TO SAFETY</button>
            </div>
        )
    }

    const isDM = room && room.sessionId === (room.state as any).dmId;

    return (
        <div className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-b from-stone-900 to-black text-stone-200 font-serif">
            <header className="mb-12 text-center">
                <h1 className="text-4xl text-amber-600 font-bold tracking-wider mb-2">LOBBY</h1>
                {roomCode && (
                    <div className="font-mono bg-stone-800 border border-amber-900/50 px-6 py-2 rounded">
                        ROOM CODE: <span className="text-2xl text-white font-bold tracking-widest ml-2">{roomCode}</span>
                    </div>
                )}
            </header>

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Players List */}
                <div className="bg-stone-900/50 border border-stone-700 p-6 rounded min-h-[400px]">
                    <h2 className="text-xl text-stone-400 border-b border-stone-700 pb-2 mb-4 font-mono uppercase">Prisoners ({players.length}/6)</h2>
                    <ul className="space-y-3">
                        {players.map((p, i) => (
                            <li key={i} className="flex items-center justify-between bg-black/40 p-3 rounded border border-stone-800 animate-fadeIn">
                                <div>
                                    <span className="font-bold text-lg text-stone-200">{p.username}</span>
                                    <div className="text-xs text-stone-500 font-mono uppercase flex gap-2">
                                        <span>{p.characterName}</span>
                                        <span>•</span>
                                        <span className={p.status === 'approved' ? 'text-green-500' : p.status === 'rejected' ? 'text-red-500' : 'text-amber-500'}>{p.status}</span>
                                        {(room?.state as any)?.dmId === p.sessionId && (
                                            <>
                                                <span>•</span>
                                                <span className="text-purple-400 font-bold">WARDEN (DM)</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {isDM && p.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => room?.send("approve-player", { playerId: p.sessionId, approved: true })}
                                                className="text-xs bg-green-900 hover:bg-green-700 text-green-100 px-2 py-1 rounded"
                                            >
                                                ALLOW
                                            </button>
                                            <button
                                                onClick={() => room?.send("approve-player", { playerId: p.sessionId, approved: false })}
                                                className="text-xs bg-red-900 hover:bg-red-700 text-red-100 px-2 py-1 rounded"
                                            >
                                                DENY
                                            </button>
                                        </>
                                    )}
                                    <div className={`h-2 w-2 rounded-full ${p.status === 'approved' ? 'bg-green-500 box-shadow-green' : 'bg-amber-500'}`}></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Info / Chat / Start */}
                <div className="flex flex-col gap-4">
                    <div className="bg-stone-900/50 border border-stone-700 p-6 rounded flex-1">
                        <h2 className="text-xl text-stone-400 border-b border-stone-700 pb-2 mb-4 font-mono uppercase">Directives</h2>
                        <div className="text-stone-500 italic">
                            {isDM ? "You are the Warden (DM). Approve prisoners and start the simulation." : "Waiting for the Warden (DM) to initiate the sequence..."}
                        </div>
                    </div>

                    {isDM && (
                        <button
                            className="w-full bg-amber-900 hover:bg-amber-800 text-white font-bold py-4 rounded border border-amber-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                                room?.send("start-game");
                            }}
                        >
                            START GAME
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}

export default function LobbyPage() {
    return (
        <Suspense>
            <LobbyContent />
        </Suspense>
    )
}
