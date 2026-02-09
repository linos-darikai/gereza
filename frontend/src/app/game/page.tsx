'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Room } from 'colyseus.js';
import { client } from '../../lib/colyseus';
import { GameState, Player, ChatMessage, PlayerInventory, InventoryItem } from '../../schemas/GameState';

// Types for local state
interface PlayerData {
    sessionId: string;
    username: string;
    characterName: string;
    health: number;
    maxHealth: number;
    status: string;
    isConnected: boolean;
}

interface InventoryItemData {
    name: string;
    description: string;
    icon: string;
}

interface ChatMessageData {
    id: string;
    role: string;
    playerUsername: string;
    content: string;
    sceneTitle: string;
    sceneDescription: string;
    sceneMood: string;
    timestamp: number;
}

interface SuggestedAction {
    label: string;
    description: string;
}

interface DiceRollData {
    result: number;
    dc: number;
    purpose: string;
    success: boolean;
}

// Mood colors for scene cards
const moodColors: Record<string, string> = {
    mysterious: 'from-purple-900/50 to-indigo-900/50 border-purple-500/30',
    dangerous: 'from-red-900/50 to-orange-900/50 border-red-500/30',
    peaceful: 'from-green-900/50 to-emerald-900/50 border-green-500/30',
    tense: 'from-yellow-900/50 to-amber-900/50 border-yellow-500/30'
};

// Scene Card Component
function SceneCard({ title, description, mood = 'mysterious' }: { title: string; description: string; mood: string }) {
    const colorClass = moodColors[mood] || moodColors['mysterious'];

    return (
        <div className={`bg-gradient-to-br ${colorClass} border rounded-lg p-6 backdrop-blur-md shadow-xl animate-fadeIn mb-4`}>
            <h3 className="text-2xl font-bold text-white mb-3 font-serif tracking-wide">{title}</h3>
            <p className="text-gray-100 leading-relaxed text-lg font-light opacity-90">{description}</p>
        </div>
    );
}

// Dice Roll Component
function DiceRoll({ result, dc, purpose, success }: DiceRollData) {
    return (
        <div className="bg-gray-800/80 border border-gray-600 rounded-lg p-4 animate-pulse my-2 shadow-lg backdrop-blur">
            <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${success ? 'text-green-400' : 'text-red-400'} w-16 text-center`}>
                    {result}
                </div>
                <div className="flex-1">
                    <div className="text-sm text-gray-300 font-medium">{purpose}</div>
                    <div className="text-white text-xs opacity-70">d20 vs DC {dc}</div>
                    <div className={`text-lg font-bold mt-1 ${success ? 'text-green-400' : 'text-red-400'}`}>
                        {success ? '✓ SUCCESS' : '✗ FAILED'}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Placeholder to trigger view_file next
// Player Sidebar Component
function PlayerSidebar({ players, currentSessionId, inventories }: {
    players: PlayerData[];
    currentSessionId: string;
    inventories: Map<string, InventoryItemData[]>;
}) {
    const currentPlayer = players.find(p => p.sessionId === currentSessionId);
    const myInventory = inventories.get(currentSessionId) || [];

    const hpPercentage = currentPlayer ?
        Math.min(100, Math.max(0, (currentPlayer.health / currentPlayer.maxHealth) * 100)) : 100;
    const hpColor = hpPercentage > 50 ? '#22c55e' : hpPercentage > 25 ? '#eab308' : '#ef4444';

    return (
        <div className="w-72 bg-gradient-to-b from-stone-900 to-stone-950 border-l-4 border-amber-700 p-4 flex flex-col gap-4 font-mono fixed right-0 top-0 bottom-0 h-screen overflow-hidden z-20 shadow-2xl">
            {/* Title Banner */}
            <div className="bg-gradient-to-r from-amber-900 to-amber-800 border-2 border-amber-600 rounded-sm p-2 text-center shadow-lg">
                <h2 className="text-amber-200 text-lg font-bold tracking-wider" style={{ textShadow: '2px 2px 0 #000' }}>
                    ⚔️ PRISONERS ⚔️
                </h2>
            </div>

            {/* My HP Section */}
            {currentPlayer && (
                <div className="bg-stone-800/80 border-2 border-stone-600 rounded-sm p-3 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-red-400 font-bold text-sm">❤️ YOUR HEALTH</span>
                        <span className="text-white font-bold">{currentPlayer.health}/{currentPlayer.maxHealth}</span>
                    </div>
                    <div className="h-6 bg-stone-900 border-2 border-stone-500 rounded-sm p-0.5 relative overflow-hidden">
                        <div
                            className="h-full transition-all duration-500 rounded-sm"
                            style={{
                                width: `${hpPercentage}%`,
                                background: `linear-gradient(180deg, ${hpColor} 0%, ${hpColor}88 50%, ${hpColor}55 100%)`,
                                boxShadow: `0 0 10px ${hpColor}`
                            }}
                        />
                    </div>
                    {currentPlayer.status && (
                        <div className="mt-2 text-xs text-yellow-400 italic font-bold animate-pulse">
                            ⚠️ {currentPlayer.status}
                        </div>
                    )}
                </div>
            )}

            {/* Party Members */}
            <div className="bg-stone-800/80 border-2 border-stone-600 rounded-sm p-3 shadow-inner">
                <div className="text-amber-400 font-bold text-sm mb-2">👥 PARTY</div>
                <div className="space-y-2">
                    {players.map((p) => (
                        <div key={p.sessionId} className={`flex items-center justify-between text-xs ${p.sessionId === currentSessionId ? 'text-amber-200' : 'text-stone-400'
                            }`}>
                            <span className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                                {p.characterName || p.username}
                            </span>
                            <span className={p.health < 10 ? 'text-red-400' : ''}>{p.health}/{p.maxHealth}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* My Inventory */}
            <div className="bg-stone-800/80 border-2 border-stone-600 rounded-sm p-3 flex-1 flex flex-col min-h-0 shadow-inner">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-600">
                    <span className="text-2xl">🧰</span>
                    <span className="text-amber-400 font-bold text-sm tracking-wide">TOOLS CHEST</span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                    {myInventory.length === 0 ? (
                        <div className="text-stone-500 text-sm italic text-center py-8 opacity-60">Empty...</div>
                    ) : (
                        <div className="space-y-2">
                            {myInventory.map((item, idx) => (
                                <div key={idx} className="bg-stone-900/50 border border-stone-600 rounded-sm p-2 hover:bg-stone-700/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl bg-stone-800 p-1 rounded border border-stone-700">{item.icon}</span>
                                        <div>
                                            <div className="text-amber-200 text-sm font-bold">{item.name}</div>
                                            <div className="text-stone-400 text-xs leading-tight">{item.description}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function GameContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomId = searchParams.get('roomId');

    const [room, setRoom] = useState<Room<GameState> | null>(null);
    const [connecting, setConnecting] = useState(true);
    const [error, setError] = useState('');
    const [inputValue, setInputValue] = useState('');

    // Game state
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [inventories, setInventories] = useState<Map<string, InventoryItemData[]>>(new Map());
    const [chatHistory, setChatHistory] = useState<ChatMessageData[]>([]);
    const [currentScene, setCurrentScene] = useState({ title: '', description: '', mood: 'mysterious' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [gameStatus, setGameStatus] = useState('waiting');
    const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
    const [lastDiceRoll, setLastDiceRoll] = useState<DiceRollData | null>(null);

    // 🔥 Turn tracking
    const [currentTurn, setCurrentTurn] = useState('');
    const [currentTurnName, setCurrentTurnName] = useState('');
    const [turnReason, setTurnReason] = useState('');  // AI's narrative reason
    // eslint-disable-next-line @next/next/no-img-element
    const [sceneImage, setSceneImage] = useState<string | null>(null); // 🔥 Scene Image

    const runOnce = useRef(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    useEffect(() => {
        if (!roomId) {
            router.push('/');
            return;
        }

        if (runOnce.current) return;
        runOnce.current = true;

        const connect = async () => {
            try {
                // 🔥 Read credentials from URL params (supports multi-tab testing)
                // Falls back to localStorage for backward compatibility
                const urlUsername = searchParams.get('username') || localStorage.getItem('gereza_username') || 'Player';
                const urlCharacterName = searchParams.get('characterName') || localStorage.getItem('gereza_characterName') || 'Hero';

                console.log("Joining game as:", urlUsername, urlCharacterName);

                // Join or create the game room using the roomCode
                const gameRoom = await client.joinOrCreate<GameState>('game', {
                    username: urlUsername,
                    characterName: urlCharacterName,
                    roomCode: roomId,  // Pass room code to match lobby
                }, GameState);

                setRoom(gameRoom);

                // Sync state on changes
                gameRoom.onStateChange((state) => {
                    // Update players
                    const playerList: PlayerData[] = [];
                    state.players.forEach((p: Player) => {
                        playerList.push({
                            sessionId: p.sessionId,
                            username: p.username,
                            characterName: p.characterName,
                            health: p.health,
                            maxHealth: p.maxHealth,
                            status: p.status,
                            isConnected: p.isConnected,
                        });
                    });
                    setPlayers(playerList);

                    // Update inventories
                    const invMap = new Map<string, InventoryItemData[]>();
                    state.inventories.forEach((inv: PlayerInventory, key: string) => {
                        const items: InventoryItemData[] = [];
                        for (let i = 0; i < inv.items.length; i++) {
                            const item = inv.items[i];
                            items.push({ name: item.name, description: item.description, icon: item.icon });
                        }
                        invMap.set(key, items);
                    });
                    setInventories(invMap);

                    // Update chat
                    const messages: ChatMessageData[] = [];
                    for (let i = 0; i < state.chatHistory.length; i++) {
                        const m = state.chatHistory[i];
                        messages.push({
                            id: m.id,
                            role: m.role,
                            playerUsername: m.playerUsername,
                            content: m.content,
                            sceneTitle: m.sceneTitle,
                            sceneDescription: m.sceneDescription,
                            sceneMood: m.sceneMood,
                            timestamp: m.timestamp,
                        });
                    }
                    setChatHistory(messages);

                    // Update scene
                    setCurrentScene({
                        title: state.currentSceneTitle,
                        description: state.currentSceneDescription,
                        mood: state.currentSceneMood,
                    });

                    setIsProcessing(state.isProcessing);
                    setGameStatus(state.status);
                });

                // Listen for suggested actions
                gameRoom.onMessage("suggested-actions", (actions: SuggestedAction[]) => {
                    setSuggestedActions(actions);
                });

                // Listen for dice rolls
                gameRoom.onMessage("dice-roll", (roll: DiceRollData) => {
                    setLastDiceRoll(roll);
                    setTimeout(() => setLastDiceRoll(null), 5000);
                });

                gameRoom.onMessage("error", (data: { message: string }) => {
                    console.error("Game error:", data.message);
                    alert(data.message); // Show turn errors to user
                });

                // 🔥 Listen for turn updates with AI's narrative reason
                gameRoom.onMessage("turn-update", (data: { currentTurn: string; currentTurnName: string; message: string }) => {
                    setCurrentTurn(data.currentTurn);
                    setCurrentTurnName(data.currentTurnName);
                    setTurnReason(data.message);
                });

                // 🔥 Listen for generated scene images
                gameRoom.onMessage("scene-image", (data: { image: string }) => {
                    setSceneImage(data.image);
                });

            } catch (e: any) {
                console.error("Failed to join game:", e);
                setError(e.message || "Failed to join game room");
            } finally {
                setConnecting(false);
            }
        };

        connect();

        return () => {
            // Room cleanup happens on unmount
        };
    }, [roomId, router]);

    const handleSendAction = (actionText: string) => {
        if (!actionText.trim() || !room || isProcessing) return;
        room.send("player-action", { action: actionText });
        setInputValue('');
        setSuggestedActions([]);
    };

    const handleStartGame = () => {
        if (!room) return;
        room.send("start-game");
    };

    if (connecting) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-amber-500 font-mono">
                <div className="animate-pulse">CONNECTING TO PRISON NETWORK...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-black text-red-500 font-mono gap-4">
                <div className="text-xl">ERROR: {error}</div>
                <button onClick={() => router.push('/')} className="hover:underline">RETURN TO SAFETY</button>
            </div>
        );
    }

    const isDM = room?.sessionId === players.find(p => p.sessionId === room?.sessionId)?.sessionId;

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-stone-900 to-black text-gray-200">
            {/* Sidebar (Fixed Right) */}
            <PlayerSidebar
                players={players}
                currentSessionId={room?.sessionId || ''}
                inventories={inventories}
            />

            {/* Main Layout Container */}
            <div className="flex min-h-screen pr-72">

                {/* 🎨 LEFT PANEL: Visual Context & Turn Info (Desktop: Fixed 40%, Mobile: Sticky Top) */}
                <div className="hidden lg:flex w-[40%] h-screen sticky top-0 bg-black/40 border-r border-stone-800 flex-col p-6 overflow-hidden">

                    {/* Scene Image Container with Page Flip Animation */}
                    <div className="flex-1 relative mb-6 rounded-lg overflow-hidden border-4 border-stone-800 shadow-2xl group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute inset-0 border-2 border-white/10 z-20 pointer-events-none mix-blend-overlay"></div>
                        {/* Halftone Overlay */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] opacity-20 z-10 mix-blend-multiply pointer-events-none"></div>

                        {sceneImage ? (
                            <img
                                key={sceneImage} // Trigger animation on change
                                src={`data:image/png;base64,${sceneImage}`}
                                alt="Scene"
                                className="w-full h-full object-cover sepia-[0.2] contrast-125 saturate-75 animate-pageFlip origin-left"
                            />
                        ) : (
                            <div className="w-full h-full bg-stone-900 flex items-center justify-center text-stone-700 font-mono">
                                AWAITING VISUALS...
                            </div>
                        )}

                        <div className="absolute bottom-3 right-3 z-30 bg-black/70 px-3 py-1 rounded text-xs text-amber-500/80 font-mono tracking-widest border border-amber-900/50">
                            VISUAL CONTEXT
                        </div>
                    </div>

                    {/* Turn Indicator (Moved to Left Panel) */}
                    <div className={`border rounded-lg p-4 text-center transition-all ${currentTurn === room?.sessionId
                        ? 'bg-green-900/40 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                        : 'bg-amber-900/40 border-amber-600/50'
                        }`}>
                        <div className={`text-lg font-bold tracking-wide ${currentTurn === room?.sessionId ? 'text-green-400' : 'text-amber-400'}`}>
                            {isProcessing ? (
                                <span className="animate-pulse">🎲 The Story Unfolds...</span>
                            ) : currentTurn === room?.sessionId ? (
                                <>
                                    <span className="block text-xl mb-1">⚔️ YOUR TURN!</span>
                                    {turnReason && <span className="text-sm opacity-80 italic block font-serif">"{turnReason}"</span>}
                                </>
                            ) : currentTurnName ? (
                                <>
                                    <span className="block">⏳ {currentTurnName}'s turn</span>
                                    {turnReason && <span className="text-xs opacity-75 italic mt-1 block">"{turnReason}"</span>}
                                </>
                            ) : (
                                <span>⚔️ Waiting...</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 📜 MIDDLE PANEL: Chat & Actions (Scrollable) */}
                <div className="flex-1 flex flex-col relative max-w-3xl mx-auto w-full">
                    {/* Mobile Header (Visible only on small screens) */}
                    <div className="lg:hidden sticky top-0 z-40 bg-stone-900/95 border-b border-amber-900/30 p-4 shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-xl font-bold text-amber-500">GEREZA</h1>
                            <div className="text-[10px] text-stone-600 mt-2">
                                Room: {room?.roomId} • Round: {chatHistory.length}
                            </div>
                        </div>
                        {/* Mobile Scene Image Thumbnail */}
                        {sceneImage && (
                            <div className="h-32 w-full rounded overflow-hidden relative border border-stone-600">
                                <img src={`data:image/png;base64,${sceneImage}`} className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>

                    <div className="p-6 flex-1 flex flex-col min-h-0">
                        {/* Header (Desktop only) */}
                        <header className="text-center mb-8 pt-4 hidden lg:block">
                            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-600 font-serif drop-shadow-sm mb-2">
                                ⚖️ GEREZA
                            </h1>
                            <p className="text-stone-400 tracking-widest text-sm uppercase">Interactive Prison RPG</p>
                        </header>

                        {/* Start Game Button (for DM before game starts) */}
                        {gameStatus === 'waiting' && (
                            <div className="text-center mb-8">
                                <p className="text-stone-500 mb-4">{players.length} player(s) connected</p>
                                <button
                                    onClick={handleStartGame}
                                    className="bg-amber-800 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded border border-amber-600 transition-colors"
                                >
                                    🎮 START THE GAME
                                </button>
                            </div>
                        )}

                        {/* Game Content */}
                        {gameStatus === 'playing' && (
                            <>
                                {/* Removed Turn Indicator & Image from here (Moved to Left Panel) */}

                                {/* Dice Roll Display */}
                                {lastDiceRoll && (
                                    <DiceRoll {...lastDiceRoll} />
                                )}

                                {/* Chat/Action History */}
                                <div className="flex-1 space-y-4 mb-8 max-h-[400px] overflow-y-auto">
                                    {chatHistory.map((msg) => (
                                        <div key={msg.id} className={`animate-fadeIn ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                                            {msg.role === 'user' ? (
                                                <div className="bg-stone-800 text-stone-200 border border-stone-600 rounded-2xl rounded-tr-sm px-6 py-3 max-w-xl">
                                                    <span className="text-amber-400 text-xs font-bold">{msg.playerUsername}: </span>
                                                    {msg.content}
                                                </div>
                                            ) : (
                                                <SceneCard
                                                    title={msg.sceneTitle}
                                                    description={msg.sceneDescription}
                                                    mood={msg.sceneMood}
                                                />
                                            )}
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Suggested Actions */}
                                {suggestedActions.length > 0 && !isProcessing && (
                                    <div className="space-y-2 mb-4">
                                        {suggestedActions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                className="bg-stone-800/80 hover:bg-stone-700 border-l-4 border-amber-600 rounded-r-lg p-3 w-full text-left transition-all hover:translate-x-1 group"
                                                onClick={() => handleSendAction(action.label)}
                                            >
                                                <div className="font-bold text-amber-100 group-hover:text-white">{action.label}</div>
                                                <div className="text-sm text-stone-400">{action.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Processing Indicator */}
                                {isProcessing && (
                                    <div className="flex items-center gap-2 text-stone-500 text-sm animate-pulse mb-4">
                                        <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce delay-75" />
                                        <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce delay-150" />
                                        <span>The Dungeon Master is weaving fate...</span>
                                    </div>
                                )}

                            </>
                        )}
                    </div>

                    {/* Input Area (Only visible when playing) */}
                    {gameStatus === 'playing' && (
                        <div className="p-6 pt-0 sticky bottom-0 bg-gradient-to-t from-stone-900 via-stone-900 to-transparent z-10">
                            <div className="bg-stone-900/90 border border-stone-700 rounded-xl p-2 shadow-2xl backdrop-blur-sm">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="What do you do?"
                                        className="w-full bg-stone-950/50 text-white border border-stone-700/50 rounded-lg pl-4 pr-12 py-4 focus:outline-none focus:border-red-500/50 focus:bg-black transition-colors"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendAction(inputValue)}
                                        disabled={isProcessing}
                                    />
                                    <button
                                        onClick={() => handleSendAction(inputValue)}
                                        disabled={isProcessing || !inputValue.trim()}
                                        className="absolute right-2 top-2 bottom-2 bg-stone-800 hover:bg-stone-700 text-stone-300 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ➤
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function GamePage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-black text-amber-500 font-mono">
                <div className="animate-pulse">LOADING...</div>
            </div>
        }>
            <GameContent />
        </Suspense>
    );
}
