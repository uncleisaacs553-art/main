/* Global tuning for the battle royale. Everything designers touch lives here. */
(function (global) {
  'use strict';

  var WEAPONS = {
    fist: {
      id: 'fist', name: 'Unarmed', slot: 'melee', tier: 0,
      damage: 12, rpm: 120, mag: Infinity, ammo: null, reload: 0,
      spread: 0.030, range: 2.6, pellets: 1, fire: 'semi', zoom: 1,
      recoil: 0.4, headMul: 1.4, color: 0x8a8f98
    },
    hg8: {
      id: 'hg8', name: 'HG-8', slot: 'sidearm', tier: 1,
      damage: 26, rpm: 400, mag: 12, ammo: 'light', reload: 1.5,
      spread: 0.0100, range: 60, pellets: 1, fire: 'semi', zoom: 1.25,
      recoil: 1.4, headMul: 2.0, color: 0xb8bec6
    },
    smg40: {
      id: 'smg40', name: 'SMG-40', slot: 'primary', tier: 2,
      damage: 21, rpm: 900, mag: 30, ammo: 'light', reload: 2.0,
      spread: 0.0160, range: 45, pellets: 1, fire: 'auto', zoom: 1.2,
      recoil: 1.1, headMul: 1.8, color: 0x6f7a86
    },
    arx: {
      id: 'arx', name: 'AR-X', slot: 'primary', tier: 3,
      damage: 30, rpm: 640, mag: 30, ammo: 'heavy', reload: 2.3,
      spread: 0.0090, range: 90, pellets: 1, fire: 'auto', zoom: 1.35,
      recoil: 1.6, headMul: 1.9, color: 0x8b7355
    },
    sg12: {
      id: 'sg12', name: 'SG-12', slot: 'primary', tier: 2,
      damage: 13, rpm: 95, mag: 6, ammo: 'shell', reload: 2.6,
      spread: 0.0550, range: 22, pellets: 9, fire: 'pump', zoom: 1.1,
      recoil: 4.5, headMul: 1.5, color: 0x8d5a3c
    },
    dmr7: {
      id: 'dmr7', name: 'DMR-7', slot: 'primary', tier: 3,
      damage: 55, rpm: 260, mag: 12, ammo: 'heavy', reload: 2.4,
      spread: 0.0045, range: 140, pellets: 1, fire: 'semi', zoom: 2.2,
      recoil: 2.6, headMul: 2.0, color: 0x4f5b52
    },
    awms: {
      id: 'awms', name: 'AWM-S', slot: 'primary', tier: 4,
      damage: 105, rpm: 45, mag: 5, ammo: 'sniper', reload: 3.4,
      spread: 0.0012, range: 260, pellets: 1, fire: 'bolt', zoom: 4.0,
      recoil: 6.0, headMul: 2.2, color: 0x2f3a44
    },
    m1887: {
      id: 'm1887', name: 'M-1887', slot: 'primary', tier: 4,
      damage: 22, rpm: 110, mag: 2, ammo: 'shell', reload: 2.2,
      spread: 0.0420, range: 26, pellets: 6, fire: 'pump', zoom: 1.1,
      recoil: 5.2, headMul: 1.5, color: 0xc9a227
    }
  };

  var CFG = {
    version: '1.0.0',

    world: {
      size: 400,             // playable square, centred on origin
      groundColor: 0x4a6741,
      skyTop: 0x87b7e8,
      skyBottom: 0xd7e9f7,
      fogNear: 90,
      fogFar: 320,
      terrainAmp: 4.2        // gentle rolling hills only
    },

    match: {
      bots: 24,              // + local player = 25 combatants
      skydiveHeight: 150,
      chuteHeight: 48,
      freefallSpeed: 42,
      chuteSpeed: 9,
      steerFree: 26,
      steerChute: 11,
      airdropAt: 95          // seconds into the match
    },

    player: {
      height: 1.75,
      radius: 0.42,
      eye: 1.62,
      walk: 5.2,
      sprint: 8.0,
      crouch: 2.6,
      adsMul: 0.55,
      accel: 42,
      airAccel: 9,
      gravity: 22,
      jump: 7.0,
      maxHealth: 100,
      maxArmor: 100,
      armorAbsorb: 0.5,      // fraction of incoming damage eaten by armour
      stepHeight: 0.65
    },

    combat: {
      falloffStart: 1.0,     // weapon.range = full damage out to here
      falloffEnd: 2.0,       // 2x range = minimum damage
      falloffMin: 0.55,
      limbMul: 0.85,
      moveSpreadMul: 2.2,
      airSpreadMul: 3.0,
      crouchSpreadMul: 0.65,
      adsSpreadMul: 0.45,
      hitmarkTime: 0.18
    },

    items: {
      medkit: { heal: 75, time: 3.0, max: 5 },
      armor:  { value: 50, time: 2.0, max: 5 },
      gloo:   { hp: 400, life: 30, width: 3.2, height: 3.4, depth: 0.45, max: 4, cooldown: 1.2 }
    },

    ammoCaps: { light: 240, heavy: 180, shell: 60, sniper: 30 },
    ammoPickup: { light: 40, heavy: 30, shell: 8, sniper: 5 },

    /* Safe-zone phases: hold, then contract to `radius`, dealing `dps` outside. */
    zone: [
      { hold: 45, shrink: 40, radius: 120, dps: 1 },
      { hold: 35, shrink: 35, radius: 75,  dps: 2 },
      { hold: 30, shrink: 30, radius: 45,  dps: 4 },
      { hold: 25, shrink: 25, radius: 22,  dps: 7 },
      { hold: 20, shrink: 25, radius: 8,   dps: 11 },
      { hold: 15, shrink: 30, radius: 0,   dps: 16 }
    ],
    zoneStartRadius: 180,

    bot: {
      viewRange: 54,
      viewRangeScoped: 100,
      fov: 2.0,              // radians, total cone
      reactionMin: 0.30,
      reactionMax: 1.10,
      burstMin: 2,
      burstMax: 5,
      /* Bots keep looting instead of starting long-range fights until the
         match has settled; they still defend themselves from the first second. */
      passiveUntil: 35,
      passiveEngageRange: 26,
      aimTrackMin: 2.6,      // how fast their aim follows a moving target
      aimTrackMax: 8.0,
      aimErrorMin: 0.9,      // metres of aim wander at the low skill end
      aimErrorMax: 0.18,
      strafeSwap: [0.7, 1.9],
      lootRadius: 30,
      healBelow: 42,
      repathEvery: 1.4
    },

    names: [
      'RAISTAR', 'Nobru', 'GyanGaming', 'AjjuBhai', 'TSG_Jash', 'Sooneeta',
      'B2K', 'Gaming_Tamizhan', 'DesiGamers', 'Sk_Sabir', 'LOKESH', 'MambaOP',
      'Vincenzo', 'Ruok_FF', 'TotalGaming', 'HelpingGamer', 'Zorro', 'Kelly',
      'Andrew', 'Alok', 'Chrono', 'Hayato', 'Wukong', 'Moco', 'Skyler',
      'Nikita', 'Laura', 'Antonio', 'Ford', 'Olivia', 'Caroline', 'Paloma'
    ],

    quality: {
      high:   { shadows: true,  pixelRatio: 2,   drawDistance: 320, props: 1.0 },
      medium: { shadows: false, pixelRatio: 1.5, drawDistance: 260, props: 0.7 },
      low:    { shadows: false, pixelRatio: 1,   drawDistance: 180, props: 0.45 }
    }
  };

  CFG.weapons = WEAPONS;

  /* Ground-loot rarity buckets. Higher tiers are rarer. */
  CFG.lootTable = [
    { id: 'hg8',    w: 14 },
    { id: 'smg40',  w: 20 },
    { id: 'arx',    w: 16 },
    { id: 'sg12',   w: 14 },
    { id: 'dmr7',   w: 9 },
    { id: 'awms',   w: 3 },
    { id: 'ammo',   w: 26 },
    { id: 'medkit', w: 18 },
    { id: 'armor',  w: 14 },
    { id: 'gloo',   w: 16 }
  ];

  CFG.airdropTable = ['awms', 'm1887'];

  global.FF = global.FF || {};
  global.FF.CFG = CFG;
})(window);
