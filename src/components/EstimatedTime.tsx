import { useEffect, useState } from "preact/hooks";
import type { CurrentStation, RealtimeInfo, Station } from "../services/gcba.service";
import type { RawForecastData } from "../services/gtfs.service";
import { getEstadoTren } from "../utils/tiempo";
import LineChip from "./LineChip.tsx";

interface EstimatedTimeProps {
    stations: Station[];
    routeId: string;
    firstStation: string;
    lastStation: string;
}

export default function EstimatedTime(props: EstimatedTimeProps) {
    const { stations, routeId, firstStation, lastStation } = props;

    const [lastForecastData, setLastForecastData] = useState<RawForecastData | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [_tick, setTick] = useState(0);

    let actualPositions: { ID: string; Linea: RealtimeInfo }[] | undefined =
        lastForecastData?.Entity;
    let directionOne: CurrentStation[] = [];
    let directionZero: CurrentStation[] = [];

    if (actualPositions) {
        actualPositions.forEach((pos) => {
            if (pos.Linea.Direction_ID === 0) {
                directionZero.push(...pos.Linea.Estaciones);
            } else {
                directionOne.push(...pos.Linea.Estaciones);
            }
        });
    }

    useEffect(() => {
        const fetchForecast = async () => {
            try {
                const response = await fetch(`/api/forecast/${routeId}`, {
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })

                if (response.status === 200) {
                    const data = await response.json();
                    setLastForecastData(data);
                } else if (response.status === 204) {
                    setLastForecastData(undefined);
                }
            } catch (error) {
                console.error("Error al obtener los datos de GTFS:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchForecast();

        const interval = setInterval(fetchForecast, 30000);
        return () => clearInterval(interval);

    }, [routeId]);

    useEffect(() => {
        const clockInterval = setInterval(() => {
            setTick(prev => prev + 1);
        }, 1000);

        return () => clearInterval(clockInterval);
    }, []);

    return (
        <div
            class="flex flex-col gap-2 bg-zinc-100 w-[stretch] rounded-sm pb-2"
            data-route-id={routeId}
        >
            <div class="flex justify-between items-center px-3 py-2 pb-0">
                <h5>Horarios estimados</h5>
                <p class="text-sm font-light text-end" data-last-update>
                    {
                        lastForecastData?.Header?.timestamp ? (
                            `Últ. actualización: ${new Date(lastForecastData.Header.timestamp * 1000).toLocaleTimeString()}`
                        ) : ("")
                    }
                </p>
            </div>
            <div class="flex flex-col gap-1">
                <div
                    class="flex not-md:flex-col items-stretch gap-0 -mb-1 bg-zinc-800 text-zinc-50"
                >
                    <div class="flex md:flex-1/2 gap-1">
                        <div class={"flex gap-1 min-w-24 w-full items-center pl-3 px-2 py-1"}>
                            <p style="text-xs">Estación</p>
                        </div>
                    </div>
                    <div class="flex md:flex-1/2 gap-0">
                        <div
                            class="flex md:flex-1/12 justify-center gap-1 flex-wrap w-full items-center h-[stretch] not-md:pr-1 py-1"
                        >
                            <p class="text-xs text-pretty">a {firstStation}</p>
                        </div>
                        <div
                            class="flex md:flex-1/12 justify-center gap-1 flex-wrap w-full items-center h-[stretch] not-md:pr-2 pr-1 py-1"
                        >
                            <p class="text-xs text-pretty">a {lastStation}</p>
                        </div>
                    </div>
                </div>
                {
                    stations.map((station) => {
                        return (
                            <div class="flex not-md:flex-col items-stretch gap-0">
                                <div class="flex md:flex-1/2 gap-1">
                                    <div
                                        class={
                                            "flex gap-1 min-w-24 w-full items-center bg-zinc-300 pl-3 px-2 py-1"
                                        }
                                    >
                                        <p style="text-xs">{station.name}</p>
                                        {
                                            station.line_combinations.length !== 0
                                                ? station.line_combinations.map((combination) => (
                                                    <LineChip line={combination} />
                                                ))
                                                : null
                                        }
                                    </div>
                                </div>

                                {loading ? (
                                    <div class="flex md:flex-1/2 gap-0">
                                        <div class="w-full bg-zinc-50">
                                            <div class="relative h-full not-md:min-h-[26.97px] flex-1 overflow-hidden bg-zinc-50">
                                                <div class="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-zinc-300 to-transparent animate-shimmer" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div class="flex md:flex-1/2 gap-0">
                                        <div
                                            class="flex md:flex-1/12 not-md:w-full justify-center gap-1 flex-wrap w-full items-center h-[stretch] px-2 py-1"
                                            data-station-cell="1"
                                            data-station-ids={JSON.stringify(station.ids)}
                                        >
                                            {(() => {
                                                if (directionOne.length === 0) {
                                                    return <p class="text-xs">Sin horarios</p>;
                                                }
                                                const hasStopInDirection = directionOne.some((dir) =>
                                                    station.ids.includes(dir.stop_id),
                                                );
                                                if (!hasStopInDirection) {
                                                    return null;
                                                }
                                                const estado = getEstadoTren(
                                                    station.ids,
                                                    directionOne,
                                                    "arrival",
                                                );
                                                if (!estado) return null;

                                                return (
                                                    <>
                                                        <p
                                                            class={`text-xs text-pretty font-bold ${estado.tiempoTexto === "En andén"
                                                                ? "text-green-600"
                                                                : estado.tiempoTexto === "Ingresando"
                                                                    ? "text-amber-500"
                                                                    : ""
                                                                }`}
                                                        >
                                                            {estado.tiempoTexto}
                                                        </p>

                                                        {(estado.atrasado && estado.minutosDeRetraso >= 5) && (
                                                            <span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium width-fit">
                                                                +{estado.minutosDeRetraso} min
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        <div
                                            class="flex md:flex-1/12 not-md:w-full flex-wrap justify-center gap-1 w-full items-center h-[stretch] pr-3 px-2 py-1"
                                            data-station-cell="0"
                                            data-station-ids={JSON.stringify(station.ids)}
                                        >
                                            {(() => {
                                                if (directionZero.length === 0) {
                                                    return <p class="text-xs">Sin horarios</p>;
                                                }
                                                const hasStopInDirection = directionZero.some((dir) =>
                                                    station.ids.includes(dir.stop_id),
                                                );
                                                if (!hasStopInDirection) {
                                                    return null;
                                                }
                                                const estado = getEstadoTren(
                                                    station.ids,
                                                    directionZero,
                                                    "arrival",
                                                );
                                                if (!estado) return null;

                                                return (
                                                    <>
                                                        <p
                                                            class={`text-xs text-pretty font-bold ${estado.tiempoTexto === "En andén"
                                                                ? "text-green-600"
                                                                : estado.tiempoTexto === "Ingresando"
                                                                    ? "text-amber-500"
                                                                    : ""
                                                                }`}
                                                        >
                                                            {estado.tiempoTexto}
                                                        </p>

                                                        {(estado.atrasado && estado.minutosDeRetraso >= 5) && (
                                                            <span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium width-fit">
                                                                +{estado.minutosDeRetraso} min
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                }
            </div>
        </div>
    )
}