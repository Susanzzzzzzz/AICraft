// AICraft — Main game entry point
import * as THREE from 'three';
import { World, BLOCK, ITEM, ITEM_NAMES, WORLD_WIDTH, WORLD_HEIGHT, WORLD_DEPTH, BLOCK_COLORS, MAX_BLOCK_TYPE, getBlockDrop } from './world.js';
import { Renderer } from './renderer.js';
import { Player } from './player.js';
import { Input, parseCommand } from './input.js';
import { TouchController } from './touch-controller.js';
import { HUD } from './hud.js';
import { raycast } from './raycast.js';
import { SteveModel } from './steve.js';
import { CameraController, CAMERA_FIRST, CAMERA_THIRD_BACK, CAMERA_THIRD_FRONT, CAMERA_GOD } from './camera.js';
import { SkinManager } from './skin.js';
import { PassiveAnimal, Pig, Cow, Sheep, Chicken, Slime } from './animals.js';
import { CharacterPreview } from './character-preview.js';
import { Inventory } from './inventory.js';
import { getCraftResult, consumeCraftInput, RECIPES } from './crafting.js';
import { getWeapon, getToolSpeed } from './weapons.js';
import { AudioManager } from './audio.js';
import { ROLES, getRole, getAvailableRoles, getUnlockedRoles } from './role.js';
import { Pet } from './pet.js';
import { MCLevel } from './MCLevel.js';
import { LEVELS } from './levelData.js';
import { MCAIController } from './MCAIController.js';
import { getSkill } from './skillLibrary.js';
import { MCSkill } from './MCSkill.js';
import { WeatherManager } from './weather.js';
import { HostileMob, Zombie, Skeleton, Spider, Creeper, Enderman, Wolf, CaveSpider, DropItem } from './hostiles.js';
import { Diagnostics } from './diagnostics.js';

const SAVE_KEY = 'aicraft_save_v4';

class Game {
  constructor() {
    this.world = null;
    this.renderer = null;
    this.player = null;
    this.input = null;
    this.hud = null;
    this.cameraCtrl = null;
    this.steveModel = null;
    this.skinManager = null;
    this.characterPreview = null;
    this.animals = [];
    this.slimes = [];
    this.running = false;
    this.lastTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.fpsTimer = 0;
    this.saveTimer = 0;
    this.timeOfDay = 0.25; // Start at dawn
    this.inventory = new Inventory();
    this.audioManager = new AudioManager();
    this.uiState = 'gameplay';    // gameplay | inventory | pause | notification | levelSelect
    this.currentWeaponId = null;
    this.daySpeedMultiplier = 1;

    // Role system fields
    this.currentRoleId = 'steve';
    this.pet = null;
    this.pauseScreenVisible = false;
    this.roleCardsBuilt = false;

    // Skill/Level/AI system
    this.currentLevelIndex = 0;
    this.currentLevel = LEVELS[0];
    this.currentTerrainIndex = 0;
    this.unlockedSkillIds = ['mc_mine_001'];
    this.currentSkillIndex = 0;
    this._levelCheckTimer = 0;

    // Combat system
    this._attackCooldownTimer = 0;
    this._miningProgress = 0;
    this._miningTarget = null;
    this._miningBlockType = 0;
    this._projectVector = new THREE.Vector3();
    this._lastSkillUseTime = 0;
    this._poisonTimer = 0;
    this._openChestPos = null;
    this.aiController = new MCAIController({
      skillSlots: ['mc_mine_001'],
      autoMode: 'semi',
    });

    // Touch controller
    this.touchController = null;

    // Weather system
    this.weatherManager = null;
    this._slimeSpawnTimer = 0;

    // Combat system expansion
    this.hostiles = [];
    this.dropItems = [];
    this._hostileSpawnTimer = 0;
    // Block/dodge
    this.blocking = false;
    this._dodgeTimer = 0;
    this._dodgeCooldownTimer = 0;
    this._dodgeDirection = [0, 0, 0];
    this._dodgeStartPos = [0, 0, 0];
    this._dodgeDuration = 0.3;
    this._dodgeDistance = 2.0;
    // Bow
    this._bowCharging = false;
    this._bowChargeTime = 0;
    this._arrows = [];
    // Footstep SFX timer
    this._footstepTimer = 0;

    // Auto-mine repeat timer (for held left-click)
    this._autoMineTimer = 0;

    // Diagnostics (F3 toggle)
    this.diagnostics = new Diagnostics(this);
  }

  init() {
    const canvas = document.getElementById('game-canvas');

    this.world = new World({ useChunks: true });
    this.skinManager = new SkinManager();

    const saved = this.loadWorld();
    if (saved) {
      this.world.generate(saved.seed);
    } else {
      this.world.generate(42);
    }

    this.renderer = new Renderer();
    this.renderer.init(canvas);

    this.input = new Input();
    this.input.init(canvas);

    this.player = new Player(this.world);

    if (saved) {
      this._applySaveData(saved);
    }
    // Regenerate as swamp if on level_006
    this._ensureSwampWorld();
    this.hud = new HUD();
    this.hud.init();

    // Listen for hotbar touch selection from HUD
    document.addEventListener('hotbar-touch-select', (e) => {
      const blockType = e.detail.type;
      if (blockType >= 1 && blockType <= 8) {
        this.input.selectedBlock = blockType;
      }
    });

    // Setup typing display connection
    const typingBufferEl = document.getElementById('typing-buffer');
    if (typingBufferEl) this.input.setTypingDisplay(typingBufferEl);

    // Touch controller (mobile)
    if (TouchController.detectTouchDevice()) {
      this.touchController = new TouchController(this.input);
      this.touchController.init();
      this.touchController.show();
	      // Lock to landscape on mobile (Promise-based API，需 .catch 否则触发 unhandledrejection)
	      screen.orientation?.lock?.('landscape')?.catch(() => {});
      this.hud.setTouchMode(true);
    }

    // Steve model with body proportions from default role
    const defaultRole = getRole('steve');
    this.steveModel = new SteveModel(defaultRole.proportions);
    this.steveModel.setVisible(false);
    this.renderer.scene.add(this.steveModel.group);
    // Enable shadows on Steve model
    this.renderer.enableShadowsOnGroup(this.steveModel.group);

    // Apply role and default skin
    this.skinManager.applyRole('steve');
    this.skinManager.applySkin(this.steveModel, 'steve');

    // Character preview (for start/pause screen) with body proportions
    this.characterPreview = new CharacterPreview(this.skinManager, defaultRole.proportions);
    this.characterPreview.init(document.getElementById('character-preview-container'));
    this.characterPreview.show();

    // Initialize inventory with starter items
    this._initInventory();

    // Initialize audio
    this.audioManager.init();

    // Initialize weather system
    this.weatherManager = new WeatherManager();
    this.weatherManager.init(this.renderer.scene);

    // Camera controller
    this.cameraCtrl = new CameraController(this.renderer.camera, this.renderer.scene);

    // Auto-equip first weapon from inventory
    const weaponIds = this.inventory.getWeaponIds();
    if (weaponIds.length > 0) {
      this.currentWeaponId = weaponIds[0];
      this.steveModel.switchWeapon(this.currentWeaponId);
      this.cameraCtrl.setFirstPersonWeapon(this.currentWeaponId);
    }

    // Initialize skill/level/AI system
    this._initSkillSystem();

    // Spawn passive animals
    this._spawnAnimals();

    // Spawn slimes
    const slimeCount = 4;
    let slimeAttempts = 0;
    while (this.slimes.length < slimeCount && slimeAttempts < 100) {
      slimeAttempts++;
      const x = 5 + Math.random() * (64 - 10);
      const z = 5 + Math.random() * (64 - 10);
      const bx = Math.floor(x), bz = Math.floor(z);
      let groundY = -1;
      for (let y = 31; y >= 0; y--) {
        const block = this.world.getBlock(bx, y, bz);
        if (block !== BLOCK.AIR && block !== BLOCK.WATER) {
          groundY = y + 1;
          break;
        }
      }
      if (groundY > 0) {
        const isLarge = Math.random() < 0.3;
        const slime = new Slime(this.world, [x, groundY, z], isLarge);
        this._setupSlimeDeathHandler(slime);
        this.slimes.push(slime);
        this.renderer.scene.add(slime.group);
      }
    }

    const spawnPos = this.world.findSpawnPosition();
    this.player.position = [...spawnPos];

    // Set camera position before building meshes (for correct LOD calculation)
    this.renderer.camera.position.set(spawnPos[0], spawnPos[1], spawnPos[2]);

    this.renderer.buildMeshes(this.world);

    // Enable shadows on all entity groups (animals, slimes, etc.)
    const entityGroups = [this.steveModel.group];
    for (const animal of this.animals) entityGroups.push(animal.group);
    for (const slime of this.slimes) entityGroups.push(slime.group);
    for (const g of entityGroups) this.renderer.enableShadowsOnGroup(g);

    this._setupStartScreen(canvas);
  }

  _initInventory() {
    // Starting gear: basic tools, weapons, armor
    this.inventory.addItem(ITEM.SWORD_WOOD, 1);
    this.inventory.addItem(ITEM.SWORD_STONE, 1);
    this.inventory.addItem(ITEM.SWORD_DIAMOND, 1);
    this.inventory.addItem(ITEM.BOW, 1);
    this.inventory.addItem(ITEM.ARROW, 16);
    this.inventory.addItem(ITEM.WOOD, 8);
    this.inventory.addItem(ITEM.PLANK, 8);
    this.inventory.addItem(ITEM.DIRT, 4);
    this.inventory.addItem(ITEM.IRON_INGOT, 16);
    // Add armor set
    this.inventory.addItem(ITEM.IRON_HELMET, 1);
    this.inventory.addItem(ITEM.IRON_CHESTPLATE, 1);
    this.inventory.addItem(ITEM.IRON_LEGGINGS, 1);
    this.inventory.addItem(ITEM.IRON_BOOTS, 1);
    // Auto-equip armor
    this.inventory.equipArmor(ITEM.IRON_HELMET);
    this.inventory.equipArmor(ITEM.IRON_CHESTPLATE);
    this.inventory.equipArmor(ITEM.IRON_LEGGINGS);
    this.inventory.equipArmor(ITEM.IRON_BOOTS);
  }

  _initSkillSystem() {
    // Assign unlocked skills to AI controller slots
    this.aiController.skillSlots = [];
    for (let i = 0; i < this.unlockedSkillIds.length && i < 6; i++) {
      this.aiController.assignSkill(i, this.unlockedSkillIds[i]);
    }
    if (this.unlockedSkillIds.length > 0) {
      this.currentSkillIndex = 0;
    }
  }

  _spawnAnimals() {
    for (const animal of this.animals) {
      this.renderer.scene.remove(animal.group);
    }
    this.animals = [];

    const animalConfigs = [
      { cls: Pig, count: 3 },
      { cls: Cow, count: 2 },
      { cls: Sheep, count: 2 },
      { cls: Chicken, count: 4 },
    ];
    for (const cfg of animalConfigs) {
      const animals = PassiveAnimal.spawnAnimals(this.world, cfg.cls, cfg.count);
      for (const animal of animals) {
        this.animals.push(animal);
        this.renderer.scene.add(animal.group);
      }
    }
  }

  _setupStartScreen(canvas) {
    const startBtn = document.getElementById('start-btn');
    const overlay = document.getElementById('overlay');
    const hudEl = document.getElementById('hud');

    startBtn.addEventListener('click', () => {
      try {
        // Ensure pause screen is hidden and start screen is visible
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');

        // Request fullscreen on mobile
        if (TouchController.detectTouchDevice()) {
          document.documentElement.requestFullscreen().catch(() => {});
        }

        overlay.style.display = 'none';
        this.input.requestLock();
        hudEl.classList.remove('hidden');
        this.hud.showHelp();
        // Resume audio context (browser autoplay policy)
        if (this.audioManager.ctx && this.audioManager.ctx.state === 'suspended') {
          this.audioManager.ctx.resume();
        }
        this._setupInventoryUI();
        this.running = true;
        this.lastTime = performance.now();
        this.characterPreview.hide();
        this.characterPreview.switchToGameDriven();
        requestAnimationFrame((t) => this.gameLoop(t));
      } catch (err) {
        console.error('Start failed:', err);
        alert('启动失败: ' + err.message + '\n\n请查看控制台 (F12) 获取详细信息');
      }
    });

    // Volume controls
    document.getElementById('bgm-volume').addEventListener('input', (e) => {
      this.audioManager.setBGMVolume(parseFloat(e.target.value));
    });
    document.getElementById('sfx-volume').addEventListener('input', (e) => {
      this.audioManager.setSFXVolume(parseFloat(e.target.value));
    });

    // Pause screen volume controls
    document.getElementById('pause-bgm-volume').addEventListener('input', (e) => {
      this.audioManager.setBGMVolume(parseFloat(e.target.value));
    });
    document.getElementById('pause-sfx-volume').addEventListener('input', (e) => {
      this.audioManager.setSFXVolume(parseFloat(e.target.value));
    });

    // Continue button (pause screen)
    document.getElementById('continue-btn').addEventListener('click', () => {
      this._resumeGame();
    });

    // Pause reset button
    document.getElementById('pause-reset-btn').addEventListener('click', () => {
      this.resetToSpawn();
    });

    // Chest close button
    const chestCloseBtn = document.getElementById('chest-close-btn');
    if (chestCloseBtn) {
      chestCloseBtn.addEventListener('click', () => {
        this._closeChest();
      });
    }

    // Inventory close button
    const invCloseBtn = document.getElementById('inventory-close-btn');
    if (invCloseBtn) {
      invCloseBtn.addEventListener('click', () => {
        this._toggleInventory();
      });
    }

    // Recipe panel toggle
    const recipeToggle = document.getElementById('recipe-panel-toggle');
    if (recipeToggle) {
      recipeToggle.addEventListener('click', () => {
        recipeToggle.classList.toggle('open');
        document.getElementById('recipe-panel-content').classList.toggle('open');
        if (recipeToggle.classList.contains('open')) {
          this._updateRecipePanel();
        }
      });
    }

    // Level select button (in pause screen)
    document.getElementById('pause-level-select-btn').addEventListener('click', () => {
      this.showLevelSelect(false);
    });

    // Level select back button
    document.getElementById('level-select-back-btn').addEventListener('click', () => {
      this._hideLevelSelect();
    });

    // Level completion notification buttons
    document.getElementById('level-complete-select-btn').addEventListener('click', () => {
      this._hideLevelCompleteNotification();
      this.showLevelSelect(true);
    });
    document.getElementById('level-complete-close-btn').addEventListener('click', () => {
      this._hideLevelCompleteNotification();
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
    });

    canvas.addEventListener('click', () => {
      if (!this.input.locked && this.running) {
        this.input.requestLock();
        if (overlay.style.display === 'none') {
          this.characterPreview.hide();
        }
      }
    });

    window.addEventListener('beforeunload', () => {
      this.saveWorld();
    });
  }

  _setupInventoryUI() {
    const overlay = document.getElementById('inventory-overlay');
    const storageGrid = document.getElementById('storage-grid');
    const hotbarRow = document.getElementById('inventory-hotbar');
    const craftSlots = document.querySelectorAll('#crafting-grid .craft-slot');
    const resultSlot = document.getElementById('craft-result-slot');

    // Build storage slots (36)
    storageGrid.innerHTML = '';
    for (let i = 0; i < 36; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.dataset.index = i;
      slot.dataset.type = 'storage';
      slot.addEventListener('click', () => this._onInvSlotClick('storage', i));
      storageGrid.appendChild(slot);
    }

    // Build hotbar row (8)
    hotbarRow.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.dataset.index = i;
      slot.dataset.type = 'hotbar';
      if (i === this.inventory.selectedSlot) slot.classList.add('selected');
      slot.addEventListener('click', () => this._onInvSlotClick('hotbar', i));
      hotbarRow.appendChild(slot);
    }

    // Armor slots
    this._setupArmorSlots();

    // Crafting slots
    this._craftGrid = [null, null, null, null];
    craftSlots.forEach((el, i) => {
      el.addEventListener('click', () => {
        const existing = this._craftGrid[i];
        if (existing) {
          // Try to add 1 more of the same type from inventory
          if (this.inventory.hasItem(existing.type, 1)) {
            existing.count += 1;
            this.inventory.removeItem(existing.type, 1);
          } else {
            // No more of this type — return whole stack to inventory
            this.inventory.addItem(existing.type, existing.count);
            this._craftGrid[i] = null;
          }
        } else {
          // Take from selected hotbar slot
          const selected = this.inventory.getSelectedItem();
          if (selected) {
            this._craftGrid[i] = { type: selected.type, count: 1 };
            this.inventory.removeItem(selected.type, 1);
          }
        }
        this._updateCraftResult();
        this._updateInventoryUI();
        this._updateCraftSlots();
      });
    });

    // Craft result click
    resultSlot.addEventListener('click', () => {
      const result = getCraftResult(this._craftGrid);
      if (result) {
        // Check if item can be added to inventory
        if (this.inventory.addItem(result.type, result.count)) {
          consumeCraftInput(this._craftGrid);
          this._updateCraftResult();
          this._updateInventoryUI();
          this._updateCraftSlots();
          this.audioManager.playSFX('craft');
        } else {
          // Inventory full — brief visual feedback
          resultSlot.style.borderColor = '#FF4444';
          setTimeout(() => { resultSlot.style.borderColor = '#FFD700'; }, 300);
        }
      }
    });

    // Initialize drag-and-drop from inventory slots to crafting grid
    this._setupDragAndDrop();

    // Touch-based inventory interaction (mobile) — tap to pick up, tap to place
    this._touchDragState = null;

    const onInvTouch = (e) => {
      if (!TouchController.detectTouchDevice()) return;
      e.preventDefault(); // suppress click handler on mobile

      const touch = e.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const slot = target ? target.closest('.inv-slot') : null;
      if (!slot) return;

      const type = slot.dataset.type;
      const index = parseInt(slot.dataset.index);
      const srcArray = type === 'storage' ? this.inventory.storage : this.inventory.hotbar;
      const item = srcArray[index];

      if (!this._touchDragState) {
        // Pick up item
        if (!item) return;
        this._touchDragState = { type, index };
        slot.classList.add('touch-selected');
      } else if (this._touchDragState.type === type && this._touchDragState.index === index) {
        // Tap same slot — deselect
        slot.classList.remove('touch-selected');
        this._touchDragState = null;
      } else {
        // Place / swap items
        const dstArray = type === 'storage' ? this.inventory.storage : this.inventory.hotbar;
        const srcType = this._touchDragState.type;
        const srcIdx = this._touchDragState.index;
        const srcArray2 = srcType === 'storage' ? this.inventory.storage : this.inventory.hotbar;

        const temp = dstArray[index];
        dstArray[index] = srcArray2[srcIdx];
        srcArray2[srcIdx] = temp;

        // Update selected block if swapping into/out of hotbar
        if (type === 'hotbar' && dstArray[index]) {
          const it = dstArray[index];
          if (it.type >= 1 && it.type <= MAX_BLOCK_TYPE) this.input.selectedBlock = it.type;
        }
        if (srcType === 'hotbar' && srcArray2[srcIdx]) {
          const it = srcArray2[srcIdx];
          if (it && it.type >= 1 && it.type <= MAX_BLOCK_TYPE) this.input.selectedBlock = it.type;
        }

        // Clear selection
        document.querySelectorAll('.inv-slot.touch-selected').forEach(el => el.classList.remove('touch-selected'));
        this._touchDragState = null;
        this._updateInventoryUI();
      }
    };

    storageGrid.addEventListener('touchstart', onInvTouch, { passive: false });
    hotbarRow.addEventListener('touchstart', onInvTouch, { passive: false });
  }

  _updateInventoryUI() {
    // Update storage slots
    const storageSlots = document.querySelectorAll('#storage-grid .inv-slot');
    storageSlots.forEach((el, i) => {
      const item = this.inventory.storage[i];
      this._setSlotDisplay(el, item);
    });

    // Update armor slots in inventory
    this._updateArmorUI();

    // Update hotbar in inventory
    const invHotbarSlots = document.querySelectorAll('#inventory-hotbar .inv-slot');
    invHotbarSlots.forEach((el, i) => {
      const item = this.inventory.hotbar[i];
      this._setSlotDisplay(el, item);
      el.classList.toggle('selected', i === this.inventory.selectedSlot);
    });
  }

  _setSlotDisplay(el, item) {
    el.innerHTML = '';
    if (!item) return;
    const preview = document.createElement('div');
    preview.className = 'item-preview';
    // Determine CSS class from item type
    const typeName = this._getItemClassName(item.type);
    preview.classList.add(typeName);
    el.appendChild(preview);
    if (item.count > 1) {
      const count = document.createElement('span');
      count.className = 'item-count';
      count.textContent = item.count;
      el.appendChild(count);
    }
  }

  _getItemClassName(type) {
    const map = {
      // Original blocks (1-12)
      [ITEM.GRASS]: 'grass',
      [ITEM.DIRT]: 'dirt',
      [ITEM.STONE]: 'stone',
      [ITEM.WOOD]: 'wood',
      [ITEM.BRICK]: 'brick',
      [ITEM.WATER]: 'water',
      [ITEM.LEAVES]: 'leaves',
      [ITEM.FLOWER]: 'flower',
      [ITEM.MUD]: 'mud',
      [ITEM.CLAY]: 'clay',
      [ITEM.LILY_PAD]: 'lily_pad',
      [ITEM.REED]: 'reed',
      // Ores (13-18)
      [ITEM.COAL]: 'coal',
      [ITEM.IRON_ORE_ITEM]: 'iron_ore',
      [ITEM.GOLD_ORE_ITEM]: 'gold_ore',
      [ITEM.DIAMOND_ORE_ITEM]: 'diamond_ore',
      [ITEM.REDSTONE_ORE_ITEM]: 'redstone_ore',
      [ITEM.LAPIS_ORE_ITEM]: 'lapis_ore',
      // New terrain blocks (19-22)
      [ITEM.SAND_ITEM]: 'sand_item',
      [ITEM.GRAVEL_ITEM]: 'gravel_item',
      [ITEM.SNOW_ITEM]: 'snow_item',
      [ITEM.CACTUS_ITEM]: 'cactus_item',
      // Crafted items
      [ITEM.PLANK]: 'plank',
      [ITEM.STICK]: 'stick',
      // Weapons
      [ITEM.SWORD_WOOD]: 'sword_wood',
      [ITEM.SWORD_STONE]: 'sword_stone',
      [ITEM.SWORD_IRON]: 'sword_iron',
      [ITEM.SWORD_DIAMOND]: 'sword_diamond',
      [ITEM.SWORD_NETHERITE]: 'sword_netherite',
      [ITEM.DIAMOND]: 'diamond',
      [ITEM.DIAMOND_CHESTPLATE]: 'diamond_chestplate',
      [ITEM.IRON_INGOT]: 'iron_ingot',
      [ITEM.NETHERITE_SCRAP]: 'netherite_scrap',
      [ITEM.SWORD_FROSTMOURNE]: 'sword_frostmourne',
      [ITEM.SWORD_DRAGON]: 'sword_dragon',
      [ITEM.SLIME_BALL]: 'slime_ball',
      // Tools (114-125)
      [ITEM.PICKAXE_WOOD]: 'pickaxe_wood',
      [ITEM.PICKAXE_STONE]: 'pickaxe_stone',
      [ITEM.PICKAXE_IRON]: 'pickaxe_iron',
      [ITEM.PICKAXE_DIAMOND]: 'pickaxe_diamond',
      [ITEM.AXE_WOOD]: 'axe_wood',
      [ITEM.AXE_STONE]: 'axe_stone',
      [ITEM.AXE_IRON]: 'axe_iron',
      [ITEM.AXE_DIAMOND]: 'axe_diamond',
      [ITEM.SHOVEL_WOOD]: 'shovel_wood',
      [ITEM.SHOVEL_STONE]: 'shovel_stone',
      [ITEM.SHOVEL_IRON]: 'shovel_iron',
      [ITEM.SHOVEL_DIAMOND]: 'shovel_diamond',
      [ITEM.BOW]: 'bow',
      [ITEM.ARROW]: 'arrow',
      [ITEM.LEATHER_HELMET]: 'leather_helmet', [ITEM.IRON_HELMET]: 'iron_helmet', [ITEM.DIAMOND_HELMET]: 'diamond_helmet', [ITEM.NETHERITE_HELMET]: 'netherite_helmet',
      [ITEM.LEATHER_CHESTPLATE]: 'leather_chestplate', [ITEM.IRON_CHESTPLATE]: 'iron_chestplate', [ITEM.DIAMOND_CHESTPLATE_NEW]: 'diamond_chestplate_new', [ITEM.NETHERITE_CHESTPLATE]: 'netherite_chestplate',
      [ITEM.LEATHER_LEGGINGS]: 'leather_leggings', [ITEM.IRON_LEGGINGS]: 'iron_leggings', [ITEM.DIAMOND_LEGGINGS]: 'diamond_leggings', [ITEM.NETHERITE_LEGGINGS]: 'netherite_leggings',
      [ITEM.LEATHER_BOOTS]: 'leather_boots', [ITEM.IRON_BOOTS]: 'iron_boots', [ITEM.DIAMOND_BOOTS]: 'diamond_boots', [ITEM.NETHERITE_BOOTS]: 'netherite_boots',
    };
    return map[type] || 'grass';
  }

  _updateCraftResult() {
    const resultSlot = document.getElementById('craft-result-slot');
    const result = getCraftResult(this._craftGrid);
    resultSlot.innerHTML = '';
    if (result) {
      const preview = document.createElement('div');
      preview.className = 'item-preview';
      preview.classList.add(this._getItemClassName(result.type));
      resultSlot.appendChild(preview);
      if (result.count > 1) {
        const count = document.createElement('span');
        count.className = 'item-count';
        count.textContent = result.count;
        resultSlot.appendChild(count);
      }
    }
  }

  _updateCraftSlots() {
    const craftSlots = document.querySelectorAll('#crafting-grid .craft-slot');
    craftSlots.forEach((el, i) => {
      this._setSlotDisplay(el, this._craftGrid[i] || null);
    });
  }

  setUIState(newState) {
    const prevState = this.uiState;
    this.uiState = newState;
    if (newState !== 'gameplay' && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  _showPause() {
    this.setUIState('pause');
    const overlay = document.getElementById('overlay');
    const startScreen = document.getElementById('start-screen');
    const pauseScreen = document.getElementById('pause-screen');
    if (!overlay || !startScreen || !pauseScreen) return;
    overlay.style.display = 'grid';
    startScreen.classList.add('hidden');
    pauseScreen.classList.remove('hidden');
    const levelSelectScreen = document.getElementById('level-select-screen');
    if (levelSelectScreen) levelSelectScreen.classList.add('hidden');
    this._buildRoleCards();
    document.getElementById('current-role-name').textContent = getRole(this.currentRoleId)?.name || 'Steve';
    const pauseContainer = document.getElementById('pause-preview-container');
    if (pauseContainer) {
      this.characterPreview.setContainer(pauseContainer);
    }
    this.characterPreview.show();

    // Hide touch controls when paused
    if (this.touchController) this.touchController.hide();
  }

  _toggleInventory() {
    if (this.uiState === 'inventory') {
      // Close inventory
      this.setUIState('gameplay');
      document.getElementById('inventory-overlay').classList.add('hidden');
      // Show touch controls on mobile when closing inventory
      if (this.touchController && TouchController.detectTouchDevice()) {
        this.touchController.show();
      }
      // Clean up any active drag state
      this._destroyDragGhost();
      this._dragState = null;
      this._dragCompleted = false;
      // Return crafting items to inventory
      for (let i = 0; i < 4; i++) {
        if (this._craftGrid[i]) {
          this.inventory.addItem(this._craftGrid[i].type, this._craftGrid[i].count);
          this._craftGrid[i] = null;
        }
      }
      this._updateCraftResult();
      this._updateCraftSlots();
    } else if (this.uiState === 'gameplay') {
      // Open inventory
      this.setUIState('inventory');
      document.getElementById('inventory-overlay').classList.remove('hidden');
      // Hide touch controls when inventory is open
      if (this.touchController) this.touchController.hide();
      this._updateInventoryUI();
      this._updateCraftSlots();
    }
  }

  _updateRecipePanel() {
    const container = document.getElementById('recipe-panel-content');
    if (!container) return;
    container.innerHTML = '';
    for (const recipe of RECIPES) {
      const entry = document.createElement('div');
      entry.className = 'recipe-entry';
      // Build input names
      const inputNames = recipe.inputs.map(inp => {
        const name = ITEM_NAMES[inp.type] || ('#' + inp.type);
        return inp.count > 1 ? `${name}×${inp.count}` : name;
      }).join(' + ');
      const outputName = ITEM_NAMES[recipe.output.type] || ('#' + recipe.output.type);
      const outputCount = recipe.output.count > 1 ? `${outputName}×${recipe.output.count}` : outputName;
      entry.innerHTML = `<span class="recipe-inputs">${inputNames}</span><span class="recipe-arrow-icon">→</span><span class="recipe-output">${outputCount}</span>`;
      container.appendChild(entry);
    }
  }

  _setupArmorSlots() {
    const armorSlotsContainer = document.getElementById('armor-slots');
    if (!armorSlotsContainer) return;
    const slots = armorSlotsContainer.querySelectorAll('.armor-slot');
    slots.forEach(el => {
      el.addEventListener('click', () => {
        const slot = el.dataset.armorSlot;
        // If slot has item, unequip it
        if (this.inventory.armorSlots[slot]) {
          this.inventory.unequipArmor(slot);
        } else {
          // Try to equip selected hotbar item
          const selected = this.inventory.getSelectedItem();
          if (selected && this.inventory.isArmor(selected.type)) {
            this.inventory.equipArmor(selected.type, 1);
          }
        }
        this._updateArmorUI();
        this._updateInventoryUI();
      });
    });
  }

  _updateArmorUI() {
    const armorDefenseEl = document.getElementById('armor-defense-value');
    if (armorDefenseEl) {
      armorDefenseEl.textContent = this.inventory.getArmorDefense();
    }
    const slots = document.querySelectorAll('.armor-slot');
    slots.forEach(el => {
      const slot = el.dataset.armorSlot;
      const item = this.inventory.armorSlots[slot];
      el.innerHTML = '';
      if (item) {
        el.classList.add('has-item');
        const preview = document.createElement('div');
        preview.className = 'item-preview';
        preview.classList.add(this._getItemClassName(item.type));
        el.appendChild(preview);
      } else {
        el.classList.remove('has-item');
        // Show slot label
        const labels = { head: '头', chest: '胸', legs: '腿', feet: '脚' };
        el.textContent = labels[slot] || slot;
      }
    });
  }

  _onInvSlotClick(type, index) {
    // Suppress click handler if a drag-and-drop just completed (browser may fire click after mouseup)
    if (this._dragCompleted) {
      this._dragCompleted = false;
      return;
    }
    if (type === 'hotbar') {
      this.inventory.selectedSlot = index;
      const item = this.inventory.hotbar[index];
      if (item && item.type >= 1 && item.type <= MAX_BLOCK_TYPE) {
        this.input.selectedBlock = item.type;
      }
      this._updateInventoryUI();
    } else if (type === 'storage') {
      // Click storage item to move to hotbar
      const item = this.inventory.storage[index];
      if (item) {
        // Find first empty hotbar slot or swap
        const emptySlot = this.inventory.hotbar.indexOf(null);
        if (emptySlot !== -1) {
          this.inventory.hotbar[emptySlot] = item;
          this.inventory.storage[index] = null;
        } else {
          // Swap with selected hotbar slot
          const temp = this.inventory.hotbar[this.inventory.selectedSlot];
          this.inventory.hotbar[this.inventory.selectedSlot] = item;
          this.inventory.storage[index] = temp;
          // Update selected block if the swapped item is a block
          if (item.type >= 1 && item.type <= MAX_BLOCK_TYPE) {
            this.input.selectedBlock = item.type;
          } else if (temp && temp.type >= 1 && temp.type <= MAX_BLOCK_TYPE) {
            this.input.selectedBlock = temp.type;
          }
        }
        this._updateInventoryUI();
      }
    }
  }

  // ===== Drag-and-Drop: Inventory to Crafting Grid =====

  _setupDragAndDrop() {
    this._dragState = null;   // { sourceType, sourceIndex, item, startX, startY, isDragging }
    this._dragGhost = null;   // ghost DOM element
    this._dragCompleted = false; // flag to suppress click after drag

    const storageGrid = document.getElementById('storage-grid');
    const hotbarRow = document.getElementById('inventory-hotbar');

    if (!storageGrid || !hotbarRow) return;

    // Start drag from storage slots
    storageGrid.addEventListener('mousedown', (e) => {
      const slot = e.target.closest('.inv-slot');
      if (!slot) return;
      const index = parseInt(slot.dataset.index);
      this._onDragStart(e, 'storage', index);
    });

    // Start drag from hotbar slots
    hotbarRow.addEventListener('mousedown', (e) => {
      const slot = e.target.closest('.inv-slot');
      if (!slot) return;
      const index = parseInt(slot.dataset.index);
      this._onDragStart(e, 'hotbar', index);
    });

    // Move ghost element and end drag on document
    document.addEventListener('mousemove', (e) => {
      if (!this._dragState) return;

      const dx = e.clientX - this._dragState.startX;
      const dy = e.clientY - this._dragState.startY;

      if (!this._dragState.isDragging && Math.sqrt(dx * dx + dy * dy) > 5) {
        // Threshold exceeded — start dragging
        this._dragState.isDragging = true;
        this._createDragGhost(this._dragState.item);
      }

      if (this._dragState.isDragging && this._dragGhost) {
        this._dragGhost.style.left = (e.clientX - 20) + 'px';
        this._dragGhost.style.top = (e.clientY - 20) + 'px';
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (!this._dragState) return;

      if (this._dragState.isDragging) {
        // Check if dropped on a crafting grid slot
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const craftSlot = target ? target.closest('.craft-slot') : null;

        if (craftSlot) {
          const craftIndex = parseInt(craftSlot.dataset.index);
          if (!isNaN(craftIndex) && craftIndex >= 0 && craftIndex < 4) {
            this._dragToCraftSlot(craftIndex);
          }
        }
        // If not over a crafting slot, cancel — item stays in original slot

        this._destroyDragGhost();
        this._dragCompleted = true;
      }

      this._dragState = null;
    });
  }

  _onDragStart(e, sourceType, sourceIndex) {
    const item = sourceType === 'storage'
      ? this.inventory.storage[sourceIndex]
      : this.inventory.hotbar[sourceIndex];
    if (!item) return;

    this._dragState = {
      sourceType,
      sourceIndex,
      item: { type: item.type, count: item.count },
      startX: e.clientX,
      startY: e.clientY,
      isDragging: false,
    };
  }

  _createDragGhost(item) {
    if (this._dragGhost) this._destroyDragGhost();

    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';

    const preview = document.createElement('div');
    preview.className = 'item-preview';
    preview.classList.add(this._getItemClassName(item.type));
    ghost.appendChild(preview);

    if (item.count > 1) {
      const countSpan = document.createElement('span');
      countSpan.className = 'item-count';
      countSpan.textContent = item.count;
      ghost.appendChild(countSpan);
    }

    document.body.appendChild(ghost);
    this._dragGhost = ghost;
  }

  _destroyDragGhost() {
    if (this._dragGhost) {
      this._dragGhost.remove();
      this._dragGhost = null;
    }
  }

  _dragToCraftSlot(craftIndex) {
    if (!this._dragState) return;

    const { sourceType, sourceIndex, item } = this._dragState;
    const sourceArray = sourceType === 'storage' ? this.inventory.storage : this.inventory.hotbar;
    const currentItem = sourceArray[sourceIndex];

    // Sanity check — source slot must still have the item
    if (!currentItem || currentItem.type !== item.type) return;

    const existing = this._craftGrid[craftIndex];
    if (existing) {
      if (existing.type === item.type) {
        // Same type — stack: place 1 more onto existing
        existing.count += 1;
        if (currentItem.count > 1) {
          currentItem.count -= 1;
        } else {
          sourceArray[sourceIndex] = null;
        }
      } else {
        // Different type — swap: return existing, place new
        this.inventory.addItem(existing.type, existing.count);
        if (currentItem.count > 1) {
          currentItem.count -= 1;
        } else {
          sourceArray[sourceIndex] = null;
        }
        this._craftGrid[craftIndex] = { type: item.type, count: 1 };
      }
    } else {
      // Empty slot — place 1 item
      if (currentItem.count > 1) {
        currentItem.count -= 1;
      } else {
        sourceArray[sourceIndex] = null;
      }
      this._craftGrid[craftIndex] = { type: item.type, count: 1 };
    }

    this._updateCraftResult();
    this._updateInventoryUI();
    this._updateCraftSlots();
  }

  _cycleWeapon() {
    const weaponIds = this.inventory.getWeaponIds();
    if (weaponIds.length === 0) {
      this.currentWeaponId = null;
      this.steveModel.switchWeapon(null);
      return;
    }
    const currentIdx = this.currentWeaponId ? weaponIds.indexOf(this.currentWeaponId) : -1;
    const nextIdx = (currentIdx + 1) % weaponIds.length;
    this.currentWeaponId = weaponIds[nextIdx];
    this.steveModel.switchWeapon(this.currentWeaponId);
  }

  gameLoop(time) {
    this.diagnostics.beginFrame();
    try {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      // FPS counter
      this.frameCount++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 1) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.fpsTimer = 0;
      }

      this.update(dt);
      this.render();
    } catch (err) {
      console.error('Game loop error:', err);
      // Show error on screen immediately
      this._showError(err);
      // Record in diagnostics for F3 panel
      if (this.diagnostics) this.diagnostics.recordError(err);
      // Continue the loop — stopping silently causes "freeze" perception
    }
    this.diagnostics.endFrame();

    if (this.running) {
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  _showError(err) {
    const el = document.getElementById('error-overlay');
    if (el) {
      el.style.display = 'block';
      el.textContent = '[' + new Date().toLocaleTimeString() + '] ' + (err.message || String(err)) + '\n' + (err.stack ? err.stack.split('\n').slice(0, 4).join('\n') : '');
    }
  }

  update(dt) {
    // Update input
    this.input.update();

    // Update touch controller
    if (this.touchController) {
      this.touchController.update();
    }

    // Handle typing submit (before escape so typing mode can submit)
    if (this.input.consumeAction('_typingSubmit')) {
      const buffer = this.input.consumeTypingSubmit();
      if (buffer) {
        if (buffer.startsWith('/')) {
          this._executeCommand(buffer);
        } else {
          console.log('Chat:', buffer);
        }
      }
    }

    // Handle H - help panel toggle
    if (this.input.consumeAction('help')) {
      this.hud.toggleHelp();
    }

    // Handle F3 - diagnostics toggle
    if (this.input.consumeAction('diagnostics')) {
      this.diagnostics.toggle();
    }

    // Handle ESC key based on current UI state
    if (this.input.consumeAction('escape')) {
      switch (this.uiState) {
        case 'gameplay':
          this._showPause();
          break;
        case 'inventory':
          this._toggleInventory();
          break;
        case 'notification':
          this._hideLevelCompleteNotification();
          this.setUIState('gameplay');
          break;
        case 'levelSelect':
          this._hideLevelSelect();
          break;
        case 'chest':
          this._closeChest();
          break;
        case 'pause':
          this._resumeGame();
          break;
      }
    }

    // Handle camera toggle (F5)
    if (this.input.consumeAction('toggleCamera')) {
      this.cameraCtrl.cycleMode();
    }

    // Sync god mode flag to input module
    this.input.godMode = this.cameraCtrl.isGodMode();

    // Handle god camera scroll (height adjustment)
    const godHeightDelta = this.input.consumeGodHeightDelta();
    if (godHeightDelta !== 0) {
      this.cameraCtrl.adjustGodHeight(godHeightDelta);
    }

    // Handle god camera mouse pitch
    if (this.cameraCtrl.isGodMode()) {
      const godPitchDelta = this.input.consumeGodPitchDelta();
      if (godPitchDelta !== 0) {
        this.cameraCtrl.adjustGodPitch(godPitchDelta);
      }
    }

    // Handle E — inventory toggle
    if (this.input.consumeAction('interact')) {
      this._toggleInventory();
    }

    // Skip game updates when inventory is open
    if (this.uiState !== 'gameplay') {
      if (this.uiState === 'inventory' && this.characterPreview && this.characterPreview.visible) {
        this.characterPreview.update(dt);
      }
      return;
    }

    // Sync inventory selectedSlot with digit key presses
    for (let i = 1; i <= 8; i++) {
      if (this.input.consumeAction('slot' + i)) {
        this.inventory.selectedSlot = i - 1;
        const item = this.inventory.hotbar[i - 1];
        if (item && item.type >= 1 && item.type <= MAX_BLOCK_TYPE) {
          this.input.selectedBlock = item.type;
        }
      }
    }

    // Handle reset (R) — return to spawn
    if (this.input.consumeAction('reset')) {
      this.resetToSpawn();
    }

    // Handle flight toggle (Tab)
    if (this.input.consumeAction('flight')) {
      this.player.toggleFlight();
    }

    // Handle cycle item (R)
    if (this.input.consumeAction('cycleItem')) {
      this._cycleBlockType();
    }

    // Handle block action (G key blocking)
    if (this.input.consumeAction('block')) {
      // Block action is handled via isKeyDown('KeyG') below
    }

    // Handle weapon switch (Q)
    if (this.input.consumeAction('weaponSwitch')) {
      this._cycleWeapon();
      this.cameraCtrl.setFirstPersonWeapon(this.currentWeaponId);
    }

    // Handle skill use (X) - only explore skills
    if (this.input.consumeAction('skillUseExplore')) {
      this._useCurrentSkill();
    }

    // Handle skill cycle (C) - only explore skills
    if (this.input.consumeAction('skillCycleExplore')) {
      this._cycleSkill();
    }

    // Handle day/night speed toggle (F6)
    if (this.input.consumeAction('daySpeed')) {
      this.daySpeedMultiplier = this.daySpeedMultiplier === 1 ? 10 : 1;
    }

    // Check if player is moving
    const isMoving = this.input.isKeyDown('KeyW') || this.input.isKeyDown('KeyS') ||
                     this.input.isKeyDown('KeyA') || this.input.isKeyDown('KeyD');

    // Update passive animals
    this.diagnostics.beginPhase('animals');
    for (const animal of this.animals) {
      animal.update(dt);
    }
    this.diagnostics.endPhase();

    // World flags for AI and slime tracking
    const isSwampLevel = this.currentLevel && this.currentLevel.id === 'level_006';
    this.world._currentLevelId = this.currentLevel ? this.currentLevel.id : null;
    this.world._playerPos = [...this.player.position];

    // Manage rain and swamp fog
    if (isSwampLevel) {
      if (!this.weatherManager.isRaining) {
        this.weatherManager.start();
        this.renderer.setSwampFog(true);
      }
      this.world._isRaining = true;
      this.world._rainSpeedBonus = 0.1;
    } else {
      if (this.weatherManager.isRaining) {
        this.weatherManager.stop();
        this.renderer.setSwampFog(false);
      }
      this.world._isRaining = false;
      this.world._rainSpeedBonus = 0;
    }

    // Update slimes
    this.diagnostics.beginPhase('slimes');
    for (const slime of this.slimes) {
      slime.update(dt, this.player.position);
    }
    this.diagnostics.endPhase();

    // Update hostile mobs
    this.diagnostics.beginPhase('hostiles');
    for (const mob of this.hostiles) {
      mob.update(dt, this.player.position, this.timeOfDay);
    }
    this.diagnostics.endPhase();

    // Hostile mob melee attack check
    this.diagnostics.phase('combat', () => {
    for (const mob of this.hostiles) {
      if (mob.dead) continue;
      if (!mob.canAttack()) continue;
      const dx = mob.position[0] - this.player.position[0];
      const dy = (mob.position[1] + mob.height * 0.5) - (this.player.position[1] + this.player.height * 0.5);
      const dz = mob.position[2] - this.player.position[2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < mob.attackRange + 0.3) {
        mob.resetAttackCooldown();
        let dmg = mob.getAttackDamage();
        // Apply block damage reduction
        if (this.blocking) {
          dmg = Math.max(1, Math.round(dmg * 0.5));
        }
        // Apply armor damage reduction
        dmg = Math.round(dmg * (1 - Math.min(this.inventory.getArmorDefense() / 30, 0.8)));
        this.player.takeDamage(dmg);
        this.audioManager.playSFX('damage');
        this._showDamageNumber(
          this.player.position[0], this.player.position[1] + 1.5, this.player.position[2],
          dmg, true
        );
      }
    }

    // Cave Spider poison on hit
    for (const mob of this.hostiles) {
      if (mob.dead || !(mob instanceof CaveSpider)) continue;
      if (!mob.canAttack()) continue;
      const dx = mob.position[0] - this.player.position[0];
      const dz = mob.position[2] - this.player.position[2];
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < mob.attackRange + 0.3) {
        mob.resetAttackCooldown();
        let dmg = mob.getAttackDamage();
        if (this.blocking) dmg = Math.max(1, Math.round(dmg * 0.5));
        dmg = Math.round(dmg * (1 - Math.min(this.inventory.getArmorDefense() / 30, 0.8)));
        this.player.takeDamage(dmg);
        this.audioManager.playSFX('damage');
        this._showDamageNumber(
          this.player.position[0], this.player.position[1] + 1.5, this.player.position[2],
          dmg, true
        );
        this._poisonTimer = 3.0;
      }
    }

    // Skeleton ranged attack check
    for (const mob of this.hostiles) {
      if (mob.dead || !(mob instanceof Skeleton)) continue;
      if (!mob.canAttack()) continue;
      const dx = mob.position[0] - this.player.position[0];
      const dz = mob.position[2] - this.player.position[2];
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < 15 && dist > 2) {
        mob.resetAttackCooldown();
        this._shootMobArrow(mob);
      }
    }

    // Creeper explosion check
    for (const mob of this.hostiles) {
      if (mob.dead || !(mob instanceof Creeper)) continue;
      if (mob._exploded) {
        // Apply explosion damage to player if within range
        const dx = mob.position[0] - this.player.position[0];
        const dz = mob.position[2] - this.player.position[2];
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < 3) {
          const dmg = Math.round(49 * (1 - dist / 3));
          this.player.takeDamage(dmg);
          this.audioManager.playSFX('explosion');
          this._showDamageNumber(
            this.player.position[0], this.player.position[1] + 1.5, this.player.position[2],
            dmg, true
          );
        }
      }
    }

    // Cave Spider poison effect
    if (this._poisonTimer > 0) {
      this._poisonTimer -= dt;
      if (Math.floor(this._poisonTimer * 4) !== Math.floor((this._poisonTimer + dt) * 4)) {
        this.player.takeDamage(1);
      }
    }

    // Slime contact damage
    const currentTime = performance.now() / 1000;
    for (const slime of this.slimes) {
      if (slime.dead) continue;
      let contactDmg = slime.checkContactDamage(this.player, currentTime);
      if (contactDmg !== null) {
        // Water combat modifier: large slimes in water deal +5% damage
        if (slime.isLarge && contactDmg > 0) {
          const slimeBx = Math.floor(slime.position[0]);
          const slimeBy = Math.floor(slime.position[1] + 0.1);
          const slimeBz = Math.floor(slime.position[2]);
          if (this.world.getBlock(slimeBx, slimeBy, slimeBz) === BLOCK.WATER) {
            contactDmg = Math.round(contactDmg * 1.05);
          }
        }
        const armorMult = this.inventory.hasDiamondArmor() ? 0.8 : 1.0;
        const actualDmg = Math.round(contactDmg * armorMult);
        this.player.takeDamage(actualDmg);
        this.audioManager.playSFX('damage');
        this._showDamageNumber(
          this.player.position[0], this.player.position[1] + 1.5, this.player.position[2],
          actualDmg, true
        );
      }
    }
    // Clean up dead entities
    this.slimes = this.slimes.filter(s => !s.dead);
    this.animals = this.animals.filter(a => !a.dead);

    }); // combat phase

    // Update weather particles
    this.weatherManager.update(dt, this.player.position);

    // Hostile mob spawn timer (every 8 seconds, cap 16)
    this._hostileSpawnTimer += dt;
    if (this._hostileSpawnTimer >= 8) {
      this._hostileSpawnTimer = 0;
      this._spawnHostiles();
    }

    // Update drop items
    for (const drop of this.dropItems) {
      drop.update(dt, this.player.position);
      // Auto-pickup
      if (drop.collected && !drop._pickedUp) {
        drop._pickedUp = true;
        this.inventory.addItem(drop.itemType, drop.count);
        this.audioManager.playSFX('pickup');
        this.audioManager.playSFX('place');
      }
    }
    this.dropItems = this.dropItems.filter(d => !d.collected);
    this.hostiles = this.hostiles.filter(m => !m.dead);

    // Update flying arrows
    this.diagnostics.beginPhase('arrows');
    for (const arrow of this._arrows) {
      if (arrow._done) continue;
      arrow.velocity[1] -= 9.8 * dt; // gravity
      arrow.position[0] += arrow.velocity[0] * dt;
      arrow.position[1] += arrow.velocity[1] * dt;
      arrow.position[2] += arrow.velocity[2] * dt;
      arrow.age += dt;
      // Orient arrow in velocity direction
      if (arrow.mesh) {
        arrow.mesh.position.set(arrow.position[0], arrow.position[1], arrow.position[2]);
        if (arrow.mesh.children[0]) {
          arrow.mesh.children[0].lookAt(
            arrow.position[0] + arrow.velocity[0],
            arrow.position[1] + arrow.velocity[1],
            arrow.position[2] + arrow.velocity[2]
          );
        }
      }
      // Check collision with blocks
      const bx = Math.floor(arrow.position[0]);
      const by = Math.floor(arrow.position[1] + 0.1);
      const bz = Math.floor(arrow.position[2]);
      if (this.world.inBounds(bx, by, bz) && this.world.getBlock(bx, by, bz) !== 0) {
        arrow._done = true;
        if (arrow.mesh && arrow.mesh.parent) arrow.mesh.parent.remove(arrow.mesh);
        continue;
      }
      // Check collision with mobs
      for (const mob of [...this.hostiles, ...this.animals, ...this.slimes]) {
        if (mob.dead) continue;
        const mx = mob.position[0], my = mob.position[1], mz = mob.position[2];
        const d = Math.sqrt((arrow.position[0]-mx)**2 + (arrow.position[1]-my-mob.height/2)**2 + (arrow.position[2]-mz)**2);
        if (d < mob.width + 0.2) {
          const dmg = arrow.damage || 5;
          mob.takeDamage(dmg);
          this._showDamageNumber(mob.position[0], mob.position[1] + mob.height/2, mob.position[2], dmg, false);
          if (mob.dead) this._handleHostileDeath(mob);
          arrow._done = true;
          if (arrow.mesh && arrow.mesh.parent) arrow.mesh.parent.remove(arrow.mesh);
          break;
        }
      }
      // Despawn after 5 seconds
      if (arrow.age > 5) {
        arrow._done = true;
        if (arrow.mesh && arrow.mesh.parent) arrow.mesh.parent.remove(arrow.mesh);
      }
    }
    this._arrows = this._arrows.filter(a => !a._done);

    this.diagnostics.endPhase(); // arrows

    // Slime spawn timer — every 10s in swamp, 1-2 slimes, max 8 total
    if (isSwampLevel) {
      this._slimeSpawnTimer += dt;
      if (this._slimeSpawnTimer >= 10) {
        this._slimeSpawnTimer = 0;
        const currentCount = this.slimes.filter(s => !s.dead).length;
        if (currentCount < 8) {
          const newSlimes = this._spawnSwampSlimes(2, currentCount);
          for (const s of newSlimes) {
            this.slimes.push(s);
            this.renderer.scene.add(s.group);
            if (this.renderer.enableShadowsOnGroup) this.renderer.enableShadowsOnGroup(s.group);
          }
        }
      }
    }

    // Update player pet (role companion)
    if (this.pet) {
      this.pet.update(dt, this.player.position, this.input.yaw);
    }

    // Apply blocking movement speed penalty
    if (this.blocking) {
      this.player.speedMultiplier = 0.7;
    } else {
      this.player.speedMultiplier = 1.0;
    }

    // Update player
    this.player.update(dt, this.input);

    // Death check: respawn if health reaches 0
    if (this.player.health <= 0) {
      this.resetToSpawn();
      this.player.health = this.player.maxHealth;
      this.player.healTimer = 0;
    }

    // Jump SFX detection
    if (this.player.velocity[1] > 5 && !this.player.isFlying) {
      if (!this._lastJumpSfx) {
        this.audioManager.playSFX('jump');
        this._lastJumpSfx = true;
      }
    } else {
      this._lastJumpSfx = false;
    }

    // Footstep SFX when walking on ground
    this._footstepTimer -= dt;
    if (this.player.onGround && isMoving && this._footstepTimer <= 0) {
      this.audioManager.playSFX('footstep');
      this._footstepTimer = 0.35;
    }

    // Track health changes for damage SFX
    if (this.player.health < (this._lastHealth || 20)) {
      this.audioManager.playSFX('damage');
    }
    this._lastHealth = this.player.health;

    // Update Steve model
    this.steveModel.updateAnimation(dt, isMoving);
    this.cameraCtrl.update(this.player, this.input, this.steveModel);

    // Diamond armor visual
    const bodyMat = this.steveModel.parts.body.material;
    const armorColor = this.inventory.hasDiamondArmor() ? 0x2BD2E8 : 0x00AAAA;
    if (Array.isArray(bodyMat)) {
      bodyMat.forEach(m => m.color.setHex(armorColor));
    } else {
      bodyMat.color.setHex(armorColor);
    }

    const rayOrigin = this.cameraCtrl.getRaycastOrigin(this.player);
    const rayDir = this.cameraCtrl.getRaycastDirection(this.input);
    const rayDist = this.cameraCtrl.isGodMode() ? 60 : 8;
    const hitResult = raycast(rayOrigin, rayDir, (x, y, z) => this.world.getBlock(x, y, z), rayDist);

    if (hitResult.hit) {
      this.renderer.showHighlight(hitResult.position);
    } else {
      this.renderer.showHighlight(null);
    }

    // Handle pick block (middle click)
    if (this.input.consumeAction('pick') && hitResult.hit) {
      const [bx, by, bz] = hitResult.position;
      const blockType = this.world.getBlock(bx, by, bz);
      if (blockType >= 1 && blockType <= 8) {
        this.input.selectedBlock = blockType;
        this.inventory.selectedSlot = blockType - 1;
      }
    }

    // Handle light toggle (Ctrl+right click)
    if (this.input.consumeAction('light') && hitResult.hit) {
      // In Craft this toggles a light flag on the block.
      // AICraft doesn't have per-block lighting yet - placeholder.
      console.log('Light toggle at', hitResult.position);
    }

    // Handle bow charge (overrides break/attack when holding bow)
    const _heldItem = this.inventory.getSelectedItem();
    const _holdingBow = _heldItem && _heldItem.type === ITEM.BOW;
    if (_holdingBow) {
      if (this.input.mouseButtons[0]) {
        if (!this._bowCharging) {
          this._bowCharging = true;
          this._bowChargeTime = 0;
          this.audioManager.playSFX('bow');
        }
        this._bowChargeTime += dt;
      } else if (this._bowCharging) {
        // Release arrow
        this._bowCharging = false;
        document.getElementById('bow-charge-container').style.display = 'none';
        if (this.inventory.hasItem(ITEM.ARROW, 1)) {
          this.inventory.removeItem(ITEM.ARROW, 1);
          this._fireArrow(this._bowChargeTime);
        }
        this._bowChargeTime = 0;
      }
    } else if (this._bowCharging) {
      this._bowCharging = false;
      this._bowChargeTime = 0;
      document.getElementById('bow-charge-container').style.display = 'none';
    }
    // Update bow charge UI
    if (this._bowCharging) {
      const cFill = document.getElementById('bow-charge-fill');
      if (cFill) cFill.style.width = Math.min(this._bowChargeTime / 1.5, 1.0) * 100 + '%';
      document.getElementById('bow-charge-container').style.display = 'block';
    }

    // Handle attack (left-click entity detection, prioritized over block breaking)
    // Auto-repeat break/attack when left mouse is held (desktop continuous mining)
    if (this.input.mouseButtons[0] && !this._bowCharging && this.uiState === "gameplay") {
      this._autoMineTimer += dt;
      if (this._autoMineTimer >= 0.15) {
        this._autoMineTimer = 0;
        this.input._actions.push("break");
        this.input._actions.push("attack");
      }
    } else {
      this._autoMineTimer = 0;
    }
    // --- Skip attack/break when charging bow ---
    if (!this._bowCharging) {
    this._attackCooldownTimer -= dt;
    if (this._attackCooldownTimer < 0) this._attackCooldownTimer = 0;

    let attacked = false;
    if (this.input.consumeAction('attack')) {
      const mobHit = this._findEntityInCrosshair(4);
      if (mobHit && this._attackCooldownTimer <= 0) {
        this._performAttack(mobHit);
        attacked = true;
      }
    }

    // Handle break action (with mining animation) — skipped if attack was performed
    // Handle break action with tool-speed-based mining
    if (!attacked && hitResult.hit && !this.steveModel.isAnimating()) {
      const [bx, by, bz] = hitResult.position;
      const blockType = this.world.getBlock(bx, by, bz);
      if (blockType !== BLOCK.WATER && blockType !== BLOCK.AIR && by > 0) {
        if (this.input.consumeAction('break')) {
          // Check if clicking a new block
          if (!this._miningTarget || this._miningTarget[0] !== bx || this._miningTarget[1] !== by || this._miningTarget[2] !== bz) {
            this._miningTarget = [bx, by, bz];
            this._miningBlockType = blockType;
            this._miningProgress = 0;
          }
              const selectedItem = this.inventory.getSelectedItem();
          const toolId = selectedItem ? selectedItem.type : 0;
          const speed = (toolId >= 114 && toolId <= 125) ? getToolSpeed(toolId, blockType) : 1.0;
          this._miningProgress += speed * 0.3;
          if (this._miningProgress >= 1.0) {
            this.steveModel.triggerAnimation('mining', () => {
              // Drop chest contents before removing
              if (blockType === BLOCK.CHEST) {
                const slots = this.world.getChestInv(bx, by, bz);
                if (slots) {
                  for (let i = 0; i < slots.length; i++) {
                    if (slots[i]) {
                      const dropItem = new DropItem(this.renderer.scene,
                        [bx + 0.5, by + 0.5, bz + 0.5],
                        slots[i].type, slots[i].count);
                      this.dropItems.push(dropItem);
                    }
                  }
                }
                this.world.removeChest(bx, by, bz);
              }
              this.world.setBlock(bx, by, bz, BLOCK.AIR);
              this.inventory.addItem(getBlockDrop(blockType), 1);
              this.audioManager.playSFX('break');
            });
            // Spawn destruction particles at the broken block position
            this.renderer.spawnDestructionParticles([bx, by, bz], BLOCK_COLORS[this._miningBlockType] || 0x888888);
            this._miningTarget = null;
            this._miningProgress = 0;
          }
        }
      } else {
        this._miningTarget = null;
        this._miningProgress = 0;
      }
    } else {
      this._miningTarget = null;
      this._miningProgress = 0;
    }

    } // end !_bowCharging (skip attack/break when charging bow)

    // Handle blocking with G key (replaces right-click hold)
    const nowBlocking = this.input.isKeyDown('KeyG');
    if (!this.blocking && nowBlocking) {
      this.audioManager.playSFX('block');
    }
    this.blocking = nowBlocking;

    // Handle dodge
    for (const code of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
      if (this.input.consumeAction('dodge_' + code)) {
        if (this.input.canDodge() && !this._dodgeActive) {
          this._dodgeActive = true;
          this._dodgeTimer = 0;
          this._dodgeStartPos = [...this.player.position];
          this.input.setDodgeCooldown();
          const dirMap = { KeyW: [0, 0, -1], KeyS: [0, 0, 1], KeyA: [-1, 0, 0], KeyD: [1, 0, 0] };
          const dir = dirMap[code];
          const yaw = this.input.yaw;
          this._dodgeDirection = [
            dir[0] * Math.cos(yaw) + dir[2] * Math.sin(yaw),
            0,
            -dir[0] * Math.sin(yaw) + dir[2] * Math.cos(yaw),
          ];
        }
      }
    }

    // Execute dodge
    if (this._dodgeActive) {
      this._dodgeTimer += dt;
      if (this._dodgeTimer < this._dodgeDuration) {
        const t = this._dodgeTimer / this._dodgeDuration;
        const eased = t * t * (3 - 2 * t); // smoothstep
        this.player.position[0] = this._dodgeStartPos[0] + this._dodgeDirection[0] * this._dodgeDistance * eased;
        this.player.position[2] = this._dodgeStartPos[2] + this._dodgeDirection[2] * this._dodgeDistance * eased;
      } else {
        this._dodgeActive = false;
      }
    }


    // Handle place action (with placing animation)
    if (!this.steveModel.isAnimating() && this.input.consumeAction('place') && hitResult.hit) {
      const [bx, by, bz] = hitResult.position;

      // Right-click on chest opens it instead of placing
      if (this.world.getBlock(bx, by, bz) === BLOCK.CHEST) {
        this._openChest(bx, by, bz);
      } else {
        const [nx, ny, nz] = hitResult.normal;
        const px = bx + nx, py = by + ny, pz = bz + nz;

        if (this.world.inBounds(px, py, pz) &&
            this.world.getBlock(px, py, pz) === BLOCK.AIR &&
            !this.player.blockOverlapsPlayer(px, py, pz) &&
            this.inventory.hasItem(this.input.selectedBlock, 1)) {
          const placeType = this.input.selectedBlock;
          this.steveModel.triggerAnimation('placing', () => {
            this.world.setBlock(px, py, pz, placeType);
            this.inventory.removeItem(placeType, 1);
            this.audioManager.playSFX('place');
            if (placeType === BLOCK.CHEST) {
              this.world.initChest(px, py, pz);
            }
          });
        }
      }
    }

    // Per-frame chunk loading around player
    if (this.world.useChunks) {
      this.world.chunkManager.loadAround(
        this.player.position[0],
        this.player.position[2],
        this.world.loadRadius
      );
    }

    this.diagnostics.beginPhase('meshRebuild');
    this.renderer.updateDirtyMeshes(this.world);
    this.diagnostics.endPhase();

    // Update character preview (when visible during pause, driven by game loop)
    if (this.characterPreview.visible) {
      this.characterPreview.setRole(this.currentRoleId);
      this.characterPreview.update(dt);
    }

    // AI update
    this.aiController.update(dt);

    // Handle retreat behavior
    if (this.aiController.retreating) {
      const stillRetreating = this.aiController.updateRetreat(this.player);
      if (stillRetreating && this.aiController.retreatTarget) {
        const dx = this.aiController.retreatTarget.x - this.player.position[0];
        const dz = this.aiController.retreatTarget.z - this.player.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 2) {
          const speed = 4.3;
          this.player.position[0] += (dx / dist) * speed * dt;
          this.player.position[2] += (dz / dist) * speed * dt;
        } else {
          this.aiController.retreatTarget = null;
        }
      }
    }

    // Semi-auto mode suggestion display
    if (this.aiController.autoMode === 'semi') {
      const suggestion = this.aiController.getSuggestion(
        this.player, this.world, [...this.animals, ...this.slimes], this.lastTime / 1000
      );
      this._showAISuggestion(suggestion);
    } else {
      this._hideAISuggestion();
    }

    // AI auto-think
    if (this.aiController.shouldThink()) {
      const skillId = this.aiController.autoThink(
        this.player, this.world, [...this.animals, ...this.slimes], this.lastTime / 1000,
        this.input, this.cameraCtrl, this.steveModel, this.inventory, this.renderer
      );
      if (skillId) {
        const skill = getSkill(skillId);
        if (skill) {
          skill.use(this.player, this.world, [...this.animals, ...this.slimes], this.lastTime / 1000,
            this.input, this.cameraCtrl, this.steveModel, this.inventory, this.renderer);
        }
      }
    }

    // Check level progress periodically
    this._levelCheckTimer += dt;
    if (this._levelCheckTimer >= 2.0) {
      this._levelCheckTimer = 0;
      this._checkLevelProgress();
    }

    // Advance day/night cycle (600s = 10min full cycle at 1x speed)
    this.timeOfDay += (dt / 600) * this.daySpeedMultiplier;
    if (this.timeOfDay >= 1) this.timeOfDay -= 1;
    this.renderer.updateDaylight(this.timeOfDay);

    // Auto-save periodically (every ~30 seconds)
    this.saveTimer += dt;
    if (this.saveTimer >= 30) {
      this.saveTimer = 0;
      this.saveWorld();
    }

    // Update HUD
    const weaponName = this.currentWeaponId ? (getWeapon(this.currentWeaponId)?.name || '') : '';
    const levelProgress = this.currentLevel ? this.currentLevel.getTaskProgress() : [];
    // Compute skill cooldowns
    const skillCooldowns = this.unlockedSkillIds.map(skillId => {
      const skill = getSkill(skillId);
      if (!skill) return { id: skillId, remaining: 0, ready: true, name: '', description: '' };
      const now = performance.now() / 1000;
      const remaining = Math.max(0, skill.cooldown - (now - skill.lastUsed));
      return {
        id: skillId,
        remaining: remaining,
        ready: remaining <= 0,
        name: skill.name,
        description: skill.description,
      };
    });
    const armorDefense = this.inventory.getArmorDefense();
    const bowChargePercent = this._bowCharging ? Math.min(this._bowChargeTime / 1.5, 1.0) : 0;
    this.hud.update(
      this.input.selectedBlock,
      this.player.position,
      this.fps,
      this.cameraCtrl.getMode(),
      this.player.isFlying,
      this.timeOfDay,
      this.player.health,
      this.player.maxHealth,
      weaponName,
      this.inventory.hasDiamondArmor(),
      this.unlockedSkillIds,
      this.currentSkillIndex,
      this.currentLevel,
      levelProgress,
      skillCooldowns,
      armorDefense,
      this.blocking,
      bowChargePercent
    );
  }

  render() {
    this.renderer.render();
  }

  // ===== Resume Game =====

  _resumeGame() {
    this.setUIState('gameplay');
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'none';
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    // Hide level select and completion notification if they happen to be open
    const levelSelectScreen = document.getElementById('level-select-screen');
    if (levelSelectScreen) levelSelectScreen.classList.add('hidden');
    this._hideLevelCompleteNotification();
    const hudEl = document.getElementById('hud');
    hudEl.classList.remove('hidden');
    // Close inventory if it was opened while paused
    if (this.uiState === 'inventory') {
      document.getElementById('inventory-overlay').classList.add('hidden');
      // Return crafting items
      for (let i = 0; i < 4; i++) {
        if (this._craftGrid[i]) {
          this.inventory.addItem(this._craftGrid[i].type, this._craftGrid[i].count);
          this._craftGrid[i] = null;
        }
      }
      this._updateCraftResult();
      this._updateCraftSlots();
    }
    this.input.requestLock();
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
    }
    this.characterPreview.hide();

    // Show touch controls when resuming
    if (this.touchController) this.touchController.show();
	      // Lock to landscape on mobile
	      screen.orientation?.lock?.('landscape')?.catch(() => {})
      this.hud.setTouchMode(true);
  }

  // ===== Role System =====

  selectRole(roleId) {
    const role = getRole(roleId);
    if (!role) return;
    if (role.locked) {
      alert(role.hint || '此角色未解锁');
      return;
    }

    this.currentRoleId = roleId;

    // Rebuild SteveModel with new proportions
    this.steveModel.rebuild(role.proportions);
    this.skinManager.applyRole(roleId);
    this.skinManager.applySkin(this.steveModel, roleId);

    // Switch pet
    if (this.pet) {
      this.pet.remove();
      this.pet = null;
    }
    if (role.pet) {
      this.pet = new Pet(role.pet, this.renderer.scene);
    }

    // Update role name in pause header
    const roleName = document.getElementById('current-role-name');
    if (roleName) roleName.textContent = role.name;

    // Update card highlights
    document.querySelectorAll('.role-card').forEach(card => {
      card.classList.toggle('active', card.dataset.roleId === roleId);
    });

    // Immediately refresh character preview
    if (this.characterPreview) {
      this.characterPreview.setRole(roleId);
    }
  }

  _buildRoleCards() {
    const container = document.getElementById('role-cards');
    if (!container) return;

    container.innerHTML = '';

    for (const roleId of getAvailableRoles()) {
      const role = getRole(roleId);
      const card = document.createElement('button');
      card.className = 'role-card';
      if (roleId === this.currentRoleId) card.classList.add('active');
      if (role.locked) card.classList.add('locked');
      card.dataset.roleId = roleId;

      if (role.locked) {
        card.innerHTML = `
          <div class="role-card-lock-icon">🔒</div>
          <div class="role-card-info">
            <span class="role-card-name">${role.name}</span>
            <span class="role-card-tag">未解锁</span>
          </div>
          <div class="role-card-hint">${role.hint}</div>
        `;
      } else {
        // Avatar color based on role
        const avatarColors = {
          steve: '#00AAAA',
          knight: '#3B7A4B',
          mage: '#7B1FA2',
          miner: '#8D6E63',
        };
        const avatarColor = avatarColors[roleId] || '#888';
        card.innerHTML = `
          <div class="role-card-avatar" style="background:${avatarColor};"></div>
          <div class="role-card-info">
            <span class="role-card-name">${role.name}</span>
            <span class="role-card-tag">${role.pet ? '🐾 有宠物' : ''}</span>
          </div>
          <div class="role-card-check">✓</div>
        `;
      }

      card.addEventListener('click', () => {
        this.selectRole(roleId);
      });

      container.appendChild(card);
    }
  }

  // ===== Skill System =====

  _useCurrentSkill() {
    if (this.unlockedSkillIds.length === 0) return;
    const skillId = this.unlockedSkillIds[this.currentSkillIndex];
    const skill = getSkill(skillId);
    // Only allow explore-type skills via X key
    if (!skill || skill.type !== 'explore') return;
    this.audioManager.playSFX('skill');
    const allMobs = [...this.animals, ...this.slimes, ...this.hostiles];
    skill.use(this.player, this.world, allMobs, this.lastTime / 1000,
      this.input, this.cameraCtrl, this.steveModel, this.inventory, this.renderer);
  }

  _cycleSkill() {
    // Only cycle among explore-type skills
    const exploreSkillIds = this.unlockedSkillIds.filter(id => {
      const skill = getSkill(id);
      return skill && skill.type === 'explore';
    });
    if (exploreSkillIds.length === 0) return;
    const currentSkill = this.unlockedSkillIds[this.currentSkillIndex];
    const currentExploreIdx = exploreSkillIds.indexOf(currentSkill);
    let nextExploreIdx;
    if (currentExploreIdx === -1 || currentExploreIdx >= exploreSkillIds.length - 1) {
      nextExploreIdx = 0;
    } else {
      nextExploreIdx = currentExploreIdx + 1;
    }
    this.currentSkillIndex = this.unlockedSkillIds.indexOf(exploreSkillIds[nextExploreIdx]);
  }

  _checkLevelProgress() {
    if (!this.currentLevel || this.currentLevel.completed) return;
    const allMobs = [...this.animals, ...this.slimes, ...this.hostiles];
    const done = this.currentLevel.checkTasks(this.inventory, allMobs);
    if (done) {
      // Apply rewards: unlock skills
      for (const skillId of this.currentLevel.unlockSkills) {
        if (!this.unlockedSkillIds.includes(skillId)) {
          this.unlockedSkillIds.push(skillId);
          this.aiController.assignSkill(this.unlockedSkillIds.length - 1, skillId);
        }
      }
      // Apply completion item rewards (e.g. slime balls + MUD)
      if (this.currentLevel.completionItemRewards) {
        for (const reward of this.currentLevel.completionItemRewards) {
          this.inventory.addItem(reward.type, reward.count);
        }
      }
      // Show level completion notification instead of auto-advancing
      this.audioManager.playSFX('levelup');
      this.showLevelCompleteNotification();
    }
  }

  // ===== Level Switching =====

  reloadLevel(levelIndex, variantIndex = 0) {
    const level = LEVELS[levelIndex];
    if (!level) return;

    // Save current inventory before switching
    this.saveWorld();

    // Pause game loop
    this.running = false;

    this.world.fillBlocks(BLOCK.AIR);

    // Remove all creatures from scene
    for (const animal of this.animals) {
      this.renderer.scene.remove(animal.group);
    }
    this.animals = [];
    for (const slime of this.slimes) {
      this.renderer.scene.remove(slime.group);
    }
    this.slimes = [];

    // Update current level state
    this.currentLevelIndex = levelIndex;
    this.currentLevel = level;
    this.currentTerrainIndex = variantIndex;

    // Get terrain variant config
    const terrains = level.terrains || [{ id: 'default', name: '默认', seedOffset: 0, biomeType: 'plains' }];
    const variant = terrains[variantIndex] || terrains[0];

    // Compute deterministic seed for this level+variant
    const seed = 42 + levelIndex * 100 + variant.seedOffset;

    // Generate world with config object
    const genConfig = { biomeType: variant.biomeType || 'plains' };
    if (variant.waterLevel !== undefined) genConfig.waterLevel = variant.waterLevel;
    this.world.generate(seed, genConfig);

    // Spawn animals
    this._spawnAnimals();

    // Spawn initial slimes for swamp levels
    const isSwamp = (variant.biomeType === 'swamp');
    if (isSwamp) {
      let slimeAttempts = 0;
      while (this.slimes.length < 4 && slimeAttempts < 100) {
        slimeAttempts++;
        const x = 5 + Math.random() * (64 - 10);
        const z = 5 + Math.random() * (64 - 10);
        const bx = Math.floor(x), bz = Math.floor(z);
        let groundY = -1;
        for (let y = 31; y >= 0; y--) {
          const block = this.world.getBlock(bx, y, bz);
          if (block !== BLOCK.AIR && block !== BLOCK.WATER) {
            groundY = y + 1;
            break;
          }
        }
        if (groundY > 0) {
          const isLarge = Math.random() < 0.3;
          const slime = new Slime(this.world, [x, groundY, z], isLarge);
          this._setupSlimeDeathHandler(slime);
          this.slimes.push(slime);
          this.renderer.scene.add(slime.group);
          if (this.renderer.enableShadowsOnGroup) this.renderer.enableShadowsOnGroup(slime.group);
        }
      }
    }

    // Build meshes
    this.renderer.buildMeshes(this.world);

    // Enable shadows on all entity groups
    const allGroups = [this.steveModel.group];
    for (const a of this.animals) allGroups.push(a.group);
    for (const s of this.slimes) allGroups.push(s.group);
    for (const g of allGroups) this.renderer.enableShadowsOnGroup(g);

    // Reset player position
    const spawnPos = this.world.findSpawnPosition();
    this.player.position = [...spawnPos];
    this.player.velocity = [0, 0, 0];
    this.player.onGround = false;

    // Reset time of day to dawn
    this.timeOfDay = 0.25;

    // Hide any open UI screens
    document.getElementById('level-select-screen').classList.add('hidden');
    document.getElementById('level-complete-notification').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';

    // Resume game loop
    this.running = true;
    this.setUIState('gameplay');
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));

    // Restore touch controls on mobile
    if (this.touchController) this.touchController.show();
  }

  _isLevelUnlocked(index) {
    return true; // All levels are freely selectable
  }

  showLevelSelect(fromNotification = false) {
    this._levelSelectFromNotification = fromNotification;
    // Hide pause screen (if coming from pause menu)
    document.getElementById('pause-screen').classList.add('hidden');
    // Show level select
    document.getElementById('level-select-screen').classList.remove('hidden');
    this.setUIState('levelSelect');
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'grid';
    this._buildLevelCards();
  }

  _hideLevelSelect() {
    document.getElementById('level-select-screen').classList.add('hidden');
    if (this._levelSelectFromNotification) {
      // Came from notification — resume game
      this.setUIState('gameplay');
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
      if (this.touchController) this.touchController.show();
    } else {
      // Came from pause — return to pause screen
      document.getElementById('pause-screen').classList.remove('hidden');
      this.setUIState('pause');
      this.characterPreview.show();
    }
  }

  _buildLevelCards() {
    const container = document.getElementById('level-cards');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i];
      const isUnlocked = this._isLevelUnlocked(i);
      const isCompleted = level.completed;
      const isCurrent = (i === this.currentLevelIndex);
      const progress = level.getTaskProgress();
      const doneCount = progress.filter(t => t.done).length;
      const totalCount = progress.length;

      const card = document.createElement('button');
      card.className = 'level-card';
      if (isCurrent) card.classList.add('current');
      if (isCompleted) card.classList.add('completed');
      if (!isUnlocked) card.classList.add('locked');
      card.dataset.levelIndex = i;

      card.innerHTML = `
        <div class="level-card-header">
          <span class="level-card-name">${level.name}</span>
          ${isCompleted ? '<span class="level-card-status-check">&#10003;</span>' : ''}
          ${!isUnlocked ? '<span class="level-card-status-lock">&#128274;</span>' : ''}
        </div>
        <div class="level-card-desc">${level.description}</div>
        <div class="level-card-progress">进度: ${doneCount}/${totalCount}</div>
      `;

      card.addEventListener('click', () => {
        if (!isUnlocked) return;
        if (isCurrent) {
          this._hideLevelSelect();
          return;
        }
        this.reloadLevel(i, 0);
      });

      container.appendChild(card);
    }
  }

  showLevelCompleteNotification() {
    this.setUIState('notification');
    this.running = false;
    const notification = document.getElementById('level-complete-notification');
    if (!notification) return;
    notification.classList.remove('hidden');
    const msg = document.getElementById('level-complete-msg');
    if (msg) msg.textContent = '恭喜完成了「' + this.currentLevel.name + '」的所有任务!';
    const rewards = document.getElementById('level-complete-rewards');
    if (rewards && this.currentLevel.unlockSkills.length > 0) {
      rewards.innerHTML = '解锁技能: ' + this.currentLevel.unlockSkills.join(', ');
    }
  }

  _hideLevelCompleteNotification() {
    const notification = document.getElementById('level-complete-notification');
    if (notification) notification.classList.add('hidden');
  }

  // ===== Commands =====

  _executeCommand(inputStr) {
    const parsed = parseCommand(inputStr);
    if (!parsed || !parsed.valid) {
      if (parsed && parsed.error) console.log(parsed.error);
      return;
    }
    switch (parsed.cmd) {
      case 'tp':
        this.player.position = [parsed.x, parsed.y, parsed.z];
        break;
      case 'give': {
        const itemMap = {
          'diamond': ITEM.DIAMOND, 'iron_ingot': ITEM.IRON_INGOT,
          'iron': ITEM.IRON_INGOT, 'wood': ITEM.WOOD,
          'stone': ITEM.STONE, 'dirt': ITEM.DIRT,
          'grass': ITEM.GRASS, 'plank': ITEM.PLANK,
          'stick': ITEM.STICK, 'bow': ITEM.BOW,
          'arrow': ITEM.ARROW, 'slime_ball': ITEM.SLIME_BALL,
          'brick': ITEM.BRICK, 'mud': ITEM.MUD,
          'clay': ITEM.CLAY, 'coal': ITEM.COAL,
        };
        const type = itemMap[parsed.item.toLowerCase()];
        if (type) {
          this.inventory.addItem(type, parsed.count);
        }
        break;
      }
      case 'time':
        this.timeOfDay = Math.max(0, Math.min(1, parsed.value));
        break;
      case 'fly':
        this.player.toggleFlight();
        break;
      case 'help':
        console.log('可用命令: /tp <x> <y> <z>, /give <item> [数量], /time <0-1>, /fly, /help');
        break;
    }
  }

  _cycleBlockType() {
    let next = this.input.selectedBlock + 1;
    if (next > 8) next = 1;
    this.input.selectedBlock = next;
    this.inventory.selectedSlot = next - 1;
  }

  // ===== Reset =====

  resetToSpawn() {
    // Find plains spawn position
    const spawnPos = this.world.findSpawnPosition();
    this.player.position = [...spawnPos];

    // Reset velocity and ground flag
    this.player.velocity = [0, 0, 0];
    this.player.onGround = false;

    // Reset camera pitch
    this.cameraCtrl.resetPitch();

    // Clear nearby hostiles and slimes for safe spawn zone
    const safeRadius = 10;
    const px = this.player.position[0], pz = this.player.position[2];
    const filterByDistance = (mobs) => mobs.filter(m => {
      const dx = m.position[0] - px, dz = m.position[2] - pz;
      return (dx * dx + dz * dz) < safeRadius * safeRadius;
    });
    const nearHostiles = filterByDistance(this.hostiles);
    for (const mob of nearHostiles) {
      this.renderer.scene.remove(mob.group);
      mob.dead = true;
    }
    const nearSlimes = filterByDistance(this.slimes);
    for (const mob of nearSlimes) {
      this.renderer.scene.remove(mob.group);
      mob.dead = true;
    }
  }

  // ===== Combat System =====

  // Find the closest entity (mob) in the crosshair within given range
  _findEntityInCrosshair(range) {
    const eyePos = this.player.getEyePosition();
    const forward = this.cameraCtrl.getRaycastDirection(this.input);

    const allMobs = [...this.animals, ...this.slimes, ...this.hostiles];
    let closestMob = null;
    let closestDist = range + 1;

    for (const mob of allMobs) {
      if (mob.dead) continue;
      const mx = mob.position[0];
      const my = mob.position[1] + (mob.height || 0.5) / 2;
      const mz = mob.position[2];

      const dx = mx - eyePos[0];
      const dy = my - eyePos[1];
      const dz = mz - eyePos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > range) continue;

      // Check if mob is roughly in the look direction (cosine similarity)
      const dot = (dx * forward[0] + dy * forward[1] + dz * forward[2]) / dist;
      if (dot > 0.92) {
        if (dist < closestDist) {
          closestDist = dist;
          closestMob = mob;
        }
      }
    }
    return closestMob;
  }

  // Calculate attack damage with all multipliers
  _calculateAttackDamage(weapon) {
    const now = performance.now() / 1000;
    const skillMult = (now - this._lastSkillUseTime) < 2 ? 1.5 : 1.0;
    const isRaining = this.world._isRaining || false;
    const envMult = isRaining ? 0.9 : 1.0;

    return Math.round(weapon.damage * skillMult * envMult);
  }

  // Perform an attack on a mob
  _performAttack(mob) {
    const weapon = this.currentWeaponId ? getWeapon(this.currentWeaponId) : null;
    if (!weapon) return;

    this._attackCooldownTimer = weapon.speed;

    const px = Math.floor(this.player.position[0]);
    const py = Math.floor(this.player.position[1] + 0.1);
    const pz = Math.floor(this.player.position[2]);
    if (this.world.getBlock(px, py, pz) === BLOCK.WATER) {
      this._attackCooldownTimer *= 1.15;
    }

    const effects = weapon.effects || {};
    let damage = this._calculateAttackDamage(weapon);

    // Apply weapon-specific effects
    if (effects.slimeBonus && mob.isSlime) {
      damage = Math.round(damage * effects.slimeBonus);
    }
    if (effects.armorPenetration) {
      damage = Math.round(damage * (1 + effects.armorPenetration));
    }

    mob.takeDamage(damage);

    // Apply slow effect (Frostmourne)
    if (effects.slow && typeof mob.slowTimer !== 'undefined') {
      mob.slowTimer = 2;
      mob.slowFactor = effects.slow;
    }

    // Apply fire damage over time (Dragon Blade)
    if (effects.fireDamage) {
      mob.fireDamageTimer = 3;
      mob.fireDamagePerTick = effects.fireDamage;
    }

    this._showDamageNumber(
      mob.position[0],
      mob.position[1] + (mob.height || 0.5),
      mob.position[2],
      damage,
      false
    );

    this.audioManager.playSFX('attack');

    if (mob.dead) {
      this._handleMobDeath(mob);
    }
  }

  // Handle mob death: drops and sounds
  _handleMobDeath(mob) {
    this.audioManager.playSFX('death');

    // Handle hostile mob drops
    if (mob.isHostile) {
      this._handleHostileDeath(mob);
      return;
    }

    // Handle slime death: split + drops
    if (mob.isSlime) {
      if (mob.isLarge) {
        // Large slime splits into 2 small slimes
        for (let i = 0; i < 2; i++) {
          const offsetX = (Math.random() - 0.5) * 0.5;
          const offsetZ = (Math.random() - 0.5) * 0.5;
          const smallSlime = new Slime(this.world, [mob.position[0] + offsetX, mob.position[1], mob.position[2] + offsetZ], false);
          this._setupSlimeDeathHandler(smallSlime);
          this.slimes.push(smallSlime);
          this.renderer.scene.add(smallSlime.group);
        }
        // Large slime drops 3-5 slime balls
        const dropCount = 3 + Math.floor(Math.random() * 3);
        this.inventory.addItem(ITEM.SLIME_BALL, dropCount);
      } else {
        // Small slime drops 1-2 slime balls
        const dropCount = 1 + Math.floor(Math.random() * 2);
        this.inventory.addItem(ITEM.SLIME_BALL, dropCount);
      }
    }
  }

  // Spawn new slimes near water or on MUD blocks in swamp
  _spawnSwampSlimes(count, currentCount) {
    const newSlimes = [];
    const maxToSpawn = Math.min(count, 8 - currentCount);
    if (maxToSpawn <= 0) return newSlimes;
    let attempts = 0;
    while (newSlimes.length < maxToSpawn && attempts < 50) {
      attempts++;
      const x = 3 + Math.random() * (this.world.width - 6);
      const z = 3 + Math.random() * (this.world.depth - 6);
      const bx = Math.floor(x), bz = Math.floor(z);
      let groundY = -1;
      for (let y = 31; y >= 0; y--) {
        if (this.world.getBlock(bx, y, bz) !== BLOCK.AIR) {
          groundY = y + 1;
          break;
        }
      }
      if (groundY > 0) {
        const surfaceBlock = this.world.getBlock(bx, Math.floor(groundY) - 1, bz);
        const nearWater = this._isNearWaterSwamp(bx, Math.floor(groundY), bz);
        if (surfaceBlock === BLOCK.MUD || surfaceBlock === BLOCK.DIRT || nearWater) {
          const isLarge = Math.random() < 0.3;
          const slime = new Slime(this.world, [x, groundY, z], isLarge);
          this._setupSlimeDeathHandler(slime);
          newSlimes.push(slime);
        }
      }
    }
    return newSlimes;
  }

  _isNearWaterSwamp(bx, by, bz) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (this.world.getBlock(bx + dx, by, bz + dz) === BLOCK.WATER) return true;
      }
    }
    return false;
  }

  // Setup slime on-death handler for split mechanic
  _setupSlimeDeathHandler(slime) {
    if (slime.isSlime) {
      // The split is handled via _handleMobDeath which is called from _performAttack
      // We use onDeath only for tracking kill count
      slime.onDeath = (deadSlime) => {
        // Track slime kills for swamp level
        if (this.currentLevel && this.currentLevel.id === 'level_006') {
          const killTask = this.currentLevel.tasks.find(t => t.type === 'kill' && t.target === 'slime');
          if (killTask) {
            killTask.current = (killTask.current || 0) + 1;
          }
        }
      };
    }
  }

  // Show a floating damage number at a 3D position
  _showDamageNumber(x, y, z, damage, isPlayerDamage) {
    if (!this.renderer || !this.renderer.camera) return;
    this._projectVector.set(x, y, z);
    this._projectVector.project(this.renderer.camera);

    // Behind the camera
    if (this._projectVector.z > 1) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const screenX = (this._projectVector.x * 0.5 + 0.5) * width;
    const screenY = (-this._projectVector.y * 0.5 + 0.5) * height;

    if (this.hud && typeof this.hud.showDamageNumber === 'function') {
      this.hud.showDamageNumber(screenX, screenY, damage, isPlayerDamage);
    }
  }

  // Show AI suggestion in semi-auto mode
  _showAISuggestion(text) {
    let el = document.getElementById('ai-suggestion');
    if (!text) {
      if (el) el.classList.add('hidden');
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'ai-suggestion';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.remove('hidden');
  }

  _hideAISuggestion() {
    const el = document.getElementById('ai-suggestion');
    if (el) el.classList.add('hidden');
  }

  // ===== Combat System Expansion Methods =====

  _spawnHostiles() {
    if (this.uiState !== 'gameplay') return;
    const alive = this.hostiles.filter(m => !m.dead).length;
    if (alive >= 16) return;

    // Biome-based spawn weights
    const biomeType = this.currentLevel && this.currentLevel.id;
    let zombieWeight = 1.0, skeletonWeight = 1.0, spiderWeight = 1.0;
    let creeperWeight = 0.8, endermanWeight = 0.3, wolfWeight = 0.6, caveSpiderWeight = 0.4;
    if (biomeType && biomeType.includes('desert')) {
      skeletonWeight = 1.5; zombieWeight = 0.7; wolfWeight = 0.8; creeperWeight = 0.5; endermanWeight = 0.2;
    } else if (biomeType && (biomeType.includes('level_005') || biomeType.includes('cave'))) {
      spiderWeight = 1.5; zombieWeight = 0.5; skeletonWeight = 0.5;
      caveSpiderWeight = 1.5; creeperWeight = 1.0; endermanWeight = 0.8;
    }
    const total = zombieWeight + skeletonWeight + spiderWeight + creeperWeight + endermanWeight + wolfWeight + caveSpiderWeight;

    // Day/night: reduce spawns during day but don't block entirely
    const isDay = this.timeOfDay > 0.25 && this.timeOfDay < 0.75;
    if (isDay && Math.random() > 0.5) return;

    // Spawn 2-4 mobs
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 20) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 15;
        const x = this.player.position[0] + Math.cos(angle) * dist;
        const z = this.player.position[2] + Math.sin(angle) * dist;
        const bx = Math.floor(x), bz = Math.floor(z);
        if (bx < 2 || bx >= this.world.width - 2 || bz < 2 || bz >= this.world.depth - 2) continue;
        let groundY = -1;
        for (let y = 31; y >= 0; y--) {
          if (this.world.getBlock(bx, y, bz) !== 0) { groundY = y + 1; break; }
        }
        if (groundY <= 0 || groundY >= 63) continue;
        // Don't spawn too close to player
        const dx = x - this.player.position[0], dz = z - this.player.position[2];
        if (Math.sqrt(dx*dx + dz*dz) < 10) continue;

        // Pick mob type based on biome weights
        const roll = Math.random() * total;
        let mobClass = Zombie;
        if (roll < zombieWeight) mobClass = Zombie;
        else if (roll < zombieWeight + skeletonWeight) mobClass = Skeleton;
        else if (roll < zombieWeight + skeletonWeight + spiderWeight) mobClass = Spider;
        else if (roll < zombieWeight + skeletonWeight + spiderWeight + creeperWeight) mobClass = Creeper;
        else if (roll < zombieWeight + skeletonWeight + spiderWeight + creeperWeight + endermanWeight) mobClass = Enderman;
        else if (roll < zombieWeight + skeletonWeight + spiderWeight + creeperWeight + endermanWeight + wolfWeight) mobClass = Wolf;
        else mobClass = CaveSpider;

        const mob = new mobClass(this.world, [x, groundY, z]);
        this.hostiles.push(mob);
        this.renderer.scene.add(mob.group);
        if (this.renderer.enableShadowsOnGroup) this.renderer.enableShadowsOnGroup(mob.group);
        break;
      }
    }
  }

  _handleHostileDeath(mob) {
    this.audioManager.playSFX('enemy_death');
    const drops = mob.getDrops();
    for (const drop of drops) {
      if (!drop || drop.count <= 0) continue;
      const dropItem = new DropItem(this.renderer.scene,
        [mob.position[0], mob.position[1] + 0.5, mob.position[2]],
        drop.type, drop.count);
      this.dropItems.push(dropItem);
    }
  }

  _openChest(cx, cy, cz) {
    this._openChestPos = [cx, cy, cz];
    this.setUIState('chest');
    const overlay = document.getElementById('chest-overlay');
    if (overlay) overlay.classList.remove('hidden');

    const grid = document.getElementById('chest-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const slots = this.world.getChestInv(cx, cy, cz);
    if (!slots) return;

    for (let i = 0; i < slots.length; i++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'chest-slot';
      slotEl.dataset.index = i;
      if (slots[i]) {
        const name = ITEM_NAMES[slots[i].type] || ('#' + slots[i].type);
        slotEl.innerHTML = `<span class="chest-item-name">${name}</span><span class="chest-item-count">${slots[i].count}</span>`;
        slotEl.addEventListener('click', () => {
          const remaining = this.inventory.addItem(slots[i].type, slots[i].count);
          if (remaining) {
            // Full inventory - put some back
            slots[i].count = remaining;
          } else {
            slots[i] = null;
          }
          this._renderChestGrid(grid, slots);
        });
      }
      grid.appendChild(slotEl);
    }
  }

  _closeChest() {
    this._openChestPos = null;
    const overlay = document.getElementById('chest-overlay');
    if (overlay) overlay.classList.add('hidden');
    this.setUIState('gameplay');
  }

  _renderChestGrid(grid, slots) {
    grid.innerHTML = '';
    for (let i = 0; i < slots.length; i++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'chest-slot';
      slotEl.dataset.index = i;
      if (slots[i]) {
        const name = ITEM_NAMES[slots[i].type] || ('#' + slots[i].type);
        slotEl.innerHTML = `<span class="chest-item-name">${name}</span><span class="chest-item-count">${slots[i].count}</span>`;
        slotEl.addEventListener('click', () => {
          const remaining = this.inventory.addItem(slots[i].type, slots[i].count);
          if (remaining) {
            slots[i].count = remaining;
          } else {
            slots[i] = null;
          }
          this._renderChestGrid(grid, slots);
        });
      }
      grid.appendChild(slotEl);
    }
  }

  _fireArrow(chargeTime) {
    // Charge levels: <0.5s = weak, 0.5-1.5 = medium, >1.5 = full
    const speed = Math.min(chargeTime / 1.5, 1.0);
    let damage, velocity;
    if (chargeTime < 0.5) {
      damage = 3; velocity = 20;
    } else if (chargeTime < 1.5) {
      damage = 6; velocity = 35;
    } else {
      damage = 10; velocity = 50;
    }
    this._launchArrow(damage, velocity);
  }

  _createAndTrackArrow(arrow, lookDir, hasTip) {
    const group = new THREE.Group();
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
    const shaftLen = hasTip ? 0.25 : 0.2;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, shaftLen), shaftMat);
    shaft.position.z = shaftLen / 2;
    group.add(shaft);
    if (hasTip) {
      const tipMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.04), tipMat);
      tip.position.z = 0.27;
      group.add(tip);
    }
    group.position.set(arrow.position[0], arrow.position[1], arrow.position[2]);
    group.lookAt(arrow.position[0] + lookDir[0], arrow.position[1] + lookDir[1], arrow.position[2] + lookDir[2]);
    this.renderer.scene.add(group);
    arrow.mesh = group;
    this._arrows.push(arrow);
  }

  _launchArrow(damage, velocity) {
    const eyePos = this.player.getEyePosition();
    const dir = this.cameraCtrl.getRaycastDirection(this.input);
    const arrow = {
      position: [eyePos[0] + dir[0] * 0.5, eyePos[1] + dir[1] * 0.5, eyePos[2] + dir[2] * 0.5],
      velocity: [dir[0] * velocity, dir[1] * velocity, dir[2] * velocity],
      damage: damage,
      age: 0,
      _done: false,
    };
    this._createAndTrackArrow(arrow, dir, true);
  }

  _shootMobArrow(mob) {
    const dir = [0, 0, 0];
    const dx = this.player.position[0] - mob.position[0];
    const dy = (this.player.position[1] + 0.5) - (mob.position[1] + mob.height * 0.5);
    const dz = this.player.position[2] - mob.position[2];
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist < 0.1) return;
    const arrowSpeed = 15;
    const arrow = {
      position: [mob.position[0], mob.position[1] + mob.height * 0.7, mob.position[2]],
      velocity: [dx/dist * arrowSpeed, dy/dist * arrowSpeed, dz/dist * arrowSpeed],
      damage: 4,
      age: 0,
      _done: false,
    };
    this._createAndTrackArrow(arrow, arrow.velocity, false);
  }

  // ===== Persistence =====

  saveWorld() {
    // Merge any previously saved changes with new incremental changes
    let allChanges = { ...this.world._changes };
    try {
      const prev = localStorage.getItem(SAVE_KEY);
      if (prev) {
        const prevData = JSON.parse(prev);
        if (prevData.version >= 2 && prevData.seed === this.world.seed) {
          // Merge: new changes override old ones
          allChanges = { ...prevData.changes, ...allChanges };
        }
      }
    } catch (e) { /* ignore corrupt save */ }

    const data = {
      version: 4,
      seed: this.world.seed,
      changes: allChanges,
      playerPos: [...this.player.position],
      currentLevelIndex: this.currentLevelIndex,
      unlockedSkillIds: [...this.unlockedSkillIds],
      inventory: this.inventory.serialize(),
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.world.clearChanges();
    } catch (e) {
      console.warn('Failed to save world:', e);
    }
  }

  loadWorld() {
    try {
      // 迁移旧存档到新键名
      const OLD_KEY = 'minicraft_save_v4';
      const oldRaw = localStorage.getItem(OLD_KEY);
      if (oldRaw && !localStorage.getItem(SAVE_KEY)) {
        localStorage.setItem(SAVE_KEY, oldRaw);
        localStorage.removeItem(OLD_KEY);
      }
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.version < 2) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  _applySaveData(data) {
    if (!data.changes) return;
    for (const [key, type] of Object.entries(data.changes)) {
      const [x, y, z] = key.split(',').map(Number);
      if (this.world.inBounds(x, y, z)) {
        this.world.applyBlockChange(x, y, z, type);
      }
    }
    if (data.playerPos) {
      this.player.position = [...data.playerPos];
    }
    if (data.currentLevelIndex !== undefined) {
      this.currentLevelIndex = data.currentLevelIndex;
      this.currentLevel = LEVELS[this.currentLevelIndex] || LEVELS[0];
    }
    if (data.unlockedSkillIds) {
      this.unlockedSkillIds = data.unlockedSkillIds;
    }
    // Restore inventory from save data (version 3+)
    if (data.inventory) {
      this.inventory.deserialize(data.inventory);
    }
    // Mark all as dirty
    for (let t = 1; t <= MAX_BLOCK_TYPE; t++) this.world.dirtyTypes.add(t);
  }

  _ensureSwampWorld() {
    if (!this.currentLevel || this.currentLevel.id !== 'level_006') return;
    let hasMud = false;
    if (this.world.useChunks) {
      hasMud = this.world.chunkManager.hasBlockType(BLOCK.MUD);
    } else {
      for (let x = 0; x < this.world.width && !hasMud; x++) {
        for (let z = 0; z < this.world.depth && !hasMud; z++) {
          for (let y = 0; y < this.world.height && !hasMud; y++) {
            if (this.world.getBlock(x, y, z) === BLOCK.MUD) { hasMud = true; }
          }
        }
      }
    }
    if (!hasMud) this._regenerateSwampWorld();
  }

  _regenerateSwampWorld() {
    this.world.generate(this.world.seed, 'swamp');
    this.renderer.buildMeshes(this.world);
    for (const animal of this.animals) { this.renderer.scene.remove(animal.group); }
    this.animals = [];
    for (const slime of this.slimes) { this.renderer.scene.remove(slime.group); }
    this.slimes = [];
    const spawnPos = this.world.findSpawnPosition();
    this.player.position = [...spawnPos];
    this.player.velocity = [0, 0, 0];
    this.cameraCtrl.resetPitch();
    for (const cfg of [{ cls: Pig, count: 2 }, { cls: Cow, count: 1 }, { cls: Sheep, count: 1 }, { cls: Chicken, count: 2 }]) {
      const animals = PassiveAnimal.spawnAnimals(this.world, cfg.cls, cfg.count);
      for (const animal of animals) { this.animals.push(animal); this.renderer.scene.add(animal.group); }
    }
  }
}

// Start the game
try {
  // Clear old version saves to prevent incompatible data
  try { localStorage.removeItem('minicraft_save_v1'); } catch (e) {}
  try { localStorage.removeItem('minicraft_save_v2'); } catch (e) {}
  try { localStorage.removeItem('minicraft_save_v3'); } catch (e) {}

  const game = new Game();
  game.init();
} catch (err) {
  console.error('AICraft init failed:', err);
  // Show error on screen
  const overlay = document.getElementById('overlay');
  if (overlay) {
    const screen = document.getElementById('start-screen');
    if (screen) {
      screen.querySelector('h1').textContent = '❌ 加载失败';
      screen.querySelector('p').textContent = err.message;
      screen.querySelector('button').style.display = 'none';
    }
  }
}
