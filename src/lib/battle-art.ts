import type { GroundedAnchor } from '#/lib/sprite-grounding';

export type BattleArtVariant = 'neutral' | 'hurt' | 'defeated';

export interface BattleSpriteGrounding {
	/** Visible contact point inside the source atlas cell. */
	sourceAnchor: GroundedAnchor;
	/** Source cell size relative to the entity stage. */
	scale: number;
	/** Distance above the stage ground point, normalized to the stage size. */
	lift: number;
	/** Contact shadow width relative to the entity stage. */
	shadowWidth: number;
}

export interface BattleAtlasFrame {
	columns: number;
	rows: number;
	column: number;
	row: number;
}

export interface BattleArtSource {
	src: string;
	atlasFrame: BattleAtlasFrame;
	grounding: BattleSpriteGrounding;
}

function framePosition(index: number, size: number): string {
	return size <= 1 ? '0%' : `${(index / (size - 1)) * 100}%`;
}

/** Derives the DOM sprite crop from the same frame metadata Pixi consumes. */
export function battleArtBackgroundStyle(art: BattleArtSource): { backgroundPosition: string; backgroundSize: string } {
	return {
		backgroundPosition: `${framePosition(art.atlasFrame.column, art.atlasFrame.columns)} ${framePosition(art.atlasFrame.row, art.atlasFrame.rows)}`,
		backgroundSize: `${art.atlasFrame.columns * 100}% ${art.atlasFrame.rows * 100}%`,
	};
}

/** Shared local contact point inside each actor stage. */
export const BATTLE_ENTITY_CONTACT_POINT = {
	x: 0.5,
	y: 1,
} as const satisfies GroundedAnchor;

export function battleArtVariant(currentHealth: number, maxHealth: number): BattleArtVariant {
	if (currentHealth === 0) return 'defeated';
	return currentHealth < maxHealth / 2 ? 'hurt' : 'neutral';
}
