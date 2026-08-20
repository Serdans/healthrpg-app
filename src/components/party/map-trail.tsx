import { useMemo } from 'react';

import { Badge } from '#/components/ui/badge';
import type { PartyMap } from '#/lib/api';

export function MapTrail({ map }: { map: PartyMap }) {
	const nodes = useMemo(() => {
		const current = map.nodes.find((node) => node.id === map.currentNodeId);
		const rest = map.nodes.filter((node) => node.id !== map.currentNodeId);
		return current ? [current, ...rest] : map.nodes;
	}, [map]);

	return (
		<div className="space-y-0">
			{nodes.map((node, index) => (
				<div key={node.id} className="node-line flex gap-4 pb-7 last:pb-0">
					<div className="relative z-10 grid size-5 shrink-0 place-items-center rounded-full border-2 border-[var(--parchment-bright)] bg-[var(--line-strong)] shadow-[0_0_0_1px_var(--line-strong)]">
						<span className={`size-2 rounded-full ${node.id === map.currentNodeId ? 'bg-[var(--gold)]' : 'bg-[var(--amethyst)]'}`} />
					</div>
					<div className="-mt-1 flex min-w-0 flex-1 items-start justify-between gap-4">
						<div>
							<p className={`font-extrabold ${node.id === map.currentNodeId ? 'text-[var(--indigo)]' : 'text-[var(--ink)]'}`}>
								{node.name} {node.id === map.currentNodeId && <span className="ml-1 text-xs text-[var(--gold-deep)]">· you are here</span>}
							</p>
							<p className="mt-1 text-xs capitalize text-[var(--ink-soft)]">
								{node.nodeType} · region {node.regionNo}
							</p>
						</div>
						{index === 0 && <Badge className="shrink-0">Current</Badge>}
					</div>
				</div>
			))}
		</div>
	);
}
