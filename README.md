# Voxel Galleons — The Pirate Republic

A playable Three.js browser game set in the Bahamas in 1715. The reference image inspired the voxel galleons, animated canvas, Caribbean water, and floating cargo. All game models are generated in code. The rebuilt fleet combines detailed voxel hulls, smooth animated canvas, rigging, gun decks, and stern galleries. The sloop has a continuous gaff mainsail; the brig and frigate have distinct hull lines and square rigs.

## Run locally

The public game is hosted at [Voxel Galleons](https://graceundergravity.github.io/VoxelGalleons/).

GitHub Actions checks the game and publishes `dist/` to GitHub Pages after pushes to `main`. In the repository's Pages settings, the publishing source is GitHub Actions. Local preview files, development screenshots, dependencies, and hosting metadata are excluded.

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

## Town life and evacuation

Bombardment sends voxel residents out of nearby buildings. Each person chooses a separate route around buildings and away from the shore and recent impacts. They spread into different streets and inland areas, take brief rests, and continue moving; renewed attacks change their routes. Their population is capped at 180.

On each voyage, 12% of enemy crews are willing to abandon ship when hull integrity drops below 28%. They cease firing, launch one rowboat (two for a galleon), and scuttle the hull. Four seated sailors row each boat with connected hands and oars, a coordinated pull, and lifted, feathered blades on the return. Boats navigate around islands to an intact navy harbour, or a peaceful neutral settlement if both forts are lost. Survivors disembark and disperse on land. Navy fort gates swing open as they approach, remain open during passage, and close after everyone clears the entrance; arriving crews enter the courtyard. Scuttled ships award their bounty once.

Cannonballs can hit exposed civilians and rowers. Buildings intercept shots before they reach people behind them. Ground strikes throw dirt and stone, leave bounded terrain marks, and can kill people within 1.25 metres; survivors flee again. Fallen voxel characters topple and fade after 12 seconds. Boats with fewer rowers travel more slowly, and only surviving crew count as rescued. New voyages clear these changes.

**F2 → Evacuation previews** can evacuate a nearby town or force the nearest enemy to abandon ship. Resume the game to watch.

Cannoneers now adjust elevation between 14° down and 12° up for a ship in their firing lane, accounting for hull height, range, and gravity. Horizontal spread, shot lifetime, firing timing, and damage remain unchanged. Manual shots with no ship in their lane retain their normal trajectory for shore bombardment.

## The fleet

| Class | Masts | Guns | Hull strength | Top speed |
| --- | ---: | ---: | ---: | ---: |
| Sloop | 1 | 6 | 70 | 11.5 knots |
| Brig | 2 | 12 | 100 | 9.4 knots |
| Frigate | 3 | 24 | 135 | 8.6 knots |
| Galleon | 3 | 50 | 180 | 7.5 knots |

All four classes now share a common rendering scale: the sloop is compact, the brig intermediate, and the frigate and galleon much larger. Pirate and navy hulls use identical dimensions for models, collision boundaries, guns, and wakes. These are stylized class proportions, not measured reconstructions of specific historical vessels.

Change ships anywhere with B or Change Ship. Cargo, doubloons, hull condition, and voyage objectives are preserved. Each class has different acceleration, rudder response, and damage resistance. Sailing retains momentum and the ship heels into turns.

Guns fire in a randomized order: the galleon has 25 guns per side firing over 1.5 seconds; the other classes fire within one second. Galleon damage remains 70 per full broadside, divided among its 25 cannonballs (2.8 each). Each gun has its own smoke, flash, recoil, aim spread, powder velocity, and ballistic arc. A full reload takes 6.2 seconds. Gun damage is balanced around repeated exchanges: a same-class perfect broadside deals at most half a fresh hull; spread reduces typical damage further. Navy hull strengths match their classes. Shots spread more while moving and fall into the sea at range.

The ocean has moving swells, subtle stepped sunlight in the shallows, planar reflections with ripple distortion, and a connected foam wake that follows the ship's path. MSAA and a higher render resolution smooth silhouettes. Canvas sails have subtle woven seams and wind-driven deformation shared with their shadows.

Ships use oriented hull collisions. Head-on impacts slow both vessels, glancing contacts transfer turning force, and mass determines how far each hull moves. Hard contact damages both ships and sheds timber. Individual cannons can be knocked out by direct hits or loss of their carriage supports and nearby deck connections. Detached guns tumble into the sea and stop firing immediately, including during an ordered broadside. The HUD shows working guns; harbour repairs restore them. Hull separation stays active during damage cooldowns.

## Sea, weather, and the Black Pearl

The player galleon is inspired by the Black Pearl: black timber and weathered canvas, an arched stern gallery, twin glowing lanterns and a winged figurehead. Navy ships retain their own colours. Visual references include the supplied film-set photograph and [additional Black Pearl images](https://corsairslegacy.com/article/black_pearl_pirates_of_the_caribbean). All geometry and materials are generated locally; no reference images are shipped as game assets.

The sea uses a varied swell spectrum and irregular wind ripples, with detail filtered at distant zoom to prevent shimmer. Reflections use the overhead camera's parallel viewing direction. Sheltered coastal water and restrained foam follow the shoreline and storm crests. The surface uses rich teal and jade colour variation with fine, filtered flecks inspired by the original voxel sea. Ships sample the water beneath their whole hull and respond through damped heave, pitch and roll. Larger, heavier classes resist rapid wave motion; steering remains responsive. An advancing bow gains buoyancy at a crest, then settles gradually, with short sprays thrown sideways when it meets the next wave. The wake remains attached to the stern, conforms to the waves across its width, and retains enough history to fade before segments are removed. The old flat shadow patch beneath ships has been removed.

**F2 → Weather & sea state** provides **Calm**, **Squall**, and **Tempest**, plus independent wave, wind, and rain sliders. Settings apply immediately and remain through voyage restarts, until the page reloads. The default is Squall. Strong wind drives the canvas, flags, rain and gun smoke. Cool illumination, warm lanterns, multisampled HDR rendering, subtle bloom and colour grading create the storm atmosphere.

Powder blasts retain their initial muzzle momentum, then bend and stretch into the current north-easterly wind. Gusts and the developer wind slider control both new smoke and lingering haze; stronger wind carries it farther. Individual billows thin quickly; translucent battle haze drifts for up to about 48 seconds. Older smoke erodes into wisps rather than staying in compact clumps. Effect pools have fixed limits.

## Naval tactics and false colours

Patrols approach on a flank, match a moving target on a parallel course, or circle a stationary target at broadside distance. Predicted hull contacts cause early evasive turns. Gun crews predict the target’s movement and fire when enough individual barrels have a useful shot, including during evasive turns. They no longer wait for near-perfect alignment. Guns with obstructed lanes do not count toward that opportunity; friendly ships, islands, reloads and false-colour surprise still matter.

Press **C** before approaching to fly a red naval ensign. Unaware ships and forts remain neutral. Press **C** again to hoist the Jolly Roger: nearby unaware crews take **3.5 seconds** to react. Firing reveals the pirate flag automatically. Witnesses remember the ship for the voyage, so switching flags or ship class cannot reset an encounter. Flags lower and rise when changed.

Steering responds more promptly, acceleration is quicker, and lowering sails brakes sooner. Class differences and coasting remain.

## Battle damage

Cannon impacts break individual hull planks, rails, and fort masonry. Wood and iron fragments spin through the air; timber settles into floating wreckage. Sails acquire irregular tears and frayed edges as hull strength drops. Heavily damaged ships smoke and burn.

Destroyed ships list, lose their mainmast, drift, and sink over about ten seconds. The player sees the full sinking sequence before the loss screen. Forts retain visible breaches and collapsed walls when their batteries are silenced. Repairs and restarting restore the original geometry and canvas.

Settlement cottages, taverns, warehouses, chandlers, cooperages, boatwright workshops, harbour offices, market stalls, council houses and churches also take cannon damage. Face the shore with a broadside and fire **Q / E**. Individual wall blocks and roof tiles break away; repeated hits bring the structure down into a lasting rubble pile with dust and debris. Both sides’ cannonballs can hit buildings. Some houses and warehouses contain flammable stores: early hits have a 35% chance to start a fire there, and sustained damage eventually ignites the exposed stores. Fires deal gradual damage, send smoke downwind, and burn out within 12 seconds of collapse. Terrain and ruins stop low shots. A new voyage restores the towns; harbour services remain available.

## Islands and ports

The voyage begins at Nassau’s waterfront. The six islands have roughly four to seven times their original land area, across a larger sailing region. Coastal towns put warehouses and boatwrights at the quay, shops around connecting streets, civic buildings near the centre, and homes inland. Terraced foundations keep buildings seated on the hillsides; inland ridges carry palm groves, tropical canopy and limestone outcrops. Forts sit on coastal ground. Harbour services are available at the actual dock approaches. Terrain, water, navigation charts and ship collisions share the same coastline. Scroll out to see more of each island.

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
- `dist/settlements.js`, `dist/town-plots.js`, `dist/town-models.js`, `dist/building-damage.js`: shared town layouts, distinct building models, cannon collisions and ruins.
- `dist/evacuation.js`, `dist/town-life.js`: civilian routing, crew escape, rowing animation and NPC casualties.
- `dist/gunnery.js`, `dist/ground-scars.js`: limited vertical aiming and terrain strike marks.
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
