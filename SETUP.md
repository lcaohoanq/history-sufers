# Boxy Run - Multiplayer Quick Setup Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
npm install
```

This will install:

- express (web server)
- socket.io (real-time communication)

### Step 2: Start the Server

```bash
npm start
```

You should see:

```
🎮 Boxy Run Multiplayer Server running on port 3000
🌐 Open http://localhost:3000 to play
```

### Step 3: Play!

Open your browser and go to: **http://localhost:3000**

## 🎮 Playing Multiplayer

### Local Multiplayer (Same Network)

1. Start the server on one computer
2. Find your local IP address:
   - Windows: `ipconfig` (look for IPv4)
   - Mac/Linux: `ifconfig` or `ip addr` (look for inet)
3. Share this address with friends: `http://YOUR_IP:3000`
4. Everyone can now join from their devices!

### Online Multiplayer

To play with friends over the internet, you need to deploy the server:

**Option 1: Quick Deploy (Recommended)**

- Deploy to [Render.com](https://render.com) (Free tier available)
- Deploy to [Railway.app](https://railway.app) (Free tier available)

**Option 2: Use Ngrok for Testing**

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

Share the generated URL with friends.

## 🎯 Game Modes

### Single Player

Classic temple run gameplay - survive as long as possible!

### Multiplayer Race

- Create a room or join existing ones
- Race with up to 6 players
- Real-time leaderboard
- Synchronized start countdown

## 🐛 Troubleshooting

**Port 3000 already in use?**

```bash
PORT=8080 npm start
```

**Can't connect to multiplayer?**

- Make sure server is running
- Check firewall settings
- Try different browser

**Game is laggy?**

- Close other tabs
- Check internet connection
- Restart the server

## 📞 Need Help?

Check the full README.md for detailed documentation and advanced configuration options.

## 🎉 Have Fun!

Enjoy racing with friends! 🏃‍♂️💨
