import { describe, expect, it } from 'vitest';

import { battleFloorSlots } from '#/lib/battle-arena';
import { battleActorStageSize, battleFloorBoundaryYAtX, createBattleCamera, projectBattleFloorSlot } from '#/lib/battle-camera';
import { battleFloorCalibrationFor } from '#/lib/battle-terrain';

const world = { width: 1672, height: 941 };

function projectedSlots(width: number, height: number, side: 'party' | 'enemy', count: number, terrain: 'ruins' | 'wilds' = 'wilds') {
	const camera = createBattleCamera({ width, height }, world);
	const calibration = battleFloorCalibrationFor(terrain);
	return battleFloorSlots(side, count).map((slot) => projectBattleFloorSlot(camera, calibration, slot, side, count));
}

describe('battle formations', () => {
	it('keeps a three-enemy encounter staggered in one logical formation', () => {
		const slots = battleFloorSlots('enemy', 3);

		expect(slots.map((slot) => slot.row)).toEqual(['back', 'front', 'back']);
		expect(slots.map((slot) => slot.laneWeight)).toEqual([0.08, 0.5, 0.92]);
		expect(slots[0]?.depth).toBe(slots[2]?.depth);
		expect(slots[1]?.depth).toBeGreaterThan(slots[0]?.depth ?? 1);
	});

	it('uses a readable front row and a smaller back row for a full party', () => {
		const slots = battleFloorSlots('party', 6);
		const backRow = slots.slice(0, 3);
		const frontRow = slots.slice(3);

		expect(backRow.every((slot) => slot.row === 'back')).toBe(true);
		expect(frontRow.every((slot) => slot.row === 'front')).toBe(true);
		expect(frontRow.every((slot) => slot.depth > (backRow[0]?.depth ?? 1))).toBe(true);
		expect(backRow.map((slot) => slot.laneWeight)).toEqual([0.04, 0.5, 0.96]);
		expect(frontRow.map((slot) => slot.laneWeight)).toEqual([0.08, 0.54, 1]);
	});
});

describe('battle camera projection', () => {
	it('fills both wide and portrait viewports without changing the reference terrain', () => {
		for (const viewport of [
			{ width: 1280, height: 640 },
			{ width: 390, height: 640 },
			{ width: 768, height: 1024 },
		]) {
			const camera = createBattleCamera(viewport, world);

			expect(camera.scale).toBeGreaterThan(0);
			expect(camera.visibleWorld.width * camera.scale).toBeCloseTo(viewport.width, 8);
			expect(camera.visibleWorld.height * camera.scale).toBeCloseTo(viewport.height, 8);
			expect(camera.visibleWorld.bottom).toBe(world.height);
			expect(camera.originX).toBeGreaterThanOrEqual(0);
			expect(camera.visibleWorld.right).toBeLessThanOrEqual(world.width + 1e-8);
		}
	});

	it('remaps side lanes inward when portrait cropping narrows the visible floor', () => {
		const wideEnemies = projectedSlots(1280, 640, 'enemy', 2);
		const portraitEnemies = projectedSlots(390, 640, 'enemy', 2);
		const portraitParty = projectedSlots(390, 640, 'party', 3);

		expect(wideEnemies[0]?.x).toBeLessThan(wideEnemies[1]?.x ?? 0);
		expect(portraitEnemies[0]?.x).toBeLessThan(portraitEnemies[1]?.x ?? 0);
		expect(portraitEnemies.every((placement) => placement.x > 390 * 0.5)).toBe(true);
		expect(portraitParty.every((placement) => placement.x < 390 * 0.5)).toBe(true);
		expect(portraitParty[0]?.x).toBeLessThan(portraitParty[1]?.x ?? 0);
		expect(portraitParty[1]?.x).toBeLessThan(portraitParty[2]?.x ?? 1);
	});

	it('keeps floor depth, actor scale, and screen contact points monotonic', () => {
		for (const terrain of ['ruins', 'wilds'] as const) {
			const placements = projectedSlots(1024, 640, 'enemy', 3, terrain);
			const calibration = battleFloorCalibrationFor(terrain);

			expect(placements.every((placement) => placement.x >= 0 && placement.x <= 1024)).toBe(true);
			expect(placements.every((placement) => placement.groundY >= 0 && placement.groundY <= 640)).toBe(true);
			expect(placements[1]?.groundY).toBeGreaterThan(placements[0]?.groundY ?? 1);
			expect(placements[1]?.groundY).toBeGreaterThan(placements[2]?.groundY ?? 1);
			expect(placements[1]?.scale).toBeGreaterThan(placements[0]?.scale ?? 1);
			expect(placements[1]?.zIndex).toBeGreaterThan(placements[0]?.zIndex ?? 0);
			expect(calibration.partyLane[1]).toBeLessThan(calibration.enemyLane[0]);
		}
	});

	it('keeps full-party and enemy contact points below each terrain wall boundary', () => {
		const viewports = [
			{ width: 1672, height: 941 },
			{ width: 1280, height: 640 },
			{ width: 390, height: 640 },
			{ width: 768, height: 1024 },
		];
		const safetyMargin = world.height * 0.02;

		for (const terrain of ['ruins', 'wilds'] as const) {
			const calibration = battleFloorCalibrationFor(terrain);
			for (const viewport of viewports) {
				const camera = createBattleCamera(viewport, world);
				for (const side of ['party', 'enemy'] as const) {
					for (const count of [1, 2, 3, 4, 5, 6]) {
						const placements = battleFloorSlots(side, count).map((slot) => projectBattleFloorSlot(camera, calibration, slot, side, count));

						for (const placement of placements) {
							const boundaryY = battleFloorBoundaryYAtX(calibration, placement.worldX / world.width) * world.height;
							expect(placement.worldY).toBeGreaterThan(boundaryY + safetyMargin);
						}
					}
				}
			}
		}
	});

	it('uses the same projected contact point for DOM sizing and Pixi sizing', () => {
		const viewport = { width: 390, height: 640 };
		const [placement] = projectedSlots(viewport.width, viewport.height, 'enemy', 1);

		const stageSize = battleActorStageSize(viewport, 'enemy', 1, placement.scale);
		const camera = createBattleCamera(viewport, world);

		expect((placement.worldX - camera.originX) * camera.scale).toBeCloseTo(placement.x, 8);
		expect((placement.worldY - camera.originY) * camera.scale).toBeCloseTo(placement.groundY, 8);
		expect(stageSize).toBeGreaterThan(0);
	});

	it('returns no slots for an empty formation', () => {
		expect(battleFloorSlots('party', 0)).toEqual([]);
	});
});
