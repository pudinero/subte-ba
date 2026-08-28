import { gcbaService, type Alert } from "../services/gcba.service";
import { initServices } from "../services/init";

export async function getAlerts(): Promise<Alert[]> {
  await initServices();

  const clientId = import.meta.env.GCBA_CLIENT_ID || "";
  const clientSecret = import.meta.env.GCBA_CLIENT_SECRET || "";

  const alerts = await gcbaService.fetchAlerts(clientId, clientSecret);

  return alerts;
}
