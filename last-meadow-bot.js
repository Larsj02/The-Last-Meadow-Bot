/**
 * The Last Meadow Game Bot
 * Version 1.1.0
 * For educational purposes only
 */

// Configuration
const config = {
    clickInterval: 10,         // Milliseconds between clicks
    purchaseInterval: 500,     // Milliseconds between purchase checks
    statusInterval: 3000,      // Milliseconds between status updates
    autoUpgrade: true,         // Automatically upgrade items
    priorityItems: [26, 18, 24, 14, 13, 12], // Items to prioritize buying (highest value ones)
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
    startTime: Date.now()
  };
  
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
  }
  
  // Initialize by reading current state
  function initialize() {
    console.log("%c🤖 The Last Meadow Bot starting...", "color: #4CAF50; font-size: 14px; font-weight: bold;");
    
    try {
      const currentState = JSON.parse(localStorage.getItem('ClickerGameStore'));
      if (currentState) {
        updateGameState(currentState);
        console.log("✅ Initial state loaded:", gameState);
      }
    } catch (e) {
      console.error("❌ Error loading initial state:", e);
    }
  }
  
  // Get current visible points from the DOM
  function getCurrentVisiblePoints() {
    const pointsElement = document.querySelector('.pointsValue__7a0c3');
    return pointsElement ? parseInt(pointsElement.textContent) : 0;
  }
  
  // Auto-clicker function
  function autoClick() {
    const button = document.querySelector('.logo_cf3f70');
    if (button) {
      button.click();
      gameState.totalClicks++;
    }
  }
  
  // Get all available shop items with their costs
  function getShopItems() {
    const items = [];
    document.querySelectorAll('.item__4b373').forEach((item, index) => {
      const pointsInfoElement = item.querySelector('.pointsInfo__4b373 .text__73a39');
      if (pointsInfoElement) {
        const cost = parseInt(pointsInfoElement.textContent);
        const isEnabled = !item.classList.contains('disabled_e9638b');
        const label = item.getAttribute('aria-label') || `Item ${index}`;
        
        items.push({
          element: item,
          cost,
          isEnabled,
          label,
          index
        });
      }
    });
    return items;
  }
  
  // Strategic purchasing of items
  function strategicPurchase() {
    const currentPoints = getCurrentVisiblePoints();
    const items = getShopItems();
    
    // First check priority items
    for (const priorityId of config.priorityItems) {
      const priorityItem = items.find(item => item.label.includes(priorityId) || item.index === priorityId);
      if (priorityItem && priorityItem.isEnabled && currentPoints >= priorityItem.cost + config.pointsReserve) {
        if (config.debugMode) {
          console.log(`🛒 Buying priority item: ${priorityItem.label} (${priorityItem.cost} points)`);
        }
        priorityItem.element.click();
        return true;
      }
    }
    
    // If no priority items were bought, buy the most expensive affordable item
    const affordableItems = items
      .filter(item => item.isEnabled && currentPoints >= item.cost + config.pointsReserve)
      .sort((a, b) => b.cost - a.cost);
      
    if (affordableItems.length > 0) {
      const itemToBuy = affordableItems[0];
      if (config.debugMode) {
        console.log(`🛒 Buying item: ${itemToBuy.label} (${itemToBuy.cost} points)`);
      }
      itemToBuy.element.click();
      return true;
    }
    
    return false;
  }
  
  // Upgrade items when possible through localStorage manipulation
  function upgradeItems() {
    if (!config.autoUpgrade) return;
    
    try {
      const currentState = JSON.parse(localStorage.getItem('ClickerGameStore'));
      if (!currentState || !currentState._state) return;
      
      let upgraded = false;
      const purchasedItems = currentState._state.purchasedItems;
      
      // Attempt to upgrade all purchased items
      for (const itemId in purchasedItems) {
        if (!purchasedItems[itemId].upgrades) {
          purchasedItems[itemId].upgrades = {};
        }
        
        // Add upgrade level if missing
        for (let i = 0; i < 5; i++) {
          if (!purchasedItems[itemId].upgrades[i]) {
            purchasedItems[itemId].upgrades[i] = 1;
            upgraded = true;
          }
        }
        
        // Increase upgrade levels
        for (const upgradeId in purchasedItems[itemId].upgrades) {
          if (purchasedItems[itemId].upgrades[upgradeId] < 10) {
            purchasedItems[itemId].upgrades[upgradeId] += 1;
            upgraded = true;
          }
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
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  
  // Print status report
  function printStatus() {
    const currentPoints = getCurrentVisiblePoints();
    const items = getShopItems();
    const enabledItems = items.filter(item => item.isEnabled);
    const nextPurchase = enabledItems.length > 0 ? 
      enabledItems.sort((a, b) => a.cost - b.cost)[0] : null;
      
    const clicksPerSecond = Math.round(gameState.totalClicks / ((Date.now() - gameState.startTime) / 1000));
    
    console.log(`
  %c🤖 BOT STATUS REPORT
  -------------------
  ⏱️ Runtime: ${getRuntime()}
  💰 Current Points: ${currentPoints}
  🖱️ Total Clicks: ${gameState.totalClicks} (${clicksPerSecond}/sec)
  🛍️ Items Available: ${enabledItems.length}/${items.length}
  ${nextPurchase ? `🎯 Next purchase: ${nextPurchase.label} (${nextPurchase.cost} points)` : '🎯 No items available to purchase'}
    `, "color: #2196F3; font-weight: bold;");
    
    // If game appears stuck, try a different strategy
    if (gameState.lastPoints === currentPoints && gameState.lastPoints !== 0) {
      console.log("⚠️ Game appears stuck. Trying to resolve...");
      tryUnstuckStrategies();
    }
    
    gameState.lastPoints = currentPoints;
  }
  
  // Strategies to try if the game appears stuck
  function tryUnstuckStrategies() {
    try {
      const currentState = JSON.parse(localStorage.getItem('ClickerGameStore'));
      if (!currentState || !currentState._state) return;
      
      // Make sure some achievements are unlocked
      if (!currentState._state.unlockedAchievements) {
        currentState._state.unlockedAchievements = [];
      }
      
      for (let i = 0; i < 10; i++) {
        if (!currentState._state.unlockedAchievements.includes(i)) {
          currentState._state.unlockedAchievements.push(i);
        }
      }
      
      console.log("🔄 Applying unstuck strategy by modifying game state");
      localStorage.setItem('ClickerGameStore', JSON.stringify(currentState));
    } catch (e) {
      console.error("❌ Error applying unstuck strategy:", e);
    }
  }
  
  // Main bot loop
  function startBot() {
    initialize();
    
    // Set up interval for auto-clicking
    const clickerInterval = setInterval(autoClick, config.clickInterval);
    
    // Set up interval for purchasing
    const purchaseInterval = setInterval(() => {
      strategicPurchase();
      
      // Occasionally try to upgrade items
      if (Math.random() < 0.05) {
        upgradeItems();
      }
    }, config.purchaseInterval);
    
    // Set up status reporting
    const statusInterval = setInterval(printStatus, config.statusInterval);
    
    // Provide control functions in global scope
    window.botControls = {
      stop: () => {
        clearInterval(clickerInterval);
        clearInterval(purchaseInterval);
        clearInterval(statusInterval);
        console.log("%c🛑 Bot stopped", "color: #F44336; font-size: 14px; font-weight: bold;");
        
        const runtime = getRuntime();
        console.log(`%c📊 Final Stats: ${gameState.totalClicks} clicks in ${runtime}`, 
          "color: #9C27B0; font-size: 14px;");
      },
      upgrade: upgradeItems,
      status: printStatus,
      toggleDebug: () => {
        config.debugMode = !config.debugMode;
        console.log(`Debug mode ${config.debugMode ? 'enabled' : 'disabled'}`);
      }
    };
    
    console.log(`
  %c🤖 The Last Meadow Bot is running!
  ----------------------------------
  Use these commands to control the bot:
  - botControls.stop() - Stop the bot
  - botControls.upgrade() - Upgrade all items
  - botControls.status() - Print status report
  - botControls.toggleDebug() - Toggle debug logging
    `, "color: #4CAF50; font-size: 14px;");
  }
  
  // Start the bot
  startBot();