/**
 * The Last Meadow Game Bot - Enhanced
 * Version 2.0.0
 * For educational purposes only
 * Last Updated: 2025-04-03
 */

// Configuration
const config = {
    clickInterval: 10,         // Milliseconds between clicks (lower = faster)
    purchaseInterval: 500,     // Milliseconds between purchase checks
    statusInterval: 3000,      // Milliseconds between status updates
    autoUpgrade: true,         // Automatically upgrade items
    collectLootboxes: true,    // Automatically collect loot boxes
    collectLevelRewards: true, // Automatically claim level rewards
    removeWeeds: true,         // Automatically remove weeds
    avoidLawnmowers: true,     // Avoid lawnmowers (they cost points)
    finishGame: true,          // Set to true to prioritize buying the final item (Back to Puter)
    experimentalMode: false,   // Skip logo items and related upgrades for faster completion
    priorityItems: [9, 21, 25, 2, 14, 15, 16], // Items to prioritize buying
    pointsReserve: 100,        // Always keep this many points in reserve
    debugMode: false           // Set to true for more verbose logging
};

// Game state tracking
let gameState = {
    points: 0,
    totalClicks: 0,
    itemsBought: {},
    upgradesBought: {},
    lastPoints: 0,
    startTime: Date.now(),
    pointsPerSecond: 0,
    currentLevel: 0,
    lootboxesCollected: 0,
    levelRewardsClaimed: 0,
    weedsRemoved: 0,
    lawnmowersAvoided: 0,
    effectiveItems: {},
    botActive: false,
    finalItemAvailable: false
};

// Bot intervals storage
let botIntervals = {
    clicker: null,
    weedScanner: null,
    gameLoop: null,
    status: null
};

// Items to skip in experimental mode (logo-related items)
const logoRelatedItems = [6, 7, 8, 19, 20, 22];

// Setup localStorage monitoring
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key === 'ClickerGameStore') {
        try {
            const parsed = JSON.parse(value);
            updateGameState(parsed);
        } catch (e) {
            console.error("Error parsing game state:", e);
        }
    }
};

// Update our tracking of the game state
function updateGameState(stateData) {
    if (!stateData || !stateData._state) return;
    
    // Calculate total points
    let totalPoints = 0;
    for (const [itemId, points] of Object.entries(stateData._state.pointsByItem)) {
        totalPoints += points;
    }
    
    gameState.points = totalPoints;
    gameState.purchasedItems = stateData._state.purchasedItems;
    gameState.pointsByItem = stateData._state.pointsByItem;
    
    // Track item contributions for efficiency calculations
    if (stateData._state.itemContributions) {
        gameState.effectiveItems = {...stateData._state.itemContributions};
    }
    
    // Track current level
    if (stateData._state.purchasedItems && stateData._state.purchasedItems[25] && 
        stateData._state.purchasedItems[25].metadata && 
        stateData._state.purchasedItems[25].metadata.lastLevelClaimed) {
        gameState.currentLevel = stateData._state.purchasedItems[25].metadata.lastLevelClaimed;
    }
    
    // Calculate points per second from DOM if available
    const ppsElement = document.querySelector('.pointsItems__7a0c3 .text__73a39');
    if (ppsElement) {
        const ppsText = ppsElement.textContent;
        const match = ppsText.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
        if (match) {
            gameState.pointsPerSecond = parseFloat(match[0].replace(/,/g, ''));
        }
    }
    
    // Check if final item is available
    checkFinalItemAvailability();
}

// Check if the "Back to Puter" final item is available
function checkFinalItemAvailability() {
    const items = document.querySelectorAll('.item__4b373');
    items.forEach(item => {
        const label = item.getAttribute('aria-label');
        if (label && label.includes('Back to Puter')) {
            const isEnabled = !item.classList.contains('disabled_e9638b');
            gameState.finalItemAvailable = isEnabled;
            
            if (isEnabled && config.finishGame && gameState.botActive) {
                // If the final item becomes available and finishGame is true, focus on it immediately
                const currentPoints = getCurrentVisiblePoints();
                const pointsInfoElement = item.querySelector('.pointsInfo__4b373 .text__73a39');
                
                if (pointsInfoElement) {
                    const cost = parseInt(pointsInfoElement.textContent.replace(/,/g, ''));
                    if (currentPoints >= cost) {
                        console.log(`🏁 FINAL ITEM AVAILABLE! Buying: ${label} (${cost.toLocaleString()} points)`);
                        item.click();
                    }
                }
            }
        }
    });
}

// Initialize by reading current state
function initialize() {
    console.log("🌱 The Last Meadow Bot Enhanced v2.0.0");
    console.log("Initializing... Reading game state...");
    
    try {
        const currentState = JSON.parse(localStorage.getItem('ClickerGameStore'));
        if (currentState) {
            updateGameState(currentState);
            console.log("✅ Initial state loaded successfully");
        }
    } catch (e) {
        console.error("❌ Error loading initial state:", e);
    }
    
    console.log("Bot initialized. Call startBot() to begin.");
}

// Get current visible points from the DOM
function getCurrentVisiblePoints() {
    const pointsElement = document.querySelector('.pointsValue__7a0c3');
    return pointsElement ? parseInt(pointsElement.textContent.replace(/,/g, '')) : 0;
}

// Auto-clicker function - maximum speed with minimal randomization
function autoClick() {
    const button = document.querySelector('.logo_cf3f70');
    if (button) {
        // Very slight randomization to avoid detection (5% chance to skip)
        if (Math.random() > 0.05) {
            button.click();
            gameState.totalClicks++;
        }
    }
}

// Get all available shop items with their costs
function getShopItems() {
    const items = [];
    // Check main shop items
    document.querySelectorAll('.item__4b373').forEach((item, index) => {
        const pointsInfoElement = item.querySelector('.pointsInfo__4b373 .text__73a39');
        if (pointsInfoElement) {
            const cost = parseInt(pointsInfoElement.textContent.replace(/,/g, ''));
            const isEnabled = !item.classList.contains('disabled_e9638b');
            const label = item.getAttribute('aria-label') || `Item ${index}`;
            const isFinalItem = label.includes('Back to Puter');
            const isLogoRelated = logoRelatedItems.includes(index);
            
            // Skip logo items in experimental mode unless it's the final item
            if (config.experimentalMode && isLogoRelated && !isFinalItem) {
                return;
            }
            
            items.push({
                element: item,
                cost,
                isEnabled,
                label,
                index,
                isFinalItem,
                isLogoRelated,
                efficiency: calculateEfficiency(index, cost)
            });
            
            // Update game state if final item is available
            if (isFinalItem && isEnabled) {
                gameState.finalItemAvailable = true;
            }
        }
    });
    
    // Check upgrade items
    document.querySelectorAll('.upgrade__75ed5').forEach((item, index) => {
        const pointsElement = item.querySelector('.text__73a39');
        if (pointsElement) {
            const cost = parseInt(pointsElement.textContent.replace(/,/g, ''));
            const isEnabled = !item.classList.contains('disabled_e9638b');
            const label = item.getAttribute('aria-label') || `Upgrade ${index}`;
            const isLogoRelated = label.toLowerCase().includes('logo') || 
                                  label.toLowerCase().includes('bouncing');
            
            // Skip logo upgrades in experimental mode
            if (config.experimentalMode && isLogoRelated) {
                return;
            }
            
            items.push({
                element: item,
                cost,
                isEnabled,
                label,
                index: 100 + index, // Use 100+ for upgrades to distinguish from regular items
                isUpgrade: true,
                isLogoRelated,
                efficiency: 999 // Upgrades generally have very high value
            });
        }
    });
    
    return items;
}

// Calculate item efficiency (contribution / cost)
function calculateEfficiency(itemId, cost) {
    // If we have contribution data for this item, use it
    if (gameState.effectiveItems && gameState.effectiveItems[itemId]) {
        return gameState.effectiveItems[itemId] / cost;
    }
    // Default efficiency
    return 1 / cost;
}

// Remove weeds (they take away points)
function removeWeeds() {
    if (!config.removeWeeds) return false;
    
    // Find weeds in the game area
    const weeds = document.querySelectorAll('.clickable_fa03d7');
    if (weeds.length > 0) {
        if (config.debugMode) {
            console.log(`🌿 Removing weed (${weeds.length} found)`);
        }
        weeds[0].click();
        gameState.weedsRemoved++;
        return true;
    }
    
    return false;
}

// Handle lawnmowers (they cost points)
function handleLawnmowers() {
    if (!config.avoidLawnmowers) return false;
    
    // If lawnmowers are spotted, we want to avoid clicking them by default
    // They have a class of lawnmowerClickable__78658
    const lawnmowers = document.querySelectorAll('.lawnmowerClickable__78658');
    
    if (lawnmowers.length > 0) {
        // We intentionally don't click on lawnmowers as they cost 200 points
        if (config.debugMode) {
            console.log(`🚜 Avoided lawnmower (${lawnmowers.length} found)`);
        }
        gameState.lawnmowersAvoided++;
        // We don't return true here so the game loop can continue
        // This prevents lawnmowers from causing the bot to hang
    }
    
    return false;
}

// Collect level rewards
function collectLevelRewards() {
    if (!config.collectLevelRewards) return false;
    
    const claimButton = document.querySelector('.claimButton__8e695');
    if (claimButton && !claimButton.classList.contains('disabled_e9638b')) {
        if (config.debugMode) {
            console.log("🎁 Claiming level reward");
        }
        claimButton.click();
        gameState.levelRewardsClaimed++;
        return true;
    }
    return false;
}

// Collect loot boxes
function collectLootboxes() {
    if (!config.collectLootboxes) return false;
    
    // Find lootboxes in the game area
    const lootboxes = document.querySelectorAll('.lootbox_cb9930 .default__9026a');
    if (lootboxes.length > 0) {
        if (config.debugMode) {
            console.log(`🎲 Collecting lootbox (${lootboxes.length} found)`);
        }
        lootboxes[0].click();
        gameState.lootboxesCollected++;
        return true;
    }
    
    return false;
}

// Handle special game elements 
function handleSpecialElements() {
    // First handle weeds as they drain points
    if (removeWeeds()) {
        return true;
    }
    
    // We call handleLawnmowers but we don't return its result
    // This prevents lawnmowers from blocking the game loop
    handleLawnmowers();
    
    return false;
}

// Strategic purchasing of items
function strategicPurchase() {
    const currentPoints = getCurrentVisiblePoints();
    const items = getShopItems();
    
    // HIGHEST priority: If final item is available, buy it immediately
    if (config.finishGame) {
        const finalItem = items.find(item => item.isFinalItem);
        if (finalItem && finalItem.isEnabled && currentPoints >= finalItem.cost) {
            console.log(`🏁 BUYING FINAL ITEM: ${finalItem.label} (${finalItem.cost.toLocaleString()} points)`);
            finalItem.element.click();
            return true;
        }
    }
    
    // If finishGame is true and final item is available but we can't afford it yet, don't buy anything else
    // This helps save points for the final item
    if (config.finishGame && gameState.finalItemAvailable) {
        const finalItem = items.find(item => item.isFinalItem);
        if (finalItem && finalItem.isEnabled) {
            if (config.debugMode) {
                console.log(`🏁 Saving for final item: ${finalItem.label} (${finalItem.cost.toLocaleString()} points)`);
                console.log(`💰 Current points: ${currentPoints.toLocaleString()}/${finalItem.cost.toLocaleString()} (${((currentPoints/finalItem.cost)*100).toFixed(1)}%)`);
            }
            return false; // Skip buying anything else
        }
    }
    
    // Otherwise continue with normal purchasing strategy
    
    // First check for upgrades as they typically provide the best value
    const affordableUpgrades = items
        .filter(item => item.isUpgrade && item.isEnabled && currentPoints >= item.cost + config.pointsReserve)
        .sort((a, b) => b.efficiency - a.efficiency);
        
    if (affordableUpgrades.length > 0) {
        const upgradeToGet = affordableUpgrades[0];
        if (config.debugMode) {
            console.log(`🔧 Buying upgrade: ${upgradeToGet.label} (${upgradeToGet.cost.toLocaleString()} points)`);
        }
        upgradeToGet.element.click();
        return true;
    }
    
    // Then check priority items
    for (const priorityId of config.priorityItems) {
        const priorityItems = items.filter(item => 
            (item.index === priorityId || (typeof item.index === 'string' && item.index.includes(priorityId))) && 
            item.isEnabled && currentPoints >= item.cost + config.pointsReserve &&
            (!config.experimentalMode || !item.isLogoRelated)
        );
        
        if (priorityItems.length > 0) {
            // Get the most efficient priority item
            const itemToBuy = priorityItems.sort((a, b) => b.efficiency - a.efficiency)[0];
            if (config.debugMode) {
                console.log(`🛒 Buying priority item: ${itemToBuy.label} (${itemToBuy.cost.toLocaleString()} points)`);
            }
            itemToBuy.element.click();
            return true;
        }
    }
    
    // If no priority items were bought, buy the most efficient affordable item
    const affordableItems = items
        .filter(item => 
            item.isEnabled && 
            currentPoints >= item.cost + config.pointsReserve && 
            (!config.experimentalMode || !item.isLogoRelated)
        )
        .sort((a, b) => b.efficiency - a.efficiency);
        
    if (affordableItems.length > 0) {
        const itemToBuy = affordableItems[0];
        if (config.debugMode) {
            console.log(`🛒 Buying item: ${itemToBuy.label} (${itemToBuy.cost.toLocaleString()} points)`);
        }
        itemToBuy.element.click();
        return true;
    }
    
    return false;
}

// Upgrade items through localStorage manipulation
function upgradeItems() {
    if (!config.autoUpgrade || (config.finishGame && gameState.finalItemAvailable)) {
        // Skip upgrades if we're focusing on the final item
        return;
    }
    
    try {
        const currentState = JSON.parse(localStorage.getItem('ClickerGameStore'));
        if (!currentState || !currentState._state) return;
        
        let upgraded = false;
        const purchasedItems = currentState._state.purchasedItems;
        
        // Focus on upgrading high-value items first
        const itemsToFocus = config.experimentalMode ? 
            [0, 9, 21, 2, 26].filter(id => !logoRelatedItems.includes(id)) : 
            [0, 9, 21, 2, 26];
        
        // Attempt to upgrade high-priority items first
        for (const focusedItemId of itemsToFocus) {
            const itemId = focusedItemId.toString();
            if (purchasedItems[itemId]) {
                // Skip logo-related items in experimental mode
                if (config.experimentalMode && logoRelatedItems.includes(parseInt(itemId))) {
                    continue;
                }
                
                if (!purchasedItems[itemId].upgrades) {
                    purchasedItems[itemId].upgrades = {};
                }
                
                // Add upgrade level if missing
                for (let i = 0; i < 10; i++) {
                    if (!purchasedItems[itemId].upgrades[i]) {
                        purchasedItems[itemId].upgrades[i] = 1;
                        upgraded = true;
                        if (config.debugMode) {
                            console.log(`🔼 Added upgrade ${i} to item ${itemId}`);
                        }
                        break;
                    }
                }
                
                // Increase upgrade levels
                for (const upgradeId in purchasedItems[itemId].upgrades) {
                    if (purchasedItems[itemId].upgrades[upgradeId] < 11) {
                        purchasedItems[itemId].upgrades[upgradeId] += 1;
                        upgraded = true;
                        if (config.debugMode) {
                            console.log(`🔼 Increased upgrade ${upgradeId} for item ${itemId} to level ${purchasedItems[itemId].upgrades[upgradeId]}`);
                        }
                        break;
                    }
                }
                
                // Break after upgrading one item
                if (upgraded) break;
            }
        }
        
        // Then try to upgrade other items
        if (!upgraded) {
            for (const itemId in purchasedItems) {
                // Skip logo-related items in experimental mode
                if (config.experimentalMode && logoRelatedItems.includes(parseInt(itemId))) {
                    continue;
                }
                
                if (itemsToFocus.includes(parseInt(itemId))) continue; // Skip already processed
                
                if (!purchasedItems[itemId].upgrades) {
                    purchasedItems[itemId].upgrades = {};
                }
                
                // Add upgrade level if missing
                for (let i = 0; i < 10; i++) {
                    if (!purchasedItems[itemId].upgrades[i]) {
                        purchasedItems[itemId].upgrades[i] = 1;
                        upgraded = true;
                        break;
                    }
                }
                
                // Increase upgrade levels
                for (const upgradeId in purchasedItems[itemId].upgrades) {
                    if (purchasedItems[itemId].upgrades[upgradeId] < 10) {
                        purchasedItems[itemId].upgrades[upgradeId] += 1;
                        upgraded = true;
                        break;
                    }
                }
                
                if (upgraded) break;
            }
        }
        
        if (upgraded) {
            console.log("🔧 Applied upgrades to items");
            localStorage.setItem('ClickerGameStore', JSON.stringify(currentState));
        }
    } catch (e) {
        console.error("❌ Error upgrading items:", e);
    }
}

// Calculate runtime in human-readable format
function getRuntime() {
    const runtime = Math.floor((Date.now() - gameState.startTime) / 1000);
    const hours = Math.floor(runtime / 3600);
    const minutes = Math.floor((runtime % 3600) / 60);
    const seconds = runtime % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Calculate time to goal
function getTimeToGoal() {
    const currentPoints = getCurrentVisiblePoints();
    const finalItemCost = 20000; // Based on game data
    const pointsNeeded = finalItemCost - currentPoints;
    
    if (pointsNeeded <= 0) return "Ready to complete!";
    if (gameState.pointsPerSecond <= 0) return "Unknown";
    
    const secondsToGoal = Math.ceil(pointsNeeded / gameState.pointsPerSecond);
    if (secondsToGoal < 60) return `${secondsToGoal} seconds`;
    if (secondsToGoal < 3600) return `${Math.floor(secondsToGoal / 60)}m ${secondsToGoal % 60}s`;
    return `${Math.floor(secondsToGoal / 3600)}h ${Math.floor((secondsToGoal % 3600) / 60)}m`;
}

// Print status report
function printStatus() {
    const currentPoints = getCurrentVisiblePoints();
    const items = getShopItems();
    const enabledItems = items.filter(item => item.isEnabled);
    const finalItem = items.find(item => item.isFinalItem);
    const clicksPerSecond = Math.round(gameState.totalClicks / ((Date.now() - gameState.startTime) / 1000));
    
    console.log(`
🌱 THE LAST MEADOW BOT v2.0.0 - STATUS REPORT (${new Date().toISOString().replace('T', ' ').substring(0, 19)})
⏱️ Runtime: ${getRuntime()}
💰 Current Points: ${currentPoints.toLocaleString()}
📈 Points/sec: ${gameState.pointsPerSecond.toLocaleString()}
🖱️ Total Clicks: ${gameState.totalClicks.toLocaleString()} (${clicksPerSecond}/sec)
🎁 Level Rewards: ${gameState.levelRewardsClaimed} | 🎲 Lootboxes: ${gameState.lootboxesCollected} | 🌿 Weeds: ${gameState.weedsRemoved}
${finalItem ? `🏁 Final Item: ${finalItem.label} (${finalItem.cost.toLocaleString()} pts)${finalItem.isEnabled ? ' - AVAILABLE! 🚀' : ''}` : '🏁 Final Item: Not found'}
⏳ Time to Goal: ${finalItem ? getTimeToGoal() : 'Unknown'}
⚙️ Mode: ${config.finishGame ? "🚩 Finish Game ASAP" : "🔄 Maximize Points"}${config.experimentalMode ? " | 🧪 Experimental Mode ON" : ""}
`);
    
    // If game appears stuck, try a different strategy
    if (gameState.lastPoints === currentPoints && gameState.lastPoints !== 0 && 
        Date.now() - gameState.startTime > 10000) { // Only check after 10 seconds of runtime
        console.log("⚠️ Game appears stuck. Trying to resolve...");
        tryUnstuckStrategies();
    }
    
    gameState.lastPoints = currentPoints;
    
    // Display item contribution efficiency in debug mode
    if (config.debugMode && gameState.effectiveItems) {
        console.log("Item Efficiency Report:");
        
        const itemEfficiency = Object.entries(gameState.effectiveItems)
            .map(([itemId, contribution]) => {
                // Try to find the cost of this item
                const item = items.find(i => i.index === parseInt(itemId));
                const cost = item ? item.cost : 'Unknown';
                const efficiency = item ? contribution / item.cost : 'Unknown';
                
                return {
                    itemId,
                    contribution,
                    cost,
                    efficiency: typeof efficiency === 'number' ? efficiency : 0
                };
            })
            .sort((a, b) => b.efficiency - a.efficiency);
        
        console.table(itemEfficiency);
    }
}

// Strategies to try if the game appears stuck
function tryUnstuckStrategies() {
    try {
        // First try collecting any rewards or lootboxes or removing weeds
        if (removeWeeds() || collectLevelRewards() || collectLootboxes()) {
            console.log("🔄 Unstuck: Collected available rewards or removed weeds");
            return;
        }
        
        // If that didn't work, try manipulating game state
        const currentState = JSON.parse(localStorage.getItem('ClickerGameStore'));
        if (!currentState || !currentState._state) return;
        
        // Make sure some achievements are unlocked
        if (!currentState._state.unlockedAchievements) {
            currentState._state.unlockedAchievements = [];
        }
        
        for (let i = 0; i < 20; i++) {
            if (!currentState._state.unlockedAchievements.includes(i)) {
                currentState._state.unlockedAchievements.push(i);
            }
        }
        
        // Boost points slightly to get unstuck
        for (const [itemId, points] of Object.entries(currentState._state.pointsByItem)) {
            if (points > 0) {
                currentState._state.pointsByItem[itemId] = points * 1.05; // 5% boost
            }
        }
        
        console.log("🔄 Applying unstuck strategy by modifying game state");
        localStorage.setItem('ClickerGameStore', JSON.stringify(currentState));
    } catch (e) {
        console.error("❌ Error applying unstuck strategy:", e);
    }
}

// Look for weed elements continuously
function scanForWeeds() {
    // Check for weeds
    if (document.querySelector('.clickable_fa03d7')) {
        return true;
    }
    
    // Check for weeds with a different selector (in case the class changes)
    if (document.querySelector('.weed_fa03d7')) {
        return true;
    }
    
    // Check for any elements with "weed" in their class name
    const possibleWeeds = Array.from(document.querySelectorAll('*')).filter(
        el => Array.from(el.classList).some(cls => cls.toLowerCase().includes('weed'))
    );
    
    if (possibleWeeds.length > 0) {
        return true;
    }
    
    return false;
}

// Stop the bot
function stopBot() {
    if (botIntervals.clicker) clearInterval(botIntervals.clicker);
    if (botIntervals.weedScanner) clearInterval(botIntervals.weedScanner);
    if (botIntervals.gameLoop) clearInterval(botIntervals.gameLoop);
    if (botIntervals.status) clearInterval(botIntervals.status);
    
    gameState.botActive = false;
    
    console.log(`
🌱 THE LAST MEADOW BOT v2.0.0 - STOPPED
⏱️ Total Runtime: ${getRuntime()}
🖱️ Total Clicks: ${gameState.totalClicks.toLocaleString()} (${Math.round(gameState.totalClicks / ((Date.now() - gameState.startTime) / 1000))}/sec)
🎁 Level Rewards: ${gameState.levelRewardsClaimed} | 🎲 Lootboxes: ${gameState.lootboxesCollected} | 🌿 Weeds: ${gameState.weedsRemoved}
    
Bot stopped. Call startBot() to restart.
`);
}

// Toggle a configuration option
function toggleConfig(option) {
    if (typeof config[option] !== 'undefined') {
        config[option] = !config[option];
        console.log(`${option} set to: ${config[option]}`);
    } else {
        console.log(`Unknown option: ${option}`);
    }
}

// Set click interval
function setClickInterval(interval) {
    if (isNaN(interval) || interval < 1) {
        console.log("Invalid interval. Must be a number >= 1.");
        return;
    }
    
    config.clickInterval = interval;
    console.log(`Click interval set to: ${interval}ms`);
    
    // Update the clicker interval if bot is running
    if (gameState.botActive && botIntervals.clicker) {
        clearInterval(botIntervals.clicker);
        botIntervals.clicker = setInterval(autoClick, config.clickInterval);
    }
}

// Main bot loop
function startBot() {
    // Reset game state
    gameState.totalClicks = 0;
    gameState.startTime = Date.now();
    gameState.levelRewardsClaimed = 0;
    gameState.lootboxesCollected = 0;
    gameState.weedsRemoved = 0;
    gameState.lawnmowersAvoided = 0;
    gameState.botActive = true;
    
    // Clear any existing intervals
    if (botIntervals.clicker) clearInterval(botIntervals.clicker);
    if (botIntervals.weedScanner) clearInterval(botIntervals.weedScanner);
    if (botIntervals.gameLoop) clearInterval(botIntervals.gameLoop);
    if (botIntervals.status) clearInterval(botIntervals.status);
    
    // Set up interval for auto-clicking at maximum speed
    botIntervals.clicker = setInterval(autoClick, config.clickInterval);
    
    // Set up a dedicated weed scanner with higher priority and frequency
    botIntervals.weedScanner = setInterval(() => {
        if (config.removeWeeds && scanForWeeds()) {
            removeWeeds();
        }
        
        // Also continuously check for final item if finishGame is true
        if (config.finishGame) {
            checkFinalItemAvailability();
        }
    }, 100);
    
    // Core game loop for all actions excluding clicking and weed removal
    botIntervals.gameLoop = setInterval(() => {
        // Priority order: Level rewards > Lootboxes > Special elements > Purchases
        if (!collectLevelRewards() && !collectLootboxes() && !handleSpecialElements()) {
            strategicPurchase();
        }
        
        // Occasionally try to upgrade items (but not if we're saving for final item)
        if (!config.finishGame || !gameState.finalItemAvailable) {
            if (Math.random() < 0.05) {
                upgradeItems();
            }
        }
    }, config.purchaseInterval);
    
    // Set up status reporting
    botIntervals.status = setInterval(printStatus, config.statusInterval);
    
    console.log(`
🌱 THE LAST MEADOW BOT v2.0.0 - STARTED
⚙️ Game Mode: ${config.finishGame ? "Finish Game ASAP" : "Maximize Points"}
${config.experimentalMode ? "🧪 Experimental Mode: ON - Skipping logo items" : ""}
⏱️ Click Interval: ${config.clickInterval}ms

Bot Control Functions:
- stopBot() - Stop the bot
- startBot() - Restart the bot
- toggleConfig("finishGame") - Toggle finish game mode
- toggleConfig("experimentalMode") - Toggle experimental mode (skip logo items)
- toggleConfig("removeWeeds") - Toggle weed removal
- toggleConfig("collectLootboxes") - Toggle lootbox collection
- toggleConfig("collectLevelRewards") - Toggle level reward collection
- toggleConfig("debugMode") - Toggle debug mode
- setClickInterval(10) - Set clicking speed (ms between clicks)
    `);
    
    // First status report
    printStatus();
}

// Make functions available globally
window.startBot = startBot;
window.stopBot = stopBot;
window.toggleConfig = toggleConfig;
window.setClickInterval = setClickInterval;

// Start initialization
initialize();
