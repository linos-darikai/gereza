# Colyseus Documentation Summary

## Connection and Schema Hydration (Schema v3 / Colyseus 0.16.x)

When using `@colyseus/schema` version 3+ with `colyseus.js`, schema callbacks are detached from the state instance. You must use `getDecoderStateCallbacks` or `Callbacks.get(room)` (if using `@colyseus/sdk`) to access `onAdd`, `onRemove`, and `listen`.

### Correct Usage

```javascript
import { Client, getStateCallbacks } from "colyseus.js";

async function connect() {
  const client = new Client('ws://localhost:2567');
  const room = await client.joinOrCreate('my_room');

  // ACCESSING CALLBACKS
  // Note: room.state.players might appear as a plain object or MapSchema but missing methods.
  // Use getStateCallbacks (imported from colyseus.js) to get the callback proxy.
  
  const rootCallbacks = getStateCallbacks(room);
  
  if (rootCallbacks && rootCallbacks.players) {
    rootCallbacks.players.onAdd((player, sessionId) => {
        console.log("Player join:", player);
        
        // Nested callbacks
        // You might need to re-query state callbacks or access via property depending on schema depth
    });
    
    rootCallbacks.players.onRemove((player, sessionId) => {
        console.log("Player left:", sessionId);
    });
  }
}
```

## Server API & User Handling

### Room Lifecycle
- **onCreate(options)**: Called once when the room is initialized. Set up your state and message handlers here.
- **onAuth(client, options, request)**: Validates client before `onJoin`. Return truthy to allow, falsy to reject. Useful for validating tokens.
- **onJoin(client, options)**: Called when a client successfully connects.
    - **Best Practice**: Use `client.sessionId` to map players in your state.
    - Avoid sending immediate messages that require client handlers unless you are sure the client is ready. Prefer setting state.
- **onLeave(client, consented)**: Called when a client disconnects.
    - `consented`: `true` if client called `.leave()`, `false` if connection dropped.
    - Use `this.allowReconnection(client, seconds)` to handle temporary disconnects.
- **onDispose()**: Cleanup when the room is destroyed.

### Room Metadata & Locking
- **setMetadata(metadata)**: Public metadata accessible via `client.getAvailableRooms()`. useful for lobby filtering (e.g. `{ mode: "hardcore" }`).
- **lock() / unlock()**: Prevent new clients from joining.
- **setPrivate(bool)**: Hide room from `getAvailableRooms()` listing.

### User Handling Best Practices
1. **Authentication**: Use `onAuth` to verify users against your database/auth system before they join.
2. **State Management**: Keep the Room class small. Delegate logic to separate Command classes or systems.
3. **Synchronization**: Only synchronize what matters. Use `@type` decorators efficiently.
4. **Scalability**: Colyseus scales vertically (processes) and horizontally (servers + Redis Presence).

## Common Errors
- **"seat reservation expired"**: Client took too long to connect after matchmake, or connection failed (e.g., protocol mismatch).
- **"onMessage not registered"**: Server sent a message before the client registered a handler. Fix by registering handlers immediately after `join` or using Room State for initial data.
