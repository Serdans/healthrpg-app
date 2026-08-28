import type { Inventory } from './api';

export type ItemDetails = Inventory['items'][number]['details'];

const statKeys = [
	['strength', 'Strength'],
	['agility', 'Agility'],
	['vitality', 'Vitality'],
	['insight', 'Insight'],
	['defense', 'Defense'],
] as const;

export function itemEffectLabel(details: ItemDetails) {
	const effect = details.effect;
	if (!effect) return null;
	if (effect.kind === 'heal') return `Restores ${effect.amount} HP`;

	const modifiers = statKeys
		.filter(([key]) => effect.modifiers[key] !== undefined)
		.map(([key, label]) => `${label} +${effect.modifiers[key]}`);

	return modifiers.length > 0 ? modifiers.join(' · ') : 'No combat bonus';
}

export function itemKindLabel(kind: Inventory['items'][number]['kind']) {
	if (kind === 'equipment') return 'Equipment';
	if (kind === 'currency') return 'Currency';
	return 'Consumable';
}
