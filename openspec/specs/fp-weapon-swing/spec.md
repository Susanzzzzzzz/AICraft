## ADDED Requirements

### Requirement: First-person weapon swing animation
The system SHALL play a three-phase swing animation on `_fpWeaponGroup` when an attack is performed, synchronized with the third-person animation timing (0.35s total). The animation phases SHALL be: windup (0-0.12s, rotate weapon up), strike (0.12-0.25s, rotate weapon down), recover (0.25-0.35s, return to idle).

#### Scenario: Attack triggers swing animation
- **WHEN** player performs an attack action
- **THEN** `_fpWeaponGroup` plays a 0.35s swing animation with rotation around X-axis

#### Scenario: Windup phase
- **WHEN** swing animation is at 0.06s (mid-windup)
- **THEN** weapon rotation is approximately half-way between idle and raised position

#### Scenario: Strike phase
- **WHEN** swing animation is at 0.18s (mid-strike)
- **THEN** weapon has swung past vertical toward the viewer

#### Scenario: Recovery phase
- **WHEN** swing animation completes at 0.35s
- **THEN** weapon rotation returns to idle position

### Requirement: FP swing triggered by attack action
The `camera.js` SHALL expose a `triggerFpSwing()` method. `main.js` SHALL call this method from `_performAttack()` when the attack executes.

#### Scenario: Attack triggers FP swing
- **WHEN** `_performAttack()` is called
- **THEN** `cameraCtrl.triggerFpSwing()` is called and animation begins

#### Scenario: No animation during cooldown
- **WHEN** `_attackCooldownTimer > 0`
- **THEN** `triggerFpSwing()` is not called
