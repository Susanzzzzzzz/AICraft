## ADDED Requirements

### Requirement: Automated test suite
The system SHALL include a three-layer automated test suite covering pure logic, simulated physics, and browser integration.

#### Scenario: L1 unit tests pass
- **WHEN** running `node tests/unit/inventory.test.js`
- **THEN** all inventory add/remove/hasItem/weaponId tests pass

#### Scenario: L1 crafting tests pass
- **WHEN** running `node tests/unit/crafting.test.js`
- **THEN** all 5 recipe matching and consumption tests pass

#### Scenario: L1 raycast tests pass
- **WHEN** running `node tests/unit/raycast.test.js`
- **THEN** all raycast hit/miss/distance tests pass

#### Scenario: L2 player physics tests pass
- **WHEN** running `node tests/integration/player.test.js`
- **THEN** all gravity/collision/jump/fall damage tests pass

#### Scenario: L3 integration tests pass
- **WHEN** running `node tests/e2e/game.test.js`
- **THEN** game loads without errors and all key bindings respond

### Requirement: First-person weapon visibility
The weapon model SHALL be visible in first-person camera mode when a weapon is equipped.

#### Scenario: Weapon visible in first person
- **WHEN** player is in first-person mode and has a weapon equipped
- **THEN** the weapon model is rendered on screen

#### Scenario: Weapon hidden in first person when unequipped
- **WHEN** player is in first-person mode and has no weapon equipped
- **THEN** no weapon model is rendered

### Requirement: Death and respawn
The system SHALL detect when player health reaches 0 and trigger a respawn.

#### Scenario: Health reaches zero
- **WHEN** player health drops to 0
- **THEN** player position resets to spawn, health restores to 20

#### Scenario: Death does not reset inventory
- **WHEN** player respawns after death
- **THEN** inventory contents are preserved

### Requirement: Missing crafting recipes
The system SHALL provide recipes for iron sword and netherite sword.

#### Scenario: Iron sword recipe exists
- **WHEN** player places IRON_INGOT and STICK in crafting grid vertically
- **THEN** the result shows SWORD_IRON

#### Scenario: Netherite sword recipe exists
- **WHEN** player places NETHERITE_SCRAP and STICK in crafting grid vertically
- **THEN** the result shows SWORD_NETHERITE
