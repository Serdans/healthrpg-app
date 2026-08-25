export type BattleArtVariant = 'neutral' | 'hurt' | 'defeated';

export function battleArtVariant(currentHealth: number, maxHealth: number): BattleArtVariant {
	if (currentHealth === 0) return 'defeated';
	return currentHealth < maxHealth / 2 ? 'hurt' : 'neutral';
}
