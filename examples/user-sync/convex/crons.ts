import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Drain user-sync outbox every minute.
crons.interval(
  'fluxomail-user-sync-drain',
  { minutes: 1 },
  internal.fluxomailUserSync.drainOutbox,
  { limit: 50 },
);

export default crons;

