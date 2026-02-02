/**
 * Volume Fade Utilities
 *
 * Provides smooth volume fading for the audio proxy.
 * Uses PCM volume control for silent fades (no Cast "bloop" sounds).
 */
/**
 * Error thrown when fade is aborted
 */
export class FadeAbortedError extends Error {
    finalVolume;
    stepsExecuted;
    constructor(finalVolume, stepsExecuted) {
        super('Fade operation was aborted');
        this.finalVolume = finalVolume;
        this.stepsExecuted = stepsExecuted;
        this.name = 'FadeAbortedError';
    }
}
/**
 * Smoothly fade volume from one level to another
 *
 * Uses the VolumeTransform's PCM volume control for completely silent fades.
 * Latency: ~2-4 seconds from setVolume() to audible change.
 *
 * @param transform - The VolumeTransform to control
 * @param from - Starting volume (0.0 - 1.5)
 * @param to - Target volume (0.0 - 1.5)
 * @param durationMs - Total fade duration in milliseconds
 * @param options - Additional options
 * @returns Promise that resolves when fade completes
 */
export async function fadeVolume(transform, from, to, durationMs, options = {}) {
    const steps = options.steps ?? 30;
    const signal = options.signal;
    const onStep = options.onStep;
    const stepDuration = durationMs / steps;
    const volumeDelta = (from - to) / steps;
    let currentVolume = from;
    let stepsExecuted = 0;
    // Set initial volume
    transform.setVolume(from);
    for (let i = 1; i <= steps; i++) {
        // Check for cancellation
        if (signal?.aborted) {
            return {
                completed: false,
                finalVolume: currentVolume,
                stepsExecuted,
                cancelled: true,
            };
        }
        // Calculate and apply new volume
        currentVolume = Math.max(0, Math.min(1.5, from - volumeDelta * i));
        transform.setVolume(currentVolume);
        stepsExecuted = i;
        // Report progress
        onStep?.(currentVolume, i, steps);
        // Wait for next step (except on last step)
        if (i < steps) {
            await sleep(stepDuration, signal);
            // Check again after sleep
            if (signal?.aborted) {
                return {
                    completed: false,
                    finalVolume: currentVolume,
                    stepsExecuted,
                    cancelled: true,
                };
            }
        }
    }
    // Ensure we end exactly at target
    transform.setVolume(to);
    return {
        completed: true,
        finalVolume: to,
        stepsExecuted: steps,
        cancelled: false,
    };
}
/**
 * Fade out (volume to 0) over duration
 */
export async function fadeOut(transform, durationMs, options = {}) {
    const currentVolume = transform.volume;
    return fadeVolume(transform, currentVolume, 0, durationMs, options);
}
/**
 * Fade in (0 to volume) over duration
 */
export async function fadeIn(transform, targetVolume, durationMs, options = {}) {
    return fadeVolume(transform, 0, targetVolume, durationMs, options);
}
/**
 * Sleep utility that respects AbortSignal
 */
function sleep(ms, signal) {
    return new Promise((resolve) => {
        if (signal?.aborted) {
            resolve();
            return;
        }
        const timeout = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timeout);
            resolve();
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}
//# sourceMappingURL=fade.js.map