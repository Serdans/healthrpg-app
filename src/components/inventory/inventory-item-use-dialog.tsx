import { useEffect, useState } from 'react';
import { HeartPulse } from 'lucide-react';

import type { Inventory, PartyRoster } from '#/lib/api';
import { itemEffectLabel } from '#/lib/item-details';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { InventoryItemSprite } from './inventory-item-sprite';

type InventoryItem = Inventory['items'][number];
type PartyMember = PartyRoster['members'][number];

export interface InventoryItemUseDialogProps {
	open: boolean;
	item: InventoryItem | null;
	roster: PartyRoster | null;
	pending?: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (targetUserId: string) => void;
}

export function InventoryItemUseDialog({ open, item, roster, pending = false, onOpenChange, onConfirm }: InventoryItemUseDialogProps) {
	const [targetUserId, setTargetUserId] = useState<string | null>(null);
	const members = roster?.members ?? [];
	const firstMemberId = members[0]?.userId ?? null;

	useEffect(() => {
		if (open) setTargetUserId(firstMemberId);
	}, [open, firstMemberId]);

	const selectedMember = members.find((member) => member.userId === targetUserId);
	const effectLabel = item ? itemEffectLabel(item.details) : null;

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && pending) return;
				onOpenChange(nextOpen);
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						{item && <InventoryItemSprite itemKey={item.key} kind={item.kind} size="md" className="bg-[var(--amethyst-wash)]" />}
						<div>
							<AlertDialogTitle>Use {item?.displayName ?? 'item'}</AlertDialogTitle>
							{effectLabel && (
								<p className="mt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--teal-deep)]">{effectLabel}</p>
							)}
						</div>
					</div>
					<AlertDialogDescription>{item?.details.description ?? 'Choose a traveler to receive this item.'}</AlertDialogDescription>
				</AlertDialogHeader>

				<fieldset className="space-y-2" disabled={pending || members.length === 0}>
					<legend className="game-pixel-label text-[var(--ink-soft)]">Choose a traveler</legend>
					{members.map((member) => (
						<TargetOption key={member.userId} member={member} selected={member.userId === targetUserId} onSelect={setTargetUserId} />
					))}
					{members.length === 0 && (
						<p className="rounded-xl bg-[var(--surface)] p-3 text-sm text-[var(--ink-soft)]">No active travelers are available.</p>
					)}
				</fieldset>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={pending || !item || !selectedMember}
						onClick={(event) => {
							event.preventDefault();
							if (selectedMember) {
								onConfirm(selectedMember.userId);
								onOpenChange(false);
							}
						}}
					>
						<HeartPulse className="size-4" aria-hidden="true" /> {pending ? 'Using…' : 'Use item'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function TargetOption({ member, selected, onSelect }: { member: PartyMember; selected: boolean; onSelect: (userId: string) => void }) {
	const name = member.character?.name ?? member.displayName ?? 'Unnamed traveler';
	return (
		<label
			className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 transition ${
				selected ? 'border-[var(--gold)] bg-[var(--gold-wash)]' : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--gold-line)]'
			}`}
		>
			<span className="flex min-w-0 items-center gap-3">
				<input
					type="radio"
					name="inventory-item-target"
					value={member.userId}
					checked={selected}
					onChange={() => onSelect(member.userId)}
					className="accent-[var(--indigo)]"
				/>
				<span className="min-w-0">
					<strong className="block truncate text-sm text-[var(--indigo)]">{name}</strong>
					<span className="text-xs text-[var(--ink-soft)]">
						{member.character?.className ?? 'Traveler'} ·{' '}
						{member.health ? `${member.health.currentHealth}/${member.health.maxHealth} HP` : 'HP unknown'}
					</span>
				</span>
			</span>
			<span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Lv. {member.progression.level}</span>
		</label>
	);
}
