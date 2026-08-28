import { gtfsService, GtfsService } from "./gtfs.service";

export enum AlertCause {
  UNKNOWN_CAUSE = 1,
  OTHER_CAUSE = 2,
  TECHNICAL_PROBLEM = 3,
  STRIKE = 4,
  DEMONSTRATION = 5,
  ACCIDENT = 6,
  HOLIDAY = 7,
  WEATHER = 8,
  MAINTENANCE = 9,
  CONSTRUCTION = 10,
  POLICE_ACTIVITY = 11,
  MEDICAL_EMERGENCY = 12,
}

export enum AlertEffect {
  NO_SERVICE = 1,
  REDUCED_SERVICE = 2,
  SIGNIFICANT_DELAYS = 3,
  DETOUR = 4,
  ADDITIONAL_SERVICE = 5,
  MODIFIED_SERVICE = 6,
  OTHER_EFFECT = 7,
  UNKNOWN_EFFECT = 8,
  STOP_MOVED = 9,
}

export interface TimeRange {
  start?: Date;
  end?: Date;
}

export interface EntitySelector {
  route_id: string;
  stop_id?: string;
}

export interface Route {
  ids: string[],
  name: string,
  letter: string,
  href: string,
  alerts: Alert[]
}

export interface Alert {
  active_period: TimeRange;
  informed_entity: EntitySelector;
  cause: string;
  effect: string;
  url?: string;
  header_text: string;
  description_text: string;
  last_updated: string;
}

export interface StopTimeEvent {
  delay: number;
  time: number;
  uncertainty?: number;
}

export interface CurrentStation {
  stop_id: string;
  stop_name: string;
  arrival: StopTimeEvent;
  departure: StopTimeEvent;
}

export interface RealtimeInfo {
  Trip_Id: string;
  Route_Id: string;
  Direction_ID: 0 | 1;
  start_time: string; /* HH:MM:SS */
  start_date: string; /* YYYYMMDD */
  Estaciones: CurrentStation[];
}

export interface Station {
  ids: string[];
  name: string;
  line_combinations: string[];
}

export class GcbaService {
  constructor(private gtfs: GtfsService = gtfsService) {}

  public formatAlert(alert: any, timestamp: number): Alert | null {
    if (!alert) return null;

    return {
      active_period: alert.active_period[0],
      informed_entity: alert.informed_entity[0],
      cause: AlertCause[alert.cause].toString(),
      effect: AlertEffect[alert.effect].toString(),
      url: alert.url,
      header_text: alert.header_text.translation[0]?.text,
      description_text: alert.description_text.translation[0]?.text,
      last_updated: new Date(Number(timestamp) * 1000).toISOString(),
    };
  }

  public async fetchAlerts(
    clientId: string,
    clientSecret: string,
  ): Promise<Alert[]> {
    try {
      const baseUrl = "https://apitransporte.buenosaires.gob.ar/subtes";
      const alertsUrl = `${baseUrl}/serviceAlerts?client_id=${clientId}&client_secret=${clientSecret}&json=1`;
      const res = await fetch(alertsUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch alerts: ${res.statusText}`);
      }

      const feed = (await res.json()) as {
        header: { timestamp: number };
        entity: { id: string; alert: any }[];
      };

      const alerts: Alert[] = [];
      for (const entity of feed.entity ?? []) {
        const formatted = this.formatAlert(entity.alert, feed.header.timestamp);
        if (!formatted) continue;
        alerts.push(formatted);
      }

      console.log(
        `Fetched ${alerts.length} active alerts`,
      );
      return alerts;
    } catch (err) {
      console.error("Error fetching alerts:", err);
      return [];
    }
  }

  public async fetchPositions(
    clientId: string,
    clientSecret: string,
  ): Promise<{ ID: string; Linea: RealtimeInfo }[]> {
    try {
      const baseUrl = "https://apitransporte.buenosaires.gob.ar/subtes";
      const positionsUrl = `${baseUrl}/forecastGTFS?client_id=${clientId}&client_secret=${clientSecret}`;
      const res = await fetch(positionsUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch positions: ${res.statusText}`);
      }

      const feed = (await res.json()) as {
        Header: { timestamp: number };
        Entity: { ID: string; Linea: RealtimeInfo }[];
      };

      // const positions: Position[] = [];
      // for (const entity of feed.entity ?? []) {
      //   const formatted = this.formatPosition(entity.linea, feed.header.timestamp);
      //   if (!formatted) continue;
      //   positions.push(formatted);
      // }

      console.log(
        `Fetched ${feed.Entity.length} active positions`,
      );
      return feed.Entity;
    } catch (err) {
      console.error("Error fetching positions:", err);
      return [];
    }
  }
}

// Singleton instance export
export const gcbaService = new GcbaService();
