# The Last Meadow Bot

![Version](https://img.shields.io/badge/Version-2.0.0-brightgreen)
![Language](https://img.shields.io/badge/Language-JavaScript-yellow)
![Last Updated](https://img.shields.io/badge/Last%20Updated-2025--04--03-blue)

An automated bot script for the Discord game "The Last Meadow" (Touch Grass) to optimize gameplay and progress efficiently.

## Overview

The Last Meadow Bot is a JavaScript-based automation tool designed to help players progress quickly through "The Last Meadow" clicker game. It provides sophisticated strategies to maximize point accumulation, handle game events, and acquire the final goal item.

This script is meant for educational purposes to demonstrate browser automation techniques and game optimization strategies.

## Features

- **Maximum Speed Auto-Clicking**: Clicks optimally to generate points
- **Intelligent Item Purchasing**: Prioritizes high-efficiency items based on point contribution
- **Auto-Collection**: Automatically collects level rewards and lootboxes
- **Weed Removal**: Detects and removes weeds that drain points
- **Lawnmower Avoidance**: Recognizes and avoids lawnmowers that cost points
- **Game Completion Focus**: Option to prioritize acquiring the final "Back to Puter" item
- **Experimental Mode**: Skip logo-related items to reach the end goal faster
- **Automatic Upgrades**: Strategically applies upgrades to owned items
- **Anti-Stuck Mechanisms**: Detects when the game is stuck and applies recovery strategies
- **Efficient Progress Tracking**: Monitors point accumulation and time to goal

## Usage

1. Open Discord and navigate to "The Last Meadow" game
2. Open your browser's developer console (F12 or Ctrl+Shift+I)
3. Copy and paste the entire script into the console
4. Press Enter to load the bot
5. Call `startBot()` to begin automation

## Commands

The bot provides several functions to control its operation:

```javascript
startBot()               // Start the bot
stopBot()                // Stop the bot
toggleConfig("option")   // Toggle a configuration option
setClickInterval(10)     // Set clicking speed (milliseconds)
```

### Configuration Options

You can toggle these options using `toggleConfig("optionName")`:

- `finishGame` - Focus on buying the final item as soon as it's available
- `experimentalMode` - Skip logo items to reach the end goal faster
- `removeWeeds` - Automatically remove weeds
- `collectLootboxes` - Automatically collect lootboxes
- `collectLevelRewards` - Automatically claim level rewards
- `avoidLawnmowers` - Avoid clicking on lawnmowers
- `debugMode` - Show detailed logs

## Strategy Guide

### General Strategy
The bot focuses on acquiring items with the highest points-per-cost efficiency. It prioritizes:

1. Level rewards and lootboxes (free points)
2. Removing weeds (prevent point loss)
3. High-value upgrades
4. Priority items based on contribution value

### Finish Game Strategy
When `finishGame` is enabled:
- The bot will immediately focus on the "Back to Puter" final item when available
- It will stop purchasing other items to save points for the final item
- All efforts will focus on reaching 20,000 points as quickly as possible

### Experimental Mode
When `experimentalMode` is enabled:
- The bot will skip all bouncing logo items and related upgrades
- This can provide a faster path to completion by avoiding unnecessary items
- It focuses only on items that directly contribute to point generation

## Implementation Notes

- The bot uses DOM manipulation to interact with the game
- It monitors localStorage to track game state
- Advanced detections for special elements like weeds and lawnmowers
- Performance optimized to minimize resource usage

## Disclaimer

This script is provided for educational purposes only. Use at your own risk. Using automation scripts may violate the terms of service of some platforms.
