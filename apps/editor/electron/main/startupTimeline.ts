import { performance } from 'node:perf_hooks';

export type StartupMeta = Record<string, unknown>;

type StartupEvent = {
  stage: string;
  at: number;
  meta: StartupMeta;
};

type StartupLogger = (event: {
  stage: string;
  elapsedMs: number;
  meta: StartupMeta;
}) => void;

export type StartupTimeline = {
  record: (stage: string, meta?: StartupMeta) => void;
  flush: () => void;
};

export function createStartupTimeline(logger: StartupLogger): StartupTimeline {
  const startedAt = performance.now();
  const events: StartupEvent[] = [];
  let flushed = false;

  const emit = (event: StartupEvent) => {
    logger({
      stage: event.stage,
      elapsedMs: Math.round(event.at - startedAt),
      meta: event.meta,
    });
  };

  return {
    record(stage, meta = {}) {
      const event: StartupEvent = {
        stage,
        at: performance.now(),
        meta,
      };
      events.push(event);
      if (flushed) {
        emit(event);
      }
    },
    flush() {
      if (flushed) {
        return;
      }
      flushed = true;
      events.forEach((event) => emit(event));
    },
  };
}
