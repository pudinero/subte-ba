import fs from "fs";
import os from 'node:os';
import path from "path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import type { RealtimeInfo } from "./gcba.service";

export interface Route {
  name: string;
  long_name: string;
  color: string;
}

export interface RawForecastData {
  Header: { timestamp: number };
  Entity: { ID: string; Linea: RealtimeInfo }[];
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FORECAST_CACHE_TTL_MS = 30 * 1000; // 30 seconds

export class GtfsService {
  private routesMap = new Map<string, Route>();
  private lastForecastData: RawForecastData | null = null;
  private dataDir = path.join(os.tmpdir(), "data");
  private zipPath = path.join(this.dataDir, "feed-gtfs.zip");
  private isDownloading = false;
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshForecastGTFSTimer: NodeJS.Timeout | null = null;
  private dataReadyPromise: Promise<void> | null = null;
  private forecastGTFSDataReadyPromise: Promise<void> | null = null;

  constructor() {
    this.lastForecastData = null;
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  public isCacheValid(): boolean {
    if (!fs.existsSync(this.zipPath)) {
      return false;
    }
    try {
      const stats = fs.statSync(this.zipPath);
      const ageMs = Date.now() - stats.mtimeMs;
      return ageMs < CACHE_TTL_MS;
    } catch {
      return false;
    }
  }

  public parseRoutesCsv(content: string): Map<string, Route> {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
    const map = new Map<string, Route>();
    for (const record of records) {
      map.set(record.route_id, {
        name: record.route_short_name,
        long_name: record.route_long_name,
        color: record.route_color,
      });
    }
    return map;
  }

  public loadRoutesFromDisk(): boolean {
    if (!fs.existsSync(this.zipPath)) return false;
    try {
      const zip = new AdmZip(this.zipPath);
      const routeEntry = zip.getEntry("routes.txt");
      if (!routeEntry) return false;
      const csvContent = routeEntry.getData().toString("utf8");
      this.routesMap = this.parseRoutesCsv(csvContent);
      console.log(`Loaded ${this.routesMap.size} routes from cached feed GTFS`);
      return true;
    } catch (err) {
      console.error("Error loading GTFS zip from disk:", err);
      return false;
    }
  }

  public async downloadGtfsZip(
    clientId: string,
    clientSecret: string,
  ): Promise<void> {
    if (this.isDownloading) return;
    this.isDownloading = true;

    try {
      console.log("Downloading feed GTFS zip in background...");
      const url = `https://apitransporte.buenosaires.gob.ar/subtes/feed-gtfs?client_id=${clientId}&client_secret=${clientSecret}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          `Failed to download feed GTFS: HTTP ${res.status} ${res.statusText}`,
        );
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const tempPath = `${this.zipPath}.tmp`;
      fs.writeFileSync(tempPath, buffer);
      fs.renameSync(tempPath, this.zipPath);
      this.loadRoutesFromDisk();
    } catch (err) {
      console.error("Error in background feed GTFS download:", err);
    } finally {
      this.isDownloading = false;
    }
  }

  public async initialize(
    clientId: string,
    clientSecret: string,
  ): Promise<void> {
    if (this.dataReadyPromise) {
      return this.dataReadyPromise;
    }

    const onDisk = fs.existsSync(this.zipPath);
    const loadedFromDisk = onDisk && this.loadRoutesFromDisk();

    if (loadedFromDisk) {
      this.dataReadyPromise = Promise.resolve();
    } else if (!this.isCacheValid()) {
      this.dataReadyPromise = this.downloadGtfsZip(
        clientId,
        clientSecret,
      ).catch((err) => {
        console.error("Initial feed GTFS download failed:", err);
      });
    } else {
      this.dataReadyPromise = Promise.resolve();
    }

    if (loadedFromDisk && !this.isCacheValid()) {
      this.downloadGtfsZip(clientId, clientSecret).catch(console.error);
    }

    if (!this.refreshTimer) {
      this.refreshTimer = setInterval(() => {
        this.downloadGtfsZip(clientId, clientSecret).catch(console.error);
      }, CACHE_TTL_MS);
      this.refreshTimer.unref();
    }

    return this.dataReadyPromise;
  }

  public whenDataReady(): Promise<void> {
    return this.dataReadyPromise ?? Promise.resolve();
  }

  public stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  public getRouteById(routeId: string): Route | undefined {
    return this.routesMap.get(routeId);
  }

  public getRouteByName(name: string): Route | undefined {
    for (const route of this.routesMap.values()) {
      if (route.name === name) {
        return route;
      }
    }
    return undefined;
  }

  public isForecastGTFSCacheValid(): boolean {
    const ageMs = Date.now() - (this.lastForecastData?.Header.timestamp || 0) * 1000;
    return ageMs < FORECAST_CACHE_TTL_MS;
  }

  public loadForecastGTFSFromDisk(): boolean {
    return !this.lastForecastData;
  }

  public async fetchForecastGTFS(
    clientId: string,
    clientSecret: string,
  ): Promise<void> {
    if (this.isDownloading) return;
    this.isDownloading = true;

    try {
      console.log("Fetching forecast GTFS in background...");
      const baseUrl = "https://apitransporte.buenosaires.gob.ar/subtes";
      const forecastUrl = `${baseUrl}/forecastGTFS?client_id=${clientId}&client_secret=${clientSecret}`;
      const res = await fetch(forecastUrl);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch forecast GTFS: ${res.status} ${res.statusText}`,
        );
      }

      this.lastForecastData = (await res.json()) as RawForecastData;

      console.log(
        `Fetched ${this.lastForecastData.Entity.length} active positions`,
      );

      this.loadForecastGTFSFromDisk();
    } catch (err) {
      console.error("Error in background forecast GTFS download:", err);
    } finally {
      this.isDownloading = false;
    }
  }

  public async initializeForecast(
    clientId: string,
    clientSecret: string,
  ): Promise<void> {
    if (this.lastForecastData) {
      if (this.isForecastGTFSCacheValid()) {
        console.log("Forecast GTFS cache is valid, no need to fetch");
        return;
      }
    }

    if (!this.forecastGTFSDataReadyPromise) {
      this.forecastGTFSDataReadyPromise = this.fetchForecastGTFS(clientId, clientSecret)
        .catch((err) => {
          console.error("Initial forecast GTFS fetch failed:", err);
        })
        .finally(() => {
          this.forecastGTFSDataReadyPromise = null;
        });
    }

    return this.forecastGTFSDataReadyPromise;
  }

  public whenForecastGTFSDataReady(): Promise<void> {
    return this.forecastGTFSDataReadyPromise ?? Promise.resolve();
  }

  public stopForecastRefreshTimer(): void {
    if (this.refreshForecastGTFSTimer) {
      clearInterval(this.refreshForecastGTFSTimer);
      this.refreshForecastGTFSTimer = null;
    }
  }

  public getForecastsById(routeId: string): RawForecastData | undefined {
    if (!this.lastForecastData) return;

    return {
      Header: this.lastForecastData.Header,
      Entity:
        this.lastForecastData.Entity.filter(
          (data) => data.Linea.Route_Id === routeId,
        ) || [],
    };
  }

  public getLastForecastTimestamp(): number {
    return this.lastForecastData?.Header?.timestamp || 0;
  }
}

// Singleton instance export
export const gtfsService = new GtfsService();
