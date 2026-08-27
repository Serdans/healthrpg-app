export type BattleArenaSide = 'enemy' | 'party';

export type BattleArenaRow = 'back' | 'front';

/** A viewport-independent formation slot in the terrain's floor plane. */
export interface BattleFloorSlot {
	laneWeight: number;
	depth: number;
	row: BattleArenaRow;
}

interface FormationPoint extends BattleFloorSlot {}

const PARTY_LANE_WEIGHTS: Partial<Record<number, readonly number[]>> = {
	2: [0.18, 0.82],
	3: [0, 0.5, 1],
	4: [0.08, 0.92, 0.08, 0.92],
	5: [0.04, 0.5, 0.96, 0.22, 0.78],
	6: [0.04, 0.5, 0.96, 0.08, 0.54, 1],
};

const ENEMY_FORMATIONS: Partial<Record<number, readonly FormationPoint[]>> = {
	1: [{ laneWeight: 0.5, depth: 0.2, row: 'back' }],
	2: [
		{ laneWeight: 0.18, depth: 0.18, row: 'back' },
		{ laneWeight: 0.82, depth: 0.46, row: 'front' },
	],
	3: [
		{ laneWeight: 0.08, depth: 0.16, row: 'back' },
		{ laneWeight: 0.5, depth: 0.3, row: 'front' },
		{ laneWeight: 0.92, depth: 0.16, row: 'back' },
	],
	4: [
		{ laneWeight: 0.12, depth: 0.16, row: 'back' },
		{ laneWeight: 0.78, depth: 0.21, row: 'back' },
		{ laneWeight: 0, depth: 0.34, row: 'front' },
		{ laneWeight: 0.64, depth: 0.38, row: 'front' },
	],
	5: [
		{ laneWeight: 0.04, depth: 0.15, row: 'back' },
		{ laneWeight: 0.5, depth: 0.2, row: 'back' },
		{ laneWeight: 0.96, depth: 0.15, row: 'back' },
		{ laneWeight: 0.22, depth: 0.34, row: 'front' },
		{ laneWeight: 0.76, depth: 0.34, row: 'front' },
	],
	6: [
		{ laneWeight: 0.04, depth: 0.15, row: 'back' },
		{ laneWeight: 0.5, depth: 0.2, row: 'back' },
		{ laneWeight: 0.96, depth: 0.15, row: 'back' },
		{ laneWeight: 0, depth: 0.34, row: 'front' },
		{ laneWeight: 0.46, depth: 0.4, row: 'front' },
		{ laneWeight: 0.92, depth: 0.34, row: 'front' },
	],
};

const PARTY_BACK_ROW_DEPTHS = [0.2, 0.24, 0.2];
const PARTY_FRONT_ROW_DEPTHS = [0.96, 1, 0.96];
const PARTY_ARC_DEPTHS = [0.66, 0.78, 0.66];

function evenlySpacedPositions(count: number): number[] {
	if (count <= 0) return [];
	if (count === 1) return [0.5];

	return Array.from({ length: count }, (_, index) => index / (count - 1));
}

function partyDepth(count: number, index: number): number {
	if (count > 3) {
		const row = index < 3 ? PARTY_BACK_ROW_DEPTHS : PARTY_FRONT_ROW_DEPTHS;
		return row[index % 3] ?? 0.8;
	}
	if (count === 3) return PARTY_ARC_DEPTHS[index] ?? 0.72;
	if (count === 2) return index === 0 ? 0.6 : 0.68;
	return 0.7;
}

function partyRow(count: number, index: number): BattleArenaRow {
	return count > 3 && index < 3 ? 'back' : 'front';
}

function fallbackPartySlot(count: number, index: number): BattleFloorSlot {
	const lanes = PARTY_LANE_WEIGHTS[count] ?? evenlySpacedPositions(count);
	return {
		laneWeight: lanes[index] ?? 0.5,
		depth: partyDepth(count, index),
		row: partyRow(count, index),
	};
}

function partySlots(count: number): BattleFloorSlot[] {
	return Array.from({ length: count }, (_, index) => fallbackPartySlot(count, index));
}

function enemySlots(count: number): BattleFloorSlot[] {
	const formation = ENEMY_FORMATIONS[count];
	return Array.from({ length: count }, (_, index) => {
		const authored = formation?.[index];
		if (authored) return authored;
		const lanes = evenlySpacedPositions(count);
		return {
			laneWeight: lanes[index] ?? 0.5,
			depth: index === 0 ? 0.2 : 0.34,
			row: index === 0 ? 'back' : 'front',
		};
	});
}

/**
 * Returns logical formation slots only. Their screen coordinates are derived
 * by `battle-camera.ts`, which keeps the terrain and every actor on one camera.
 */
export function battleFloorSlots(side: BattleArenaSide, count: number): BattleFloorSlot[] {
	if (count <= 0) return [];
	return side === 'enemy' ? enemySlots(count) : partySlots(count);
}
