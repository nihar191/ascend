// docs/socket_events.md

# Socket.IO Events Documentation

This document describes all Socket.IO events for real-time communication in the Ascend platform.

## Authentication

All socket connections require JWT authentication:

const socket = io('http://localhost:5000', {
auth: {
token: 'your_jwt_token_here'
}
});


## Matchmaking Events

### Client → Server

#### `matchmaking:join`
Join matchmaking queue.

**Payload:**
{
"matchType": "1v1",
"preferences": {
"difficulty": "medium",
"rating": 1500
}
}

text

**Response:** `matchmaking:joined`

---

#### `matchmaking:leave`
Leave matchmaking queue.

**Payload:** None

**Response:** `matchmaking:left`

---

#### `matchmaking:status`
Get current queue status.

**Payload:** None

**Response:** `matchmaking:status`

---

### Server → Client

#### `matchmaking:joined`
Confirmation of joining queue.

**Payload:**
{
"success": true,
"queuePosition": 3,
"queueSize": 8
}

text

---

#### `matchmaking:match_found`
Match has been found.

**Payload:**
{
"matchId": 123,
"match": {
"id": 123,
"problem_title": "Two Sum",
"difficulty": "easy",
"participants": [...]
}
}

text

---

#### `matchmaking:stats`
Queue statistics (broadcast to all).

**Payload:**
{
"1v1": {
"playersInQueue": 8,
"avgWaitTimeMs": 15000
},
"2v2": {
"playersInQueue": 4,
"avgWaitTimeMs": 30000
}
}

text

---

## Match/Lobby Events

### Client → Server

#### `lobby:join`
Join match lobby.

**Payload:**
{
"matchId": 123
}

text

**Response:** `lobby:joined`

---

#### `match:ready`
Signal player is ready.

**Payload:**
{
"matchId": 123
}

text

**Broadcast:** `match:player_ready`

---

#### `match:start`
Start the match (admin/system).

**Payload:**
{
"matchId": 123
}

text

**Broadcast:** `match:started`

---

#### `match:submit`
Submit code solution.

**Payload:**
{
"matchId": 123,
"code": "function solve() { ... }",
"language": "javascript"
}

text

**Response:** `submission:received`

---

#### `match:get_scoreboard`
Request current scoreboard.

**Payload:**
{
"matchId": 123
}

text

**Response:** `match:scoreboard`

---

### Server → Client

#### `lobby:joined`
Successfully joined lobby.

**Payload:**
{
"match": {
"id": 123,
"status": "waiting",
"participants": [...]
}
}

text

---

#### `lobby:player_joined`
Another player joined lobby.

**Payload:**
{
"userId": 456,
"username": "john_doe"
}

text

---

#### `match:started`
Match has started.

**Payload:**
{
"matchId": 123,
"problem": {
"id": 5,
"title": "Binary Search",
"description": "...",
"sampleInput": "...",
"sampleOutput": "..."
},
"duration": 900000,
"startTime": 1729270800000,
"endTime": 1729271700000,
"participants": [...]
}

text

---

#### `match:time_sync`
Server time synchronization (every 5 seconds).

**Payload:**
{
"timeLeft": 850000,
"serverTime": 1729270850000
}

text

---

#### `submission:received`
Code submission received.

**Payload:**
{
"submissionId": 789,
"status": "pending"
}

text

---

#### `submission:judging`
Submission is being judged.

**Payload:**
{
"submissionId": 789,
"userId": 456
}

text

---

#### `submission:result`
Submission judging completed.

**Payload:**
{
"submissionId": 789,
"userId": 456,
"status": "accepted",
"score": 250,
"passedTests": 5,
"totalTests": 5,
"executionTime": 145
}

text

---

#### `match:scoreboard_update`
Scoreboard updated (after submission).

**Payload:**
[
{
"userId": 456,
"username": "alice",
"score": 250,
"rank": 1,
"submissionCount": 1
},
{
"userId": 789,
"username": "bob",
"score": 0,
"rank": 2,
"submissionCount": 2
}
]

text

---

#### `match:ended`
Match has ended.

**Payload:**
{
"matchId": 123,
"finalScoreboard": [...],
"participants": [
{
"user_id": 456,
"rank": 1,
"score": 250
}
]
}

text

---

## Error Events

#### `match:error`
Match-related error.

**Payload:**
{
"message": "Match not found"
}

text

---

#### `submission:error`
Submission-related error.

**Payload:**
{
"message": "Code contains forbidden patterns"
}

text

---

## Connection Events

#### `connect`
Socket connected successfully.

#### `disconnect`
Socket disconnected (automatic queue cleanup).

---

## Example Client Usage

// Connect
const socket = io('http://localhost:5000', {
auth: { token: userToken }
});

// Join matchmaking
socket.emit('matchmaking:join', {
matchType: '1v1',
preferences: { difficulty: 'medium' }
});

// Listen for match found
socket.on('matchmaking:match_found', (data) => {
console.log('Match found!', data.matchId);

// Join match lobby
socket.emit('lobby:join', { matchId: data.matchId });
});

// Listen for match start
socket.on('match:started', (data) => {
console.log('Match started!', data.problem);
startTimer(data.endTime);
});

// Submit code
socket.emit('match:submit', {
matchId: currentMatchId,
code: editorContent,
language: 'javascript'
});

// Listen for results
socket.on('submission:result', (data) => {
console.log('Result:', data.status, 'Score:', data.score);
});

// Listen for scoreboard updates
socket.on('match:scoreboard_update', (scoreboard) => {
updateScoreboardUI(scoreboard);
});

text
undefined