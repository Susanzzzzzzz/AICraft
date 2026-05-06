## MODIFIED Requirements

### Requirement: Dynamic hotbar rendering from inventory data
The hotbar SHALL be dynamically rendered by JavaScript based on `inventory.hotbar` array content. Each slot SHALL display the item's emoji icon from `EMOJI_MAP` and the item count when count > 1. The HTML `#hotbar` container SHALL start as empty slots (no hardcoded block types), and `hud.js` SHALL populate them each update cycle.

#### Scenario: Hotbar reflects inventory contents
- **WHEN** `inventory.hotbar[0]` contains `{ type: ITEM.STONE, count: 32 }`
- **THEN** hotbar slot 0 displays "🧱" icon and "×32" count text

#### Scenario: Empty hotbar slot
- **WHEN** `inventory.hotbar[3]` is null
- **THEN** hotbar slot 3 displays empty (no icon, no count)

#### Scenario: Non-block item in hotbar
- **WHEN** `inventory.hotbar[2]` contains `{ type: ITEM.SWORD_IRON, count: 1 }`
- **THEN** hotbar slot 2 displays "🗡️" icon and no count (count is 1)

### Requirement: Hotbar selection syncs with inventory.selectedSlot
The `.selected` class on hotbar slots SHALL be driven by `inventory.selectedSlot` index, not by matching `data-type` to `selectedBlock`.

#### Scenario: Select hotbar slot via keyboard
- **WHEN** player presses "3" key
- **THEN** `inventory.selectedSlot` becomes 2, and hotbar slot index 2 gets `.selected` class

#### Scenario: Select hotbar slot via touch
- **WHEN** player taps hotbar slot index 5
- **THEN** `inventory.selectedSlot` becomes 5, and that slot gets `.selected` class
