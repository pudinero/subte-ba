import { gcbaService, type RealtimeInfo } from "../services/gcba.service";

export async function getRealtimePositions(line: string): Promise<{ ID: string; Linea: RealtimeInfo }[]> {
  const clientId = import.meta.env.GCBA_CLIENT_ID || "";
  const clientSecret = import.meta.env.GCBA_CLIENT_SECRET || "";

  const positions = await gcbaService.fetchPositions(clientId, clientSecret);

  return positions;
}

