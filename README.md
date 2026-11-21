[![make.fun · the-catalogue-photo-of-an-2-20261121-0341](https://make.fun/badge/the-catalogue-photo-of-an-2-20261121-0341.svg)](https://make.fun/bounty/the-catalogue-photo-of-an-2-20261121-0341?utm_source=github&utm_medium=readme&utm_campaign=the-catalogue-photo-of-an-2-20261121-0341)
[![rank](https://make.fun/badge/the-catalogue-photo-of-an-2-20261121-0341/tqhieu1105/catalogue-impossible-gadget/rank.svg)](https://make.fun/bounty/the-catalogue-photo-of-an-2-20261121-0341/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=the-catalogue-photo-of-an-2-20261121-0341)
[![reward](https://make.fun/badge/the-catalogue-photo-of-an-2-20261121-0341/tqhieu1105/catalogue-impossible-gadget/reward.svg)](https://make.fun/bounty/the-catalogue-photo-of-an-2-20261121-0341?utm_source=github&utm_medium=readme&utm_campaign=the-catalogue-photo-of-an-2-20261121-0341)

Built for the [make.fun bounty](https://make.fun/bounty/the-catalogue-photo-of-an-2-20261121-0341).

# Catalogue Impossible Gadget

This entry is a studio catalogue photograph of the **CRISP PRESS 3000**, a
manufactured countertop appliance that irons potato chips flat. The absurd job
is shown in use: a wrinkled chip enters from the left, passes between two
precision rollers, and exits perfectly planar on the right, with the control
display reporting its impossible flatness.

`main.ts` draws the entire product shot procedurally. It builds a shaded,
gradient-lit background and a raster canvas in memory, then layers the device,
its rollers, one accessory (the included output tray), screws, glass, display
digits, shadows, highlights, and small product markings. A tiny
embedded bitmap font keeps all labels self-contained. The finished PNG is
written directly to `/output/entry.png` with Node's built-in `zlib` module, so
the program needs no network, package install, or external assets.

Run it with Node 22:

```bash
node main.ts
```

The output is a single catalogue image at `/output/entry.png` (1024 × 1024 or
smaller and under 1 MiB).
