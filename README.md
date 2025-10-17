# Boxy-Run - Multiplayer Edition 🎮

A Three.js survival game inspired by "Temple Run", now enhanced with **real-time multiplayer racing**! Originally developed for educational purposes for [Bit By Bit](http://littlebitbybit.org/).

![animation](https://thumbs.gfycat.com/CarefulCharmingBug-size_restricted.gif)

## 🎯 Game Objective

**Single Player:** Jump and shuffle to avoid the trees and survive as long as possible!

**Multiplayer:** Race against up to **50 players** in real-time! Avoid obstacles and achieve the highest score to win!

The 3D Graphics are powered by Three.js, which provides the camera, lights, and basic geometries required to create the immersive racing scene.

## 🚀 New Features

- ✨ **Real-time Multiplayer Racing** - Race with up to **50 players** simultaneously
- 🎨 **Unique Player Colors** - Each racer has a distinct character appearance (25+ predefined colors + dynamic generation)
- 🖼️ **Dynamic Avatars** - Unique avatar for each player generated from [Dicebear Adventurer API](https://www.dicebear.com/) using player name as seed
- 🏆 **Live Leaderboard** - See real-time standings during the race with player avatars
- 🎭 **Lobby System** - Create rooms, share codes, and invite friends
- 🎮 **Room Browsing** - Find and join available races with host avatars displayed
- ⏱️ **Race Countdown** - Synchronized start for all players
- 📊 **Race Results** - Final rankings and scores after each race
- 🔔 **Rich Notifications** - Toast notifications for all game events (join, leave, ready, start, finish)
- ⚙️ **Configurable Capacity** - Adjust max players via environment variables (10, 25, 50, 100+)

## 🎮 Controls

- **↑ (Up Arrow)**: Jump over obstacles
- **← (Left Arrow)**: Move to left lane
- **→ (Right Arrow)**: Move to right lane
- **P**: Pause game (single player only)

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

### Quick Start

1. **Clone or download this repository**

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the server**

   ```bash
   npm start
   ```

   Or with custom configuration:

   ```bash
   MAX_PLAYERS=100 npm start
   ```

4. **Open your browser**
   Navigate to: `http://localhost:3000`

5. **Play!**
   - Choose **Single Player** for classic solo gameplay
   - Choose **Multiplayer Race** to compete with friends

### Development Mode

For development with auto-reload:

```bash
npm run dev
```

## 🐳 Docker Deployment

### Quick Docker Setup

```bash
# Using Docker Compose (Recommended)
docker-compose up -d

# Or using Docker directly
docker run -d -p 3000:3000 --name boxy-run lcaohoanq/boxy-run:latest
```

### Self-Hosted Server Deployment

```bash
# Clone repository
git clone https://github.com/lcaohoanq/historical-run.git
cd historical-run

# Deploy with automated script
chmod +x deploy.sh
./deploy.sh

# Access your game
open http://your-server-ip:3000
```

**For complete Docker deployment instructions, see [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)**

### Docker Hub

Pre-built images are available on Docker Hub:

- **Latest**: `docker pull lcaohoanq/boxy-run:latest`
- **Versioned**: `docker pull lcaohoanq/boxy-run:v2.0.0`

## ⚙️ Configuration

You can customize the server settings using environment variables:

### Maximum Players Per Room

Control how many players can join a single race room:

```bash
# Using .env file (recommended)
cp .env.example .env
# Edit .env and set MAX_PLAYERS=50

# Or set directly when starting
MAX_PLAYERS=100 npm start
```

**Examples:**

- `MAX_PLAYERS=10` - Small intimate races
- `MAX_PLAYERS=25` - Medium sized competitions
- `MAX_PLAYERS=50` - Default, large races
- `MAX_PLAYERS=100` - Massive multiplayer events

### Player Color System

The game automatically assigns unique colors to each player:

- **Players 1-25:** Predefined carefully selected color palette
- **Players 26+:** Dynamically generated using HSL golden angle distribution
- Each player gets a visually distinct color, even in 100+ player rooms

### Player Avatars

Each player gets a unique avatar automatically generated using the [Dicebear Adventurer API](https://www.dicebear.com/):

- **Deterministic:** Same name always generates the same avatar
- **Unique:** Different names create visually distinct characters
- **Persistent:** Avatar appears in lobby, room browser, and race leaderboard
- **No Storage:** Avatars are generated on-the-fly via API (no image hosting needed)

Example: A player named "Alex" will always have the same adventurer avatar across all rooms and sessions.

### Notification System

All game events trigger toast notifications:

- 🟢 **Success** (green): Room created, race started, player ready
- 🔴 **Error** (red): Room full, invalid code, connection issues
- 🟡 **Warning** (yellow): Host left, player disconnected
- 🔵 **Info** (blue): Player joined, countdown, race updates

## 🎯 How to Play Multiplayer

### Creating a Room

1. Click **"Multiplayer Race"** from the main menu
2. Click **"Create New Room"**
3. Enter your player name
4. Share the generated room code with friends
5. Click **"Ready"** when everyone has joined
6. Race starts when all players are ready!

### Joining a Room

**Option 1: Direct Join**

1. Click **"Join Room"**
2. Enter the room code shared by your friend
3. Enter your player name
4. Click **"Ready"** to start

**Option 2: Browse Rooms**

1. Click **"Browse Rooms"**
2. See all available rooms
3. Click on any room to join
4. Click **"Ready"** to start

### During the Race

- Your character is highlighted in the leaderboard
- See other players' scores in real-time
- Avoid obstacles just like in single player
- The game ends when you hit an obstacle
- Final rankings show after all players finish

## 📁 Project Structure

```
Boxy-Run/
├── server.js              # Node.js multiplayer server
├── package.json           # Dependencies and scripts
├── index.html            # Main menu
├── singleplayer.html     # Single player game
├── lobby.html            # Multiplayer lobby
├── multiplayer.html      # Multiplayer race
├── display.html          # Character demo
├── style.css             # Styles
├── js/
│   ├── game.js           # Original single player game logic
│   ├── game-multiplayer.js  # Enhanced multiplayer game logic
│   ├── network.js        # Client-side networking
│   ├── display.js        # Character animation demo
│   └── three.min.js      # Three.js library
├── README.md
└── LICENSE
```

## 📝 Original Credits

Original single-player game by [lcaohoanq](https://wanfungchui.github.io/)

You can play the original game [here](https://wanfungchui.github.io/Boxy-Run/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
