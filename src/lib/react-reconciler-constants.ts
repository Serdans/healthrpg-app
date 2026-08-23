// @pixi/react 8.0.5 imports this module without the .js extension. Keeping the
// small constants surface as ESM lets TanStack Start SSR it without evaluating
// React's CommonJS compatibility wrapper as an ES module.
export const ConcurrentRoot = 1;
export const ContinuousEventPriority = 8;
export const DefaultEventPriority = 32;
export const DiscreteEventPriority = 2;
export const IdleEventPriority = 268435456;
export const LegacyRoot = 0;
export const NoEventPriority = 0;
