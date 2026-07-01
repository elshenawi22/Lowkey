// ============================================================================
// LOWKEY — Media Layer
// Single source of truth for all photography. Separates:
//   - Product imagery (local, curated AI still lifes)
//   - Texture / craft / architecture (real photography via CDN)
// A unified `.luxury-image` filter is applied in CSS so AI + real photography
// share the same warm editorial tone. Swap sources here without touching UI.
// ============================================================================

// Pexels CDN helper — lets us request exact crops/aspect ratios per placement.
const px = (id: number, w: number, h: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

export const media = {
  // --- Real texture / fabric macro ---
  texture: {
    cottonBrown: px(5908251, 1200, 900), // light brown crumpled cotton — warm, sand-toned
    whiteFabric: px(7087669, 1200, 900), // smooth white textile — cream
    linenGray: px(6843273, 1200, 900), // crumpled linen — stone-toned
  },
  // --- Craftsmanship / process ---
  craft: {
    handSewing: px(36356352, 1200, 900), // hand sewing, intricate stitching
    tailorMachine: px(13295278, 1200, 900), // elderly tailor at machine — heritage atelier
    handsSewing: px(11482124, 1200, 900), // hands sewing with needle
  },
  // --- Heritage environments ---
  heritage: {
    libraryArched: px(16131590, 1200, 900), // vintage library, arched window, warm light
    libraryWarm: px(37330364, 1200, 900), // multi-level library, warm lighting
  },
  // --- Architecture / stone (portrait) ---
  architecture: {
    stoneSunlit: px(17286096, 900, 1200), // sunlit heritage stone walls
    moroccanWall: px(38027964, 900, 1200), // sunlit traditional wall, wood detail
  },
  // --- Drop 001 Campaign ---
  drop001: {
    hero: px(36700230, 1200, 1600), // man in white tee, relaxed, warm light
    lookbook1: px(36700206, 900, 1200), // contemplative portrait, moody
    lookbook2: px(31780129, 1200, 800), // textured sweater portrait
    editorial: px(16564574, 1200, 800), // elegant profile, neutral bg
  },
  // --- Egyptian origin story ---
  egypt: {
    alexandriaHarbor: px(15238719, 1200, 800), // Alexandria harbor with Citadel
    alexandriaSkyline: px(36876677, 1200, 800), // Alexandria coastal skyline
    cottonField: px(13924889, 1200, 800), // Cotton field harvest
    cottonBoll: px(13924868, 1200, 800), // Close-up cotton boll
    cottonPlant: px(13924871, 1200, 800), // Cotton plant detail
  },
} as const;
