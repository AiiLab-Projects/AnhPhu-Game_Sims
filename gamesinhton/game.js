// Island 30 Days 3D - Main Game & Interaction Coordinator
class IslandSurvivalGame {
  constructor() {
    this.initDefaultState();
    this.init3DWorld();
    this.bindDOM();
    this.attachEventListeners();
    this.updateUI();
    this.logDiary("🌊 Ngày 1: Bạn tỉnh dậy trên đảo hoang 3D! Hãy dùng [WASD] để di chuyển và phím [E] để tương tác.", "special");
  }

  initDefaultState() {
    this.state = {
      day: 1,
      maxDays: 30,
      timeOfDay: 'day', // 'day', 'dusk', 'night'
      weather: WEATHER_TYPES[0],
      
      hp: 100,
      hunger: 85,
      thirst: 80,
      sanity: 90,
      
      stamina: 3,
      maxStamina: 3,

      shelterLevel: 0,
      
      res: {
        wood: 3,
        stone: 2,
        rawFood: 1,
        cookedFood: 1,
        water: 2,
        herb: 1,
        rope: 1,
        metal: 0
      },

      crafted: {
        axe: false,
        rod: false,
        bow: false,
        sosTower: false
      },

      stats: {
        treesChopped: 0,
        fishCaught: 0,
        locationsExplored: 0,
        itemsCrafted: 0,
        eventsEncountered: 0
      },

      gameOver: false,
      gameWon: false,
      rescuedEarly: false
    };
  }

  init3DWorld() {
    this.world3D = new IslandWorld3D('canvas3d-container');
  }

  bindDOM() {
    this.domCurrentDay = document.getElementById('currentDay');
    this.domTimeIcon = document.getElementById('timeIcon');
    this.domTimeName = document.getElementById('timeName');
    this.domWeatherIcon = document.getElementById('weatherIcon');
    this.domWeatherName = document.getElementById('weatherName');

    this.domAvatarMood = document.getElementById('avatarMood');
    this.domShelterBadge = document.getElementById('shelterBadge');
    this.domSurvivorTitle = document.getElementById('survivorTitle');
    this.domSurvivorCondition = document.getElementById('survivorCondition');

    this.domHpVal = document.getElementById('hpVal');
    this.domHpBar = document.getElementById('hpBar');
    this.domHungerVal = document.getElementById('hungerVal');
    this.domHungerBar = document.getElementById('hungerBar');
    this.domThirstVal = document.getElementById('thirstVal');
    this.domThirstBar = document.getElementById('thirstBar');
    this.domSanityVal = document.getElementById('sanityVal');
    this.domSanityBar = document.getElementById('sanityBar');
    this.domStaminaVal = document.getElementById('staminaVal');
    this.domStaminaPips = document.getElementById('staminaPips');

    this.domResWood = document.getElementById('resWood');
    this.domResStone = document.getElementById('resStone');
    this.domResRawFood = document.getElementById('resRawFood');
    this.domResCookedFood = document.getElementById('resCookedFood');
    this.domResWater = document.getElementById('resWater');
    this.domResHerb = document.getElementById('resHerb');
    this.domResRope = document.getElementById('resRope');
    this.domResMetal = document.getElementById('resMetal');

    this.domEatBtn = document.getElementById('eatBtn');
    this.domDrinkBtn = document.getElementById('drinkBtn');
    this.domHealBtn = document.getElementById('healBtn');

    this.domDiaryScroll = document.getElementById('diaryScroll');

    // Bottom Action Buttons
    this.domBtnDockChop = document.getElementById('btnDockChop');
    this.domBtnDockFish = document.getElementById('btnDockFish');
    this.domBtnDockBuild = document.getElementById('btnDockBuild');
    this.domBtnDockCraft = document.getElementById('btnDockCraft');
    this.domBtnDockRest = document.getElementById('btnDockRest');

    // Modals
    this.domCraftModal = document.getElementById('craftModal');
    this.domCloseCraftBtn = document.getElementById('closeCraftBtn');
    this.domBtnCraftCook = document.getElementById('btnCraftCook');
    this.domBtnCraftWater = document.getElementById('btnCraftWater');
    this.domBtnCraftAxe = document.getElementById('btnCraftAxe');
    this.domBtnCraftRod = document.getElementById('btnCraftRod');
    this.domBtnCraftBow = document.getElementById('btnCraftBow');
    this.domBtnCraftSOS = document.getElementById('btnCraftSOS');

    this.domEventModal = document.getElementById('eventModal');
    this.domEventModalTitle = document.getElementById('eventModalTitle');
    this.domEventModalIcon = document.getElementById('eventModalIcon');
    this.domEventModalText = document.getElementById('eventModalText');
    this.domEventIllustration = document.getElementById('eventIllustration');
    this.domEventChoicesContainer = document.getElementById('eventChoicesContainer');

    this.domEndingModal = document.getElementById('endingModal');
    this.domEndingEmoji = document.getElementById('endingEmoji');
    this.domEndingTitle = document.getElementById('endingTitle');
    this.domEndingSubtitle = document.getElementById('endingSubtitle');
    this.domEndingStatsGrid = document.getElementById('endingStatsGrid');
    this.domEndingStoryText = document.getElementById('endingStoryText');
    this.domBtnRestartGame = document.getElementById('btnRestartGame');

    this.domGuideModal = document.getElementById('guideModal');
    this.domGuideBtn = document.getElementById('guideBtn');
    this.domCloseGuideBtn = document.getElementById('closeGuideBtn');
    this.domSoundToggleBtn = document.getElementById('soundToggleBtn');
    this.domCameraToggleBtn = document.getElementById('cameraToggleBtn');
    this.domRestartBtn = document.getElementById('restartBtn');
    this.domInteractionPrompt = document.getElementById('interactionPrompt');
  }

  attachEventListeners() {
    this.domSoundToggleBtn.addEventListener('click', () => {
      const isMuted = soundManager.toggleMute();
      this.domSoundToggleBtn.textContent = isMuted ? '🔇' : '🔊';
      soundManager.play('click');
    });

    this.domCameraToggleBtn.addEventListener('click', () => {
      soundManager.play('click');
      if (this.world3D.player.cameraDistance > 18) {
        this.world3D.player.cameraDistance = 10;
        this.world3D.player.cameraHeight = 5;
      } else {
        this.world3D.player.cameraDistance = 22;
        this.world3D.player.cameraHeight = 11;
      }
    });

    this.domGuideBtn.addEventListener('click', () => {
      soundManager.play('click');
      this.domGuideModal.classList.remove('hidden');
    });

    this.domCloseGuideBtn.addEventListener('click', () => {
      soundManager.play('click');
      this.domGuideModal.classList.add('hidden');
    });

    this.domRestartBtn.addEventListener('click', () => {
      if (confirm('Bạn có muốn bắt đầu lại hành trình 30 ngày?')) {
        this.restartGame();
      }
    });

    this.domBtnRestartGame.addEventListener('click', () => {
      this.restartGame();
    });

    // 3D Interaction prompt click
    this.domInteractionPrompt.addEventListener('click', () => {
      this.handleContextInteraction();
    });

    // Quick consumables
    this.domEatBtn.addEventListener('click', () => this.consumeItem('eat'));
    this.domDrinkBtn.addEventListener('click', () => this.consumeItem('drink'));
    this.domHealBtn.addEventListener('click', () => this.consumeItem('heal'));

    // Dock Action Buttons
    this.domBtnDockChop.addEventListener('click', () => this.actionChopWood());
    this.domBtnDockFish.addEventListener('click', () => this.actionGoFishing());
    this.domBtnDockBuild.addEventListener('click', () => this.actionBuildShelter());
    this.domBtnDockCraft.addEventListener('click', () => this.openCraftModal());
    this.domBtnDockRest.addEventListener('click', () => this.actionRestAndSleep());

    // Craft Modal
    this.domCloseCraftBtn.addEventListener('click', () => {
      soundManager.play('click');
      this.domCraftModal.classList.add('hidden');
    });

    this.domBtnCraftCook.addEventListener('click', () => this.craftCookFood());
    this.domBtnCraftWater.addEventListener('click', () => this.craftPurifyWater());
    this.domBtnCraftAxe.addEventListener('click', () => this.craftItem('axe', { wood: 4, stone: 3 }, '🪓 Đã rèn Rìu Đá! Chặt cây nhận gấp đôi gỗ.'));
    this.domBtnCraftRod.addEventListener('click', () => this.craftItem('rod', { wood: 3, rope: 2 }, '🎣 Đã chế Cần Câu Xịn!'));
    this.domBtnCraftBow.addEventListener('click', () => this.craftItem('bow', { wood: 5, rope: 3, stone: 2 }, '🏹 Đã chế Cung Tên Săn Bắn!'));
    this.domBtnCraftSOS.addEventListener('click', () => this.craftSOSLighthouse());
  }

  handleContextInteraction() {
    if (this.world3D.activeInteraction) {
      this.world3D.triggerActiveInteraction();
    } else {
      // Default action when standing anywhere: Chop or Fish if close to water
      this.actionChopWood();
    }
  }

  openCraftModal() {
    soundManager.play('click');
    this.domCraftModal.classList.remove('hidden');
  }

  openShelterMenu() {
    const nextLevel = this.state.shelterLevel + 1;
    if (nextLevel < SHELTER_LEVELS.length) {
      if (confirm(`Bạn đang ở Nơi Trú Ẩn Lửa Trại.\nBạn muốn NÂNG CẤP LỀU [${SHELTER_LEVELS[nextLevel].name}] (Nhấn OK)\nhoặc NGHỈ NGƠI QUA NGÀY (Nhấn Cancel)?`)) {
        this.actionBuildShelter();
      } else {
        this.actionRestAndSleep();
      }
    } else {
      if (confirm("Nơi trú ẩn đã đạt Cấp Tối Đa. Bạn có muốn NGHỈ NGƠI QUA ĐÊM để phục hồi thể lực?")) {
        this.actionRestAndSleep();
      }
    }
  }

  logDiary(message, type = 'normal') {
    const timeLabel = `[Ngày ${this.state.day} - ${this.state.timeOfDay === 'day' ? 'Sáng' : this.state.timeOfDay === 'dusk' ? 'Chiều' : 'Đêm'}]`;
    const entryEl = document.createElement('div');
    entryEl.className = `diary-entry ${type}`;
    entryEl.innerHTML = `<div class="entry-time">${timeLabel}</div><div>${message}</div>`;
    this.domDiaryScroll.insertBefore(entryEl, this.domDiaryScroll.firstChild);
  }

  useStamina() {
    if (this.state.stamina <= 0) {
      this.logDiary("⚠️ Bạn đã cạn kiệt Thể Lực! Hãy về lửa trại hoặc nhấn [5] Nghỉ Ngơi qua ngày mới.", "warning");
      soundManager.play('danger');
      return false;
    }
    this.state.stamina--;
    
    this.state.hunger = Math.max(0, this.state.hunger - 4);
    this.state.thirst = Math.max(0, this.state.thirst - 5 * this.state.weather.thirstMultiplier);

    if (this.state.stamina === 2) {
      this.state.timeOfDay = 'day';
    } else if (this.state.stamina === 1) {
      this.state.timeOfDay = 'dusk';
    } else if (this.state.stamina === 0) {
      this.state.timeOfDay = 'night';
    }

    this.world3D.updateDayNightCycle(this.state.timeOfDay, this.state.weather);
    this.checkHealthCondition();
    return true;
  }

  checkHealthCondition() {
    if (this.state.hunger <= 0) {
      this.state.hp = Math.max(0, this.state.hp - 8);
      this.logDiary("⚠️ Đói lả! Bạn bị mất 8 HP mỗi lượt.", "danger");
    }
    if (this.state.thirst <= 0) {
      this.state.hp = Math.max(0, this.state.hp - 12);
      this.logDiary("⚠️ Khát khô cổ họng! Bạn bị mất 12 HP mỗi lượt.", "danger");
    }
    if (this.state.sanity <= 20) {
      this.state.hp = Math.max(0, this.state.hp - 4);
      this.logDiary("🌀 Hoảng loạn và ảo giác làm giảm 4 HP.", "warning");
    }

    if (this.state.hp <= 0) {
      this.triggerGameOver('death');
    }
  }

  // 1. 🌲 CHẶT CÂY
  actionChopWood() {
    if (!this.useStamina()) return;
    this.world3D.player.playActionAnimation('chop');
    soundManager.play('chop');
    this.state.stats.treesChopped++;

    const bonus = this.state.crafted.axe ? 2 : 1;
    const woodGain = (Math.floor(Math.random() * 3) + 2) * bonus + (this.state.weather.bonusWood || 0);
    this.state.res.wood += woodGain;

    let rewardMsg = `+${woodGain} Gỗ 🪵`;
    if (Math.random() > 0.4) {
      this.state.res.herb += 1;
      rewardMsg += `, +1 Thảo Dược 🌿`;
    }
    if (Math.random() > 0.5) {
      this.state.hunger = Math.min(100, this.state.hunger + 10);
      rewardMsg += `, Ăn quả dừa (+10 Đói) 🥥`;
    }

    if (Math.random() < 0.12) {
      this.state.hp = Math.max(0, this.state.hp - 8);
      this.logDiary(`🌲 Chặt cây: ${rewardMsg}. Không may bị ong rừng đốt (-8 HP)!`, "warning");
    } else {
      this.logDiary(`🌲 Chặt cây 3D: Thu hoạch được ${rewardMsg}.`, "success");
    }

    this.checkHealthCondition();
    this.updateUI();
  }

  // 2. 🎣 CÂU CÁ
  actionGoFishing() {
    if (!this.useStamina()) return;
    this.world3D.player.playActionAnimation('fish');
    soundManager.play('fish');
    this.state.stats.fishCaught++;

    const rodBonus = this.state.crafted.rod ? 0.35 : 0;
    const roll = Math.random() + rodBonus;

    if (roll > 0.8) {
      this.state.res.rawFood += 3;
      this.state.res.rope += 1;
      this.state.sanity = Math.min(100, this.state.sanity + 8);
      this.logDiary("🎣 Câu bờ biển 3D: Trúng mẻ cá ngừ lớn và vớt được dây bạt (+3 Cá tươi, +1 Dây bạt)! 🐟", "special");
    } else if (roll > 0.35) {
      const qty = Math.floor(Math.random() * 2) + 1;
      this.state.res.rawFood += qty;
      this.logDiary(`🎣 Câu cá 3D: Bạn bắt được ${qty} con cá biển (+${qty} Đồ sống). 🐟`, "success");
    } else {
      this.state.hunger = Math.min(100, this.state.hunger + 6);
      this.logDiary("🎣 Câu cá: Chỉ bắt được vài con sò điệp ăn lót dạ (+6 Đói). 🦪", "warning");
    }

    this.checkHealthCondition();
    this.updateUI();
  }

  // 3. 🏠 XÂY NHÀ & NÂNG CẤP LỀU
  actionBuildShelter() {
    const nextLevel = this.state.shelterLevel + 1;
    if (nextLevel >= SHELTER_LEVELS.length) {
      this.logDiary("🏡 Nơi trú ẩn 3D của bạn đã đạt cấp độ Pháo Đài kiên cố nhất!", "special");
      soundManager.play('click');
      return;
    }

    const nextInfo = SHELTER_LEVELS[nextLevel];
    const req = nextInfo.req;

    if (this.state.res.wood < (req.wood || 0) ||
        this.state.res.stone < (req.stone || 0) ||
        this.state.res.rope < (req.rope || 0) ||
        this.state.res.metal < (req.metal || 0)) {
      
      let reqStr = [];
      if (req.wood) reqStr.push(`${req.wood} 🪵 Gỗ`);
      if (req.stone) reqStr.push(`${req.stone} 🪨 Đá`);
      if (req.rope) reqStr.push(`${req.rope} 🧶 Dây`);
      if (req.metal) reqStr.push(`${req.metal} ⚙️ Kim loại`);

      this.logDiary(`❌ Thiếu nguyên liệu xây ${nextInfo.name}! Cần: ${reqStr.join(', ')}`, "warning");
      soundManager.play('danger');
      return;
    }

    if (!this.useStamina()) return;
    this.world3D.player.playActionAnimation('action');
    soundManager.play('craft');

    if (req.wood) this.state.res.wood -= req.wood;
    if (req.stone) this.state.res.stone -= req.stone;
    if (req.rope) this.state.res.rope -= req.rope;
    if (req.metal) this.state.res.metal -= req.metal;

    this.state.shelterLevel = nextLevel;
    this.state.sanity = Math.min(100, this.state.sanity + 25);
    
    // Update 3D Shelter Mesh immediately in scene
    this.world3D.updateShelterModel(this.state.shelterLevel);

    this.logDiary(`🏠 Nâng cấp thành công [${nextInfo.name}] trong thế giới 3D! +25 Tinh thần.`, "special");
    this.checkHealthCondition();
    this.updateUI();
  }

  // 4. 🗺️ THÁM HIỂM ĐỊA ĐIỂM
  actionExploreLocation(locKey) {
    if (!this.useStamina()) return;
    this.state.stats.locationsExplored++;
    this.world3D.player.playActionAnimation('action');

    if (Math.random() < 0.45) {
      this.triggerRandomModalEncounter();
      this.updateUI();
      return;
    }

    soundManager.play('click');
    if (locKey === 'shipwreck') {
      const metalGain = Math.floor(Math.random() * 2) + 1;
      const ropeGain = 2;
      this.state.res.metal += metalGain;
      this.state.res.rope += ropeGain;
      this.state.sanity = Math.min(100, this.state.sanity + 10);
      this.logDiary(`🚢 Khám phá Xác Tàu 3D: Thu thập được +${metalGain} Kim loại, +${ropeGain} Dây bạt cổ!`, 'special');
    } else if (locKey === 'cave') {
      const stoneGain = Math.floor(Math.random() * 3) + 2;
      const waterGain = 2;
      this.state.res.stone += stoneGain;
      this.state.res.water += waterGain;
      this.logDiary(`🦇 Hang Động Hắc Ám 3D: Khai thác +${stoneGain} Đá, lấy +${waterGain} Nước ngầm.`, 'success');
    } else if (locKey === 'volcano') {
      this.state.res.stone += 4;
      this.state.sanity = Math.min(100, this.state.sanity + 15);
      this.logDiary(`🌋 Đỉnh Núi Lửa 3D: Lên đỉnh cao quan sát biển khơi (+15 Tinh thần, +4 Đá lửa)!`, 'special');
    }

    this.checkHealthCondition();
    this.updateUI();
  }

  // 5. 😴 NGHỈ NGƠI / QUA NGÀY MỚI
  actionRestAndSleep() {
    soundManager.play('sleep');

    const shelter = SHELTER_LEVELS[this.state.shelterLevel];
    const shelterHpBonus = shelter.hpProtect;

    const hungerLoss = 15;
    const thirstLoss = 18 * this.state.weather.thirstMultiplier;
    this.state.hunger = Math.max(0, this.state.hunger - hungerLoss);
    this.state.thirst = Math.max(0, this.state.thirst - thirstLoss);

    if (this.state.weather.id === 'storm' && this.state.shelterLevel < 2) {
      this.state.hp = Math.max(0, this.state.hp - 15);
      this.state.sanity = Math.max(0, this.state.sanity - 20);
      this.logDiary(`⛈️ Bão lớn đêm qua! Lều tạm bợ khiến bạn nhiễm lạnh (-15 HP, -20 Tinh thần).`, 'danger');
    } else if (this.state.weather.id === 'rain') {
      this.state.res.water += 1;
      this.logDiary(`🌧️ Mưa đêm: Hứng được +1 Nước ngọt tự nhiên.`, 'success');
    }

    if (this.state.hunger > 40 && this.state.thirst > 40) {
      const healAmt = 10 + shelterHpBonus;
      this.state.hp = Math.min(100, this.state.hp + healAmt);
      this.state.sanity = Math.min(100, this.state.sanity + 12);
      this.logDiary(`😴 Giấc ngủ ngon: Phục hồi +${healAmt} HP và +12 Tinh thần.`, 'success');
    } else {
      this.state.sanity = Math.max(0, this.state.sanity - 5);
      this.logDiary(`😴 Giấc ngủ chập chờn vì đói và khát.`, 'warning');
    }

    this.state.day++;
    this.state.stamina = this.state.maxStamina;
    this.state.timeOfDay = 'day';

    const randWeather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
    this.state.weather = randWeather;

    this.world3D.updateDayNightCycle(this.state.timeOfDay, this.state.weather);
    this.logDiary(`🌅 Bắt đầu Ngày ${this.state.day} - Thời tiết: ${this.state.weather.name} ${this.state.weather.icon}`, 'special');

    if (this.state.day > this.state.maxDays) {
      this.triggerGameOver('victory_30days');
      return;
    }

    if (this.state.day === 10 || this.state.day === 20 || this.state.day === 28) {
      setTimeout(() => this.triggerEncounterById('distant_ship'), 500);
    } else if (Math.random() < 0.3) {
      setTimeout(() => this.triggerRandomModalEncounter(), 500);
    }

    this.checkHealthCondition();
    this.updateUI();
  }

  consumeItem(type) {
    if (type === 'eat') {
      if (this.state.res.cookedFood <= 0) {
        if (this.state.res.rawFood > 0) {
          if (confirm("Chỉ còn đồ sống! Ăn sống có thể bị ngộ độc. Bạn có muốn ăn?")) {
            this.state.res.rawFood--;
            this.state.hunger = Math.min(100, this.state.hunger + 15);
            if (Math.random() > 0.5) {
              this.state.hp = Math.max(0, this.state.hp - 15);
              this.logDiary("🤢 Ngộ độc thức ăn sống (-15 HP)!", "danger");
            } else {
              this.logDiary("🍖 Ăn tạm thịt sống (+15 Đói).", "warning");
            }
            soundManager.play('eat');
          }
        } else {
          this.logDiary("❌ Hết thức ăn! Hãy đi câu cá.", "warning");
          soundManager.play('danger');
        }
        this.updateUI();
        return;
      }
      this.state.res.cookedFood--;
      this.state.hunger = Math.min(100, this.state.hunger + 30);
      this.state.hp = Math.min(100, this.state.hp + 10);
      soundManager.play('eat');
      this.logDiary("🍲 Ăn món nướng chín ngon lành (+30 Đói, +10 HP).", "success");
    } else if (type === 'drink') {
      if (this.state.res.water <= 0) {
        this.logDiary("❌ Hết nước ngọt! Hãy đun nước hoặc tìm ở hang động.", "warning");
        soundManager.play('danger');
        return;
      }
      this.state.res.water--;
      this.state.thirst = Math.min(100, this.state.thirst + 35);
      this.state.sanity = Math.min(100, this.state.sanity + 5);
      soundManager.play('drink');
      this.logDiary("🍶 Uống nước ngọt mát lành (+35 Khát, +5 Tinh thần).", "success");
    } else if (type === 'heal') {
      if (this.state.res.herb <= 0) {
        this.logDiary("❌ Hết thảo dược! Hãy tìm trong rừng cây.", "warning");
        soundManager.play('danger');
        return;
      }
      this.state.res.herb--;
      this.state.hp = Math.min(100, this.state.hp + 25);
      this.state.sanity = Math.min(100, this.state.sanity + 15);
      soundManager.play('eat');
      this.logDiary("🌿 Dùng thảo dược trị thương (+25 HP, +15 Tinh thần).", "success");
    }

    this.checkHealthCondition();
    this.updateUI();
  }

  craftCookFood() {
    if (this.state.res.rawFood < 1 || this.state.res.wood < 1) {
      alert("Cần ít nhất 1 Cá sống 🐟 và 1 Gỗ 🪵 để nhóm bếp nướng!");
      soundManager.play('danger');
      return;
    }
    this.state.res.rawFood -= 1;
    this.state.res.wood -= 1;
    this.state.res.cookedFood += 1;
    this.state.stats.itemsCrafted++;
    soundManager.play('craft');
    this.logDiary("🍳 Nhóm lửa nướng chín thực phẩm thơm ngon (+1 Đồ chín).", "success");
    this.updateUI();
  }

  craftPurifyWater() {
    if (this.state.res.wood < 1) {
      alert("Cần 1 Gỗ 🪵 để đun sôi khử khuẩn nước!");
      soundManager.play('danger');
      return;
    }
    this.state.res.wood -= 1;
    this.state.res.water += 2;
    this.state.stats.itemsCrafted++;
    soundManager.play('craft');
    this.logDiary("🍶 Đun sôi nước thu được +2 Nước ngọt tinh khiết.", "success");
    this.updateUI();
  }

  craftItem(itemKey, cost, successMsg) {
    if (this.state.crafted[itemKey]) {
      alert("Bạn đã chế tạo trang bị này rồi!");
      return;
    }

    for (let resKey in cost) {
      if ((this.state.res[resKey] || 0) < cost[resKey]) {
        alert("Chưa đủ tài nguyên để chế tạo!");
        soundManager.play('danger');
        return;
      }
    }

    for (let resKey in cost) {
      this.state.res[resKey] -= cost[resKey];
    }

    this.state.crafted[itemKey] = true;
    this.state.stats.itemsCrafted++;
    this.state.sanity = Math.min(100, this.state.sanity + 15);
    soundManager.play('craft');
    this.logDiary(`🛠️ ${successMsg}`, "special");
    this.updateUI();
  }

  craftSOSLighthouse() {
    if (this.state.crafted.sosTower) {
      alert("Ngọn Hải Đăng SOS đã hoàn thành trên đỉnh núi!");
      return;
    }

    const cost = { wood: 15, stone: 10, rope: 5, metal: 3 };
    for (let resKey in cost) {
      if ((this.state.res[resKey] || 0) < cost[resKey]) {
        alert("Cần 15 Gỗ, 10 Đá, 5 Dây, 3 Kim loại để xây Ngọn Hải Đăng SOS!");
        soundManager.play('danger');
        return;
      }
    }

    for (let resKey in cost) {
      this.state.res[resKey] -= cost[resKey];
    }

    this.state.crafted.sosTower = true;
    this.state.stats.itemsCrafted++;
    soundManager.play('victory');
    this.logDiary("🗼 ĐẠI CÔNG TRÌNH! Dựng thành công Ngọn Hải Đăng SOS rực sáng trên đỉnh núi!", "special");
    
    setTimeout(() => {
      if (confirm("🗼 Ngọn Hải Đăng SOS đang bùng cháy rực rỡ! Bạn có muốn đốt pháo sáng tối thượng để trực thăng giải cứu ngay lập tức?")) {
        this.triggerGameOver('victory_rescue');
      }
    }, 500);

    this.updateUI();
  }

  triggerRandomModalEncounter() {
    const enc = RANDOM_ENCOUNTERS[Math.floor(Math.random() * RANDOM_ENCOUNTERS.length)];
    this.showEncounterModal(enc);
  }

  triggerEncounterById(encId) {
    const enc = RANDOM_ENCOUNTERS.find(e => e.id === encId);
    if (enc) this.showEncounterModal(enc);
  }

  showEncounterModal(enc) {
    this.state.stats.eventsEncountered++;
    soundManager.play('danger');
    
    this.domEventModalIcon.textContent = enc.icon;
    this.domEventModalTitle.textContent = enc.title;
    this.domEventModalText.textContent = enc.text;
    this.domEventIllustration.textContent = enc.icon;

    this.domEventChoicesContainer.innerHTML = '';
    enc.choices.forEach((ch) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span>${ch.text}</span> <span>➔</span>`;
      btn.addEventListener('click', () => {
        soundManager.play('click');
        const res = ch.effect(this.state);
        this.domEventModal.classList.add('hidden');
        if (res && res.msg) {
          this.logDiary(`📜 [${enc.title}]: ${res.msg}`, res.type || 'normal');
        }
        if (this.state.rescuedEarly) {
          this.triggerGameOver('victory_rescue');
        } else {
          this.checkHealthCondition();
          this.updateUI();
        }
      });
      this.domEventChoicesContainer.appendChild(btn);
    });

    this.domEventModal.classList.remove('hidden');
  }

  triggerGameOver(reason) {
    this.state.gameOver = true;
    let emoji = '💀';
    let title = 'GAME OVER - BẠN ĐÃ TỬ NẠN';
    let subtitle = `Hành trình dừng lại ở Ngày ${this.state.day}`;
    let story = 'Bạn đã không thể vượt qua những thử thách khắc nghiệt của hoang đảo...';

    if (reason === 'victory_30days') {
      emoji = '👑';
      title = 'CHIẾN THẮNG: VUA HOANG ĐẢO!';
      subtitle = 'Bạn đã kiên cường sống sót trọn vẹn 30 ngày!';
      story = 'Vào ngày thứ 30, đội cứu hộ quốc tế đã tiếp cận đảo hoang và tìm thấy bạn trong trạng thái tràn đầy sinh lực. Tên tuổi của bạn trở thành huyền thoại!';
      soundManager.play('victory');
    } else if (reason === 'victory_rescue') {
      emoji = '🚁';
      title = 'GIẢI CỨU THÀNH CÔNG!';
      subtitle = `Tín hiệu cứu hộ SOS của bạn đã được tiếp nhận ở Ngày ${this.state.day}!`;
      story = 'Ngọn lửa bùng cháy từ công trình SOS đã thu hút trực thăng tuần tra cứu hộ. Bạn được đưa về đất liền an toàn!';
      soundManager.play('victory');
    } else {
      soundManager.play('danger');
    }

    this.domEndingEmoji.textContent = emoji;
    this.domEndingTitle.textContent = title;
    this.domEndingSubtitle.textContent = subtitle;
    this.domEndingStoryText.textContent = story;

    this.domEndingStatsGrid.innerHTML = `
      <div class="ending-stat-box"><span class="ending-stat-val">${this.state.day}</span><span class="ending-stat-label">Ngày Sống Sót</span></div>
      <div class="ending-stat-box"><span class="ending-stat-val">${this.state.stats.treesChopped}</span><span class="ending-stat-label">Cây Đã Đốn</span></div>
      <div class="ending-stat-box"><span class="ending-stat-val">${this.state.stats.fishCaught}</span><span class="ending-stat-label">Cá Đã Bắt</span></div>
      <div class="ending-stat-box"><span class="ending-stat-val">${this.state.shelterLevel} / 3</span><span class="ending-stat-label">Cấp Lều 3D</span></div>
      <div class="ending-stat-box"><span class="ending-stat-val">${this.state.stats.locationsExplored}</span><span class="ending-stat-label">Thám Hiểm</span></div>
      <div class="ending-stat-box"><span class="ending-stat-val">${this.state.stats.itemsCrafted}</span><span class="ending-stat-label">Chế Tạo</span></div>
    `;

    this.domEndingModal.classList.remove('hidden');
  }

  restartGame() {
    this.domEndingModal.classList.add('hidden');
    this.domEventModal.classList.add('hidden');
    this.domCraftModal.classList.add('hidden');
    this.domDiaryScroll.innerHTML = '';
    this.initDefaultState();
    this.world3D.updateShelterModel(0);
    this.world3D.updateDayNightCycle('day', this.state.weather);
    this.world3D.player.meshGroup.position.set(0, 0.1, 4);
    this.updateUI();
    this.logDiary("🌊 Ngày 1: Bạn bắt đầu lại chuyến phiêu lưu 30 ngày trên hoang đảo 3D!", "special");
    soundManager.play('click');
  }

  updateUI() {
    this.domCurrentDay.textContent = Math.min(this.state.day, 30);
    
    if (this.state.timeOfDay === 'day') {
      this.domTimeIcon.textContent = '☀️';
      this.domTimeName.textContent = 'Sáng';
    } else if (this.state.timeOfDay === 'dusk') {
      this.domTimeIcon.textContent = '🌇';
      this.domTimeName.textContent = 'Chiều Tà';
    } else {
      this.domTimeIcon.textContent = '🌙';
      this.domTimeName.textContent = 'Đêm';
    }

    this.domWeatherIcon.textContent = this.state.weather.icon;
    this.domWeatherName.textContent = this.state.weather.name;

    this.domHpVal.textContent = `${Math.round(this.state.hp)}/100`;
    this.domHpBar.style.width = `${Math.max(0, Math.min(100, this.state.hp))}%`;

    this.domHungerVal.textContent = `${Math.round(this.state.hunger)}/100`;
    this.domHungerBar.style.width = `${Math.max(0, Math.min(100, this.state.hunger))}%`;

    this.domThirstVal.textContent = `${Math.round(this.state.thirst)}/100`;
    this.domThirstBar.style.width = `${Math.max(0, Math.min(100, this.state.thirst))}%`;

    this.domSanityVal.textContent = `${Math.round(this.state.sanity)}/100`;
    this.domSanityBar.style.width = `${Math.max(0, Math.min(100, this.state.sanity))}%`;

    this.domStaminaVal.textContent = `${this.state.stamina}/${this.state.maxStamina}`;
    
    const pips = this.domStaminaPips.querySelectorAll('.stamina-dot');
    pips.forEach((pip, idx) => {
      if (idx < this.state.stamina) {
        pip.classList.add('active');
      } else {
        pip.classList.remove('active');
      }
    });

    if (this.state.hp < 30 || this.state.hunger < 20 || this.state.thirst < 20) {
      this.domAvatarMood.textContent = '😫';
      this.domSurvivorCondition.textContent = 'Kiệt quệ';
      this.domSurvivorCondition.className = 'status-pill status-danger';
    } else if (this.state.sanity < 40) {
      this.domAvatarMood.textContent = '😵';
      this.domSurvivorCondition.textContent = 'Hoảng loạn';
      this.domSurvivorCondition.className = 'status-pill status-warn';
    } else {
      this.domAvatarMood.textContent = '🤠';
      this.domSurvivorCondition.textContent = 'Khỏe mạnh';
      this.domSurvivorCondition.className = 'status-pill status-good';
    }

    const shelter = SHELTER_LEVELS[this.state.shelterLevel];
    this.domShelterBadge.textContent = `${shelter.icon} Lv${this.state.shelterLevel}: ${shelter.name}`;

    this.domResWood.textContent = this.state.res.wood;
    this.domResStone.textContent = this.state.res.stone;
    this.domResRawFood.textContent = this.state.res.rawFood;
    this.domResCookedFood.textContent = this.state.res.cookedFood;
    this.domResWater.textContent = this.state.res.water;
    this.domResHerb.textContent = this.state.res.herb;
    this.domResRope.textContent = this.state.res.rope;
    this.domResMetal.textContent = this.state.res.metal;

    if (this.state.crafted.axe) {
      this.domBtnCraftAxe.textContent = "Đã có (Tối đa)";
      this.domBtnCraftAxe.disabled = true;
    }
    if (this.state.crafted.rod) {
      this.domBtnCraftRod.textContent = "Đã có (Tối đa)";
      this.domBtnCraftRod.disabled = true;
    }
    if (this.state.crafted.bow) {
      this.domBtnCraftBow.textContent = "Đã có (Tối đa)";
      this.domBtnCraftBow.disabled = true;
    }
    if (this.state.crafted.sosTower) {
      this.domBtnCraftSOS.textContent = "Đã xây dựng (Tối đa)";
      this.domBtnCraftSOS.disabled = true;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new IslandSurvivalGame();
});
