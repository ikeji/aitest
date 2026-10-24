# Effect Config Reference

## Effect Level Progression

Effect level advances every 10 lines: `effectLevel = floor(lines / 10)`, capped at config array length.

## Config Table

| Level | Name (JP) | Name (EN) | Color | Count Base | Speed | Gravity | Flags |
|-------|-----------|-----------|-------|------------|-------|---------|-------|
| 0 | 爆発 | Basic | #ff4400 | 40 | 2.5 | 0.3 | - |
| 1 | 着火 | Fire | #ff6600 | 50 | 3.0 | 0.2 | - |
| 2 | 電撃 | Lightning | #ffff00 | 60 | 3.5 | 0.1 | - |
| 3 | 氷結 | Ice | #00ffff | 55 | 2.5 | 0.15 | - |
| 4 | 毒 | Poison | #8800ff | 65 | 2.8 | 0.25 | - |
| 5 | 炭火 | Coal | #440000 | 70 | 2.0 | 0.35 | smoke |
| 6 | フリッジ | Fridge | #a0ffff | 60 | 3.0 | 0.1 | sparkle |
| 7 | ヒート | Heat | #ff3300 | 80 | 3.5 | 0.2 | wave |
| 8 | サークル | Circle | #ff00aa | 90 | 4.0 | 0.0 | circular |
| 9 | 嵐 | Storm | #88aaff | 100 | 4.5 | 0.15 | lightning |
| 10 | ネオン | Neon | #00ffaa | 110 | 3.5 | 0.05 | neon |
| 11 | ホログラム | Hologram | #ffaa00 | 130 | 3.0 | 0.0 | hologram |
| 12 | ブラックホール | Black Hole | #8800ff | 150 | 5.0 | 0.0 | blackhole |
| 13 | 超神 | Super God | #ffffff | 200 | 6.0 | 0.0 | rainbow, nova |
| 14 | デジタル | Digital | #00ff00 | 300 | 8.0 | 0.0 | digital |
| 15 | シグマ | Sigma | #ff0066 | 500 | 10.0 | 0.0 | sigma |
| 16 | クレイジー | Crazy | #00ffff | 800 | 12.0 | 0.0 | crazy |
| 17 | マッドネス | Madness | #ff00ff | 1000 | 15.0 | 0.0 | madness |
| 18 | アポカリプス | Apocalypse | #ff4500 | 1500 | 20.0 | 0.1 | apocalypse |
| 19 | サブライメーション | Sublimation | #ffffff | 2000 | 25.0 | 0.0 | rainbow, nova, lightning, blackhole |

## Particle Count Formula

```
totalParticles = config.count + lineCount * 15
```

Where `lineCount` is the number of lines cleared (1-4).

## Effect Flags

- `sparkle`: Random white flashes on particles
- `wave`: Blur increases as particle fades
- `circular`: Particles orbit in circles
- `lightning`: ~5% chance of lightning bolt effect
- `neon`: CSS filter blur + saturation
- `hologram`: Particles shimmer
- `blackhole`: Multiple explosion origins
- `rainbow`: HSL hue cycling over lifetime
- `nova`: Size scales with remaining life (expansion effect)
- `digital`: Pixelated/glitch effect
- `sigma`: Extreme particle count + speed
- `crazy`: Chaotic movement + rapid direction change
- `madness`: Random color shifts
- `apocalypse`: Gravity + maximum chaos
- `sublimation`: All flags combined

## Performance Notes

- At levels >= 15, particle counts can exceed 1000 per clear
- Consider capping total active particles at 5000 to prevent browser timeout
- Each particle is a DOM element — remove from DOM when life <= 0