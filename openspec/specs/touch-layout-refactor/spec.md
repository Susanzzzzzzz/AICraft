## ADDED Requirements

### Requirement: Core button set of 4
The touch controller SHALL display exactly 4 core buttons: pause (⏸, top-left), inventory (🎒, top-right), weapon switch (right func row position 1), flight toggle (right func row position 2). The diamond action area (jump/break/place/dodge) SHALL remain unchanged.

#### Scenario: Core buttons visible on touch device
- **WHEN** touch controller is active
- **THEN** exactly 4 core buttons are displayed: pause, inventory, weapon, flight

#### Scenario: Diamond action buttons unchanged
- **WHEN** touch controller is active
- **THEN** jump, break, place, dodge buttons appear in diamond layout at bottom-right

### Requirement: Conditional flight arrows
The ascend (↑) and descend (↓) buttons SHALL only be visible when the player is in flying mode. They SHALL be positioned in the right function row after the flight toggle button.

#### Scenario: Flying mode active
- **WHEN** player toggles flight mode on
- **THEN** ↑ and ↓ buttons become visible in the function row

#### Scenario: Flying mode inactive
- **WHEN** player toggles flight mode off
- **THEN** ↑ and ↓ buttons are hidden

### Requirement: Removed buttons accessible from pause menu
The removed buttons (skill use, skill cycle, camera toggle, help) SHALL be accessible from the pause menu when in touch mode. These buttons SHALL be hidden from the touch overlay and only appear as additional options in `#pause-actions` with class `touch-only`.

#### Scenario: Touch device pause menu
- **WHEN** player opens pause menu on a touch device
- **THEN** additional buttons are visible: "使用技能", "切换技能", "切换视角", "帮助"

#### Scenario: PC pause menu unchanged
- **WHEN** player opens pause menu on PC
- **THEN** no additional touch-only buttons are visible

### Requirement: Inventory button replaces interact button
The top-right button SHALL be labeled "🎒" and trigger the `'interact'` action (which opens inventory). The original "交互" button label SHALL be replaced with a backpack icon for clarity.

#### Scenario: Touching inventory button
- **WHEN** player taps the 🎒 button
- **THEN** `'interact'` action is pushed, opening the inventory screen

### Requirement: Break button hold behavior
The break (挖) button SHALL set `input.mouseButtons[0] = true` and `_breakHeldByTouch = true` on touchstart. On touchend/touchcancel, both SHALL be set to false. The button SHALL NOT use `setInterval` to push repeated actions. A single `'attack'` action SHALL be pushed on initial press.

#### Scenario: Break button press and hold
- **WHEN** player presses and holds the break button
- **THEN** `mouseButtons[0]` is true, `_breakHeldByTouch` is true, one `'attack'` action is pushed, no interval is started

#### Scenario: Break button release
- **WHEN** player releases the break button
- **THEN** `mouseButtons[0]` is false, `_breakHeldByTouch` is false
