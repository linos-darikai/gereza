// frontend/src/lib/colyseus.ts
import { Client } from 'colyseus.js';

const COLYSEUS_URL = process.env.NEXT_PUBLIC_COLYSEUS_URL || 'ws://localhost:2567';

export const colyseusClient = new Client(COLYSEUS_URL);

// Create a room using Colyseus's built-in create method
export async function createSession(dmId: string, roomCode: string) {
  try {
    // Create room with specific roomId
    const room = await colyseusClient.create('lobby', {
      roomCode,
      dmId
    });
    
    console.log('✅ Room created:', room.roomId);
    return {
      success: true,
      roomId: room.roomId,
      roomCode: roomCode,
      room: room
    };
  } catch (error) {
    console.error('❌ Failed to create room:', error);
    throw error;
  }
}

// Join a room by ID
export async function joinLobby(roomCode: string, options: {
  userId: string;
  username: string;
  characterName?: string;
  isDM?: boolean;
}) {
  try {
    // Try to join by roomId
    const room = await colyseusClient.joinById(roomCode, options);
    console.log('✅ Joined lobby:', roomCode);
    return room;
  } catch (error) {
    console.error('❌ Failed to join lobby:', error);
    throw error;
  }
}

// Get available rooms
export async function getAvailableRooms() {
  try {
    const rooms = await colyseusClient.getAvailableRooms('lobby');
    return rooms;
  } catch (error) {
    console.error('❌ Failed to get rooms:', error);
    return [];
  }
}

export async function checkHealth() {
  try {
    const rooms = await colyseusClient.getAvailableRooms();
    return { status: 'ok', rooms: rooms.length };
  } catch (error) {
    console.error('Backend is not reachable:', error);
    return null;
  }
}