# Tetris Guideline Summary

## Scoring (per line clear, multiplied by level)

| Lines | Non-B2B | Back-to-Back |
|-------|---------|-------------|
| 1     | 100     | 200         |
| 2     | 300     | 400         |
| 3     | 500     | 700         |
| 4 (Tetris) | 800 | 1200       |

Combo bonus: `combo_count * 50` per clear (added after line score).

Back-to-back (B2B) is active when the previous clear was a Tetris (4 lines) or a T-Spin.

## Level Progression

- Level increases every 10 lines cleared: `level = floor(lines / 10) + 1`
- Drop interval decreases by 50ms per level: `interval = max(100, 1000 - (level - 1) * 50)`

## SRS (Super Rotation System)

### Kick tables for non-I pieces (rotations: 0=spawn, R=Right, 2=Down, _=Left)

```
0 → R: [0,0], [-1,0], [-1,-1], [0,2], [-1,2]
R → 0: [0,0], [1,0], [1,-1], [0,2], [1,2]
R → 2: [0,0], [1,0], [1,1], [0,-2], [1,-2]
2 → R: [0,0], [-1,0], [-1,1], [0,-2], [-1,-2]
2 → 0: [0,0], [1,0], [1,1], [0,-2], [1,-2]
0 → 2: [0,0], [-1,0], [-1,-1], [0,2], [-1,2]
```

### Kick tables for I piece

```
0 → R: [0,0], [-2,0], [1,0], [-2,1], [1,-2]
R → 0: [0,0], [2,0], [-1,0], [2,-1], [-1,2]
R → 2: [0,0], [1,0], [-2,0], [1,2], [-2,-1]
2 → R: [0,0], [-1,0], [2,0], [-1,-2], [2,1]
2 → 0: [0,0], [2,0], [-1,0], [2,-1], [-1,2]
0 → 2: [0,0], [-2,0], [1,0], [-2,1], [1,-2]
```

### Rotation mapping

| Index | Name |
|-------|------|
| 0     | Spawn |
| 1     | Right |
| 2     | Down (Upside-down) |
| 3     | Left |

To get the kick table key: `${oldRot}${newRotName}` where newRotName is `['0','R','2','_'][newRotation]`.

## 7-Piece Bag

Pieces are dealt from a shuffled bag containing all 7 pieces (I, O, T, S, Z, J, L).
When the bag is empty, a new shuffled bag is created.
This ensures roughly even distribution while maintaining unpredictability.

## ARE (Animation Reaction Time)

- 0.5 seconds between piece lock and next piece spawn
- Not strictly required for single-file games, but affects feel

## Soft Drop

- Soft drop moves piece down 1 row per key frame
- Score: 1 point per row (not multiplied by level)
