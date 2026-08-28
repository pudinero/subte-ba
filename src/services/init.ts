import { gtfsService } from './gtfs.service';

let initialized = false;

export async function initServices() {
  if (initialized) return;
  initialized = true;

  const clientId = import.meta.env.GCBA_CLIENT_ID || '';
  const clientSecret = import.meta.env.GCBA_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    console.warn('WARNING: GCBA credentials missing from environment variables');
    return;
  }

  console.log('Initializing GTFS static data service (non-blocking)...');
  gtfsService.initialize(clientId, clientSecret).catch(console.error);

  console.log('Initializing forecast GTFS data service (non-blocking)...');
  gtfsService.initializeForecast(clientId, clientSecret).catch(console.error);
}
