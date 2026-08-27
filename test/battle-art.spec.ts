import { describe, expect, it } from 'vitest';

import type { BattleArtSource } from '#/lib/battle-art';
import { battleEnemyArtForArchetype, battlePartyArtForClass } from '#/lib/game-art';

const partyClasses = ['warrior', 'rogue', 'ranger', 'cleric', 'mage', 'bard'];
const enemyArchetypes = ['vermin', 'bat', 'wild-mushroom', 'slime', 'wolf', 'grotto-mite', 'thorn-wolf', 'ruin-sentinel', 'unknown'];

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
});
