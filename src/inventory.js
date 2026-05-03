// Inventory module — ItemStack, Inventory (36 storage + 8 hotbar slots)
import { ITEM } from './world.js';

const ARMOR_DEFENSE = {
  [ITEM.LEATHER_HELMET]: 1, [ITEM.IRON_HELMET]: 2, [ITEM.DIAMOND_HELMET]: 3, [ITEM.NETHERITE_HELMET]: 3,
  [ITEM.LEATHER_CHESTPLATE]: 3, [ITEM.IRON_CHESTPLATE]: 6, [ITEM.DIAMOND_CHESTPLATE_NEW]: 8, [ITEM.NETHERITE_CHESTPLATE]: 8,
  [ITEM.LEATHER_LEGGINGS]: 2, [ITEM.IRON_LEGGINGS]: 5, [ITEM.DIAMOND_LEGGINGS]: 6, [ITEM.NETHERITE_LEGGINGS]: 6,
  [ITEM.LEATHER_BOOTS]: 1, [ITEM.IRON_BOOTS]: 2, [ITEM.DIAMOND_BOOTS]: 3, [ITEM.NETHERITE_BOOTS]: 3,
};

const ARMOR_SLOT_MAP = {
  [ITEM.LEATHER_HELMET]: 'head', [ITEM.IRON_HELMET]: 'head', [ITEM.DIAMOND_HELMET]: 'head', [ITEM.NETHERITE_HELMET]: 'head',
  [ITEM.LEATHER_CHESTPLATE]: 'chest', [ITEM.IRON_CHESTPLATE]: 'chest', [ITEM.DIAMOND_CHESTPLATE_NEW]: 'chest', [ITEM.NETHERITE_CHESTPLATE]: 'chest',
  [ITEM.LEATHER_LEGGINGS]: 'legs', [ITEM.IRON_LEGGINGS]: 'legs', [ITEM.DIAMOND_LEGGINGS]: 'legs', [ITEM.NETHERITE_LEGGINGS]: 'legs',
  [ITEM.LEATHER_BOOTS]: 'feet', [ITEM.IRON_BOOTS]: 'feet', [ITEM.DIAMOND_BOOTS]: 'feet', [ITEM.NETHERITE_BOOTS]: 'feet',
};


const MAX_STACK = 64;

export class ItemStack {
  constructor(type, count = 1) {
    this.type = type;
    this.count = count;
  }
}

export class Inventory {
  constructor() {
    this.hotbar = new Array(8).fill(null);   // indices 0-7
    this.storage = new Array(36).fill(null); // indices 0-35
    this.selectedSlot = 0;                   // 0-7 hotbar index
    this.armorSlots = { head: null, chest: null, legs: null, feet: null };
  }

  getSelectedItem() {
    return this.hotbar[this.selectedSlot];
  }

  addItem(type, count = 1) {
    let remaining = count;
    // First: stack onto existing items
    for (const slots of [this.hotbar, this.storage]) {
      for (let i = 0; i < slots.length && remaining > 0; i++) {
        const slot = slots[i];
        if (slot && slot.type === type && slot.count < MAX_STACK) {
          const canAdd = Math.min(remaining, MAX_STACK - slot.count);
          slot.count += canAdd;
          remaining -= canAdd;
        }
      }
    }
    // Then: fill empty slots
    for (const slots of [this.hotbar, this.storage]) {
      for (let i = 0; i < slots.length && remaining > 0; i++) {
        if (!slots[i]) {
          const addCount = Math.min(remaining, MAX_STACK);
          slots[i] = new ItemStack(type, addCount);
          remaining -= addCount;
        }
      }
    }
    return remaining === 0;
  }

  removeItem(type, count = 1) {
    if (!this.hasItem(type, count)) return false;
    let remaining = count;
    for (const slots of [this.hotbar, this.storage]) {
      for (let i = 0; i < slots.length && remaining > 0; i++) {
        const slot = slots[i];
        if (slot && slot.type === type) {
          const toRemove = Math.min(remaining, slot.count);
          slot.count -= toRemove;
          remaining -= toRemove;
          if (slot.count <= 0) slots[i] = null;
        }
      }
    }
    return true;
  }

  hasItem(type, count = 1) {
    let total = 0;
    for (const slots of [this.hotbar, this.storage]) {
      for (const slot of slots) {
        if (slot && slot.type === type) total += slot.count;
      }
    }
    return total >= count;
  }

  countItem(type) {
    let total = 0;
    for (const slots of [this.hotbar, this.storage]) {
      for (const slot of slots) {
        if (slot && slot.type === type) total += slot.count;
      }
    }
    return total;
  }

  serialize() {
    return {
      hotbar: this.hotbar.map(s => s ? { type: s.type, count: s.count } : null),
      storage: this.storage.map(s => s ? { type: s.type, count: s.count } : null),
      selectedSlot: this.selectedSlot,
      armor: {
        head: this.armorSlots.head ? { type: this.armorSlots.head.type, count: this.armorSlots.head.count } : null,
        chest: this.armorSlots.chest ? { type: this.armorSlots.chest.type, count: this.armorSlots.chest.count } : null,
        legs: this.armorSlots.legs ? { type: this.armorSlots.legs.type, count: this.armorSlots.legs.count } : null,
        feet: this.armorSlots.feet ? { type: this.armorSlots.feet.type, count: this.armorSlots.feet.count } : null,
      },
    };
  }

  deserialize(data) {
    if (!data) return;
    this.hotbar = (data.hotbar || []).map(s => s ? new ItemStack(s.type, s.count) : null);
    while (this.hotbar.length < 8) this.hotbar.push(null);
    this.storage = (data.storage || []).map(s => s ? new ItemStack(s.type, s.count) : null);
    while (this.storage.length < 36) this.storage.push(null);
    this.selectedSlot = data.selectedSlot || 0;
    // Restore armor slots
    if (data.armor) {
      this.armorSlots.head = data.armor.head ? new ItemStack(data.armor.head.type, data.armor.head.count) : null;
      this.armorSlots.chest = data.armor.chest ? new ItemStack(data.armor.chest.type, data.armor.chest.count) : null;
      this.armorSlots.legs = data.armor.legs ? new ItemStack(data.armor.legs.type, data.armor.legs.count) : null;
      this.armorSlots.feet = data.armor.feet ? new ItemStack(data.armor.feet.type, data.armor.feet.count) : null;
    }
  }

  getArmorDefense() {
    let total = 0;
    for (const slot of ['head', 'chest', 'legs', 'feet']) {
      const item = this.armorSlots[slot];
      if (item && ARMOR_DEFENSE[item.type]) total += ARMOR_DEFENSE[item.type];
    }
    return total;
  }

  getArmorSlot(itemType) {
    return ARMOR_SLOT_MAP[itemType] || null;
  }

  isArmor(itemType) {
    return !!ARMOR_SLOT_MAP[itemType];
  }

  equipArmor(itemType, count = 1) {
    const slot = this.getArmorSlot(itemType);
    if (!slot) return false;
    // Swap with existing item in slot
    const existing = this.armorSlots[slot];
    this.armorSlots[slot] = new ItemStack(itemType, 1);
    if (existing) {
      this.addItem(existing.type, existing.count);
    }
    this.removeItem(itemType, 1);
    return true;
  }

  unequipArmor(slot) {
    const item = this.armorSlots[slot];
    if (!item) return false;
    if (this.addItem(item.type, item.count)) {
      this.armorSlots[slot] = null;
      return true;
    }
    return false;
  }

  getWeaponIds() {
    const weapons = [];
    for (const slots of [this.hotbar, this.storage]) {
      for (const slot of slots) {
        if (slot && (
          (slot.type >= 102 && slot.type <= 106) ||
          slot.type === 111 || slot.type === 112 ||
          (slot.type >= 114 && slot.type <= 125)
        )) {
          if (!weapons.includes(slot.type)) weapons.push(slot.type);
        }
      }
    }
    return weapons.sort((a, b) => a - b);
  }

  hasDiamondArmor() {
    // Check new armor slots first, then legacy item
    if (this.armorSlots.chest && this.armorSlots.chest.type === ITEM.DIAMOND_CHESTPLATE_NEW) return true;
    return this.hasItem(ITEM.DIAMOND_CHESTPLATE, 1);
  }
}
