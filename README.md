# Voxel Galleons — The Pirate Republic

A playable Three.js browser game set in the Bahamas in 1715. All game models are generated in code. The fleet combines detailed voxel hulls, smooth animated canvas, rigging, gun decks, and stern galleries. The sloop has a continuous gaff mainsail; the brig and frigate have distinct hull lines and square rigs.

## Run locally

Requires Node.js 20 or newer. From this folder, run:

```sh
npm start
```

Open http://127.0.0.1:4173. Three.js is vendored in `dist/vendor`, so running the game needs no install or build. Google Fonts is optional; local serif and sans-serif fonts are used when unavailable. WebGL 2 is required.

## Play

Recover five floating salvage bundles, sink two navy patrols, and return to Nassau. Cargo earns 150 doubloons and repairs 6 hull points; navy ships earn 300. Finishing the voyage earns 1,000. Repairs at friendly settlements cost 100 doubloons; the black market offers repairs for 75.

| Action | Control |
| --- | --- |
| Raise / lower sails | W / S or up / down arrows |
| Steer port / starboard | A / D or left / right arrows |
| Fire toward nearest enemy | Space |
| Fire port / starboard | Q / E |
| False colours / hoist pirate flag | C or the colours button |
| Set a destination | Click open sea or the expanded chart |
| Chart | M |
| Pause / resume | P or Escape |
| Repair at a friendly port | R |
| Zoom | Mouse wheel |
| Guide | H |
| Choose ship class | B or Change Ship |
| Harbour services | F near a friendly port |
| Upgrade shop | O or Outfit Ship |
| Hide / show the interface | U or Hide UI |
| Developer menu | F2 or Dev |

Touch buttons support steering, sail changes, and cannon fire. Sound is off until enabled. Course setting follows a direct route; steer around islands. Game progress lasts for the current page session.

## The fleet

| Class | Masts | Guns | Hull strength | Top speed |
| --- | ---: | ---: | ---: | ---: |
| Sloop | 1 | 6 | 70 | 11.5 knots |
| Brig | 2 | 12 | 100 | 9.4 knots |
| Frigate | 3 | 24 | 135 | 8.6 knots |
| Galleon | 3 | 28 | 180 | 7.5 knots |

All four classes share a common rendering scale: the sloop is compact, the brig intermediate, and the frigate and galleon much larger. Pirate and navy hulls use identical dimensions for models, collision boundaries, guns, and wakes. These are stylized class proportions, not measured reconstructions of specific historical vessels.

Change ships anywhere with B or Change Ship. Cargo, doubloons, hull condition, and voyage objectives are preserved. Each class has different acceleration, rudder response, and damage resistance. Sailing retains momentum and the ship heels into turns.

Guns fire in a randomized order within one second of the broadside command. Each gun has its own smoke, flash, recoil, aim spread, powder velocity, and ballistic arc. A full reload takes 6.2 seconds. Gun damage is balanced around repeated exchanges: a same-class perfect broadside deals at most half a fresh hull; spread reduces typical damage further. Navy hull strengths match their classes. Shots spread more while moving and fall into the sea at range.

The ocean has moving swells, subtle stepped sunlight in the shallows, planar reflections with ripple distortion, and a connected foam wake that follows the ship's path. MSAA and a higher render resolution smooth silhouettes. Canvas sails have subtle woven seams and wind-driven deformation shared with their shadows.

Ships use oriented hull collisions. Head-on impacts slow both vessels, glancing contacts transfer turning force, and mass determines how far each hull moves. Hard contact damages both ships and sheds timber. Hull separation stays active during damage cooldowns.

## Sea, weather, and the Black Pearl

The player galleon is inspired by the Black Pearl: black timber and weathered canvas, an arched stern gallery, twin glowing lanterns and a winged figurehead. Navy ships retain their own colours. Visual references: [Black Pearl images](https://corsairslegacy.com/article/black_pearl_pirates_of_the_caribbean). All geometry and materials are generated locally; no reference images are shipped as game assets.

The sea uses a varied swell spectrum and irregular wind ripples, with detail filtered at distant zoom to prevent shimmer. Reflections use the overhead camera's parallel viewing direction. Sheltered coastal water and restrained foam follow the shoreline and storm crests. Ships pitch and roll on the same surface as cargo and wakes. The wake remains attached to the stern, conforms to the waves across its width, and retains enough history to fade before segments are removed. The old flat shadow patch beneath ships has been removed.

**F2 → Weather & sea state** provides **Calm**, **Squall**, and **Tempest**, plus independent wave, wind, and rain sliders. Settings apply immediately and remain through voyage restarts, until the page reloads. The default is Squall. Strong wind drives the canvas, flags, rain and gun smoke. Cool illumination, warm lanterns, multisampled HDR rendering, subtle bloom and colour grading create the storm atmosphere.

Powder blasts expand and stretch downwind. Individual billows thin quickly; translucent battle haze drifts for up to about 48 seconds. Older smoke erodes into wisps rather than staying in compact clumps. Effect pools have fixed limits.

## Naval tactics and false colours

Patrols approach on a flank, match a moving target on a parallel course, or circle a stationary target at broadside distance. Predicted hull contacts cause early evasive turns. Ships hold fire when the target is outside their gun arc or another friendly ship or island blocks the shot.

Press **C** before approaching to fly a red naval ensign. Unaware ships and forts remain neutral. Press **C** again to hoist the Jolly Roger: nearby unaware crews take **3.5 seconds** to react. Firing reveals the pirate flag automatically. Witnesses remember the ship for the voyage, so switching flags or ship class cannot reset an encounter. Flags lower and rise when changed.

Steering responds more promptly, acceleration is quicker, and lowering sails brakes sooner. Class differences and coasting remain.

## Battle damage

Cannon impacts break individual hull planks, rails, and fort masonry. Wood and iron fragments spin through the air; timber settles into floating wreckage. Sails acquire irregular tears and frayed edges as hull strength drops. Heavily damaged ships smoke and burn.

Destroyed ships list, lose their mainmast, drift, and sink over about ten seconds. The player sees the full sinking sequence before the loss screen. Forts retain visible breaches and collapsed walls when their batteries are silenced. Repairs and restarting restore the original geometry and canvas.

## Islands and ports

The voyage begins at Nassau’s waterfront. The sailing region contains six islands. Coastal towns have streets, warehouses, markets and working quays; inland ridges carry palm groves, tropical canopy and limestone outcrops. Forts sit on coastal ground. Harbour services are available at the actual dock approaches. Terrain, water, navigation charts and ship collisions share the same coastline. Scroll out to see more of each island.

- **Nassau:** pirate harbour, shipwright, repairs, voyage completion.
- **Smuggler’s Cove:** black market, discounted repairs, and ship upgrades.
- **Crooked Harbour and Salt Key:** settlements, docks, chapels, and shipwrights.
- **Fort Crown and Eastwatch:** Royal Navy bastion forts. Their coastal batteries defend nearby waters; silencing a fort earns 400 doubloons.

Ship flags have cloth motion and readable pirate or navy ensigns on separate mast-top staffs. Ratlines sit clear of the sail panels and connect deck channels to fighting tops.

## Upgrades and developer tools

Open the shop with **O**. Browse anywhere and purchase at any friendly harbour. Upgrades last for the voyage and follow you when changing ship class.

| Fitting | Effect | Prices by level |
| --- | --- | --- |
| Seasoned oak | +12% hull strength per level, 3 levels | 250 / 500 / 850 |
| Fine canvas | +5% sailing speed per level, 3 levels | 225 / 450 / 750 |
| Master rigging | +6% rudder response per level, 3 levels | 200 / 400 / 650 |
| Veteran gun crews | 6% shorter reload per level, 3 levels | 300 / 600 / 900 |
| Fine powder & shot | +15% cannon damage, 1 level | 400 |

The **F2** developer menu grants 1,000 doubloons, individual upgrades or all upgrades, repairs the ship, removes upgrades, and moves the ship to a friendly harbour. It pauses sailing while open. These controls do not change voyage objectives or automatically award a victory.

**U** hides the HUD and world labels for an unobstructed view. Sailing controls remain active; a small Show UI button stays available.

## Project

- `dist/game.js`: Three.js scene, UI, audio, input, particle effects, map.
- `dist/galleon.js`, `dist/fleet.js`: four detailed ship models.
- `dist/canvas-cloth.js`: fabric materials, curved sails, and wind animation.
- `dist/water.js`, `dist/wake.js`: reflective sea, waves, caustics, and wake ribbons.
- `dist/models.js`: shared voxel construction, cargo, shadows.
- `dist/islands.js`, `dist/geography.js`: terrain, buildings, shorelines, and ports.
- `dist/battle-damage.js`: local impact damage, physical debris, repairs, and sinking sequences.
- `dist/flags.js`, `dist/colours.js`: animated flags, disguise and encounter memory.
- `dist/naval-ai.js`: broadside tactics, predictive avoidance and firing lanes.
- `dist/sea-state.js`, `dist/atmosphere.js`: shared wave physics, live weather, rain and post-processing.
- `dist/powder-smoke.js`: gun blasts, wind dispersion, persistent haze and pooled lights.
- `dist/ship-classes.js`: fleet stats and consistent class scale.
- `dist/upgrades.js`: upgrade catalogue, prices, limits, and gameplay modifiers.
- `dist/collisions.js`: convex hull contacts, separation, momentum and impact forces.
- `dist/simulation.js`: ship movement, collisions, combat, voyage rules.
- `dist/index.html`, `dist/style.css`: responsive game HUD.
- `tests/simulation.test.mjs`: gameplay regression checks.

Run `npm test` and `npm run check` for validation. Three.js is MIT licensed; its license is in `dist/vendor/THREE-LICENSE.txt`.
