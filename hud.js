// HUD module — update UI elements
import { BLOCK, BLOCK_NAMES, ITEM, ITEM_NAMES } from './world.js';
import { getSkill } from './skillLibrary.js';

const BLOCK_CSS_CLASSES = {
  [BLOCK.GRASS]: 'grass',
  [BLOCK.DIRT]:  'dirt',
  [BLOCK.STONE]: 'stone',
  [BLOCK.WOOD]:  'wood',
  [BLOCK.BRICK]: 'brick',
  [BLOCK.WATER]: 'water',
  [BLOCK.LEAVES]: 'leaves',
  [BLOCK.FLOWER]: 'flower',
  [BLOCK.MUD]: 'mud',
  [BLOCK.CLAY]: 'clay',
  [BLOCK.LILY_PAD]: 'lily_pad',
  [BLOCK.REED]: 'reed',
  [BLOCK.COAL_ORE]: 'coal_ore',
  [BLOCK.IRON_ORE]: 'iron_ore',
  [BLOCK.GOLD_ORE]: 'gold_ore',
  [BLOCK.DIAMOND_ORE]: 'diamond_ore',
  [BLOCK.REDSTONE_ORE]: 'redstone_ore',
  [BLOCK.LAPIS_ORE]: 'lapis_ore',
  [BLOCK.SAND]: 'sand',
  [BLOCK.GRAVEL]: 'gravel',
  [BLOCK.SNOW]: 'snow',
  [BLOCK.CACTUS]: 'cactus',
};

export class HUD {
  constructor() {
    this.hotbarSlots = null;
    this.heldPreview = null;
    this.debugInfo = null;
    this.healthDisplay = null;
    this.weaponDisplay = null;
    this.timeDisplay = null;
    this.armorDisplay = null;
    this.skillSlots = null;
    this.skillNameDisplay = null;
    this.levelNameDisplay = null;
    this.levelTasksDisplay = null;
    this._touchMode = false;
  }

  init() {
    this.hotbarSlots = document.querySelectorAll('.hotbar-slot');
    this.heldPreview = document.getElementById('held-preview');
    this.debugInfo = document.getElementById('debug-info');
    this.healthDisplay = document.getElementById('health-display');
    this.weaponDisplay = document.getElementById('weapon-display');
    this.timeDisplay = document.getElementById('time-display');
    this.armorDisplay = document.getElementById('armor-display');
    this.skillSlots = document.getElementById('skill-slots');
    this.skillNameDisplay = document.getElementById('skill-name');
    this.levelNameDisplay = document.getElementById('level-name');
    this.levelTasksDisplay = document.getElementById('level-tasks');
    this.helpPanel = document.getElementById('help-panel');
  }

  showDamageNumber(screenX, screenY, damage, isPlayerDamage) {
    const container = this._damageContainer || (this._damageContainer = document.getElementById('damage-numbers') || this._createDamageContainer());
    const el = document.createElement('div');
    el.className = 'damage-number';
    if (isPlayerDamage) el.classList.add('player-damage');
    el.textContent = `-${damage}`;
    el.style.left = screenX + 'px';
    el.style.top = screenY + 'px';
    container.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1000);

    // Limit concurrent damage numbers to 3
    while (container.children.length > 3) {
      container.removeChild(container.firstChild);
    }
  }

  _createDamageContainer() {
    const container = document.createElement('div');
    container.id = 'damage-numbers';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1000;';
    document.body.appendChild(container);
    return container;
  }

  update(selectedBlock, playerPosition, fps, cameraMode, isFlying, timeOfDay, health, maxHealth, weaponName, armorActive,
          unlockedSkills, currentSkillIndex, currentLevel, levelProgress, skillCooldowns,
          armorDefense, blocking, bowChargePercent) {
    // Update time display
    if (this.timeDisplay) {
      const totalMinutes = Math.floor(timeOfDay * 1440);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      this.timeDisplay.textContent = `🕐 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Update health display
    if (this.healthDisplay) {
      const hearts = Math.ceil(health / 2);
      const maxHearts = Math.ceil(maxHealth / 2);
      let heartsHtml = '';
      for (let i = 0; i < maxHearts; i++) {
        heartsHtml += i < hearts ? '❤️' : '🖤';
      }
      this.healthDisplay.innerHTML = heartsHtml;
    }

    // Update weapon display
    if (this.weaponDisplay) {
      this.weaponDisplay.textContent = weaponName || '';
    }

    // Update armor display
    if (this.armorDisplay) {
      this.armorDisplay.textContent = armorDefense > 0 ? "⚔️ 盔甲" + armorDefense + "点" : "";
    }
    // Update armor bar in top-info
    const armorValueEl = document.getElementById('armor-value');
    if (armorValueEl) {
      armorValueEl.textContent = armorDefense || 0;
    }

    // Blocking indicator
    const blockOverlay = document.getElementById('block-overlay');
    if (blockOverlay) {
      blockOverlay.classList.toggle('active', blocking);
    }

    // Bow charge indicator
    const bowChargeContainer = document.getElementById('bow-charge-container');
    if (bowChargeContainer) {
      bowChargeContainer.style.display = bowChargePercent > 0 ? 'block' : 'none';
    }
    const bowFill = document.getElementById('bow-charge-fill');
    if (bowFill) {
      bowFill.style.width = (bowChargePercent * 100) + '%';
    }

    // Update hotbar selection
    this.hotbarSlots.forEach(slot => {
      const type = parseInt(slot.dataset.type);
      if (type === selectedBlock) {
        slot.classList.add('selected');
      } else {
        slot.classList.remove('selected');
      }
    });

    // Update held block preview
    const cssClass = BLOCK_CSS_CLASSES[selectedBlock] || 'grass';
    // Remove old class, add new
    this.heldPreview.className = 'block-preview ' + cssClass;

    // Update debug info
    const modeNames = ['第一人称', '第三人称(后)', '第三人称(前)', '上帝视角'];
    const modeName = modeNames[cameraMode] || '未知';
    if (this.debugInfo && playerPosition) {
      const bx = Math.floor(playerPosition[0]);
      const by = Math.floor(playerPosition[1]);
      const bz = Math.floor(playerPosition[2]);
      this.debugInfo.innerHTML =
        `FPS: ${fps}<br>` +
        `Pos: ${playerPosition[0].toFixed(1)}, ${playerPosition[1].toFixed(1)}, ${playerPosition[2].toFixed(1)}<br>` +
        `Block: ${bx}, ${by}, ${bz}<br>` +
        `Held: ${BLOCK_NAMES[selectedBlock]}<br>` +
        `视角: ${modeName}<br>` +
        (isFlying ? '✈ 飞行模式<br>' : '');
    }

    // Update skill bar — only show explore-type skills
    if (this.skillSlots && unlockedSkills) {
      this.skillSlots.innerHTML = '';
      const exploreSkills = unlockedSkills.filter(skillId => {
        const skill = getSkill(skillId);
        return skill && skill.type === 'explore';
      });
      for (let i = 0; i < exploreSkills.length && i < 6; i++) {
        const skillId = exploreSkills[i];
        const slot = document.createElement('div');
        slot.className = 'skill-slot';
        if (skillId === unlockedSkills[currentSkillIndex]) slot.classList.add('active');

        // Skill short name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'skill-name';
        nameSpan.textContent = getSkillShortName(skillId);
        slot.appendChild(nameSpan);

        // Cooldown overlay
        const idxInUnlocked = unlockedSkills.indexOf(skillId);
        const cd = skillCooldowns && skillCooldowns[idxInUnlocked];
        if (cd && !cd.ready) {
          slot.classList.add('cooldown');
          const cdText = document.createElement('span');
          cdText.className = 'skill-cooldown-text';
          cdText.textContent = cd.remaining.toFixed(1) + 's';
          slot.appendChild(cdText);
        }

        // Tooltip with skill description
        if (cd && cd.name) {
          slot.title = cd.name + ' - ' + cd.description;
        } else {
          slot.title = skillId;
        }
        this.skillSlots.appendChild(slot);
      }
    }
    if (this.skillNameDisplay && unlockedSkills && unlockedSkills[currentSkillIndex]) {
      const currentSkill = getSkill(unlockedSkills[currentSkillIndex]);
      if (currentSkill && currentSkill.type === 'explore') {
        const cd = skillCooldowns && skillCooldowns[currentSkillIndex];
        this.skillNameDisplay.textContent = (cd && cd.name) || unlockedSkills[currentSkillIndex];
      } else {
        this.skillNameDisplay.textContent = '';
      }
    }

    // Keyboard hint — only show when explore skills exist
    if (this.skillSlots) {
      const hasExploreSkills = unlockedSkills && unlockedSkills.some(id => {
        const skill = getSkill(id);
        return skill && skill.type === 'explore';
      });
      if (!this._skillHints) {
        this._skillHints = document.createElement('div');
        this._skillHints.className = 'skill-hints';
        this._skillHints.textContent = 'X:使用  C:切换';
        this.skillSlots.parentNode.insertBefore(this._skillHints, this.skillSlots.nextSibling);
      }
      this._skillHints.style.display = hasExploreSkills ? '' : 'none';
    }

    // Update level info
    if (this.levelNameDisplay && currentLevel) {
      this.levelNameDisplay.textContent = '📋 ' + currentLevel.name;
    }
    if (this.levelTasksDisplay && levelProgress) {
      const done = levelProgress.filter(t => t.done).length;
      const total = levelProgress.length;
      this.levelTasksDisplay.textContent = ` ${done}/${total}`;
    }
  }

  toggleHelp() {
    if (this._touchMode) return false;
    if (!this.helpPanel) return;
    const isHidden = this.helpPanel.classList.contains('hidden');
    this.helpPanel.classList.toggle('hidden', isHidden);
    return !isHidden;
  }

  showHelp() {
    if (this._touchMode) return;
    if (this.helpPanel) this.helpPanel.classList.remove('hidden');
  }

  hideHelp() {
    if (this.helpPanel) this.helpPanel.classList.add('hidden');
  }

  setTouchMode(val) {
    this._touchMode = !!val;
    if (val) {
      this._enableTouchHotbar();
    } else {
      this._disableTouchHotbar();
    }
  }

  _enableTouchHotbar() {
    this._hotbarTouchHandler = (e) => {
      e.preventDefault();
      const slot = e.currentTarget;
      const type = parseInt(slot.dataset.type);
      // Dispatch a custom event that main.js can listen for
      const event = new CustomEvent('hotbar-touch-select', { detail: { type } });
      document.dispatchEvent(event);
    };
    document.querySelectorAll('.hotbar-slot').forEach(el => {
      el.addEventListener('touchstart', this._hotbarTouchHandler, { passive: false });
    });
  }

  _disableTouchHotbar() {
    if (this._hotbarTouchHandler) {
      document.querySelectorAll('.hotbar-slot').forEach(el => {
        el.removeEventListener('touchstart', this._hotbarTouchHandler);
      });
      this._hotbarTouchHandler = null;
    }
  }
}

function getSkillShortName(skillId) {
  const map = {
    'mc_mine_001': '⛏挖',
    'mc_mine_002': '⛏范围',
    'mc_fight_001': '⚔猛击',
    'mc_fight_002': '⚔致命',
    'mc_build_001': '🔨建造',
    'mc_explore_001': '🔍探索',
    'mc_explore_002': '🔍扫描',
  };
  return map[skillId] || skillId;
}
