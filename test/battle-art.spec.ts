import { describe, expect, it } from 'vitest';

import { battleArtVariant } from '#/lib/battle-art';
import type { BattleArtSource } from '#/lib/battle-art';
import { battleEnemyArtForArchetype, battlePartyArtForClass, dungeonMapMonsterArtForArchetype, enemyArchetypes } from '#/lib/game-art';

const partyClasses = ['warrior', 'rogue', 'ranger', 'cleric', 'mage', 'bard'];

function expectGroundingMetrics(art: BattleArtSource) {
	expect(art.grounding.sourceAnchor.x).toBeGreaterThanOrEqual(0);
	expect(art.grounding.sourceAnchor.x).toBeLessThanOrEqual(1);
	expect(art.grounding.sourceAnchor.y).toBeGreaterThanOrEqual(0);
	expect(art.grounding.sourceAnchor.y).toBeLessThanOrEqual(1);
	expect(art.grounding.scale).toBeGreaterThan(0);
	expect(art.grounding.lift).toBeGreaterThanOrEqual(0);
	expect(art.grounding.shadowWidth).toBeGreaterThan(0);
}

describe('battle sprite grounding metadata', () => {
	it('covers every party class with normalized grounding metrics', () => {
		for (const classKey of partyClasses) {
			expectGroundingMetrics(battlePartyArtForClass(classKey));
		}
	});

	it('covers every enemy archetype with normalized grounding metrics', () => {
		for (const archetypeKey of enemyArchetypes) {
			expectGroundingMetrics(battleEnemyArtForArchetype(archetypeKey));
		}
	});

	it('uses the warrior grounding metrics for an unknown party class', () => {
		expect(battlePartyArtForClass('unknown').grounding).toEqual(battlePartyArtForClass('warrior').grounding);
	});

	it('uses the unknown grounding metrics for an unknown enemy archetype', () => {
		expect(battleEnemyArtForArchetype('unknown-enemy').grounding).toEqual(battleEnemyArtForArchetype('unknown').grounding);
	});

	it('keeps battle and dungeon enemy atlas frames aligned', () => {
		for (const archetypeKey of enemyArchetypes) {
			const battleFrame = battleEnemyArtForArchetype(archetypeKey).atlasFrame;
			const dungeonPosition = dungeonMapMonsterArtForArchetype(archetypeKey).position;
			expect([battleFrame.column, battleFrame.row]).toEqual(dungeonPosition);
		}
	});

	it('rejects prototype properties when resolving art keys', () => {
		expect(battleEnemyArtForArchetype('toString').atlasFrame).toEqual(battleEnemyArtForArchetype('unknown').atlasFrame);
		expect(battlePartyArtForClass('toString').atlasFrame).toEqual(battlePartyArtForClass('warrior').atlasFrame);
	});

	it('treats zero and negative health as defeated', () => {
		expect(battleArtVariant(0, 100)).toBe('defeated');
		expect(battleArtVariant(-1, 100)).toBe('defeated');
		expect(battleArtVariant(49, 100)).toBe('hurt');
		expect(battleArtVariant(50, 100)).toBe('neutral');
	});
});
