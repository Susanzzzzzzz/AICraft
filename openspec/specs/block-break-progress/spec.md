## ADDED Requirements

### Requirement: Block break progress state machine
The system SHALL track a breaking state object `_breaking` with fields `{ x, y, z, progress, total }`. When the player holds the break input (left mouse button or touch break button) and a block is targeted, progress SHALL increment by `dt / total` each frame. When progress reaches 1.0, the block SHALL be destroyed via `_instantBreak()`. When the player releases the break input, changes target block, or the target becomes invalid, the breaking state SHALL reset to null.

#### Scenario: Start breaking a block
- **WHEN** player holds break input and crosshair targets a dirt block (hardness 0.5s)
- **THEN** `_breaking` is initialized with `{ x, y, z, progress: 0, total: 0.5 }` and progress increments each frame

#### Scenario: Complete breaking a block
- **WHEN** `_breaking.progress` reaches 1.0
- **THEN** `_instantBreak()` is called and `_breaking` is reset to null

#### Scenario: Interrupt breaking by releasing
- **WHEN** player releases break input while `_breaking.progress` is 0.4
- **THEN** `_breaking` is reset to null and visual feedback is cleared

#### Scenario: Interrupt by changing target
- **WHEN** crosshair moves from block (1,2,3) to block (4,5,6) while breaking
- **THEN** `_breaking` resets and a new breaking state starts for block (4,5,6)

### Requirement: Block hardness table
The system SHALL export `BLOCK_HARDNESS` from `world.js` mapping block type IDs to break duration in seconds. Default hardness SHALL be 1.0s. Soft blocks (flower, torch, reed, lily_pad) SHALL have hardness ≤ 0.3s. Hard blocks (diamond ore, gold ore) SHALL have hardness ≥ 2.0s.

#### Scenario: Grass block hardness
- **WHEN** player breaks a grass block
- **THEN** break duration is 0.6 seconds

#### Scenario: Diamond ore hardness
- **WHEN** player breaks a diamond ore block
- **THEN** break duration is 3.0 seconds

#### Scenario: Unknown block default
- **WHEN** player breaks a block type not in BLOCK_HARDNESS
- **THEN** break duration defaults to 1.0 seconds

### Requirement: Break progress visual — darkening overlay
The system SHALL render a semi-transparent black BoxGeometry (1.002×1.002×1.002) over the targeted block. The overlay opacity SHALL scale linearly with progress from 0.0 to 0.55. The overlay SHALL have `depthWrite: false` and `renderOrder: 1`.

#### Scenario: 50% progress overlay
- **WHEN** break progress is 0.5
- **THEN** overlay opacity is 0.275 and is visible on the block

#### Scenario: No breaking in progress
- **WHEN** `_breaking` is null
- **THEN** overlay is hidden (`visible: false`)

### Requirement: Break progress visual — billboard progress bar
The system SHALL render a progress bar above the breaking block at y+1.15. The bar SHALL consist of a gray background (0.8×0.06) and a colored fill (0.76×0.04, pivot at left edge). The fill SHALL scale on x-axis from 0 to 1 with progress. The fill color SHALL transition: white(#FFF) at 0% → yellow(#FFEB3B) at 25% → orange(#FF9800) at 50% → red(#F44336) at 75% → dark red(#B71C1C) at 100%. Both meshes SHALL billboard via `lookAt(camera.position)` each frame before render, with `DoubleSide`, `depthWrite: false`, `renderOrder: 2-3`.

#### Scenario: Progress bar at 40%
- **WHEN** break progress is 0.4
- **THEN** fill scale.x is 0.4, fill color is approximately orange, bar faces camera

#### Scenario: Progress bar hidden when not breaking
- **WHEN** `_breaking` is null
- **THEN** progress bar meshes are hidden

### Requirement: Break input as hold state
The touch break button SHALL set `mouseButtons[0] = true` and `_breakHeldByTouch = true` on press, and clear both on release. It SHALL NOT use `setInterval` to push repeated `'break'` actions. The PC left mouse button behavior SHALL remain unchanged (mousedown sets `mouseButtons[0] = true`).

#### Scenario: Touch break hold
- **WHEN** player holds touch break button for 0.8 seconds on a stone block (hardness 1.5s)
- **THEN** `mouseButtons[0]` stays true, progress reaches approximately 0.53, no interval-based actions are pushed

#### Scenario: PC left click hold
- **WHEN** player holds left mouse button on a dirt block for 0.5 seconds
- **THEN** progress reaches 1.0 and block is destroyed
