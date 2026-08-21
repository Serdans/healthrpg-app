import { Coins, Leaf, Sword } from 'lucide-react';

import { cn } from '#/lib/utils';
import { inventoryItemArtForKey, inventoryItemSpriteArt } from '#/lib/game-art';
import type { InventoryItemKind } from '#/lib/game-art';

const sizeClasses = {
	xs: 'size-7',
	sm: 'size-9',
	md: 'size-12',
	lg: 'size-14',
} as const;

export type InventoryItemSpriteProps = {
	itemKey: string;
	kind: InventoryItemKind;
	size?: keyof typeof sizeClasses;
	className?: string;
};

export function InventoryItemSprite({ itemKey, kind, size = 'md', className }: InventoryItemSpriteProps) {
	const art = inventoryItemArtForKey(itemKey);
	const sharedClassName = cn('shrink-0 rounded-xl bg-[var(--surface)]', sizeClasses[size], className);

	if (!art) {
		const FallbackIcon = kind === 'currency' ? Coins : kind === 'equipment' ? Sword : Leaf;

		return (
			<span
				className={cn('grid place-items-center text-[var(--amethyst)]', sharedClassName)}
				data-fallback="true"
				data-item-sprite={itemKey}
				data-testid={`inventory-item-sprite-${itemKey}`}
				aria-hidden="true"
			>
				<FallbackIcon className="size-1/2" />
			</span>
		);
	}

	return (
		<span
			className={cn('inventory-item-sprite', sharedClassName)}
			style={{
				backgroundImage: `url('${inventoryItemSpriteArt.src}')`,
				backgroundPosition: art.position,
				backgroundSize: inventoryItemSpriteArt.backgroundSize,
			}}
			data-item-sprite={itemKey}
			data-testid={`inventory-item-sprite-${itemKey}`}
			aria-hidden="true"
		/>
	);
}
