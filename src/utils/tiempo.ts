import type { CurrentStation } from "../services/gcba.service";

export interface EstadoTren {
  tiempoTexto: string; // "3 minutos", "Ingresando", "En andén", "Ya partió", "Partió hace ..."
  atrasado: boolean; // true si el delay es mayor a 30s
  minutosDeRetraso: number;
}

export function getEstadoTren(
  stationIds: string[],
  direction: CurrentStation[],
  type: "arrival" | "departure",
): EstadoTren | null {
  const parada = direction.find((dir) => stationIds.includes(dir.stop_id));

  if (!parada || isNaN(Number(parada[type]?.time))) {
    return null;
  }

  const ahora = Math.floor(Date.now() / 1000);

  const tiempoPlanificado = parada[type].time;
  const delay = parada[type].delay || 0;

  const totalSegundos = tiempoPlanificado - ahora;

  const atrasado = delay > 30;
  const minutosDeRetraso = Math.round(delay / 60);

  const tiempoRealArribo = parada.arrival.time + (parada.arrival.delay || 0);
  const tiempoRealPartida = parada.departure.time + (parada.departure.delay || 0);

  if (ahora > tiempoRealPartida) {
    const elapsed = ahora - tiempoRealPartida;
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return {
      tiempoTexto: `Partió hace ${parts.join(" ")}`,
      atrasado,
      minutosDeRetraso,
    };
  }

  if (ahora >= tiempoRealArribo && ahora <= tiempoRealPartida) {
    return { tiempoTexto: "En andén", atrasado, minutosDeRetraso };
  }

  if (totalSegundos > 0) {
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;

    if (minutos <= 0) {
      if (segundos <= 35) {
        return {
          tiempoTexto: "En andén",
          atrasado,
          minutosDeRetraso,
        };
      }

      return {
        tiempoTexto: "Ingresando",
        atrasado,
        minutosDeRetraso,
      };
    }

    return {
      tiempoTexto: `en ${minutos <= 1 ? minutos + ' minuto' : minutos + ' minutos'}`,
      atrasado,
      minutosDeRetraso,
    };
  }

  // TODO: En teoría ya no está en el andén
  return { tiempoTexto: "En andén", atrasado, minutosDeRetraso };
}
