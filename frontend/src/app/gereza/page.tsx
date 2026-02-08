'use client'

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react'
import { useUiChat, exposeComponent } from '@hashbrownai/react'
import { s } from '@hashbrownai/core'

// ============================================================
// GAME STATE CONTEXT
// ============================================================

interface InventoryItem {
    name: string
    description: string
    icon: string
}

interface GameState {
    hp: number
    maxHp: number
    status: string
    inventory: InventoryItem[]
}

interface GameContextType {
    gameState: GameState
    updateGameState: (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => void
    addItem: (item: InventoryItem) => void
    removeItem: (itemName: string) => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

function GameProvider({ children }: { children: ReactNode }) {
    const [gameState, setGameState] = useState<GameState>({
        hp: 20,
        maxHp: 20,
        status: '',
        inventory: []
    })

    const updateGameState = useCallback((updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => {
        setGameState(prev => {
            const newValues = typeof updates === 'function' ? updates(prev) : updates
            return { ...prev, ...newValues }
        })
    }, [])

    const addItem = useCallback((item: InventoryItem) => {
        setGameState(prev => {
            if (prev.inventory.some(i => i.name === item.name)) return prev
            return {
                ...prev,
                inventory: [...prev.inventory, item]
            }
        })
    }, [])

    const removeItem = useCallback((itemName: string) => {
        setGameState(prev => ({
            ...prev,
            inventory: prev.inventory.filter(i => i.name !== itemName)
        }))
    }, [])

    return (
        <GameContext.Provider value={{ gameState, updateGameState, addItem, removeItem }}>
            {children}
        </GameContext.Provider>
    )
}

function useGame() {
    const context = useContext(GameContext)
    if (!context) throw new Error('useGame must be used within a GameProvider')
    return context
}

// ============================================================
// RETRO SIDEBAR COMPONENT
// ============================================================

function RetroSidebar() {
    const { gameState } = useGame()

    // Ensure accurate HP percentage even with 0 maxHp (avoid NaN)
    const maxHp = Math.max(1, gameState.maxHp)
    const hpPercentage = Math.min(100, Math.max(0, (gameState.hp / maxHp) * 100))
    const hpColor = hpPercentage > 50 ? '#22c55e' : hpPercentage > 25 ? '#eab308' : '#ef4444'

    return (
        <div className="w-72 bg-gradient-to-b from-stone-900 to-stone-950 border-l-4 border-amber-700 p-4 flex flex-col gap-4 font-mono fixed right-0 top-0 bottom-0 h-screen overflow-hidden z-20 shadow-2xl">
            {/* Title Banner */}
            <div className="bg-gradient-to-r from-amber-900 to-amber-800 border-2 border-amber-600 rounded-sm p-2 text-center shadow-lg">
                <h2 className="text-amber-200 text-lg font-bold tracking-wider" style={{ textShadow: '2px 2px 0 #000' }}>
                    ⚔️ PRISONER ⚔️
                </h2>
            </div>

            {/* HP Section */}
            <div className="bg-stone-800/80 border-2 border-stone-600 rounded-sm p-3 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-red-400 font-bold text-sm">❤️ HEALTH</span>
                    <span className="text-white font-bold">{Math.round(gameState.hp)}/{maxHp}</span>
                </div>
                {/* Retro HP Bar */}
                <div className="h-6 bg-stone-900 border-2 border-stone-500 rounded-sm p-0.5 relative overflow-hidden">
                    <div
                        className="h-full transition-all duration-500 rounded-sm"
                        style={{
                            width: `${hpPercentage}%`,
                            background: `linear-gradient(180deg, ${hpColor} 0%, ${hpColor}88 50%, ${hpColor}55 100%)`,
                            boxShadow: `0 0 10px ${hpColor}`
                        }}
                    />
                    {/* Pixel segments */}
                    <div className="absolute inset-0 flex gap-0.5 p-0.5 pointer-events-none">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex-1 border-r border-stone-700/50 last:border-r-0" />
                        ))}
                    </div>
                </div>
                {/* Status */}
                {gameState.status && (
                    <div className="mt-2 text-xs text-yellow-400 italic font-bold animate-pulse">
                        ⚠️ {gameState.status}
                    </div>
                )}
            </div>

            {/* Tools Chest */}
            <div className="bg-stone-800/80 border-2 border-stone-600 rounded-sm p-3 flex-1 flex flex-col min-h-0 shadow-inner">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-600">
                    <span className="text-2xl">🧰</span>
                    <span className="text-amber-400 font-bold text-sm tracking-wide">TOOLS CHEST</span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {gameState.inventory.length === 0 ? (
                        <div className="text-stone-500 text-sm italic text-center py-8 opacity-60">
                            Empty...
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {gameState.inventory.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="bg-stone-900/50 border border-stone-600 rounded-sm p-2 hover:bg-stone-700/50 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl bg-stone-800 p-1 rounded border border-stone-700 group-hover:border-stone-500 transition-colors">{item.icon}</span>
                                        <div>
                                            <div className="text-amber-200 text-sm font-bold group-hover:text-amber-100">{item.name}</div>
                                            <div className="text-stone-400 text-xs leading-tight">{item.description}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Footer */}
            <div className="bg-stone-800/50 border border-stone-600 rounded-sm p-2 text-xs text-stone-400 backdrop-blur">
                <div className="flex justify-between">
                    <span>📍 Location:</span>
                    <span className="text-amber-300 font-semibold">Prison Cell</span>
                </div>
                <div className="flex justify-between mt-1">
                    <span>🎲 Luck:</span>
                    <span className="text-green-400 font-semibold">Normal</span>
                </div>
            </div>
        </div>
    )
}

// ============================================================
// GEREZA COMPONENTS
// ============================================================

interface SceneCardProps {
    title: string
    description: string
    imageUrl?: string
    mood: string
}

function SceneCard({ title, description, imageUrl, mood = 'mysterious' }: SceneCardProps) {
    const moodColors: Record<string, string> = {
        mysterious: 'from-purple-900/50 to-indigo-900/50 border-purple-500/30',
        dangerous: 'from-red-900/50 to-orange-900/50 border-red-500/30',
        peaceful: 'from-green-900/50 to-emerald-900/50 border-green-500/30',
        tense: 'from-yellow-900/50 to-amber-900/50 border-yellow-500/30'
    }

    // Fallback if mood is invalid
    const colorClass = moodColors[mood] || moodColors['mysterious']

    return (
        <div className={`bg-gradient-to-br ${colorClass} border rounded-lg p-6 backdrop-blur-md shadow-xl animate-fadeIn mb-4`}>
            {imageUrl && (
                <div className="mb-4 rounded-lg overflow-hidden border border-white/10 shadow-inner bg-black/50">
                    <img src={imageUrl} alt={title} className="w-full h-64 object-cover animate-fadeIn" />
                </div>
            )}
            <h3 className="text-2xl font-bold text-white mb-3 font-serif tracking-wide">{title}</h3>
            <p className="text-gray-100 leading-relaxed text-lg font-light opacity-90">{description}</p>
        </div>
    )
}

interface DiceRollProps {
    result: number
    sides: number
    purpose: string
    dc: number
}

function DiceRoll({ result, sides, purpose, dc = 15 }: DiceRollProps) {
    const isSuccess = result >= dc

    return (
        <div className="bg-gray-800/80 border border-gray-600 rounded-lg p-4 animate-rollIn my-2 shadow-lg backdrop-blur">
            <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${isSuccess ? 'text-green-400' : 'text-red-400'} w-16 text-center`}>
                    {result}
                </div>
                <div className="flex-1">
                    <div className="text-sm text-gray-300 font-medium">{purpose}</div>
                    <div className="text-white text-xs opacity-70">
                        d{sides} vs DC {dc}
                    </div>
                    <div className={`text-lg font-bold mt-1 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                        {isSuccess ? '✓ SUCCESS' : '✗ FAILED'}
                    </div>
                </div>
            </div>
        </div>
    )
}

interface ActionButtonProps {
    label: string
    description: string
    variant: string
}

function ActionButton({ label, description, variant = 'primary' }: ActionButtonProps) {
    const variantStyles: Record<string, string> = {
        primary: 'bg-red-700/80 hover:bg-red-600 border-red-500/50 text-white',
        secondary: 'bg-gray-800/80 hover:bg-gray-700 border-gray-600/50 text-gray-200',
        danger: 'bg-orange-700/80 hover:bg-orange-600 border-orange-500/50 text-white'
    }

    // Fallback if variant is invalid
    const styleClass = variantStyles[variant] || variantStyles['primary']

    return (
        <button
            className={`${styleClass} border-l-4 rounded-r-lg p-4 w-full text-left cursor-pointer transition-all hover:translate-x-1 hover:shadow-lg mb-2 group`}
            onClick={() => {
                const input = document.querySelector('input[type="text"]') as HTMLInputElement
                if (input) {
                    input.value = label
                    input.focus()
                }
            }}
        >
            <div className="font-bold text-lg group-hover:text-white transition-colors flex items-center justify-between">
                {label}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">➤</span>
            </div>
            {description && <div className="text-sm font-light opacity-80 mt-1">{description}</div>}
        </button>
    )
}

// ============================================================
// LOGIC COMPONENTS
// ============================================================

interface GameStateUpdateProps {
    hpChange: number
    newStatus: string
    addItem: { name: string; description: string; icon: string } | null
    removeItem: string
}

function GameStateUpdate({ hpChange = 0, newStatus = "", addItem: newItem, removeItem: removeName = "" }: GameStateUpdateProps) {
    const { updateGameState, addItem, removeItem } = useGame()
    // Prevent double-execution in Strict Mode
    const hasRun = useRef(false)

    useEffect(() => {
        if (hasRun.current) return
        hasRun.current = true

        if (hpChange !== 0) {
            updateGameState(prev => ({
                ...prev,
                hp: Math.max(0, Math.min(prev.maxHp, prev.hp + hpChange))
            }))
        }
        if (newStatus !== "") {
            updateGameState({ status: newStatus })
        }
        if (newItem) {
            addItem(newItem)
        }
        if (removeName !== "") {
            removeItem(removeName)
        }
    }, [hpChange, newStatus, newItem, removeName, updateGameState, addItem, removeItem])

    return (
        <div className="text-xs font-mono border-l-2 border-stone-500 pl-2 my-2 opacity-70">
            {typeof hpChange === 'number' && hpChange < 0 && <div className="text-red-400">🔻 Took {Math.abs(hpChange)} damage</div>}
            {typeof hpChange === 'number' && hpChange > 0 && <div className="text-green-400">💚 Healed {hpChange} HP</div>}
            {newStatus && <div className="text-yellow-400">⚠️ Status: {newStatus}</div>}
            {newItem && <div className="text-amber-300">📦 Obtained: {newItem.name}</div>}
            {removeName && <div className="text-stone-400">🗑️ Lost: {removeName}</div>}
        </div>
    )
}

// ============================================================
// EXPOSED COMPONENT DEFINITIONS
// ============================================================

const exposedSceneCard = exposeComponent(SmartSceneCard, {
    name: 'SceneCard',
    description: 'Display a scene description. Always use this first in your response.',
    props: {
        title: s.string('Title of the scene'),
        description: s.streaming.string('Vivid description'),
        mood: s.string('Atmosphere: mysterious, dangerous, peaceful, tense')
    }
})

const exposedDiceRoll = exposeComponent(DiceRoll, {
    name: 'DiceRoll',
    description: 'Show a dice roll result for skill checks.',
    props: {
        result: s.number('The result (1-20)'),
        sides: s.number('Sides (usually 20)'),
        purpose: s.string('Reason for roll'),
        dc: s.number('Difficulty Class')
    }
})

const exposedActionButton = exposeComponent(ActionButton, {
    name: 'ActionButton',
    description: 'Suggest an action the player can take.',
    props: {
        label: s.string('Action text'),
        description: s.string('Potential outcome hint'),
        variant: s.string('Style variant: primary, secondary, danger')
    }
})

const exposedGameStateUpdate = exposeComponent(GameStateUpdate, {
    name: 'GameStateUpdate',
    description: 'CRITICAL: Updates the game HUD/Sidebar. Use this immediately when player takes damage, heals, gets items, etc. Pass 0/empty string if no change.',
    props: {
        hpChange: s.number('Change in HP (negative for damage). Pass 0 if no change.'),
        newStatus: s.string('New status effect. Pass empty string if no change.'),
        addItem: s.anyOf([
            s.object('Item to add', {
                name: s.string('Name'),
                description: s.string('Description'),
                icon: s.string('Icon/Emoji')
            }),
            s.nullish()
        ]),
        removeItem: s.string('Item name to remove. Pass empty string if no change.')
    }
})

// ============================================================
// MAIN GAME LAYOUT & LOGIC
// ============================================================


// --- Smart Scene Card for Image Generation ---
function SmartSceneCard({ title, description, mood = 'mysterious' }: { title: string, description: string, mood: string }) {
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false) // Start false, only true when actually fetching
    const [error, setError] = useState(false)
    const lastFetchedDescription = useRef('')

    useEffect(() => {
        // 1. If we already have an image for this EXACT description, do nothing.
        if (!description || description === lastFetchedDescription.current) return

        // 2. Clear unrelated state if description changes radically (optional, but good for new cards)
        // Actually, since this component is reused or new instances created? 
        // Hashbrown creates new instances for new UI elements usually.

        // 3. Debounce the fetch to wait for streaming to finish
        const timeoutId = setTimeout(() => {
            let mounted = true
            const fetchImage = async () => {
                try {
                    setLoading(true)
                    lastFetchedDescription.current = description

                    // Sanity check: don't fetch for very short prompts
                    if (description.length < 15) {
                        setLoading(false)
                        return
                    }

                    const res = await fetch('/api/image', {
                        method: 'POST',
                        body: JSON.stringify({ prompt: description, mood }),
                    })

                    if (!res.ok) throw new Error('Failed to generate')

                    const data = await res.json()
                    if (mounted && data.imageUrl) {
                        setImageUrl(data.imageUrl)
                    }
                } catch (e) {
                    if (mounted) setError(true)
                } finally {
                    if (mounted) setLoading(false)
                }
            }
            fetchImage()
        }, 1200) // Wait 1.2s after last character to ensure stream is mostly done

        return () => clearTimeout(timeoutId)
    }, [description, mood])

    // Map mood to basic SceneCard styling
    return (
        <div className="relative group">
            <SceneCard
                title={title}
                description={description}
                imageUrl={imageUrl || undefined}
                mood={mood}
            />
            {loading && (
                <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-white/10 animate-pulse">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                    <span className="text-xs text-purple-200 font-medium">Dreaming...</span>
                </div>
            )}
        </div>
    )
}

function GameContent() {

    const [inputValue, setInputValue] = useState('')
    // Cast to any to access error property which might not be in the strict type definition but is available at runtime
    const { messages, sendMessage, isLoading, error } = useUiChat({
        model: 'gemini-3-flash-preview',
        system: `You are the dungeon master for GEREZA, a dark prison escape adventure game.

SETTING:
- The player is trapped in a mysterious medieval prison called "Gereza"
- Strange magic permeates the walls
- Guards are ruthless but can be outsmarted

YOUR ROLE:
1. Describe scenes vividly using SceneCard
2. Suggest 2-3 actions using ActionButton
3. Resolve risky actions with DiceRoll
4. **ALWAYS** track state using GameStateUpdate. If the player gets hurt, use hpChange. If they find an item, use addItem.

Use GameStateUpdate aggressively to keep the sidebar alive!

INITIAL STATE: Player has 20/20 HP, no items.
START: Describe waking up in a cold cell. Give an initial choice.`,
        components: [
            exposedSceneCard,
            exposedDiceRoll,
            exposedActionButton,
            exposedGameStateUpdate
        ]
    }) as any

    const handleSend = (text: string) => {
        if (!text.trim() || isLoading) return
        sendMessage({ role: 'user', content: text })
        setInputValue('')
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-stone-900 to-black text-gray-200">
            {/* Sidebar (Fixed position) */}
            <RetroSidebar />

            {/* Main Content Wrapper - Adds padding for sidebar so content centers in remaining space */}
            <div className="pr-72 min-h-screen flex flex-col">
                {/* Centered Content Area */}
                <div className="max-w-4xl w-full mx-auto p-8 flex-1 flex flex-col">
                    {/* Header */}
                    <header className="text-center mb-12 animate-fadeIn pt-8">
                        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-600 font-serif drop-shadow-sm mb-2">
                            ⚖️ GEREZA
                        </h1>
                        <p className="text-stone-400 tracking-widest text-sm uppercase">AI-Powered Prison Escape</p>
                        <div className="flex justify-center gap-2 mt-2 text-[10px] text-stone-600">
                            <span className="border border-stone-700 px-2 py-0.5 rounded">Beta</span>
                            <span className="border border-stone-700 px-2 py-0.5 rounded">Gemini 3 Flash</span>
                            <span className="border border-stone-700 px-2 py-0.5 rounded">Hashbrown</span>
                        </div>
                    </header>

                    {/* Chat Area */}
                    <div className="flex-1 space-y-6 mb-8 relative">

                        {/* Error Alert */}
                        {error && (
                            <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-4 rounded-lg animate-pulse backdrop-blur-sm shadow-xl">
                                <strong className="text-red-400">⚠️ CONNECTION LOST:</strong>
                                <span className="ml-2 opacity-90">{error.message || 'The Dungeon Master has temporarily vanished.'}</span>
                                <div className="mt-2 text-xs opacity-70">
                                    The free AI tier (Gemini 3 Flash) can be unstable. Please try again in a moment.
                                </div>
                            </div>
                        )}

                        {messages.length === 0 && (
                            <div className="text-center py-20 animate-pulse text-stone-500">
                                The cell door creaks... <br />
                                <button
                                    onClick={() => handleSend('I wake up and look around')}
                                    className="mt-8 bg-red-800 hover:bg-red-700 text-white font-bold py-3 px-8 rounded shadow-lg transition-transform hover:scale-105 active:scale-95 border border-red-600"
                                >
                                    START ADVENTURE
                                </button>
                            </div>
                        )}

                        {messages.map((msg: any, idx: number) => (
                            <div key={idx} className={`animate-fadeIn ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                                {msg.role === 'user' ? (
                                    <div className="bg-stone-800 text-stone-200 border border-stone-600 rounded-2xl rounded-tr-sm px-6 py-3 max-w-xl shadow-md">
                                        {msg.content}
                                    </div>
                                ) : (
                                    <div className="w-full space-y-4">
                                        {msg.ui}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-center gap-2 text-stone-500 text-sm animate-pulse ml-2">
                                <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                <span>The Dungeon Master is thinking...</span>
                            </div>
                        )}
                    </div>

                    {/* Input Area (Sticky Bottom) */}
                    <div className="bg-stone-900/90 border border-stone-700 rounded-xl p-2 shadow-2xl backdrop-blur-sm sticky bottom-8 z-10 mx-auto w-full max-w-2xl">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="What do you do?"
                                className="w-full bg-stone-950/50 text-white border border-stone-700/50 rounded-lg pl-4 pr-12 py-4 focus:outline-none focus:border-red-500/50 focus:bg-black transition-colors"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSend(inputValue)
                                }}
                                autoFocus
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handleSend(inputValue)}
                                disabled={isLoading || !inputValue.trim()}
                                className="absolute right-2 top-2 bottom-2 bg-stone-800 hover:bg-stone-700 text-stone-300 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function GerezaPage() {
    return (
        <GameProvider>
            <GameContent />
        </GameProvider>
    )
}
