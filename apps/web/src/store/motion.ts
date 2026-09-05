import { motionValue, type MotionValue } from 'motion/react';

/**
 * Global continuous values.
 *
 * These are MotionValues, not React state, on purpose. They update every
 * frame during a scroll; putting them in state would re-render the tree
 * 60 times a second. Consumers subscribe imperatively with `.on('change')`
 * or bind them straight to a `motion` element's style.
 *
 * Discrete story state (which record is active) lives in store/story.ts.
 */

/** Progress through the entire document, 0..1. */
export const globalProgress: MotionValue<number> = motionValue(0);

/** Progress through the currently pinned record, 0..1. */
export const chapterProgress: MotionValue<number> = motionValue(0);

/**
 * Signal strength, 0..1. Interpolated from each record's declared
 * `signal` range, so it climbs across the survey, peaks at the 3:2 lock,
 * and collapses to zero in SIGNAL LOST.
 */
export const signalStrength: MotionValue<number> = motionValue(0);

/** How much of the hero trace has been plotted, 0..1. */
export const traceProgress: MotionValue<number> = motionValue(0);
