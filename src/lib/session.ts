import { createServerFn } from '@tanstack/react-start';

import { loadSession } from '#/server/session';
import type { SessionState } from '#/server/session';

export const getSession = createServerFn({ method: 'GET' }).handler(async (): Promise<SessionState> => loadSession());
