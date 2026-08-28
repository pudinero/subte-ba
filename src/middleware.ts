import { initServices } from "./services/init";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (_ctx, next) => {
  await initServices();
  return next();
});
