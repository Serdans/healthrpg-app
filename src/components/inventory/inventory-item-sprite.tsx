import { Coins, Leaf, Sword } from 'lucide-react';

import { cn } from '#/lib/utils';
import {
	accessoryItemArtForKey,
	accessorySpriteArt,
	armorItemArtForKey,
	armorSpriteArt,
	inventoryItemArtForKey,
	inventoryItemSpriteArt,
	weaponItemArtForKey,
	weaponSpriteArt,
} from '#/lib/game-art';
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
	const itemArt = inventoryItemArtForKey(itemKey);
	const weaponArt = kind === 'equipment' ? weaponItemArtForKey(itemKey) : undefined;
	const armorArt = kind === 'equipment' ? armorItemArtForKey(itemKey) : undefined;
	const accessoryArt = kind === 'equipment' ? accessoryItemArtForKey(itemKey) : undefined;
	const art = weaponArt ?? armorArt ?? accessoryArt ?? itemArt;
	const spriteArt = weaponArt ? weaponSpriteArt : armorArt ? armorSpriteArt : accessoryArt ? accessorySpriteArt : inventoryItemSpriteArt;
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
				backgroundImage: `url('${spriteArt.src}')`,
				backgroundPosition: art.position,
				backgroundSize: spriteArt.backgroundSize,
				backgroundRepeat: 'no-repeat',
			}}
			data-item-sprite={itemKey}
			data-testid={`inventory-item-sprite-${itemKey}`}
			aria-hidden="true"
		/>
	);
}
