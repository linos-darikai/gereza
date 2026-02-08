# Colyseus Complete Reference Guide

This document combines the essential Colyseus documentation for Server configuration, Room lifecycle, and State synchronization.

---

## Table of Contents

1. [Server Configuration](#server-configuration)
2. [Room System](#room-system)
3. [State Synchronization](#state-synchronization)

---

## Server Configuration

### Overview

Colyseus Server is a framework component that manages server configuration, including transport layer setup, presence management, and matchmaking drivers. The recommended initialization uses `npm create colyseus-app@latest`.

### Core Configuration Options

**Transport Layer**: Handles bidirectional communication between server and client, defaulting to WebSocketTransport. Custom options like `pingInterval` can be configured.

**Presence System**: Required for multi-process deployments, with Redis as a common implementation for cross-server communication.

**Driver**: Stores and queries rooms during matchmaking operations across your infrastructure.

### Room Definition

Rooms are defined through a configuration object using `defineRoom()`, which accepts a Room class and optional default parameters. **Rooms are not created during configuration** but rather upon client request.

### Advanced Features

**Filtering & Sorting**: Rooms support matchmaking refinement through `.filterBy()` for specific options and `.sortBy()` for priority-based selection.

**Development Mode**: When enabled, preserves room state across server restarts during local development.

**Lifecycle Events**: Monitor room creation, disposal, and client joins/leaves for logging and analytics.

**Graceful Shutdown**: Automatic or manual shutdown handling ensures clean server termination.

### Key Server Methods

- `listen(port)` - Binds the transport layer
- `onBeforeShutdown()` / `onShutdown()` - Custom shutdown callbacks
- `simulateLatency()` - Development-only latency simulation

---

## Room System

### Core Concept

The `Room` class serves as the foundation of Colyseus, representing isolated game sessions where clients interact through shared state and messages. Rooms provide:

- **Isolation**: Each room is an independent game session
- **Encapsulation**: Game logic contained within room boundaries
- **Scalability**: Rooms can scale across multiple processes
- **Flexibility**: Customizable room behavior and matchmaking

### Lifecycle Events

Rooms follow a specific lifecycle with these key hooks:

#### onCreate(options)
Initializes the room when created by the matchmaker. This is where you set up your initial state and game logic.

#### onAuth(client, options)
Validates client authentication before joining. Return `true` or user data to allow, throw an error to reject.

#### onJoin(client, options)
Triggered when a client successfully joins the room. Use this to initialize player-specific data.

#### onDrop(client, consented?)
Called when a client disconnects unexpectedly. The client may reconnect if `allowReconnection()` was called.

#### onReconnect(client, sessionId)
Fired when a dropped client successfully reconnects using their reconnection token.

#### onLeave(client, consented?)
Activated when a client intentionally leaves or is removed. Use for cleanup and notifying other players.

#### onDispose()
Cleanup callback when the room is destroyed. Clean up resources, save data, etc.

#### Additional Lifecycle Hooks

- `onBeforePatch()` - Called before state synchronization
- `onUncaughtException(error)` - Global error handler for the room
- `onBeforeShutdown()` - Called during graceful server shutdown

### Key Methods

#### State Management

- **setSimulationInterval(callback, delay)** - Establishes a game loop for state updates
- **broadcastPatch()** - Manually synchronizes state changes to clients

#### Communication

- **broadcast(type, payload, options?)** - Sends messages to all or selected clients
  - Options: `{ except: client }`, `{ afterNextPatch: true }`
- **client.send(type, payload)** - Sends messages to individual clients

#### Room Control

- **lock()** / **unlock()** - Controls whether new clients can join
- **setMetadata(metadata)** - Updates room metadata for matchmaking
- **setMatchmaking(matchmaking)** - Updates matchmaking properties
- **disconnect()** - Disconnects all clients and disposes the room
- **allowReconnection(client, seconds)** - Permits client reconnection for specified duration

### Essential Properties

- **roomId**: Unique room identifier (can be customized in `onCreate`)
- **state**: The synchronizable game state (Schema instance)
- **clients**: Array of connected clients
- **maxClients**: Maximum allowed connections (default: Infinity)
- **patchRate**: State synchronization frequency in milliseconds (default: 50ms)
- **autoDispose**: Auto-cleanup when empty (default: true)
- **clock**: Timer management with automatic cleanup

### Client Instance

Each connected client is represented by a `Client` object with:

- **sessionId**: Unique connection identifier
- **userData**: Player-specific data storage
- **auth**: Data returned from `onAuth()`
- **reconnectionToken**: Token for reconnection
- **send(type, payload)**: Send message to this client
- **leave(code?)**: Disconnect the client
- **error(code, message)**: Send error and disconnect

### Message Handling

Handle client messages using the `messages` object:

```typescript
this.messages.on("action", (client, data) => {
  // Handle action
});

// With validation (using Zod)
import { z } from "zod";

const ActionSchema = z.object({
  x: z.number(),
  y: z.number()
});

this.messages.on("action", ActionSchema, (client, data) => {
  // data is validated and typed
});

// Fallback handler for unmatched messages
this.messages.onAny((type, client, data) => {
  console.log(`Unhandled message: ${type}`);
});
```

---

## State Synchronization

### Overview

Colyseus implements a schema-based approach where **the server is responsible for mutating the state, and the client listens for state changes to keep the user interface in sync.**

### Key Concepts

**State Definition**: Developers extend the `Schema` class from `@colyseus/schema` to define room state structures. Only the server can directly modify state.

**Client Communication**: Clients cannot mutate state directly. Instead, they send messages requesting changes, which the server processes and applies.

**Optimization**: The framework tracks property-level changes and sends only modified properties during synchronization intervals, optimizing bandwidth.

### Core Workflow

1. **Backend Setup**: Define state classes and handle client connections
2. **Message Flow**: Clients send messages → Server updates state → State syncs automatically
3. **Frontend Listening**: Clients use callbacks to respond to state changes

### Defining State Schema

```typescript
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

class Player extends Schema {
  @type("string") name: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") health: number;
}

class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("number") timer: number;
  @type(["string"]) items = new ArraySchema<string>();
}
```

### Supported Types

- Primitive: `"string"`, `"number"`, `"boolean"`, `"int8"`, `"uint8"`, `"int16"`, `"uint16"`, `"int32"`, `"uint32"`, `"int64"`, `"uint64"`, `"float32"`, `"float64"`
- Complex: Custom Schema classes
- Collections: `MapSchema`, `ArraySchema`, `CollectionSchema`, `SetSchema`

### Listening to Changes

The framework provides two approaches for monitoring state changes:

#### onChange() - Monitor all changes on an instance

```typescript
// Server-side
room.state.onChange((changes) => {
  changes.forEach(change => {
    console.log(change.field, change.value, change.previousValue);
  });
});

// Client-side
room.state.onChange(() => {
  // React to any state change
});
```

#### listen() - Track specific property modifications

```typescript
// Client-side
room.state.players.onAdd((player, sessionId) => {
  console.log("Player joined:", sessionId);

  player.listen("health", (currentValue, previousValue) => {
    console.log(`Health changed from ${previousValue} to ${currentValue}`);
  });
});

room.state.players.onRemove((player, sessionId) => {
  console.log("Player left:", sessionId);
});
```

### Collection Callbacks

```typescript
// MapSchema / CollectionSchema callbacks
map.onAdd((item, key) => { /* ... */ });
map.onChange((item, key) => { /* ... */ });
map.onRemove((item, key) => { /* ... */ });

// ArraySchema callbacks
array.onAdd((item, index) => { /* ... */ });
array.onChange((item, index) => { /* ... */ });
array.onRemove((item, index) => { /* ... */ });

// SetSchema callbacks
set.onAdd((item) => { /* ... */ });
set.onRemove((item) => { /* ... */ });
```

### Constraints and Limitations

- Maximum **64 serialized fields** per Schema (use nesting for more)
- `NaN` and `Infinity` convert to `0`
- Null strings become empty strings
- Multi-dimensional arrays are not supported
- Field definition order must match between server and client
- Direct array index modification may not trigger synchronization (use `.splice()` or reassign)

### Best Practices

1. **Keep State Minimal**: Only synchronize data that clients need to render
2. **Use Appropriate Types**: Choose efficient numeric types (int8, uint16, etc.)
3. **Batch Updates**: Make multiple state changes before synchronization
4. **Avoid Frequent Changes**: Minimize high-frequency updates to reduce bandwidth
5. **Clean Up Listeners**: Remove event listeners when components unmount

### Internal Mechanics

The synchronization system works through:

1. **Handshaking**: Initial state transfer when client joins
2. **Change Tracking**: ChangeTree object monitors modifications
3. **Encoding**: Only modified properties are encoded and sent
4. **RefId Assignment**: Each Schema instance gets a unique network identifier

### Server-Side State Mutation

```typescript
class MyRoom extends Room<GameState> {
  onCreate() {
    this.setState(new GameState());

    this.setSimulationInterval((deltaTime) => {
      // Update game state here
      this.state.timer += deltaTime;
    });
  }

  onJoin(client: Client) {
    const player = new Player();
    player.name = client.userData.name;
    player.x = 0;
    player.y = 0;
    player.health = 100;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }
}
```

### Client-Side State Listening

```typescript
room.onStateChange((state) => {
  console.log("Full state update:", state);
});

room.state.onChange(() => {
  // Render UI based on current state
  updateUI(room.state);
});

room.state.players.onAdd((player, sessionId) => {
  // Create player entity in game
  createPlayerEntity(sessionId, player);

  player.onChange(() => {
    // Update player entity when any property changes
    updatePlayerEntity(sessionId, player);
  });
});
```

---

## Quick Reference

### Room Lifecycle Order

1. `onCreate(options)`
2. `onAuth(client, options)` - per client
3. `onJoin(client, options)` - per client
4. `onDrop(client)` - when client disconnects
5. `onReconnect(client, sessionId)` - if reconnection allowed
6. `onLeave(client, consented)` - when client leaves
7. `onDispose()` - when room is destroyed

### Common Patterns

#### Setting up a game loop
```typescript
onCreate() {
  this.setSimulationInterval((deltaTime) => {
    // Game logic here
  }, 1000/60); // 60 FPS
}
```

#### Handling player input
```typescript
onCreate() {
  this.messages.on("move", (client, { x, y }) => {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.x = x;
      player.y = y;
    }
  });
}
```

#### Allowing reconnection
```typescript
onLeave(client: Client, consented: boolean) {
  if (!consented) {
    // Allow 30 seconds to reconnect
    this.allowReconnection(client, 30);
  }
}
```

---

## Additional Resources

- Official Documentation: https://docs.colyseus.io
- GitHub: https://github.com/colyseus/colyseus
- Discord Community: https://discord.gg/RY8rRS7

