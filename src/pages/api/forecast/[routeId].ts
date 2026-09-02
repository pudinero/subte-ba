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

  await gtfsService.initializeForecast(
    import.meta.env.GCBA_CLIENT_ID, 
    import.meta.env.GCBA_CLIENT_SECRET
  );

  const forecast = gtfsService.getForecastsById(routeId);

  if (!forecast || forecast.Entity.length === 0) {
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify(forecast), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Tag": `forecast-${routeId}`,
      "Netlify-CDN-Cache-Control": "public, s-maxage=30, must-revalidate",
      "Cache-Control": "no-cache"
    }
  });
};
