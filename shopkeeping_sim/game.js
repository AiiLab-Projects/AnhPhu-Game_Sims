// Shopkeeper Simulator - Main Game Engine & Controller

class ShopkeeperGame {
  constructor() {
    this.storeName = 'Tiệm Bách Hóa Vui Vẻ';
    this.day = 1;
    this.timeMinutes = 8 * 60; // 08:00 AM (in minutes)
    this.dayEndMinutes = 22 * 60; // 22:00 PM
    this.gameSpeed = 1; // 0 = pause, 1 = normal, 2 = fast, 3 = super fast
    
    // Core Economy
    this.isOpen = true; // Store open/close state
    this.money = 600000; // Starting money: 600,000 VND
    this.reputation = 50; // 0 to 100
    this.cleanliness = 100; // 0 to 100%
    
    // Warehouse & Shelves
    this.warehouseCapacity = 50;
    this.warehouse = {}; // { item_id: quantity }
    
    // Default initial shelves (3 starting shelves)
    this.maxShelves = 3;
    this.shelves = [
      { id: 0, itemId: 'drink_water', price: 8000, quantity: 15, maxQuantity: 20, x: 160, y: 140 },
      { id: 1, itemId: 'drink_soda', price: 12000, quantity: 12, maxQuantity: 16, x: 280, y: 140 },
      { id: 2, itemId: 'snack_chips', price: 12000, quantity: 10, maxQuantity: 15, x: 400, y: 140 }
    ];
    
    // Initial Stock in Warehouse
    this.warehouse['drink_water'] = 20;
    this.warehouse['drink_soda'] = 15;
    this.warehouse['snack_chips'] = 15;
    this.warehouse['food_noodles'] = 10;
    
    // Upgrades, Staff, Marketing State
    this.purchasedUpgrades = [];
    this.hiredStaff = []; // array of staff ids
    this.activeMarketing = []; // { id, remainingDays }
    this.activeBuffs = {}; // e.g. { boost_drink: 1, market_discount: 0.7 }
    
    // Daily Financial Tracking
    this.dailyRevenue = 0;
    this.dailyTips = 0;
    this.dailyCostGoods = 0;
    this.dailyRent = 40000;
    this.dailyServedCustomers = 0;
    this.dailyReviews = [];
    
    // All-time Stats
    this.allTimeRevenue = 0;
    this.allTimeTips = 0;
    this.allTimeProfit = 0;
    this.allTimeCustomers = 0;
    this.allTimeHappyCustomers = 0;
    
    // Simulation Entities
    this.customers = [];
    this.dirtPatches = []; // [{x, y, radius}]
    this.floatingTexts = []; // [{text, x, y, color, life}]
    this.cashierQueue = []; // customers waiting at checkout
    this.checkoutTimer = 0;

    // Anti-Theft & Security System State
    this.activeQTE = false;
    this.activeDasher = null;
    this.qteTimeLeft = 0;
    this.qteTotalTime = 3;
    this.pendingScammer = null;
    
    // Dynamic Staff Entities (Animated Running & Working)
    this.staffEntities = {
      staff_restocker: {
        x: 450, y: 80, targetX: 450, targetY: 80,
        state: 'idle', targetShelfIdx: null, carryingItemId: null, carryingQty: 0,
        timer: 0, speech: '', speechTimer: 0, speed: 120, animBounce: 0
      },
      staff_janitor: {
        x: 320, y: 250, targetX: 320, targetY: 250,
        state: 'patrolling', targetDirtIndex: null, timer: 0, speech: '', speechTimer: 0, speed: 100, animBounce: 0
      },
      staff_security: {
        x: 60, y: 280, targetX: 60, targetY: 280,
        state: 'patrolling', targetThief: null, timer: 0, speech: '', speechTimer: 0, speed: 135, animBounce: 0
      },
      staff_cashier: {
        x: 90, y: 220, targetX: 90, targetY: 220,
        state: 'working', timer: 0, speech: '', speechTimer: 0, speed: 80, animBounce: 0
      }
    };
    
    // Canvas & Rendering
    this.canvas = document.getElementById('shop-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.animFrameId = null;
    this.lastTimestamp = performance.now();
    
    // Market Fluctuations per item { itemId: multiplier }
    this.marketPrices = {};
    this.initMarketPrices();
    
    // Event Logs
    this.logs = [];

    // Temporary variables for modal UI
    this.selectedShelfForAssign = null;
    this.isDayEnding = false;
    this.autoSaveTimer = 0;

    this.init();
  }

  init() {
    this.loadGame();
    this.setupCanvas();
    this.initStaffEntities();
    this.bindDOMEvents();
    this.updateAllUI();

    // Initialize 3D Supermarket Engine
    if (typeof Shop3D !== 'undefined') {
      try {
        this.shop3D = new Shop3D(this);
      } catch (err) {
        console.error('Failed to initialize Shop3D:', err);
      }
    }

    this.log(`🏪 ${this.storeName} chính thức mở cửa ngày thứ ${this.day}!`);
    
    // Start Simulation Loop
    this.lastTimestamp = performance.now();
    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  initStaffEntities() {
    const w = (this.canvas && this.canvas.width > 50) ? this.canvas.width : 650;
    const h = (this.canvas && this.canvas.height > 50) ? this.canvas.height : 420;
    const checkoutX = w * 0.15;
    const checkoutY = h * 0.55;

    if (this.staffEntities.staff_cashier) {
      this.staffEntities.staff_cashier.x = checkoutX;
      this.staffEntities.staff_cashier.y = checkoutY - 32;
    }
    if (this.staffEntities.staff_restocker) {
      if (this.staffEntities.staff_restocker.state === 'idle') {
        this.staffEntities.staff_restocker.x = w * 0.88;
        this.staffEntities.staff_restocker.y = 50;
        this.staffEntities.staff_restocker.targetX = w * 0.65;
        this.staffEntities.staff_restocker.targetY = h * 0.4;
      }
    }
    if (this.staffEntities.staff_janitor) {
      if (typeof this.staffEntities.staff_janitor.x !== 'number' || isNaN(this.staffEntities.staff_janitor.x) || this.staffEntities.staff_janitor.x < 10) {
        this.staffEntities.staff_janitor.x = w * 0.45;
        this.staffEntities.staff_janitor.y = h * 0.5;
      }
      this.staffEntities.staff_janitor.targetX = w * 0.25 + Math.random() * (w * 0.55);
      this.staffEntities.staff_janitor.targetY = h * 0.25 + Math.random() * (h * 0.5);
    }
    if (this.staffEntities.staff_security) {
      if (typeof this.staffEntities.staff_security.x !== 'number' || isNaN(this.staffEntities.staff_security.x)) {
        this.staffEntities.staff_security.x = 60;
        this.staffEntities.staff_security.y = (h * 0.85) - 30;
      }
      this.staffEntities.staff_security.targetX = 55;
      this.staffEntities.staff_security.targetY = (h * 0.85) - 30;
    }
  }

  initMarketPrices() {
    GAME_ITEMS.forEach(item => {
      const mult = 0.85 + Math.random() * 0.3;
      this.marketPrices[item.id] = Math.round(item.baseCost * mult / 1000) * 1000;
    });
  }

  setupCanvas() {
    if (!this.canvas) return;
    const resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.recalculateShelfPositions();
      this.initStaffEntities();
    };
    window.addEventListener('resize', resize);
    resize();
  }

  recalculateShelfPositions() {
    const w = this.canvas.width || 600;
    const h = this.canvas.height || 400;

    const row1Y = Math.floor(h * 0.35);
    const row2Y = Math.floor(h * 0.65);
    
    const count = this.shelves.length;
    for (let i = 0; i < count; i++) {
      let x, y;
      if (i < 5) {
        const step = (w * 0.65) / Math.min(count, 5);
        x = Math.floor(w * 0.28 + (i % 5) * step);
        y = row1Y;
      } else {
        const step = (w * 0.65) / (count - 5);
        x = Math.floor(w * 0.28 + ((i - 5) % 5) * step);
        y = row2Y;
      }
      this.shelves[i].x = x;
      this.shelves[i].y = y;
    }
  }

  // GAME LOOP
  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    if (this.gameSpeed > 0 && !this.isDayEnding) {
      this.update(dt * this.gameSpeed);
    }
    
    if (this.shop3D) {
      this.shop3D.update(dt);
      this.shop3D.render();
    } else {
      this.render();
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  }

  // UPDATE STATE
  update(dt) {
    // 1. Time advancement
    this.timeMinutes += dt * 1.0;
    this.updateClockUI();

    if (this.timeMinutes >= this.dayEndMinutes) {
      this.endDay();
      return;
    }

    // 2. Staff animated behaviors & duties
    this.updateStaffBehaviors(dt);

    // 3. Customer Spawning
    this.updateCustomerSpawning(dt);

    // 4. Update Customers AI
    this.updateCustomers(dt);

    // 5. Checkout Processing
    this.updateCheckout(dt);

    // 6. Cleanliness & Dirt generation
    this.updateStoreHygiene(dt);

    // 7. Random Event Chance trigger
    this.checkRandomEventTrigger(dt);

    // 8. Update floating text particles
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].life -= dt;
      this.floatingTexts[i].y -= dt * 25;
      if (this.floatingTexts[i].life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 9. Update active Dasher QTE
    if (this.activeQTE) {
      this.qteTimeLeft -= dt;
      const bar = document.getElementById('qte-timer-bar');
      if (bar) {
        const pct = Math.max(0, (this.qteTimeLeft / this.qteTotalTime) * 100);
        bar.style.width = `${pct}%`;
      }
      if (this.qteTimeLeft <= 0) {
        this.handleQTEFail();
      }
    }

    // 9. Update store open/close banner status
    this.updateStoreStatusUI();

    // 10. Auto-save progress every 20 seconds
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= 20) {
      this.autoSaveTimer = 0;
      this.saveGame(false);
    }
  }

  updateClockUI() {
    const hours = Math.floor(this.timeMinutes / 60);
    const mins = Math.floor(this.timeMinutes % 60);
    const formatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    const clockEl = document.getElementById('clock-display');
    if (clockEl) clockEl.innerText = formatted;
    
    const dayEl = document.getElementById('day-counter');
    if (dayEl) dayEl.innerText = `Ngày ${this.day}`;
  }

  updateStaffBehaviors(dt) {
    if (!this.staffEntities) this.initStaffEntities();

    const w = (this.canvas && this.canvas.width > 50) ? this.canvas.width : 650;
    const h = (this.canvas && this.canvas.height > 50) ? this.canvas.height : 420;
    const whX = w * 0.88;
    const whY = 55;

    // Helper movement function for staff
    const moveEntity = (ent, speed, delta) => {
      if (typeof ent.targetX !== 'number' || isNaN(ent.targetX)) ent.targetX = ent.x || 300;
      if (typeof ent.targetY !== 'number' || isNaN(ent.targetY)) ent.targetY = ent.y || 200;
      if (typeof ent.x !== 'number' || isNaN(ent.x)) ent.x = ent.targetX;
      if (typeof ent.y !== 'number' || isNaN(ent.y)) ent.y = ent.targetY;

      const dx = ent.targetX - ent.x;
      const dy = ent.targetY - ent.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 8) {
        ent.x += (dx / dist) * speed * delta;
        ent.y += (dy / dist) * speed * delta;
        ent.animBounce = Math.sin(Date.now() / 90) * 4;
        return false; // Still moving
      } else {
        ent.animBounce = 0;
        return true; // Arrived at target waypoint
      }
    };

    // 1. JANITOR (Lao công quét dọn 🧹 - Chạy liên tục khắp tiệm & dọn rác)
    if (this.hiredStaff.includes('staff_janitor')) {
      const j = this.staffEntities.staff_janitor;
      if (j) {
        if (j.speechTimer > 0) j.speechTimer -= dt;

        // Ensure valid position
        if (typeof j.targetX !== 'number' || isNaN(j.targetX) || j.targetX < 20) {
          j.targetX = w * 0.25 + Math.random() * (w * 0.55);
          j.targetY = h * 0.25 + Math.random() * (h * 0.5);
        }

        if (this.dirtPatches.length > 0) {
          // Prioritize cleaning dirt
          const closestDirt = this.dirtPatches[0];
          j.targetX = closestDirt.x;
          j.targetY = closestDirt.y;
          j.state = 'cleaning_dirt';
          
          const arrived = moveEntity(j, (j.speed || 115) * 1.4, dt);
          const distToDirt = Math.sqrt((j.x - closestDirt.x)**2 + (j.y - closestDirt.y)**2);

          if (arrived || distToDirt <= 20) {
            this.dirtPatches.shift();
            this.cleanliness = Math.min(100, this.cleanliness + 10);
            gameAudio.playSweep();
            this.addFloatingText('✨ Sạch bóng!', j.x, j.y - 20, '#34d399');
            j.speech = '🧹 Quét sạch vết bẩn!';
            j.speechTimer = 1.5;
            this.updateStatsUI();

            // Immediately choose a new active patrol target across store
            j.targetX = w * 0.2 + Math.random() * (w * 0.65);
            j.targetY = h * 0.25 + Math.random() * (h * 0.55);
          } else {
            if (j.speechTimer <= 0) {
              j.speech = '🧹 Chạy tới dọn rác!';
              j.speechTimer = 1.5;
            }
          }
        } else {
          // No dirt -> Continuous active patrolling and floor maintenance
          this.cleanliness = Math.min(100, this.cleanliness + dt * 1.5);
          const arrived = moveEntity(j, (j.speed || 105), dt);
          
          if (arrived) {
            // Pick next patrol waypoint across store aisles
            j.targetX = w * 0.18 + Math.random() * (w * 0.68);
            j.targetY = h * 0.22 + Math.random() * (h * 0.58);
            j.speech = Math.random() < 0.4 ? '🧹 Lau sàn bóng loáng!' : '✨ Tiệm sạch 100%!';
            j.speechTimer = 2;
          }
        }
      }
    }

    // 2. RESTOCKER (Nhân viên tiếp hàng 👨‍🔧)
    if (this.hiredStaff.includes('staff_restocker')) {
      const r = this.staffEntities.staff_restocker;
      if (r) {
        if (r.speechTimer > 0) r.speechTimer -= dt;

        if (r.state === 'idle') {
          // Look for low or empty shelf that warehouse has items for
          let needyShelfIdx = -1;
          for (let i = 0; i < this.shelves.length; i++) {
            const s = this.shelves[i];
            if (s.itemId && s.quantity < s.maxQuantity && (this.warehouse[s.itemId] || 0) > 0) {
              needyShelfIdx = i;
              break;
            }
          }

          if (needyShelfIdx !== -1) {
            r.targetShelfIdx = needyShelfIdx;
            r.state = 'walking_to_wh';
            r.targetX = whX;
            r.targetY = whY;
            r.speech = '📦 Đến kho lấy hàng';
            r.speechTimer = 1.8;
          } else {
            // Patrol shelves to inspect goods
            const arrived = moveEntity(r, (r.speed || 115) * 0.7, dt);
            if (arrived) {
              if (this.shelves.length > 0) {
                const randShelf = this.shelves[Math.floor(Math.random() * this.shelves.length)];
                r.targetX = randShelf.x;
                r.targetY = randShelf.y + 35;
              } else {
                r.targetX = w * 0.7 + Math.random() * (w * 0.2);
                r.targetY = h * 0.2 + Math.random() * (h * 0.5);
              }
              r.speech = '👍 Hàng trên kệ đã đủ!';
              r.speechTimer = 2;
            }
          }
        } else if (r.state === 'walking_to_wh') {
          const arrived = moveEntity(r, (r.speed || 115), dt);
          if (arrived) {
            r.state = 'loading';
            r.timer = 0.5;
            r.speech = '📦 Đang bốc hàng...';
            r.speechTimer = 1.2;
          }
        } else if (r.state === 'loading') {
          r.timer -= dt;
          if (r.timer <= 0) {
            const shelf = this.shelves[r.targetShelfIdx];
            if (shelf && shelf.itemId && (this.warehouse[shelf.itemId] || 0) > 0) {
              const needed = shelf.maxQuantity - shelf.quantity;
              const inWh = this.warehouse[shelf.itemId] || 0;
              const take = Math.min(needed, inWh, 6);
              if (take > 0) {
                this.warehouse[shelf.itemId] -= take;
                r.carryingItemId = shelf.itemId;
                r.carryingQty = take;
                r.state = 'walking_to_shelf';
                r.targetX = shelf.x;
                r.targetY = shelf.y + 35;
                r.speech = `🏃 Bê ${take} món ra kệ!`;
                r.speechTimer = 2;
                this.updateInventoryCountUI();
              } else {
                r.state = 'idle';
              }
            } else {
              r.state = 'idle';
            }
          }
        } else if (r.state === 'walking_to_shelf') {
          const arrived = moveEntity(r, (r.speed || 115), dt);
          if (arrived) {
            r.state = 'stocking';
            r.timer = 0.5;
            r.speech = '⚡ Đang châm kệ!';
            r.speechTimer = 1;
          }
        } else if (r.state === 'stocking') {
          r.timer -= dt;
          if (r.timer <= 0) {
            const shelf = this.shelves[r.targetShelfIdx];
            if (shelf) {
              shelf.quantity = Math.min(shelf.maxQuantity, shelf.quantity + r.carryingQty);
              this.addFloatingText(`⚡ +${r.carryingQty} ${GAME_ITEMS.find(i=>i.id===r.carryingItemId)?.icon||'món'}`, r.x, r.y - 25, '#38bdf8');
              gameAudio.playScan();
              this.renderShelvesTab();
            }
            r.carryingQty = 0;
            r.carryingItemId = null;
            r.state = 'idle';
          }
        }
      }
    }

    // 3. SECURITY GUARD (Bảo vệ đô con 👮)
    if (this.hiredStaff.includes('staff_security')) {
      const sec = this.staffEntities.staff_security;
      if (sec) {
        if (sec.speechTimer > 0) sec.speechTimer -= dt;

        // Check if thief is in store
        const thief = this.customers.find(c => c.archetype.type === 'thief' && c.state !== 'leaving');
        if (thief) {
          sec.targetX = thief.x;
          sec.targetY = thief.y;
          sec.state = 'chasing';
          sec.speech = '🚨 ĐỨNG LẠI TÊN TRỘM!';
          sec.speechTimer = 1.5;

          // Sprint fast towards thief!
          const arrived = moveEntity(sec, (sec.speed || 130) * 1.5, dt);
          const distToThief = Math.sqrt((sec.x - thief.x)**2 + (sec.y - thief.y)**2);

          if (arrived || distToThief < 25) {
            // Tackle thief!
            thief.state = 'leaving';
            thief.speech = '😫 Bị bảo vệ tóm rồi!';
            thief.speechTimer = 3;
            thief.targetX = 20;
            thief.targetY = h * 0.85;

            this.money += 20000;
            this.reputation = Math.min(100, this.reputation + 3);
            gameAudio.playUpgrade();
            this.addFloatingText('🎯 BẢO VỆ BẮT TRỘM +20.000₫', sec.x, sec.y - 30, '#34d399');
            this.log('👮 Bảo vệ đã kịp thời tóm gọn tên trộm và nhận thưởng 20.000₫!');
            sec.speech = '👮 Đã tóm gọn!';
            sec.speechTimer = 2;
            this.updateStatsUI();

            sec.targetX = 55;
            sec.targetY = (h * 0.85) - 30;
          }
        } else {
          // Continuous Patrol near entrance and aisles
          const arrived = moveEntity(sec, (sec.speed || 130) * 0.75, dt);
          if (arrived) {
            if (Math.random() < 0.5) {
              sec.targetX = 55;
              sec.targetY = (h * 0.85) - 30;
              sec.speech = '👮 Canh gác cửa chính';
            } else {
              sec.targetX = w * 0.35 + Math.random() * (w * 0.35);
              sec.targetY = h * 0.45 + Math.random() * (h * 0.3);
              sec.speech = '👁️ Tuần tra các dãy kệ';
            }
            sec.speechTimer = 2;
          }
        }
      }
    }

    // 4. CASHIER (Thu ngân 👩‍💼)
    if (this.hiredStaff.includes('staff_cashier')) {
      const c = this.staffEntities.staff_cashier;
      if (c) {
        if (c.speechTimer > 0) c.speechTimer -= dt;
        if (this.cashierQueue.length > 0) {
          c.speech = '💳 Đang tính tiền...';
          c.speechTimer = 1;
          c.animBounce = Math.sin(Date.now() / 150) * 2;
        } else {
          c.animBounce = 0;
        }
      }
    }
  }

  updateCustomerSpawning(dt) {
    if (!this.isOpen) return;

    // Max capacity based on upgrades
    const maxCapacity = 4 + this.shelves.length;
    const capacityEl = document.getElementById('store-capacity');
    if (capacityEl) capacityEl.innerText = maxCapacity;

    if (this.customers.length >= maxCapacity) return;

    // Spawn rate influenced by reputation and marketing
    let marketingBonus = 0;
    this.activeMarketing.forEach(m => {
      const camp = MARKETING_CAMPAIGNS.find(c => c.id === m.id);
      if (camp) marketingBonus += camp.bonusVisitors * 0.15;
    });

    const spawnRate = (0.2 + (this.reputation / 100) * 0.4 + marketingBonus);
    if (Math.random() < spawnRate * dt) {
      this.spawnCustomer();
    }
  }

  spawnCustomer() {
    const hasVipUpgrade = this.purchasedUpgrades.includes('maneki_neko');
    const hasDog = this.purchasedUpgrades.includes('shop_dog');
    const rand = Math.random();

    let archetype = CUSTOMER_TYPES[0]; // default student

    // Theft spawn chance (50% reduction if Shop Dog is present)
    const thiefThreshold = hasDog ? 0.06 : 0.12;

    if (rand < thiefThreshold) {
      const thiefSub = Math.random();
      if (thiefSub < 0.35) {
        archetype = CUSTOMER_TYPES.find(c => c.type === 'the_shoplifter') || CUSTOMER_TYPES[0];
      } else if (thiefSub < 0.65) {
        archetype = CUSTOMER_TYPES.find(c => c.type === 'the_dasher') || CUSTOMER_TYPES[0];
      } else if (thiefSub < 0.85) {
        archetype = CUSTOMER_TYPES.find(c => c.type === 'the_scammer') || CUSTOMER_TYPES[0];
      } else {
        archetype = CUSTOMER_TYPES.find(c => c.type === 'distraction_bait') || CUSTOMER_TYPES[0];
        // Distraction Crew: spawn accomplice thief shortly
        setTimeout(() => {
          if (this.isOpen) {
            const thiefArch = CUSTOMER_TYPES.find(c => c.type === 'distraction_thief');
            if (thiefArch) this.createCustomerEntity(thiefArch);
          }
        }, 1500);
      }
    } else if (rand < (hasVipUpgrade ? 0.32 : 0.20)) {
      archetype = CUSTOMER_TYPES.find(c => c.type === 'vip') || CUSTOMER_TYPES[3];
    } else if (rand < 0.50) {
      archetype = CUSTOMER_TYPES.find(c => c.type === 'office') || CUSTOMER_TYPES[1];
    } else if (rand < 0.75) {
      archetype = CUSTOMER_TYPES.find(c => c.type === 'housewife') || CUSTOMER_TYPES[2];
    } else {
      archetype = CUSTOMER_TYPES.find(c => c.type === 'tiktoker') || CUSTOMER_TYPES[4];
    }

    this.createCustomerEntity(archetype);
  }

  createCustomerEntity(archetype) {
    const entranceX = 50;
    const entranceY = (this.canvas ? this.canvas.height : 400) * 0.85;

    const cust = {
      id: Math.random().toString(36).substring(2, 9),
      archetype: archetype,
      x: entranceX,
      y: entranceY,
      targetX: entranceX + 40,
      targetY: entranceY,
      state: 'entering',
      cart: [],
      budget: 50000 * (archetype.budgetMultiplier || 1),
      patience: (archetype.patience || 20) * (this.purchasedUpgrades.includes('air_conditioner') ? 1.4 : 1),
      maxPatience: (archetype.patience || 20),
      currentShelfTarget: null,
      browseTimer: 0,
      speech: archetype.isSpecial ? '👀' : '👋',
      speechTimer: 2,
      satisfaction: 100,
      hasStolen: false,
      stolenItem: null,
      isAlerted: false,
      isCaught: false,
      alarmTriggered: false,
      speedMultiplier: 1.0
    };

    this.customers.push(cust);
    const countEl = document.getElementById('customer-count');
    if (countEl) countEl.innerText = this.customers.length;
    gameAudio.playDoorBell();
    return cust;
  }

  updateCustomers(dt) {
    const count = this.customers.length;
    for (let i = count - 1; i >= 0; i--) {
      const c = this.customers[i];
      c.patience -= dt * (this.cleanliness < 50 ? 1.5 : 1);
      if (c.speechTimer > 0) {
        c.speechTimer -= dt;
      }

      // Movement step with dasher speed support
      const dx = c.targetX - c.x;
      const dy = c.targetY - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const baseSpeed = 70 * (c.archetype.speed || 1.2);
      const currentSpeed = baseSpeed * (c.speedMultiplier || 1.0);

      if (dist > 5) {
        c.x += (dx / dist) * currentSpeed * dt;
        c.y += (dy / dist) * currentSpeed * dt;
      } else {
        this.handleCustomerArrival(c);
      }

      // Security Sensor Gates Alarm check as thief nears exit
      if (c.hasStolen && !c.isCaught && c.state === 'leaving' && dist <= 35) {
        if (this.purchasedUpgrades.includes('security_gates') && !c.alarmTriggered) {
          c.alarmTriggered = true;
          gameAudio.playAlarm();
          this.addFloatingText('🚨 CỔNG TỪ BÁO ĐỘNG ĐỎ!', c.x, c.y - 25, '#ef4444');
          this.log(`🚨 Cổng từ an ninh báo động: Phát hiện ${c.archetype.name} mang hàng chưa thanh toán ra cửa!`);

          // Security Guard automatic intercept
          if (this.hiredStaff.includes('staff_security')) {
            c.isCaught = true;
            c.state = 'leaving';
            c.speech = '👮 Bị bảo vệ chặn tại cổng từ!';
            c.speechTimer = 3;
            this.money += 35000;
            this.reputation = Math.min(100, this.reputation + 4);
            gameAudio.playTackle();
            this.addFloatingText('👮 BẢO VỆ TÓM TẠI CỬA! +35.000₫', c.x, c.y - 30, '#34d399');
            this.log('👮 Bảo vệ chuyên nghiệp đã kịp thời tóm gọn kẻ trộm tại cổng từ!');
            this.updateStatsUI();
          }
        }
      }

      // If customer ran out of patience
      if (c.patience <= 0 && c.state !== 'leaving') {
        c.state = 'leaving';
        c.speech = '😡 Đợi lâu quá!';
        c.speechTimer = 2.5;
        c.satisfaction = 0;
        this.reputation = Math.max(0, this.reputation - 1);
        gameAudio.playAngry();
        c.targetX = 20;
        c.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;
      }

      // Exit reached
      if (c.state === 'leaving' && dist <= 12) {
        if (c.hasStolen && !c.isCaught) {
          this.reputation = Math.max(0, this.reputation - 3);
          this.log(`💸 ${c.archetype.name} đã tẩu thoát qua cửa cùng món hàng! Hãy nâng cấp an ninh.`);
          this.updateStatsUI();
        }
        this.customers.splice(i, 1);
        const countEl = document.getElementById('customer-count');
        if (countEl) countEl.innerText = this.customers.length;
      }
    }
  }

  handleCustomerArrival(c) {
    if (c.state === 'entering') {
      this.assignCustomerToShelf(c);
    } else if (c.state === 'browsing') {
      this.evaluateShelfPurchase(c);
    } else if (c.state === 'queueing') {
      if (!this.cashierQueue.includes(c)) {
        this.cashierQueue.push(c);
      }
    } else if (c.state === 'commotion') {
      // Distraction bait makes a scene
      this.cleanliness = Math.max(10, this.cleanliness - 15);
      gameAudio.playAngry();
      c.speech = '😱 Ôi trời ơi, vỡ đồ ngất xỉu rồi!';
      c.speechTimer = 3.5;
      this.addFloatingText('💥 ĐỔ VỠ ĐỒ ĐẠC! -15% Sạch', c.x, c.y - 25, '#ef4444');
      this.log('💥 Kẻ dàn cảnh vừa cố tình gây đổ vỡ làm bẩn sàn tiệm và gây chú ý! Hãy coi chừng kệ hàng cao cấp!');
      
      // Spawn dirt patches
      this.dirtPatches.push(
        { x: c.x - 15, y: c.y - 10, r: 16 },
        { x: c.x + 15, y: c.y + 10, r: 14 }
      );
      c.state = 'leaving';
      c.targetX = 20;
      this.updateStatsUI();
    }
  }

  assignCustomerToShelf(c) {
    const populatedShelves = this.shelves.filter(s => s.itemId && s.quantity > 0);

    // Distraction Bait: head to store center
    if (c.archetype.subType === 'distraction_bait') {
      const w = this.canvas ? this.canvas.width : 600;
      const h = this.canvas ? this.canvas.height : 400;
      c.targetX = w * 0.45;
      c.targetY = h * 0.48;
      c.state = 'commotion';
      c.speech = '🚶 Đi lảo đảo...';
      c.speechTimer = 2;
      return;
    }

    if (populatedShelves.length === 0) {
      c.state = 'leaving';
      c.speech = '😕 Hết hàng rồi à?';
      c.speechTimer = 2.5;
      c.targetX = 20;
      c.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;
      return;
    }

    // Shoplifter & Distraction Thief seek highest value shelves
    if (c.archetype.subType === 'shoplifter' || c.archetype.subType === 'distraction_thief') {
      const sorted = [...populatedShelves].sort((a, b) => (b.price || 0) - (a.price || 0));
      const shelf = sorted[0] || populatedShelves[0];
      c.currentShelfTarget = shelf;
      c.targetX = shelf.x + (Math.random() * 20 - 10);
      c.targetY = shelf.y + 35;
      c.state = 'browsing';
      c.speech = '👀 Nhìn quanh lén lút...';
      c.speechTimer = 2;
      return;
    }

    // Dasher & Scammer pick any available goods
    if (c.archetype.subType === 'dasher' || c.archetype.subType === 'scammer') {
      const shelf = populatedShelves[Math.floor(Math.random() * populatedShelves.length)];
      c.currentShelfTarget = shelf;
      c.targetX = shelf.x + (Math.random() * 20 - 10);
      c.targetY = shelf.y + 35;
      c.state = 'browsing';
      c.speech = c.archetype.subType === 'dasher' ? '🏃 Chuẩn bị bứt tốc...' : '🕵️ Tìm món đắt để tráo tem...';
      c.speechTimer = 2;
      return;
    }

    // Normal customer preference logic
    let preferred = populatedShelves.filter(s => {
      const itm = GAME_ITEMS.find(i => i.id === s.itemId);
      return itm && c.archetype.preferredCategories && c.archetype.preferredCategories.includes(itm.category);
    });

    const chosenShelf = preferred.length > 0
      ? preferred[Math.floor(Math.random() * preferred.length)]
      : populatedShelves[Math.floor(Math.random() * populatedShelves.length)];

    c.currentShelfTarget = chosenShelf;
    c.targetX = chosenShelf.x + (Math.random() * 20 - 10);
    c.targetY = chosenShelf.y + 35;
    c.state = 'browsing';
    c.speech = '🤔 Xem thử...';
    c.speechTimer = 1.5;
  }

  evaluateShelfPurchase(c) {
    const shelf = c.currentShelfTarget;
    if (!shelf || !shelf.itemId || shelf.quantity <= 0) {
      c.speech = '🙁 Tiếc quá, hết hàng!';
      c.speechTimer = 1.5;
      this.routeToNextActionOrCheckout(c);
      return;
    }

    const item = GAME_ITEMS.find(i => i.id === shelf.itemId);
    if (!item) {
      this.routeToNextActionOrCheckout(c);
      return;
    }

    // 1. Shoplifter (Kẻ trộm vặt giấu đồ)
    if (c.archetype.subType === 'shoplifter') {
      shelf.quantity = Math.max(0, shelf.quantity - 1);
      c.hasStolen = true;
      c.stolenItem = item;

      // Detection upgrade check
      const hasDetection = this.purchasedUpgrades.includes('convex_mirror') || this.purchasedUpgrades.includes('cctv_security');
      if (hasDetection) {
        c.isAlerted = true;
        c.speech = '⚠️ (Chuẩn bị nhét vào áo)';
        c.speechTimer = 3;
        this.addFloatingText('🔍 PHÁT HIỆN KẺ GIẤU ĐỒ!', c.x, c.y - 25, '#fbbf24');
        this.log(`🔍 Gương cầu lồi / Camera đã phát hiện ${c.archetype.name} chuẩn bị giấu ${item.name}! Hãy bấm Khám xét ngay.`);
      } else {
        c.speech = '🤫 Đã giấu vào áo!';
        c.speechTimer = 2.5;
      }

      c.state = 'leaving';
      c.targetX = 20;
      c.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;
      this.renderShelvesTab();
      return;
    }

    // 2. Dasher (Khách chạy làng / Grab & Run)
    if (c.archetype.subType === 'dasher') {
      shelf.quantity = Math.max(0, shelf.quantity - 1);
      c.hasStolen = true;
      c.stolenItem = item;
      c.speech = '⚡ CƯỚP ĐƯỢC RỒI! PHÓNG THÔI!';
      c.speechTimer = 3;
      c.state = 'dashing';
      c.speedMultiplier = this.purchasedUpgrades.includes('emergency_door_lock') ? 1.7 : 2.7;
      c.targetX = 20;
      c.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;
      this.triggerDasherQTE(c);
      this.renderShelvesTab();
      return;
    }

    // 3. Scammer (Kẻ tráo tem giá / tiền giả)
    if (c.archetype.subType === 'scammer') {
      shelf.quantity = Math.max(0, shelf.quantity - 1);
      c.cart.push({ itemId: item.id, name: item.name, price: shelf.price, icon: item.icon });
      c.isScammer = true;
      c.speech = '😏 Đã dán đè tem...';
      c.speechTimer = 2;
      this.renderShelvesTab();
      this.routeToNextActionOrCheckout(c);
      return;
    }

    // 4. Distraction Thief (Kẻ trộm đi kèm dàn cảnh)
    if (c.archetype.subType === 'distraction_thief') {
      const takeQty = Math.min(shelf.quantity, 2);
      shelf.quantity -= takeQty;
      c.hasStolen = true;
      c.stolenItem = item;
      c.speech = '🤫 Thừa cơ vơ vét đồ!';
      c.speechTimer = 3;
      c.state = 'leaving';
      c.targetX = 20;
      c.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;
      this.renderShelvesTab();
      return;
    }

    // Price tolerance evaluation
    const priceRatio = shelf.price / item.basePrice;
    let buyProbability = 1.0;

    if (item.category === 'drink' && this.activeBuffs['boost_drink']) {
      buyProbability += 0.5;
    }

    if (priceRatio <= 0.8) {
      buyProbability = 0.98;
      c.speech = '😍 Rẻ quá!';
    } else if (priceRatio <= 1.1) {
      buyProbability = 0.85;
      c.speech = '👍 Giá hợp lý!';
    } else if (priceRatio <= 1.35) {
      buyProbability = 0.55 / (c.archetype.priceSensitivity || 1);
      c.speech = '🤨 Hơi đắt...';
    } else if (priceRatio <= 1.7) {
      buyProbability = 0.25 / (c.archetype.priceSensitivity || 1);
      c.speech = '💸 Đắt thế!';
    } else {
      buyProbability = 0.05;
      c.speech = '🤬 Cắt cổ à?!';
      c.satisfaction -= 25;
    }

    if (Math.random() < buyProbability && shelf.quantity > 0) {
      shelf.quantity -= 1;
      c.cart.push({ itemId: item.id, name: item.name, price: shelf.price, icon: item.icon });
      this.addFloatingText(`+${item.icon}`, c.x, c.y - 25, '#38bdf8');
      gameAudio.playScan();
      this.renderShelvesTab();
      this.updateInventoryCountUI();
    }

    this.routeToNextActionOrCheckout(c);
  }

  routeToNextActionOrCheckout(c) {
    const maxItems = Math.floor(Math.random() * (c.archetype.buyCount ? c.archetype.buyCount[1] : 2)) + 1;
    if (c.cart.length < maxItems && Math.random() < 0.5) {
      setTimeout(() => {
        if (c.state !== 'leaving') this.assignCustomerToShelf(c);
      }, 800);
    } else {
      if (c.cart.length > 0) {
        const checkoutX = (this.canvas ? this.canvas.width : 600) * 0.15;
        const checkoutY = (this.canvas ? this.canvas.height : 400) * 0.55;
        c.targetX = checkoutX + (this.cashierQueue.length * 24);
        c.targetY = checkoutY;
        c.state = 'queueing';
        c.speech = '🛒 Tính tiền nào!';
        c.speechTimer = 1.5;
        if (!this.cashierQueue.includes(c)) {
          this.cashierQueue.push(c);
        }
      } else {
        c.state = 'leaving';
        c.speech = '🚶 Không mua được gì.';
        c.speechTimer = 2;
        c.targetX = 20;
        c.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;
      }
    }
  }

  updateCheckout(dt) {
    const hasAutoCashier = this.hiredStaff.includes('staff_cashier');
    const hasScanner = this.purchasedUpgrades.includes('pos_scanner');
    const checkoutSpeedMult = (hasScanner ? 2.2 : 1.0) * (hasAutoCashier ? 1.5 : 1.0);

    const cashierPrompt = document.getElementById('cashier-zone-prompt');

    if (this.cashierQueue.length > 0) {
      if (hasAutoCashier) {
        if (cashierPrompt) cashierPrompt.classList.add('hidden');
        this.checkoutTimer += dt * checkoutSpeedMult;
        if (this.checkoutTimer >= 1.2) {
          this.checkoutTimer = 0;
          this.processSingleCheckout();
        }
      } else {
        if (cashierPrompt) cashierPrompt.classList.remove('hidden');
      }
    } else {
      if (cashierPrompt) cashierPrompt.classList.add('hidden');
      this.checkoutTimer = 0;
    }
  }

  manualCheckoutClick() {
    if (this.cashierQueue.length > 0) {
      this.processSingleCheckout();
    }
  }

  processSingleCheckout() {
    const cust = this.cashierQueue.shift();
    if (!cust) return;

    // Check Scammer Archetype (Kẻ tráo tem giá / tiền giả)
    if (cust.isScammer && !cust.scammerResolved) {
      if (this.purchasedUpgrades.includes('barcode_scanner_ai')) {
        // AI Barcode Scanner automatically catches fraud!
        gameAudio.playBuzzer();
        this.money += 50000;
        this.reputation = Math.min(100, this.reputation + 4);
        gameAudio.playUpgrade();
        this.addFloatingText('🤖 AI BẮT LỪA ĐẢO +50.000₫', cust.x, cust.y - 30, '#38bdf8');
        this.log('🤖 Máy quét AI đã phát hiện tem giá bị dán đè! Tên lừa đảo bị bảo vệ lập biên bản và nộp phạt 50.000₫!');
        cust.speech = '🤖 Bị máy quét AI soi ra rồi!';
        cust.speechTimer = 2.5;
        cust.state = 'leaving';
        cust.targetX = 20;
        cust.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;
        this.updateStatsUI();
        return;
      } else {
        // Put back at front of queue and show manual inspection modal
        this.cashierQueue.unshift(cust);
        this.openScammerModal(cust);
        return;
      }
    }

    let billTotal = 0;
    cust.cart.forEach(item => {
      billTotal += item.price;
    });

    // Customer Tip Calculation
    let tipAmount = 0;
    const baseTipChance = cust.archetype.tipChance || 0.2;
    let finalTipChance = baseTipChance;
    if (this.cleanliness >= 85) finalTipChance += 0.15;
    if (this.purchasedUpgrades.includes('air_conditioner')) finalTipChance += 0.15;
    if (this.purchasedUpgrades.includes('tip_jar')) finalTipChance += 0.35;

    if (cust.satisfaction >= 70 && Math.random() < finalTipChance && cust.cart.length > 0) {
      const [minTip, maxTip] = cust.archetype.tipRange || [2000, 10000];
      let rawTip = Math.floor(Math.random() * (maxTip - minTip + 1)) + minTip;
      tipAmount = Math.max(1000, Math.round(rawTip / 1000) * 1000);
      if (this.purchasedUpgrades.includes('tip_jar')) {
        tipAmount = Math.round((tipAmount * 1.5) / 1000) * 1000;
      }
    }

    const totalReceived = billTotal + tipAmount;
    this.money += totalReceived;
    this.dailyRevenue += totalReceived;
    this.allTimeRevenue += totalReceived;
    if (tipAmount > 0) {
      this.dailyTips += tipAmount;
      this.allTimeTips += tipAmount;
    }

    this.dailyServedCustomers += 1;
    this.allTimeCustomers += 1;

    let repGain = 1;
    if (cust.archetype.bonusRep) repGain += cust.archetype.bonusRep;
    if (cust.satisfaction >= 80) {
      this.reputation = Math.min(100, this.reputation + repGain);
      this.allTimeHappyCustomers += 1;
      if (tipAmount > 0) {
        cust.speech = `💖 Gửi tip ${this.formatCurrency(tipAmount)} nha!`;
      } else {
        cust.speech = '🥰 Cảm ơn tiệm nha!';
      }
    } else {
      cust.speech = '😐 Cũng tàm tạm.';
    }

    // Leave a review for daily report
    if (this.dailyReviews.length < 5 && Math.random() < 0.6) {
      const reviewText = cust.satisfaction >= 80
        ? (tipAmount > 0 
            ? `"${cust.archetype.name}: Tiệm siêu sạch, đồ ngon nên mình tip thêm ${this.formatCurrency(tipAmount)} luôn! ⭐⭐⭐⭐⭐"`
            : `"${cust.archetype.name}: Cửa hàng phục vụ chu đáo, đồ rất ngon và giá tốt! 5 sao ⭐⭐⭐⭐⭐"`)
        : `"${cust.archetype.name}: Tiệm cần châm thêm hàng nhiều hơn, đôi khi giá hơi cao. 3 sao ⭐⭐⭐"`;
      this.dailyReviews.push(reviewText);
    }

    if (tipAmount > 0) {
      gameAudio.playTip();
      this.addFloatingText(`+${this.formatCurrency(billTotal)} 💵`, cust.x, cust.y - 30, '#34d399');
      setTimeout(() => {
        this.addFloatingText(`💖 TIP +${this.formatCurrency(tipAmount)}`, cust.x, cust.y - 50, '#fbbf24');
      }, 150);
      if (tipAmount >= 20000) {
        this.log(`💖 ${cust.archetype.name} rất ưng ý và boa thêm ${this.formatCurrency(tipAmount)} tiền tip!`);
      }
    } else {
      gameAudio.playChaChing();
      this.addFloatingText(`+${this.formatCurrency(billTotal)}`, cust.x, cust.y - 30, '#fbbf24');
    }

    // Customer walks to exit
    cust.state = 'leaving';
    cust.speechTimer = 2.5;
    cust.targetX = 20;
    cust.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;

    // Shift the rest of the queue forward
    const checkoutX = (this.canvas ? this.canvas.width : 600) * 0.15;
    const checkoutY = (this.canvas ? this.canvas.height : 400) * 0.55;
    this.cashierQueue.forEach((c, idx) => {
      c.targetX = checkoutX + (idx * 24);
      c.targetY = checkoutY;
    });

    this.updateStatsUI();
  }

  // DASHER & QTE METHODS
  triggerDasherQTE(cust) {
    this.activeQTE = true;
    this.activeDasher = cust;
    const hasLock = this.purchasedUpgrades.includes('emergency_door_lock');
    this.qteTotalTime = hasLock ? 5.0 : 3.2;
    this.qteTimeLeft = this.qteTotalTime;

    gameAudio.playAlarm();
    const overlay = document.getElementById('qte-dasher-overlay');
    if (overlay) overlay.classList.remove('hidden');

    const desc = document.querySelector('.qte-subtitle');
    const stolenVal = cust.stolenItem ? cust.stolenItem.basePrice : 50000;
    if (desc) {
      desc.innerText = `Kẻ trộm vừa cướp món hàng [${cust.stolenItem?.name || 'Đồ giá trị'}] (${this.formatCurrency(stolenVal)}) và đang phi nước đại ra cửa!`;
    }
    this.log(`🚨 BÁO ĐỘNG: Kẻ chạy làng đang phi ra cửa với món hàng ${this.formatCurrency(stolenVal)}! Phản xạ nhanh!`);
  }

  handleQTESuccess(actionType) {
    if (!this.activeQTE || !this.activeDasher) return;
    const cust = this.activeDasher;
    const stolenVal = cust.stolenItem ? cust.stolenItem.basePrice : 50000;

    this.activeQTE = false;
    this.activeDasher = null;
    const overlay = document.getElementById('qte-dasher-overlay');
    if (overlay) overlay.classList.add('hidden');

    cust.state = 'leaving';
    cust.speedMultiplier = 0.6;
    cust.targetX = 20;
    cust.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;

    this.money += 50000;
    this.reputation = Math.min(100, this.reputation + 5);
    gameAudio.playTackle();

    if (actionType === 'door') {
      cust.speech = '💥 Á đù! Cửa sập mất rồi!';
      this.addFloatingText('🚪 SẬP CỬA BẮT TRỘM +50.000₫', cust.x, cust.y - 30, '#38bdf8');
      this.log(`🚪 RẦM! Cửa sập khẩn cấp đóng kịp thời! Tên chạy làng đâm sầm vào cửa ngã sõng soài, thu hồi ${this.formatCurrency(stolenVal)} tiền hàng và thưởng 50.000₫!`);
    } else {
      cust.speech = '💫 Vấp chổi ngã nhào!';
      this.addFloatingText('🧹 NÉM CHỔI BẮT TRỘM +50.000₫', cust.x, cust.y - 30, '#fbbf24');
      this.log(`🧹 Bạn ném cán chổi cản đường chuẩn xác! Tên chạy làng vấp ngã nhào, thu hồi toàn bộ hàng hóa và thưởng 50.000₫!`);
    }

    this.updateStatsUI();
  }

  handleQTEFail() {
    if (!this.activeQTE || !this.activeDasher) return;
    const cust = this.activeDasher;
    const stolenVal = cust.stolenItem ? cust.stolenItem.basePrice : 50000;

    this.activeQTE = false;
    this.activeDasher = null;
    const overlay = document.getElementById('qte-dasher-overlay');
    if (overlay) overlay.classList.add('hidden');

    cust.speech = '💨 Ngu gì trả tiền, lêu lêu!';
    cust.speechTimer = 3;
    cust.state = 'leaving';
    cust.targetX = 20;
    cust.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;

    this.reputation = Math.max(0, this.reputation - 5);
    gameAudio.playBuzzer();
    this.addFloatingText(`🚨 THOÁT MẤT HÀNG -${this.formatCurrency(stolenVal)}`, cust.x, cust.y - 30, '#ef4444');
    this.log(`🚨 Kẻ chạy làng đã tẩu thoát ra đường cùng ${this.formatCurrency(stolenVal)} tiền hàng! Uy tín bị giảm 5 điểm.`);
    this.updateStatsUI();
  }

  // SCAMMER FRAUD CHECK METHODS
  openScammerModal(cust) {
    this.pendingScammer = cust;
    gameAudio.playBuzzer();
    const overlay = document.getElementById('scammer-modal-overlay');
    const content = document.getElementById('scammer-details-content');
    if (!overlay || !content) return;

    const item = cust.cart[0] || { name: 'Rượu Vang Đỏ Cao Cấp', price: 180000 };
    const fakePrice = Math.round(item.price * 0.15 / 1000) * 1000;

    content.innerHTML = `
      <div class="fraud-row">
        <span class="fraud-label">Mặt hàng quét:</span>
        <span class="fraud-val">${item.name}</span>
      </div>
      <div class="fraud-row">
        <span class="fraud-label">Giá niêm yết hệ thống:</span>
        <span class="fraud-val" style="color: #38bdf8;">${this.formatCurrency(item.price)}</span>
      </div>
      <div class="fraud-row">
        <span class="fraud-label">Tem dán đè của khách:</span>
        <span class="fraud-val" style="color: #ef4444;">${this.formatCurrency(fakePrice)}</span>
      </div>
      <div class="fraud-alert-box">
        ⚠️ Phát hiện nhãn mã vạch có vết bóc dán lại cẩu thả và số tiền mặt đưa kèm có dấu hiệu tiền giấy giả!
      </div>
    `;

    overlay.classList.remove('hidden');
  }

  handleScammerReject() {
    const cust = this.pendingScammer;
    if (!cust) return;

    this.cashierQueue.shift();
    this.pendingScammer = null;
    const overlay = document.getElementById('scammer-modal-overlay');
    if (overlay) overlay.classList.add('hidden');

    cust.scammerResolved = true;
    cust.state = 'leaving';
    cust.speech = '😱 Tôi xin lỗi, đừng báo công an!';
    cust.speechTimer = 2.5;
    cust.targetX = 20;
    cust.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;

    this.money += 50000;
    this.reputation = Math.min(100, this.reputation + 5);
    gameAudio.playUpgrade();
    this.addFloatingText('🔎 VẠCH TRẦN LỪA ĐẢO +50.000₫', cust.x, cust.y - 30, '#fbbf24');
    this.log('🔎 Bạn đã dũng cảm lật tẩy chiêu trò tráo tem! Kẻ gian nộp phạt 50.000₫ và bị đuổi khỏi tiệm.');
    this.updateStatsUI();
  }

  handleScammerAccept() {
    const cust = this.pendingScammer;
    if (!cust) return;

    this.cashierQueue.shift();
    this.pendingScammer = null;
    const overlay = document.getElementById('scammer-modal-overlay');
    if (overlay) overlay.classList.add('hidden');

    cust.scammerResolved = true;
    cust.state = 'leaving';
    cust.speech = '😏 Dễ bị lừa ghê!';
    cust.speechTimer = 2.5;
    cust.targetX = 20;
    cust.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;

    const penalty = 60000;
    this.money = Math.max(0, this.money - penalty);
    this.reputation = Math.max(0, this.reputation - 3);
    gameAudio.playBuzzer();
    this.addFloatingText(`💸 DÍNH BẪY LỪA ĐẢO -${this.formatCurrency(penalty)}`, cust.x, cust.y - 30, '#ef4444');
    this.log(`💸 Bạn đã bỏ qua và chấp nhận thanh toán! Tiệm bị lỗ ${this.formatCurrency(penalty)} do tem giả / tiền âm.`);
    this.updateStatsUI();
  }

  // CUSTOMER INTERACTION (SEARCH / APOLOGY)
  interactWithCustomer(cust) {
    if (!cust || cust.state === 'leaving') return;

    const isThief = (cust.archetype && cust.archetype.type === 'thief') || cust.isShoplifter || cust.isDistractionThief;
    const isBait = cust.isDistractionBait;

    if (isThief) {
      cust.state = 'leaving';
      cust.speech = '😫 Bị tóm tang vật rồi!';
      cust.speechTimer = 3;
      cust.isAlerted = false;
      cust.targetX = 20;
      cust.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;

      this.money += 40000;
      this.reputation = Math.min(100, this.reputation + 5);
      gameAudio.playTackle();
      this.addFloatingText('🔍 BẮT QUẢ TANG +40.000₫', cust.x, cust.y - 30, '#34d399');
      this.log(`🎯 Khám xét chính xác! Tên trộm vặt [${cust.archetype?.name || 'Kẻ trộm'}] đã phải móc toàn bộ hàng giấu trong áo ra giao nộp và nộp phạt 40.000₫!`);
      this.updateStatsUI();
    } else if (isBait) {
      cust.state = 'leaving';
      cust.speech = '🏃 Ôi bị đuổi rồi, chuồn thôi!';
      cust.speechTimer = 2.5;
      cust.targetX = 20;
      cust.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;
      this.log('👮 Bạn đã nhanh chóng đuổi kẻ gây rối dàn cảnh ra khỏi tiệm trước khi hắn làm vỡ thêm đồ!');
      this.updateStatsUI();
    } else {
      // False accusation on innocent customer!
      this.reputation = Math.max(0, this.reputation - 6);
      const compensation = 15000;
      this.money = Math.max(0, this.money - compensation);
      gameAudio.playBuzzer();
      cust.speech = '😡 Sao vô cớ nghi ngờ tôi là kẻ trộm?! 1 sao!';
      cust.speechTimer = 3.5;
      cust.satisfaction = 0;
      cust.state = 'leaving';
      cust.targetX = 20;
      cust.targetY = (this.canvas ? this.canvas.height : 400) * 0.85;

      this.addFloatingText(`⚠️ KHÁM XÉT NHẦM -${this.formatCurrency(compensation)}`, cust.x, cust.y - 30, '#ef4444');
      this.log(`⚠️ BẠN ĐÃ KHÁM XÉT NHẦM KHÁCH HÀNG VÔ TỘI (${cust.archetype?.name || 'Khách'})! Cửa hàng phải bồi thường ${this.formatCurrency(compensation)} voucher và trừ 6 uy tín!`);
      this.updateStatsUI();
    }
  }

  updateStoreHygiene(dt) {
    if (this.customers.length > 0 && Math.random() < 0.04 * dt) {
      this.cleanliness = Math.max(10, this.cleanliness - 1);
      const w = this.canvas ? this.canvas.width : 600;
      const h = this.canvas ? this.canvas.height : 400;
      this.dirtPatches.push({
        x: Math.random() * (w * 0.7) + w * 0.15,
        y: Math.random() * (h * 0.6) + h * 0.2,
        r: 12 + Math.random() * 8
      });
      if (this.dirtPatches.length > 8) this.dirtPatches.shift();
      this.updateStatsUI();
    }
  }

  cleanStoreManually() {
    this.cleanliness = Math.min(100, this.cleanliness + 25);
    this.dirtPatches = [];
    gameAudio.playSweep();
    this.addFloatingText('✨ Sạch bóng!', (this.canvas ? this.canvas.width : 600) * 0.5, (this.canvas ? this.canvas.height : 400) * 0.5, '#34d399');
    this.updateStatsUI();
    this.log('🧹 Bạn đã quét dọn cửa hàng tinh tươm sạch sẽ!');
  }

  checkRandomEventTrigger(dt) {
    if (Math.random() < 0.0006 * dt && !this.isDayEnding) {
      const ev = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      this.showEventModal(ev);
    }
  }

  showEventModal(eventObj) {
    const modal = document.getElementById('modal-event');
    if (!modal) return;

    gameAudio.playEvent();
    document.getElementById('event-modal-icon').innerText = eventObj.icon || '⚡';
    document.getElementById('event-modal-title').innerText = eventObj.title;
    document.getElementById('event-modal-desc').innerText = eventObj.desc;

    const choicesContainer = document.getElementById('event-modal-choices');
    choicesContainer.innerHTML = '';

    eventObj.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'btn-event-choice';
      btn.innerHTML = `<span>${choice.text}</span> <span>👉</span>`;
      btn.onclick = () => {
        choice.action(this);
        modal.classList.add('hidden');
        this.updateAllUI();
      };
      choicesContainer.appendChild(btn);
    });

    modal.classList.remove('hidden');
  }

  // END OF DAY ROUTINE
  endDay() {
    this.isDayEnding = true;
    gameAudio.playUpgrade();

    let dailyWages = 0;
    this.hiredStaff.forEach(staffId => {
      const st = STAFF_TYPES.find(s => s.id === staffId);
      if (st) dailyWages += st.dailyWage;
    });

    let dailyMarketingCost = 0;
    for (let i = this.activeMarketing.length - 1; i >= 0; i--) {
      this.activeMarketing[i].remainingDays -= 1;
      if (this.activeMarketing[i].remainingDays <= 0) {
        this.activeMarketing.splice(i, 1);
      }
    }

    const netProfit = this.dailyRevenue - this.dailyCostGoods - this.dailyRent - dailyWages - dailyMarketingCost;
    this.money = Math.max(0, this.money - this.dailyRent - dailyWages);
    this.allTimeProfit += netProfit;

    // Show daily report modal
    const modal = document.getElementById('modal-daily-report');
    if (modal) {
      document.getElementById('report-day-title').innerText = `Tổng Kết Ngày ${this.day}`;
      document.getElementById('rep-income').innerText = `+${this.formatCurrency(this.dailyRevenue - this.dailyTips)}`;
      const repTipsEl = document.getElementById('rep-tips');
      if (repTipsEl) repTipsEl.innerText = `+${this.formatCurrency(this.dailyTips)}`;
      document.getElementById('rep-cost-goods').innerText = `-${this.formatCurrency(this.dailyCostGoods)}`;
      document.getElementById('rep-rent').innerText = `-${this.formatCurrency(this.dailyRent)}`;
      document.getElementById('rep-wages').innerText = `-${this.formatCurrency(dailyWages)}`;
      document.getElementById('rep-marketing').innerText = `-${this.formatCurrency(dailyMarketingCost)}`;
      
      const profitEl = document.getElementById('rep-net-profit');
      profitEl.innerText = `${netProfit >= 0 ? '+' : ''}${this.formatCurrency(netProfit)}`;
      profitEl.className = netProfit >= 0 ? 'text-gold' : 'text-danger';

      const reviewsList = document.getElementById('report-reviews-container');
      reviewsList.innerHTML = '';
      if (this.dailyReviews.length === 0) {
        this.dailyReviews.push('"Khách hàng: Tiệm tạp hóa thân thiện và sạch sẽ! 5 sao ⭐⭐⭐⭐⭐"');
      }
      this.dailyReviews.forEach(rev => {
        const d = document.createElement('div');
        d.className = 'review-bubble';
        d.innerHTML = rev;
        reviewsList.appendChild(d);
      });

      modal.classList.remove('hidden');
    }
  }

  startNextDay() {
    const modal = document.getElementById('modal-daily-report');
    if (modal) modal.classList.add('hidden');

    this.day += 1;
    this.timeMinutes = 8 * 60; // 08:00 AM
    this.dailyRevenue = 0;
    this.dailyTips = 0;
    this.dailyCostGoods = 0;
    this.dailyServedCustomers = 0;
    this.dailyReviews = [];
    this.customers = [];
    this.cashierQueue = [];
    this.dirtPatches = [];
    this.activeBuffs = {};
    this.isDayEnding = false;

    this.initMarketPrices();
    this.initStaffEntities();
    this.updateAllUI();
    this.log(`☀️ Chào mừng Ngày ${this.day}! Giá sỉ chợ đầu mối đã được cập nhật mới.`);
    this.saveGame();
  }

  // WHOLESALE MARKET PURCHASING
  buyWholesaleItem(itemId, qty) {
    const item = GAME_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    let unitCost = this.marketPrices[itemId] || item.baseCost;
    if (this.activeBuffs['market_discount']) {
      unitCost = Math.round(unitCost * this.activeBuffs['market_discount']);
    }

    const totalCost = unitCost * qty;

    if (this.money < totalCost) {
      alert('Không đủ ngân quỹ để nhập lô hàng này!');
      return;
    }

    const currentStock = this.getWarehouseTotalCount();
    if (currentStock + qty > this.warehouseCapacity) {
      alert(`Kho hàng không đủ chỗ chứa! (Chỉ còn trống ${this.warehouseCapacity - currentStock} chỗ). Hãy nâng cấp kho bãi.`);
      return;
    }

    this.money -= totalCost;
    this.dailyCostGoods += totalCost;
    this.warehouse[itemId] = (this.warehouse[itemId] || 0) + qty;

    gameAudio.playChaChing();
    this.log(`📦 Đã nhập ${qty}x ${item.name} (${this.formatCurrency(totalCost)}) vào kho.`);
    this.updateAllUI();
    this.saveGame(false);
  }

  getWarehouseTotalCount() {
    let total = 0;
    for (let key in this.warehouse) {
      total += this.warehouse[key] || 0;
    }
    return total;
  }

  quickRestockAllShelves() {
    let restockedCount = 0;
    for (let shelf of this.shelves) {
      if (shelf.itemId && shelf.quantity < shelf.maxQuantity) {
        const inWh = this.warehouse[shelf.itemId] || 0;
        if (inWh > 0) {
          const needed = shelf.maxQuantity - shelf.quantity;
          const transfer = Math.min(needed, inWh);
          shelf.quantity += transfer;
          this.warehouse[shelf.itemId] -= transfer;
          restockedCount += transfer;
        }
      }
    }

    if (restockedCount > 0) {
      gameAudio.playUpgrade();
      this.addFloatingText(`⚡ Đã xếp ${restockedCount} món!`, (this.canvas ? this.canvas.width : 600) * 0.5, (this.canvas ? this.canvas.height : 400) * 0.4, '#38bdf8');
      this.log(`⚡ Đã xếp nhanh ${restockedCount} sản phẩm từ kho lên các kệ trưng bày.`);
      this.updateAllUI();
      this.saveGame(false);
    } else {
      alert('Kho không còn hàng phù hợp để xếp thêm lên các kệ hiện tại!');
    }
  }

  // SHELF ASSIGNMENT & PRICING
  openShelfAssignModal(shelfIndex) {
    this.selectedShelfForAssign = shelfIndex;
    const modal = document.getElementById('modal-assign-shelf');
    if (!modal) return;

    document.getElementById('assign-shelf-title').innerText = `Chọn Hàng Bày Lên Kệ #${shelfIndex + 1}`;
    const grid = document.getElementById('warehouse-selection-grid');
    grid.innerHTML = '';

    const stockedItemIds = Object.keys(this.warehouse).filter(id => this.warehouse[id] > 0);
    if (stockedItemIds.length === 0) {
      grid.innerHTML = '<p class="subtext" style="grid-column: 1/-1; text-align: center; padding: 20px;">Kho của bạn đang trống! Hãy sang tab "Nhập sỉ" để mua hàng về nhé.</p>';
    } else {
      stockedItemIds.forEach(id => {
        const itm = GAME_ITEMS.find(i => i.id === id);
        if (!itm) return;
        const card = document.createElement('div');
        card.className = 'wh-pick-card';
        card.innerHTML = `
          <div class="wh-pick-icon">${itm.icon}</div>
          <div class="wh-pick-name">${itm.name}</div>
          <div class="wh-pick-qty">Có sẵn: ${this.warehouse[id]} món</div>
        `;
        card.onclick = () => {
          this.assignItemToShelf(shelfIndex, itm.id);
          modal.classList.add('hidden');
        };
        grid.appendChild(card);
      });
    }

    modal.classList.remove('hidden');
  }

  assignItemToShelf(shelfIndex, itemId) {
    const shelf = this.shelves[shelfIndex];
    if (!shelf) return;

    const itm = GAME_ITEMS.find(i => i.id === itemId);
    if (!itm) return;

    if (shelf.itemId && shelf.itemId !== itemId && shelf.quantity > 0) {
      this.warehouse[shelf.itemId] = (this.warehouse[shelf.itemId] || 0) + shelf.quantity;
    }

    shelf.itemId = itemId;
    shelf.maxQuantity = itm.maxPerShelf;
    shelf.price = itm.basePrice;

    const inWh = this.warehouse[itemId] || 0;
    const transfer = Math.min(inWh, shelf.maxQuantity);
    shelf.quantity = transfer;
    this.warehouse[itemId] -= transfer;

    gameAudio.playClick();
    this.log(`🛒 Đã gán ${itm.name} lên Kệ #${shelfIndex + 1} với giá niêm yết ${this.formatCurrency(shelf.price)}.`);
    this.updateAllUI();
    this.saveGame(false);
  }

  adjustShelfPrice(shelfIndex, delta) {
    const shelf = this.shelves[shelfIndex];
    if (!shelf || !shelf.itemId) return;

    shelf.price = Math.max(1000, shelf.price + delta);
    gameAudio.playClick();
    this.renderShelvesTab();
    this.saveGame(false);
  }

  setShelfPriceExact(shelfIndex, val) {
    const shelf = this.shelves[shelfIndex];
    if (!shelf || !shelf.itemId) return;

    const num = parseInt(val, 10);
    if (isNaN(num) || num < 500) {
      shelf.price = 1000;
    } else {
      shelf.price = Math.max(500, Math.round(num));
    }
    gameAudio.playClick();
    this.renderShelvesTab();
    this.saveGame(false);
  }

  restockShelfManual(shelfIndex) {
    const shelf = this.shelves[shelfIndex];
    if (!shelf || !shelf.itemId) return;

    const needed = shelf.maxQuantity - shelf.quantity;
    const inWh = this.warehouse[shelf.itemId] || 0;
    if (inWh <= 0) {
      alert('Trong kho đã hết món hàng này! Hãy vào tab "Nhập sỉ" để mua thêm.');
      return;
    }

    const transfer = Math.min(needed, inWh);
    shelf.quantity += transfer;
    this.warehouse[shelf.itemId] -= transfer;

    gameAudio.playScan();
    this.log(`📦 Đã châm thêm ${transfer} món lên Kệ #${shelfIndex + 1}.`);
    this.updateAllUI();
    this.saveGame(false);
  }

  // UPGRADES & PURCHASES
  purchaseUpgrade(upgradeId) {
    const upg = STORE_UPGRADES.find(u => u.id === upgradeId);
    if (!upg || this.purchasedUpgrades.includes(upgradeId)) return;

    if (this.money < upg.cost) {
      alert('Không đủ tiền để mua nâng cấp này!');
      return;
    }

    this.money -= upg.cost;
    this.purchasedUpgrades.push(upgradeId);

    if (upgradeId === 'shelf_expand_1') {
      this.maxShelves = 5;
      this.shelves.push(
        { id: 3, itemId: null, price: 0, quantity: 0, maxQuantity: 15, x: 0, y: 0 },
        { id: 4, itemId: null, price: 0, quantity: 0, maxQuantity: 15, x: 0, y: 0 }
      );
    } else if (upgradeId === 'shelf_expand_2') {
      this.maxShelves = 7;
      this.shelves.push(
        { id: 5, itemId: null, price: 0, quantity: 0, maxQuantity: 15, x: 0, y: 0 },
        { id: 6, itemId: null, price: 0, quantity: 0, maxQuantity: 15, x: 0, y: 0 }
      );
    } else if (upgradeId === 'shelf_expand_3') {
      this.maxShelves = 10;
      this.shelves.push(
        { id: 7, itemId: null, price: 0, quantity: 0, maxQuantity: 15, x: 0, y: 0 },
        { id: 8, itemId: null, price: 0, quantity: 0, maxQuantity: 15, x: 0, y: 0 },
        { id: 9, itemId: null, price: 0, quantity: 0, maxQuantity: 15, x: 0, y: 0 }
      );
    } else if (upgradeId === 'warehouse_1') {
      this.warehouseCapacity = 120;
    } else if (upgradeId === 'warehouse_2') {
      this.warehouseCapacity = 300;
    } else if (upgradeId === 'cctv_security') {
      this.reputation = Math.min(100, this.reputation + 10);
    }

    this.recalculateShelfPositions();
    if (this.shop3D && this.shop3D.rebuildShelves) {
      this.shop3D.rebuildShelves();
    }
    if (this.shop3D && this.shop3D.updateSecurityFixtures) {
      this.shop3D.updateSecurityFixtures();
    }
    gameAudio.playUpgrade();
    this.log(`🏗️ Đã trang bị nâng cấp thành công: ${upg.name}!`);
    this.updateAllUI();
    this.saveGame(false);
  }

  hireStaffMember(staffId) {
    const st = STAFF_TYPES.find(s => s.id === staffId);
    if (!st || this.hiredStaff.includes(staffId)) return;

    if (this.money < st.hireCost) {
      alert('Không đủ tiền chi phí tuyển dụng ban đầu!');
      return;
    }

    this.money -= st.hireCost;
    this.hiredStaff.push(staffId);
    this.initStaffEntities();

    gameAudio.playUpgrade();
    this.log(`👔 Bạn đã ký hợp đồng tuyển dụng: ${st.name}!`);
    this.updateAllUI();
    this.saveGame(false);
  }

  launchMarketingCampaign(campId) {
    const camp = MARKETING_CAMPAIGNS.find(c => c.id === campId);
    if (!camp) return;

    if (this.money < camp.cost) {
      alert('Không đủ ngân quỹ chạy chiến dịch truyền thông!');
      return;
    }

    this.money -= camp.cost;
    this.activeMarketing.push({ id: campId, remainingDays: camp.durationDays });
    if (camp.bonusRep) {
      this.reputation = Math.min(100, this.reputation + camp.bonusRep);
    }

    gameAudio.playUpgrade();
    this.log(`📢 Đã kích hoạt chiến dịch quảng bá: ${camp.name}!`);
    this.updateAllUI();
    this.saveGame(false);
  }

  // CANVAS RENDERING
  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background: Floor tiles
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const tileSize = 40;
    for (let x = 0; x < w; x += tileSize) {
      for (let y = 0; y < h; y += tileSize) {
        ctx.fillStyle = ((x / tileSize + y / tileSize) % 2 === 0) ? '#1e293b' : '#182234';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // Entrance Area (Door Mat & Door)
    const doorX = 20;
    const doorY = h * 0.85;
    ctx.fillStyle = this.isOpen ? '#f59e0b' : '#ef4444';
    ctx.fillRect(doorX - 10, doorY - 20, 50, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(this.isOpen ? 'WELCOME' : 'CLOSED 🔒', doorX + 15, doorY + 4);

    // Dirt Patches on floor
    this.dirtPatches.forEach(d => {
      ctx.fillStyle = 'rgba(74, 55, 40, 0.45)';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '12px Outfit';
      ctx.fillText('🐾', d.x, d.y + 4);
    });

    // Warehouse Storeroom Area (Top-Right)
    const whAreaX = w * 0.88;
    const whAreaY = 48;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(whAreaX - 32, whAreaY - 26, 64, 48);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(whAreaX - 32, whAreaY - 26, 64, 48);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('KHO HÀNG 📦', whAreaX, whAreaY - 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${this.getWarehouseTotalCount()} món`, whAreaX, whAreaY + 10);

    // Checkout Counter & Cashier Register
    const checkoutX = w * 0.15;
    const checkoutY = h * 0.55;
    
    ctx.fillStyle = '#334155';
    ctx.roundRect ? ctx.roundRect(checkoutX - 25, checkoutY - 25, 55, 55, 8) : ctx.fillRect(checkoutX - 25, checkoutY - 25, 55, 55);
    ctx.fillStyle = '#475569';
    ctx.fillRect(checkoutX - 22, checkoutY - 22, 49, 49);
    
    ctx.font = '24px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('📟', checkoutX + 2, checkoutY + 2);

    // Staff Entity Drawing Helper
    const drawStaffEntity = (ent, emoji, roleName, roleColor, extraIcon = null) => {
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(ent.x, ent.y + 12, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Emoji Avatar with bounce
      ctx.font = '24px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(emoji, ent.x, ent.y + 8 + (ent.animBounce || 0));

      if (extraIcon) {
        ctx.font = '16px Outfit';
        ctx.fillText(extraIcon, ent.x + 8, ent.y - 12 + (ent.animBounce || 0));
      }

      ctx.font = 'bold 8px Outfit';
      ctx.fillStyle = roleColor || '#38bdf8';
      ctx.fillText(roleName, ent.x, ent.y - 18);

      if (ent.speech && ent.speechTimer > 0) {
        ctx.font = 'bold 10px Outfit';
        const textWidth = ctx.measureText(ent.speech).width;
        const bX = ent.x - textWidth / 2 - 8;
        const bY = ent.y - 42;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = roleColor || '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.fillRect(bX, bY, textWidth + 16, 18);
        ctx.strokeRect(bX, bY, textWidth + 16, 18);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(ent.speech, ent.x, bY + 13);
      }
    };

    // Render Animated Staff Members
    if (this.hiredStaff.includes('staff_cashier') && this.staffEntities.staff_cashier) {
      drawStaffEntity(this.staffEntities.staff_cashier, '👩‍💼', 'THU NGÂN', '#34d399');
    }
    if (this.hiredStaff.includes('staff_restocker') && this.staffEntities.staff_restocker) {
      const extra = this.staffEntities.staff_restocker.carryingQty > 0 ? '📦' : null;
      drawStaffEntity(this.staffEntities.staff_restocker, '👨‍🔧', 'TIẾP HÀNG', '#38bdf8', extra);
    }
    if (this.hiredStaff.includes('staff_janitor') && this.staffEntities.staff_janitor) {
      drawStaffEntity(this.staffEntities.staff_janitor, '🧹', 'LAO CÔNG', '#a78bfa');
    }
    if (this.hiredStaff.includes('staff_security') && this.staffEntities.staff_security) {
      drawStaffEntity(this.staffEntities.staff_security, '👮', 'BẢO VỆ', '#f59e0b');
    }

    // Decor: Air Conditioner
    if (this.purchasedUpgrades.includes('air_conditioner')) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(w * 0.5 - 35, 10, 70, 18);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px Outfit';
      ctx.fillText('❄️ 24°C', w * 0.5, 23);
    }

    // Decor: Lucky Cat
    if (this.purchasedUpgrades.includes('maneki_neko')) {
      ctx.font = '20px Outfit';
      ctx.fillText('🐱', checkoutX + 35, checkoutY - 15);
    }

    // Decor: Tip Jar
    if (this.purchasedUpgrades.includes('tip_jar')) {
      ctx.font = '18px Outfit';
      ctx.fillText('🏺', checkoutX - 35, checkoutY - 15);
    }

    // Shelves Rendering
    this.shelves.forEach((s, idx) => {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = s.itemId ? '#38bdf8' : '#64748b';
      ctx.lineWidth = 2;
      
      const sW = 60;
      const sH = 45;
      ctx.fillRect(s.x - sW/2, s.y - sH/2, sW, sH);
      ctx.strokeRect(s.x - sW/2, s.y - sH/2, sW, sH);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(`KỆ #${idx + 1}`, s.x, s.y - sH/2 - 4);

      if (s.itemId) {
        const itm = GAME_ITEMS.find(i => i.id === s.itemId);
        if (itm) {
          ctx.font = '22px Outfit';
          ctx.fillText(itm.icon, s.x, s.y + 4);

          const pct = s.maxQuantity > 0 ? (s.quantity / s.maxQuantity) : 0;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(s.x - 22, s.y + sH/2 - 9, 44, 6);
          ctx.fillStyle = pct > 0.3 ? '#34d399' : '#f87171';
          ctx.fillRect(s.x - 22, s.y + sH/2 - 9, 44 * pct, 6);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px Outfit';
          ctx.fillText(`${s.quantity}/${s.maxQuantity}`, s.x, s.y + sH/2 + 9);
        }
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Outfit';
        ctx.fillText('+ Trống', s.x, s.y + 4);
      }
    });

    // Render Customers
    this.customers.forEach(c => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 12, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '24px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(c.archetype.emoji, c.x, c.y + 8);

      if (c.speech && c.speechTimer > 0) {
        ctx.font = 'bold 11px Outfit';
        const textWidth = ctx.measureText(c.speech).width;
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        
        const bX = c.x - textWidth / 2 - 8;
        const bY = c.y - 38;
        ctx.fillRect(bX, bY, textWidth + 16, 20);
        ctx.strokeRect(bX, bY, textWidth + 16, 20);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(c.speech, c.x, bY + 14);
      }
    });

    // Render floating text particles
    this.floatingTexts.forEach(f => {
      ctx.fillStyle = f.color || '#fbbf24';
      ctx.font = 'bold 14px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    });
  }

  addFloatingText(text, x, y, color) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color: color || '#fbbf24',
      life: 1.2
    });

    const overlay = document.getElementById('canvas-overlay-container');
    if (overlay) {
      const el = document.createElement('div');
      el.className = 'floating-text';
      el.innerText = text;
      el.style.color = color || '#fbbf24';
      const posX = (x && this.canvas && this.canvas.width) ? (x / this.canvas.width) * 100 : 50;
      const posY = (y && this.canvas && this.canvas.height) ? (y / this.canvas.height) * 100 : 50;
      el.style.left = `${Math.min(85, Math.max(15, posX))}%`;
      el.style.top = `${Math.min(85, Math.max(15, posY))}%`;
      overlay.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }
  }

  // UI UPDATES & DOM EVENT BINDINGS
  bindDOMEvents() {
    // Store Name Edit
    const btnEditName = document.getElementById('btn-edit-name');
    if (btnEditName) {
      btnEditName.onclick = () => {
        const newName = prompt('Nhập tên mới cho cửa hàng của bạn:', this.storeName);
        if (newName && newName.trim()) {
          this.storeName = newName.trim();
          document.getElementById('store-name-display').innerText = this.storeName;
          this.log(`🏪 Cửa hàng đổi tên thành "${this.storeName}"!`);
        }
      };
    }

    // Speed controls
    const btnPause = document.getElementById('btn-speed-pause');
    const btn1x = document.getElementById('btn-speed-1');
    const btn2x = document.getElementById('btn-speed-2');
    const btn3x = document.getElementById('btn-speed-3');
    const speedButtons = [btnPause, btn1x, btn2x, btn3x];

    const setSpeed = (spd, activeBtn) => {
      this.gameSpeed = spd;
      speedButtons.forEach(b => b && b.classList.remove('active'));
      if (activeBtn) activeBtn.classList.add('active');
    };

    if (btnPause) btnPause.onclick = () => setSpeed(0, btnPause);
    if (btn1x) btn1x.onclick = () => setSpeed(1, btn1x);
    if (btn2x) btn2x.onclick = () => setSpeed(2, btn2x);
    if (btn3x) btn3x.onclick = () => setSpeed(3, btn3x);

    // Audio Toggle
    const btnAudio = document.getElementById('btn-audio-toggle');
    if (btnAudio) {
      btnAudio.onclick = () => {
        const on = gameAudio.toggleSound();
        btnAudio.innerText = on ? '🔊' : '🔇';
      };
    }

    // Tabs switching
    const tabs = document.querySelectorAll('.hub-tab');
    tabs.forEach(tab => {
      tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        const pane = document.getElementById(targetId);
        if (pane) pane.classList.add('active');
        gameAudio.playClick();
      };
    });

    // Market category filters
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.onclick = () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const cat = chip.getAttribute('data-cat');
        this.renderMarketTab(cat);
      };
    });

    // Quick Action Bar Buttons
    const btnQuickRestock = document.getElementById('btn-quick-restock');
    if (btnQuickRestock) {
      btnQuickRestock.onclick = () => this.quickRestockAllShelves();
    }
    const btnClean = document.getElementById('btn-clean-store');
    if (btnClean) {
      btnClean.onclick = () => this.cleanStoreManually();
    }

    // Cashier Prompt click
    const cashierPrompt = document.getElementById('cashier-zone-prompt');
    if (cashierPrompt) {
      cashierPrompt.onclick = () => this.manualCheckoutClick();
    }

    // Canvas click interactions
    if (this.canvas) {
      this.canvas.onclick = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check dirt
        for (let i = this.dirtPatches.length - 1; i >= 0; i--) {
          const d = this.dirtPatches[i];
          const dist = Math.sqrt((clickX - d.x)**2 + (clickY - d.y)**2);
          if (dist <= d.r + 10) {
            this.dirtPatches.splice(i, 1);
            this.cleanliness = Math.min(100, this.cleanliness + 5);
            gameAudio.playSweep();
            this.addFloatingText('✨ Sạch!', d.x, d.y, '#34d399');
            this.updateStatsUI();
            return;
          }
        }

        // Check customers (Search suspected shoplifter / interact)
        for (let cust of this.customers) {
          if (cust.state !== 'leaving') {
            const dist = Math.sqrt((clickX - cust.x)**2 + (clickY - cust.y)**2);
            if (dist <= 26) {
              this.interactWithCustomer(cust);
              return;
            }
          }
        }

        // Check shelf
        for (let i = 0; i < this.shelves.length; i++) {
          const s = this.shelves[i];
          if (Math.abs(clickX - s.x) < 30 && Math.abs(clickY - s.y) < 25) {
            if (!s.itemId) {
              this.openShelfAssignModal(i);
            } else {
              this.restockShelfManual(i);
            }
            return;
          }
        }
      };
    }

    // Toggle Open / Close Store
    const btnToggleStore = document.getElementById('btn-toggle-store');
    if (btnToggleStore) {
      btnToggleStore.onclick = () => this.toggleStoreStatus();
    }

    const btnOverlayReopen = document.getElementById('btn-overlay-reopen');
    if (btnOverlayReopen) {
      btnOverlayReopen.onclick = () => this.toggleStoreStatus(true);
    }

    const btnOverlayEndDay = document.getElementById('btn-overlay-endday');
    if (btnOverlayEndDay) {
      btnOverlayEndDay.onclick = () => this.endDay();
    }

    const btnEndDayEarly = document.getElementById('btn-end-day-early');
    if (btnEndDayEarly) {
      btnEndDayEarly.onclick = () => {
        if (confirm('Bạn có muốn đóng cửa và kết toán doanh thu Ngày ' + this.day + ' ngay bây giờ?')) {
          this.endDay();
        }
      };
    }

    // Modal Close buttons
    const btnCloseAssign = document.getElementById('btn-close-assign-modal');
    if (btnCloseAssign) {
      btnCloseAssign.onclick = () => {
        document.getElementById('modal-assign-shelf').classList.add('hidden');
      };
    }

    // Start Next Day Button
    const btnNextDay = document.getElementById('btn-start-next-day');
    if (btnNextDay) {
      btnNextDay.onclick = () => this.startNextDay();
    }

    // Save game utility buttons
    const btnQuickSave = document.getElementById('btn-quick-save');
    if (btnQuickSave) btnQuickSave.onclick = () => this.saveGame(true);

    const btnSave = document.getElementById('btn-manual-save');
    if (btnSave) btnSave.onclick = () => this.saveGame(true);

    const btnExport = document.getElementById('btn-export-save');
    if (btnExport) btnExport.onclick = () => this.exportSaveFile();

    const btnImport = document.getElementById('btn-import-save');
    const fileInput = document.getElementById('file-input-save');
    if (btnImport && fileInput) {
      btnImport.onclick = () => fileInput.click();
      fileInput.onchange = (e) => this.importSaveFile(e);
    }

    const btnReset = document.getElementById('btn-reset-game');
    if (btnReset) {
      btnReset.onclick = () => {
        if (confirm('Bạn có chắc muốn xóa toàn bộ tiến trình và chơi lại từ đầu?')) {
          localStorage.removeItem('shopkeeper_save');
          window.location.reload();
        }
      };
    }

    // QTE Emergency Anti-Dasher Buttons
    const btnQteSlam = document.getElementById('btn-qte-slam-door');
    if (btnQteSlam) {
      btnQteSlam.onclick = () => this.handleQTESuccess('door');
    }
    const btnQteBroom = document.getElementById('btn-qte-throw-broom');
    if (btnQteBroom) {
      btnQteBroom.onclick = () => this.handleQTESuccess('broom');
    }

    // Spacebar listener for QTE Door Slam
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.activeQTE) {
        e.preventDefault();
        this.handleQTESuccess('door');
      }
    });

    // Scammer Fraud Check Modal Buttons
    const btnScammerReject = document.getElementById('btn-scammer-reject');
    if (btnScammerReject) {
      btnScammerReject.onclick = () => this.handleScammerReject();
    }
    const btnScammerAccept = document.getElementById('btn-scammer-accept');
    if (btnScammerAccept) {
      btnScammerAccept.onclick = () => this.handleScammerAccept();
    }

    // Save / Load Manager Modal bindings
    const btnHeaderSaveFile = document.getElementById('btn-header-save-file');
    if (btnHeaderSaveFile) {
      btnHeaderSaveFile.onclick = () => this.openSaveManagerModal();
    }

    const btnCloseSaveModal = document.getElementById('btn-close-save-modal');
    if (btnCloseSaveModal) {
      btnCloseSaveModal.onclick = () => {
        const modal = document.getElementById('modal-save-manager');
        if (modal) modal.classList.add('hidden');
      };
    }

    const btnModalExport = document.getElementById('btn-modal-export');
    if (btnModalExport) {
      btnModalExport.onclick = () => this.exportSaveFile();
    }

    const dropZone = document.getElementById('drop-zone-save');
    const modalFileInput = document.getElementById('file-input-save-modal');
    if (dropZone && modalFileInput) {
      dropZone.onclick = () => modalFileInput.click();
      modalFileInput.onchange = (e) => this.importSaveFile(e);

      dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      };
      dropZone.ondragleave = () => {
        dropZone.classList.remove('drag-over');
      };
      dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.importSaveFile({ target: { files: e.dataTransfer.files } });
        }
      };
    }
  }

  toggleStoreStatus(forceOpen = null) {
    if (forceOpen !== null) {
      this.isOpen = forceOpen;
    } else {
      this.isOpen = !this.isOpen;
    }

    if (this.isOpen) {
      gameAudio.playDoorBell();
      this.log('🟢 Cửa hàng đã MỞ CỬA đón khách! Chúc buôn may bán đắt.');
    } else {
      gameAudio.playClick();
      this.log('🔒 Cửa hàng đã TẠM ĐÓNG CỬA. Khách mới sẽ không vào, bạn có thể thong thả nhập hàng và đổi giá.');
    }

    this.updateStoreStatusUI();
    this.saveGame(false);
  }

  updateStoreStatusUI() {
    const btn = document.getElementById('btn-toggle-store');
    const text = document.getElementById('store-status-text');
    const banner = document.getElementById('shop-closed-banner');

    if (btn && text) {
      if (this.isOpen) {
        btn.className = 'store-status-btn open';
        text.innerText = 'ĐANG MỞ CỬA';
        btn.querySelector('.status-action-hint').innerText = '✕ Đóng tiệm';
        if (banner) banner.classList.add('hidden');
      } else {
        btn.className = 'store-status-btn closed';
        text.innerText = 'ĐANG ĐÓNG CỬA';
        btn.querySelector('.status-action-hint').innerText = '🟢 Mở tiệm';
        if (banner) {
          if (this.customers.length === 0) {
            banner.classList.remove('hidden');
          } else {
            banner.classList.add('hidden');
          }
        }
      }
    }
  }

  updateAllUI() {
    this.updateStatsUI();
    this.updateStoreStatusUI();
    this.renderShelvesTab();
    this.renderMarketTab('all');
    this.renderUpgradesTab();
    this.renderStaffTab();
    this.renderMarketingTab();
    this.renderFinanceTab();

    if (this.shop3D && this.shop3D.refreshAllShelfLabels) {
      this.shop3D.refreshAllShelfLabels();
    }
  }

  updateStatsUI() {
    document.getElementById('store-name-display').innerText = this.storeName;
    document.getElementById('stat-money').innerText = this.formatCurrency(this.money);
    document.getElementById('stat-reputation').innerText = `${Math.round(this.reputation)} / 100`;
    document.getElementById('stat-cleanliness').innerText = `${Math.round(this.cleanliness)}%`;
    
    document.getElementById('metric-today-revenue').innerText = `+${this.formatCurrency(this.dailyRevenue)}`;
    const tipsMetric = document.getElementById('metric-today-tips');
    if (tipsMetric) tipsMetric.innerText = `+${this.formatCurrency(this.dailyTips)}`;
    document.getElementById('metric-today-served').innerText = this.dailyServedCustomers;
    
    this.updateInventoryCountUI();
  }

  updateInventoryCountUI() {
    const whCount = this.getWarehouseTotalCount();
    document.getElementById('wh-used').innerText = whCount;
    document.getElementById('wh-max').innerText = this.warehouseCapacity;
    document.getElementById('metric-total-stock').innerText = `${whCount} món trong kho`;
  }

  // TAB RENDERING METHODS
  renderShelvesTab() {
    const list = document.getElementById('shelves-list');
    if (!list) return;
    list.innerHTML = '';

    document.getElementById('shelf-usage-badge').innerText = `Kệ đã mở: ${this.shelves.length} / ${this.maxShelves}`;

    this.shelves.forEach((s, idx) => {
      const itm = s.itemId ? GAME_ITEMS.find(i => i.id === s.itemId) : null;
      const card = document.createElement('div');
      card.className = `shelf-card ${!itm ? 'empty-shelf' : ''}`;

      if (!itm) {
        card.innerHTML = `
          <div class="shelf-top-row">
            <span class="shelf-number">🛒 Kệ #${idx + 1}</span>
            <span class="shelf-status-pill status-empty">Đang trống</span>
          </div>
          <div class="shelf-item-details">
            <div class="shelf-item-icon">➕</div>
            <div class="shelf-item-info">
              <div class="shelf-item-name">Chưa gán mặt hàng nào</div>
              <div class="shelf-item-counts">Bấm nút bên dưới để chọn món từ kho</div>
            </div>
          </div>
          <div class="shelf-actions">
            <button class="btn-shelf-action primary" onclick="game.openShelfAssignModal(${idx})">📦 Chọn món bày lên kệ</button>
          </div>
        `;
      } else {
        const marginPct = Math.round(((s.price - itm.baseCost) / itm.baseCost) * 100);
        let marginClass = 'margin-fair';
        let marginLabel = 'Giá chuẩn';
        if (marginPct < 15) { marginClass = 'margin-cheap'; marginLabel = 'Siêu rẻ'; }
        else if (marginPct > 80) { marginClass = 'margin-overpriced'; marginLabel = 'Quá đắt'; }
        else if (marginPct > 40) { marginClass = 'margin-expensive'; marginLabel = 'Lời cao'; }

        const inWh = this.warehouse[s.itemId] || 0;

        card.innerHTML = `
          <div class="shelf-top-row">
            <span class="shelf-number">🛒 Kệ #${idx + 1} • ${itm.name}</span>
            <span class="shelf-status-pill ${s.quantity > 3 ? 'status-stocked' : (s.quantity > 0 ? 'status-low' : 'status-empty')}">
              ${s.quantity > 0 ? `Còn ${s.quantity}/${s.maxQuantity}` : 'Hết hàng'}
            </span>
          </div>

          <div class="shelf-item-details">
            <div class="shelf-item-icon">${itm.icon}</div>
            <div class="shelf-item-info">
              <div class="shelf-item-name">${itm.name}</div>
              <div class="shelf-item-counts">Trên kệ: <b>${s.quantity}</b> | Trong kho còn: <b>${inWh}</b></div>
            </div>
            <span class="margin-pill ${marginClass}">${marginLabel} (+${marginPct}%)</span>
          </div>

          <div class="shelf-controls-row">
            <div class="price-input-group">
              <span class="price-input-label">Giá bán:</span>
              <div class="price-stepper">
                <button class="btn-step" onclick="game.adjustShelfPrice(${idx}, -1000)" title="Giảm 1.000₫">-</button>
                <div class="price-input-wrap">
                  <input type="number" class="price-number-input" value="${s.price}" min="500" step="1000"
                         onchange="game.setShelfPriceExact(${idx}, this.value)"
                         onkeydown="if(event.key==='Enter') this.blur();"
                         title="Nhập số giá bán niêm yết">
                  <span class="currency-symbol">₫</span>
                </div>
                <button class="btn-step" onclick="game.adjustShelfPrice(${idx}, 1000)" title="Tăng 1.000₫">+</button>
              </div>
            </div>

            <div class="shelf-actions">
              <button class="btn-shelf-action" onclick="game.openShelfAssignModal(${idx})">🔄 Đổi món</button>
              <button class="btn-shelf-action primary" onclick="game.restockShelfManual(${idx})">⚡ Châm hàng (${inWh})</button>
            </div>
          </div>
        `;
      }
      list.appendChild(card);
    });
  }

  renderMarketTab(categoryFilter = 'all') {
    const list = document.getElementById('market-items-list');
    if (!list) return;
    list.innerHTML = '';

    const items = categoryFilter === 'all'
      ? GAME_ITEMS
      : GAME_ITEMS.filter(i => i.category === categoryFilter);

    items.forEach(itm => {
      let unitCost = this.marketPrices[itm.id] || itm.baseCost;
      if (this.activeBuffs['market_discount']) {
        unitCost = Math.round(unitCost * this.activeBuffs['market_discount']);
      }

      const diff = unitCost - itm.baseCost;
      let trendClass = 'trend-flat';
      let trendText = 'Bình ổn';
      if (diff > 500) { trendClass = 'trend-up'; trendText = 'Tăng giá ↗'; }
      else if (diff < -500) { trendClass = 'trend-down'; trendText = 'Giảm giá ↘'; }

      const inWh = this.warehouse[itm.id] || 0;
      const card = document.createElement('div');
      card.className = 'market-card';
      card.innerHTML = `
        <div class="item-badge-row">
          <span class="item-category-tag">${this.getCategoryLabel(itm.category)}</span>
          <span class="trend-pill ${trendClass}">${trendText}</span>
        </div>

        <div class="market-item-visual">
          <div class="item-icon-huge">${itm.icon}</div>
          <div class="item-title-col">
            <h4>${itm.name}</h4>
            <div class="item-stock-info">Tồn kho: <b>${inWh}</b> món</div>
          </div>
        </div>

        <div class="market-pricing-row">
          <span class="cost-label">Giá sỉ hôm nay:</span>
          <span class="cost-price">${this.formatCurrency(unitCost)}/món</span>
        </div>

        <div class="buy-buttons-group">
          <button class="btn-buy" onclick="game.buyWholesaleItem('${itm.id}', 5)" ${this.money < unitCost * 5 ? 'disabled' : ''}>
            Nhập x5 (${this.formatCurrency(unitCost * 5)})
          </button>
          <button class="btn-buy" onclick="game.buyWholesaleItem('${itm.id}', 20)" ${this.money < unitCost * 20 ? 'disabled' : ''}>
            Nhập x20 (${this.formatCurrency(unitCost * 20)})
          </button>
        </div>
      `;
      list.appendChild(card);
    });
  }

  renderUpgradesTab() {
    const list = document.getElementById('upgrades-list');
    if (!list) return;
    list.innerHTML = '';

    STORE_UPGRADES.forEach(upg => {
      const isOwned = this.purchasedUpgrades.includes(upg.id);
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="card-icon-box">${upg.icon}</div>
        <div class="card-content-col">
          <h4>${upg.name} ${isOwned ? '<span class="card-tier-badge">ĐÃ SỞ HỮU</span>' : ''}</h4>
          <p>${upg.description}</p>
          <div class="card-effect-tag">✨ ${upg.effect}</div>
        </div>
        <button class="btn-purchase-upgrade" onclick="game.purchaseUpgrade('${upg.id}')" ${isOwned || this.money < upg.cost ? 'disabled' : ''}>
          <span>${isOwned ? 'Đã trang bị' : 'Mua nâng cấp'}</span>
          <span class="btn-price-subtext">${isOwned ? '✓' : this.formatCurrency(upg.cost)}</span>
        </button>
      `;
      list.appendChild(card);
    });
  }

  renderStaffTab() {
    const list = document.getElementById('staff-list');
    if (!list) return;
    list.innerHTML = '';

    let totalDailyWages = 0;
    this.hiredStaff.forEach(sId => {
      const st = STAFF_TYPES.find(s => s.id === sId);
      if (st) totalDailyWages += st.dailyWage;
    });
    document.getElementById('daily-wage-badge').innerText = `Lương/ngày: ${this.formatCurrency(totalDailyWages)}`;

    STAFF_TYPES.forEach(st => {
      const isHired = this.hiredStaff.includes(st.id);
      const card = document.createElement('div');
      card.className = 'staff-card';
      card.innerHTML = `
        <div class="card-icon-box">${st.icon}</div>
        <div class="card-content-col">
          <h4>${st.name} ${isHired ? '<span class="card-tier-badge">ĐANG LÀM VIỆC</span>' : ''}</h4>
          <p>${st.description}</p>
          <div class="card-effect-tag">✨ Lương: ${this.formatCurrency(st.dailyWage)}/ngày</div>
        </div>
        <button class="btn-hire-staff" onclick="game.hireStaffMember('${st.id}')" ${isHired || this.money < st.hireCost ? 'disabled' : ''}>
          <span>${isHired ? 'Đã ký HĐ' : 'Tuyển dụng'}</span>
          <span class="btn-price-subtext">${isHired ? '✓' : this.formatCurrency(st.hireCost)}</span>
        </button>
      `;
      list.appendChild(card);
    });
  }

  renderMarketingTab() {
    const list = document.getElementById('marketing-list');
    if (!list) return;
    list.innerHTML = '';

    MARKETING_CAMPAIGNS.forEach(camp => {
      const activeEntry = this.activeMarketing.find(m => m.id === camp.id);
      const card = document.createElement('div');
      card.className = 'campaign-card';
      card.innerHTML = `
        <div class="card-icon-box">${camp.icon}</div>
        <div class="card-content-col">
          <h4>${camp.name} ${activeEntry ? `<span class="card-tier-badge">CÒN ${activeEntry.remainingDays} NGÀY</span>` : ''}</h4>
          <p>${camp.description}</p>
          <div class="card-effect-tag">📢 ${camp.effect} (${camp.durationDays} ngày)</div>
        </div>
        <button class="btn-start-campaign" onclick="game.launchMarketingCampaign('${camp.id}')" ${activeEntry || this.money < camp.cost ? 'disabled' : ''}>
          <span>${activeEntry ? 'Đang chạy' : 'Kích hoạt'}</span>
          <span class="btn-price-subtext">${activeEntry ? '⚡' : this.formatCurrency(camp.cost)}</span>
        </button>
      `;
      list.appendChild(card);
    });
  }

  renderFinanceTab() {
    document.getElementById('fin-alltime-rev').innerText = this.formatCurrency(this.allTimeRevenue);
    const finTips = document.getElementById('fin-alltime-tips');
    if (finTips) finTips.innerText = this.formatCurrency(this.allTimeTips);
    document.getElementById('fin-alltime-profit').innerText = `${this.allTimeProfit >= 0 ? '+' : ''}${this.formatCurrency(this.allTimeProfit)}`;
    document.getElementById('fin-alltime-customers').innerText = this.allTimeCustomers;
    const happyPct = this.allTimeCustomers > 0 ? Math.round((this.allTimeHappyCustomers / this.allTimeCustomers) * 100) : 100;
    document.getElementById('fin-satisfaction-rate').innerText = `${happyPct}%`;

    const logBox = document.getElementById('activity-log');
    if (logBox) {
      logBox.innerHTML = '';
      this.logs.slice(-20).reverse().forEach(l => {
        const row = document.createElement('div');
        row.className = 'log-entry';
        row.innerHTML = `<span class="log-time">[${l.time}]</span> <span class="log-msg">${l.msg}</span>`;
        logBox.appendChild(row);
      });
    }
  }

  log(msg) {
    const hours = Math.floor(this.timeMinutes / 60);
    const mins = Math.floor(this.timeMinutes % 60);
    const timeStr = `N${this.day} ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    this.logs.push({ time: timeStr, msg });
    
    const ticker = document.getElementById('event-ticker');
    if (ticker) ticker.innerText = msg;

    this.renderFinanceTab();
  }

  getCategoryLabel(cat) {
    switch (cat) {
      case 'drink': return 'Đồ uống';
      case 'snack': return 'Bánh kẹo';
      case 'food': return 'Đồ ăn';
      case 'daily': return 'Gia dụng';
      case 'tech': return 'Điện tử';
      default: return 'Khác';
    }
  }

  formatCurrency(val) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' ₫';
  }

  // TOAST NOTIFICATION SYSTEM
  showToast(htmlMsg, type = 'success') {
    const container = document.getElementById('game-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `game-toast toast-${type}`;
    toast.innerHTML = htmlMsg;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    }, 2500);
  }

  // SAVE / LOAD SYSTEM
  saveGame(showToast = false) {
    try {
      const data = {
        storeName: this.storeName,
        day: this.day,
        timeMinutes: this.timeMinutes,
        isOpen: this.isOpen,
        money: this.money,
        reputation: this.reputation,
        cleanliness: this.cleanliness,
        warehouseCapacity: this.warehouseCapacity,
        warehouse: this.warehouse,
        maxShelves: this.maxShelves,
        shelves: this.shelves,
        purchasedUpgrades: this.purchasedUpgrades,
        hiredStaff: this.hiredStaff,
        activeMarketing: this.activeMarketing,
        activeBuffs: this.activeBuffs,
        marketPrices: this.marketPrices,
        allTimeRevenue: this.allTimeRevenue,
        allTimeTips: this.allTimeTips,
        dailyTips: this.dailyTips,
        dailyRevenue: this.dailyRevenue,
        dailyCostGoods: this.dailyCostGoods,
        allTimeProfit: this.allTimeProfit,
        allTimeCustomers: this.allTimeCustomers,
        allTimeHappyCustomers: this.allTimeHappyCustomers,
        logs: this.logs.slice(-30)
      };
      localStorage.setItem('shopkeeper_save', JSON.stringify(data));
      if (showToast) {
        gameAudio.playUpgrade();
        const hours = Math.floor(this.timeMinutes / 60);
        const mins = Math.floor(this.timeMinutes % 60);
        const timeFormatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        this.showToast(`💾 <span>Đã lưu game thành công! (Ngày ${this.day} - ${timeFormatted})</span>`, 'success');
      }
    } catch (e) {
      console.error('Save game error:', e);
      if (showToast) {
        this.showToast(`⚠️ Không thể lưu game: ${e.message || 'Lỗi lưu'}`, 'error');
      }
    }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem('shopkeeper_save');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data) {
        this.storeName = data.storeName || this.storeName;
        this.day = data.day || this.day;
        this.timeMinutes = data.timeMinutes || this.timeMinutes;
        this.isOpen = data.isOpen !== undefined ? data.isOpen : this.isOpen;
        this.money = data.money !== undefined ? data.money : this.money;
        this.reputation = data.reputation !== undefined ? data.reputation : this.reputation;
        this.cleanliness = data.cleanliness !== undefined ? data.cleanliness : this.cleanliness;
        this.warehouseCapacity = data.warehouseCapacity || this.warehouseCapacity;
        this.warehouse = data.warehouse || this.warehouse;
        this.maxShelves = data.maxShelves || (data.shelves ? data.shelves.length : this.maxShelves);
        this.shelves = data.shelves || this.shelves;
        this.purchasedUpgrades = data.purchasedUpgrades || this.purchasedUpgrades;
        this.hiredStaff = data.hiredStaff || this.hiredStaff;
        this.activeMarketing = data.activeMarketing || this.activeMarketing;
        this.activeBuffs = data.activeBuffs || {};
        if (data.marketPrices) this.marketPrices = data.marketPrices;
        this.allTimeRevenue = data.allTimeRevenue || 0;
        this.allTimeTips = data.allTimeTips || 0;
        this.dailyTips = data.dailyTips || 0;
        this.dailyRevenue = data.dailyRevenue || 0;
        this.dailyCostGoods = data.dailyCostGoods || 0;
        this.allTimeProfit = data.allTimeProfit || 0;
        this.allTimeCustomers = data.allTimeCustomers || 0;
        this.allTimeHappyCustomers = data.allTimeHappyCustomers || 0;
        this.logs = data.logs || [];
      }
    } catch (e) {
      console.error('Save loading error:', e);
    }
  }

  openSaveManagerModal() {
    const modal = document.getElementById('modal-save-manager');
    if (!modal) return;
    gameAudio.playClick();

    // Populate current save stats
    const nameEl = document.getElementById('save-info-name');
    const dayTimeEl = document.getElementById('save-info-day-time');
    const moneyEl = document.getElementById('save-info-money');
    const repEl = document.getElementById('save-info-rep');

    const hours = Math.floor(this.timeMinutes / 60);
    const mins = Math.floor(this.timeMinutes % 60);
    const timeFormatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    if (nameEl) nameEl.innerText = this.storeName;
    if (dayTimeEl) dayTimeEl.innerText = `Ngày ${this.day} • ${timeFormatted}`;
    if (moneyEl) moneyEl.innerText = this.formatCurrency(this.money);
    if (repEl) repEl.innerText = `${Math.round(this.reputation)}⭐ • ${this.shelves.length} Kệ hàng`;

    modal.classList.remove('hidden');
  }

  exportSaveFile() {
    this.saveGame(false);
    const raw = localStorage.getItem('shopkeeper_save');
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (this.storeName || 'Tiem_Tap_Hoa').replace(/[\s\/\\?%*:|"<>]+/g, '_');
    const filename = `${safeName}_Ngay_${this.day}.json`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    gameAudio.playUpgrade();
    this.showToast(`📥 Đã tải file lưu [${filename}] về máy!`, 'success');
    this.log(`📤 Bạn đã xuất file lưu tiến trình: ${filename}`);
  }

  importSaveFile(e) {
    const file = e.target && e.target.files ? e.target.files[0] : null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json || typeof json !== 'object' || json.money === undefined) {
          throw new Error('Dữ liệu không đúng định dạng của game');
        }
        localStorage.setItem('shopkeeper_save', JSON.stringify(json));
        gameAudio.playUpgrade();
        alert(`🎉 NẠP TIẾN TRÌNH THÀNH CÔNG!\n\n🏪 Tiệm: ${json.storeName || 'Tiệm Tạp Hóa'}\n📅 Ngày chơi: Ngày ${json.day || 1}\n💵 Ngân quỹ: ${(json.money || 0).toLocaleString('vi-VN')}₫\n⭐ Uy tín: ${Math.round(json.reputation || 50)}/100\n\nGame sẽ tải lại để bạn tiếp tục chơi ngay bây giờ!`);
        window.location.reload();
      } catch (err) {
        gameAudio.playBuzzer();
        alert(`⚠️ File lưu không hợp lệ! Vui lòng chọn đúng file .json đã xuất từ game.\nChi tiết lỗi: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }
}

// Global game instance initialization
let game = null;
window.addEventListener('DOMContentLoaded', () => {
  game = new ShopkeeperGame();
});
