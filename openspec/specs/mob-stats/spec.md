## MODIFIED Requirements

### Requirement: Skeleton attack range and cooldown
Skeleton attack range SHALL be 5.0 (was 8.0). Skeleton attack cooldown SHALL be 2.5s (was 2.0s). Skeleton tracking range SHALL be 12 (was 15).

#### Scenario: Skeleton attacks at moderate range
- **WHEN** player is within 5 blocks of a skeleton
- **THEN** skeleton can attack the player

#### Scenario: Skeleton cannot attack from long range
- **WHEN** player is 7 blocks away from a skeleton
- **THEN** skeleton cannot attack (out of range)

### Requirement: Spider tracking range
Spider tracking range SHALL be 16 (was 20). Spider attack cooldown SHALL be 1.2s (was 1.0s). Spider attack range SHALL be 1.8 (was 1.5).

#### Scenario: Spider detects player at moderate distance
- **WHEN** player is within 16 blocks of a spider
- **THEN** spider begins tracking the player

#### Scenario: Spider ignores distant player
- **WHEN** player is 18 blocks away from a spider
- **THEN** spider does not track the player

### Requirement: Wolf attack cooldown
Wolf attack cooldown SHALL be 1.0s (was 0.8s). Wolf attack range SHALL be 1.5 (was 1.2).

#### Scenario: Wolf attacks with reasonable cooldown
- **WHEN** wolf attacks player
- **THEN** next attack cannot occur for 1.0 seconds

### Requirement: Zombie attack range and cooldown
Zombie attack range SHALL be 2.0 (was 1.5). Zombie attack cooldown SHALL be 1.5s (was 1.0s).

#### Scenario: Zombie attacks with slightly longer range
- **WHEN** player is 1.8 blocks from a zombie
- **THEN** zombie can attack the player
