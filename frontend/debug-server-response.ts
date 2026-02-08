
import { Client } from 'colyseus.js';

async function test() {
    console.log("Testing call to http://localhost:2567/matchmake/joinOrCreate/lobby");
    try {
        const response = await fetch("http://localhost:2567/matchmake/joinOrCreate/lobby", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({})
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Body:", text);

        if (response.ok) {
            const json = JSON.parse(text);
            if (!json.room) {
                console.error("CRITICAL: 'room' property missing in response!");
            } else {
                console.log("Room info found:", json.room);
            }
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

test();
