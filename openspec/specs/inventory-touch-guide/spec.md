## ADDED Requirements

### Requirement: Touch inventory slot selection highlight
When in touch mode, tapping an inventory slot SHALL add a `.selected` CSS class to that slot, visually highlighting it. Only one slot SHALL be selected at a time.

#### Scenario: Tap to select a slot
- **WHEN** player taps a storage slot in touch mode
- **THEN** that slot gets `.selected` class and any previously selected slot loses it

#### Scenario: Tap selected slot to deselect
- **WHEN** player taps the already-selected slot
- **THEN** the `.selected` class is removed from that slot

### Requirement: Touch two-step item transfer
When in touch mode, after selecting a source slot, tapping a destination slot SHALL move the item from source to destination. If the destination already has an item, the items SHALL swap.

#### Scenario: Move item from storage to hotbar
- **WHEN** player taps a storage slot (selecting it), then taps an empty hotbar slot
- **THEN** the item moves from storage to the hotbar slot

#### Scenario: Swap items between slots
- **WHEN** player taps a storage slot with dirt, then taps a hotbar slot with stone
- **THEN** dirt moves to hotbar slot and stone moves to storage slot

### Requirement: Touch inventory guidance text
When in touch mode, a guidance text SHALL appear at the bottom of the inventory panel reading "点击物品 → 点击目标位置移动". This text SHALL be hidden in non-touch mode.

#### Scenario: Touch mode inventory opened
- **WHEN** player opens inventory on a touch device
- **THEN** guidance text "点击物品 → 点击目标位置移动" is visible at bottom of inventory

#### Scenario: PC inventory opened
- **WHEN** player opens inventory on PC
- **THEN** no guidance text is shown
