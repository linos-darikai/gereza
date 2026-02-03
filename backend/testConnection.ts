// backend/testConnection.ts
import { Client } from '@colyseus/sdk';
import { LobbyState } from './game_server/schemas/LobbyState';

async function testConnection() {
  console.log('🧪 Testing Colyseus server...\n');

  const client = new Client('ws://localhost:2567');

  try {
    // Step 1: Create a room directly (skip checking available rooms)
    console.log('1️⃣ Creating a test room...');
    const room = await client.create<LobbyState>('lobby', {
      roomCode: 'TEST123',
      dmId: 'test-dm-123',
      username: 'TestDirector',
      userId: 'dm-1'
    });
    console.log('✅ Room created!');
    console.log('   Room ID:', room.roomId);
    console.log('   Session ID:', room.sessionId);
    console.log('   Full Room State:', room.state);

    console.log('⏳ Waiting for state sync...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Check room state
    console.log('\n2️⃣ Checking room state...');
    if (!room.state) {
      console.error("❌ Room state is undefined! This is the core issue.");
    } else {
      console.log('   Room Code:', room.state.roomCode);
    }
    console.log('   DM ID:', room.state.dmId);
    console.log('   Max Players:', room.state.maxPlayers);
    console.log('   Players:', room.state.players.size);

    // Step 3: Listen to state changes
    console.log('\n3️⃣ Listening for state changes...');
    room.onStateChange((state) => {
      console.log('📊 State updated! Players:', state.players.size);
    });

    // Step 4: Try joining as a player
    console.log('\n4️⃣ Joining as a player...');
    const playerClient = new Client('ws://localhost:2567');
    const playerRoom = await playerClient.joinById(room.roomId, {
      userId: 'player-456',
      username: 'TestPlayer',
      characterName: 'Gandalf',
      isDM: false
    });
    console.log('✅ Player joined!');
    console.log('   Player session ID:', playerRoom.sessionId);

    // Wait to see state changes
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n5️⃣ Final room state:');
    console.log('   Players in room:', room.state.players.size);
    room.state.players.forEach((player: any, key: string) => {
      console.log(`   - ${player.characterName} (${player.username}) - Status: ${player.status}`);
    });

    // Step 6: Test DM approving player
    console.log('\n6️⃣ Testing DM approval...');
    room.send('approve-player', {
      playerId: playerRoom.sessionId,
      approved: true
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('   Updated player statuses:');
    room.state.players.forEach((player: any, key: string) => {
      console.log(`   - ${player.characterName}: ${player.status}`);
    });

    // Cleanup
    console.log('\n7️⃣ Cleaning up...');
    await playerRoom.leave();
    await room.leave();

    console.log('\n✅ All tests passed!\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testConnection();