import express, { type ErrorRequestHandler, type Express } from "express";
import { isValidApiKey } from "./api-key";

export function useJsonBody(app: Express, apiKey: string): void {
  app.use(express.json({ limit: "1mb" }));

  const handleBodyErrors: ErrorRequestHandler = (error, req, res, next) => {
    if (error?.type !== "entity.parse.failed" && error?.type !== "entity.too.large") {
      next(error);
      return;
    }
    if (!isValidApiKey(req.header("x-api-key"), apiKey)) {
      res.status(401).json({ error: "missing or invalid API key" });
      return;
    }
    if (error.type === "entity.too.large") {
      res.status(413).json({ error: "request body is too large" });
      return;
    }
    res.status(400).json({ error: "request body must be valid JSON" });
  };

  app.use(handleBodyErrors);
}
