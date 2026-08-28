import type { APIRoute } from "astro";
import { gtfsService } from "../../../services/gtfs.service";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const routeId = params.routeId;
  if (!routeId) {
    return new Response(JSON.stringify({ error: "routeId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const forecast = gtfsService.getForecastsById(routeId);

  if (!forecast || forecast.Entity.length === 0) {
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify(forecast), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
