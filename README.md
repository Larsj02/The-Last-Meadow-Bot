# The Last Meadow Game Bot

A JavaScript bot that automates gameplay for "The Last Meadow" browser game (aka "Touch Grass"). This project is for educational purposes only to demonstrate browser automation and game hacking concepts.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Updated](https://img.shields.io/badge/updated-2025--04--02-green)

## Features

- **High-speed Auto-clicking**: Maximizes point generation through rapid automated clicking
- **Strategic Item Purchasing**: Intelligently buys items based on priorities and affordability
- **Automatic Upgrades**: Applies upgrades to all purchased items automatically
- **Progress Monitoring**: Tracks game state and reports statistics in real-time
- **Anti-Stuck Mechanisms**: Detects when game progress stalls and applies recovery strategies

## Installation

1. Open "The Last Meadow" game in your browser
2. Open your browser's JavaScript console:
   - Chrome: Press F12 or Ctrl+Shift+J (Windows/Linux) or Cmd+Option+J (Mac)
   - Firefox: Press F12 or Ctrl+Shift+K (Windows/Linux) or Cmd+Option+K (Mac)
3. Copy the entire script from `last-meadow-bot.js`
4. Paste it into your browser's console and press Enter

## Usage

Once the bot starts running, it will automatically:
- Click the main button to generate points
- Purchase items strategically when affordable
- Apply upgrades to all items
- Display status reports at regular intervals

### Bot Controls

The following commands are available through the browser console:

```javascript
// Stop the bot
botControls.stop()

// Force item upgrades
botControls.upgrade()

// Display current status report
botControls.status()

// Toggle detailed debug logging
botControls.toggleDebug()
```

## Configuration

You can adjust bot behavior by modifying these values at the top of the script:

```javascript
const config = {
  clickInterval: 10,         // Milliseconds between clicks
  purchaseInterval: 500,     // Milliseconds between purchase checks
  statusInterval: 3000,      // Milliseconds between status updates
  autoUpgrade: true,         // Automatically upgrade items
  priorityItems: [26, 18, 24, 14, 13, 12], // Priority items to buy
  pointsReserve: 100,        // Points reserve to maintain
  debugMode: false           // Verbose logging toggle
};
```

## How It Works

The bot uses several techniques to automate gameplay:

1. **DOM Manipulation**: Simulates clicks on game elements
2. **LocalStorage Monitoring**: Tracks changes to the game state
3. **Strategic Algorithms**: Makes intelligent decisions about purchases
4. **State Modification**: Directly edits localStorage data to apply upgrades

## Educational Value

This project demonstrates several concepts relevant to web security and game development:

- Client-side state management vulnerabilities
- DOM manipulation through JavaScript
- Event simulation and interception
- Resource optimization algorithms
- Anti-cheat considerations for game developers

## Disclaimer

This bot is provided for educational purposes only. Using automated bots may violate the terms of service of some games. Always respect the rules and terms of service for any application you interact with.