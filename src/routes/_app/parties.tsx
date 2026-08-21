import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';

import { PartiesIndex } from '#/components/party/parties-index';

export const Route = createFileRoute('/_app/parties')({
	head: () => ({ meta: [{ title: 'Parties · HealthRPG' }] }),
	component: PartiesPage,
});

function PartiesPage() {
	const pathname = useLocation({ select: (location) => location.pathname });

	if (pathname !== '/parties' && pathname !== '/parties/') return <Outlet />;

	return <PartiesIndex />;
}
