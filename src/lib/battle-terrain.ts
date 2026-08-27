import type { PartyMap } from '#/lib/api';

export type BattleTerrain = 'ruins' | 'wilds';

export interface BattleFloorControlPoint {
	x: number;
	y: number;
}

export interface BattleFloorSurface {
	/** The far floor/wall boundary, ordered from left to right. */
	farRail: readonly BattleFloorControlPoint[];
	/** The near staging rail, ordered with the same lane positions as farRail. */
	nearRail: readonly BattleFloorControlPoint[];
}

/**
 * Floor landmarks are authored in the terrain artwork's reference space.
 * The battle camera maps this space to the current viewport; actors must
 * never carry a second mobile/desktop calibration.
 */
export interface BattleFloorCalibration {
	/** A terrain-specific perspective surface for actor contact points. */
	floorSurface: BattleFloorSurface;
	/** Sprite scale at the far and near edges of the plane. */
	farScale: number;
	nearScale: number;
	/** Side bands expressed as fractions of the visible floor span. */
	partyLane: readonly [number, number];
	enemyLane: readonly [number, number];
	enemyPairLane: readonly [number, number];
}

const battleFloorCalibrations: Record<BattleTerrain, BattleFloorCalibration> = {
	ruins: {
		floorSurface: {
			farRail: [
				{ x: 0.08, y: 0.455 },
				{ x: 0.25, y: 0.425 },
				{ x: 0.5, y: 0.385 },
				{ x: 0.75, y: 0.425 },
				{ x: 0.92, y: 0.455 },
			],
			nearRail: [
				{ x: 0.02, y: 0.64 },
				{ x: 0.25, y: 0.62 },
				{ x: 0.5, y: 0.6 },
				{ x: 0.75, y: 0.62 },
				{ x: 0.98, y: 0.64 },
			],
		},
		farScale: 0.78,
		nearScale: 1.02,
		partyLane: [0.06, 0.36],
		enemyLane: [0.64, 0.94],
		enemyPairLane: [0.7, 0.9],
	},
	wilds: {
		floorSurface: {
			farRail: [
				{ x: 0.07, y: 0.445 },
				{ x: 0.25, y: 0.405 },
				{ x: 0.5, y: 0.355 },
				{ x: 0.75, y: 0.405 },
				{ x: 0.93, y: 0.445 },
			],
			nearRail: [
				{ x: 0.01, y: 0.64 },
				{ x: 0.25, y: 0.62 },
				{ x: 0.5, y: 0.6 },
				{ x: 0.75, y: 0.62 },
				{ x: 0.99, y: 0.64 },
			],
		},
		farScale: 0.78,
		nearScale: 1.02,
		partyLane: [0.06, 0.36],
		enemyLane: [0.64, 0.94],
		enemyPairLane: [0.7, 0.9],
	},
};

export function battleFloorCalibrationFor(terrain: BattleTerrain): BattleFloorCalibration {
	return battleFloorCalibrations[terrain];
}

export function battleTerrainForMap(mapType: PartyMap['currentMap']['mapType']): BattleTerrain {
	switch (mapType) {
		case 'dungeon':
			return 'ruins';
		case 'overworld':
		case 'village':
			return 'wilds';
	}
}
