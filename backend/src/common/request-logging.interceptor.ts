import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request, Response } from "express";
import { tap } from "rxjs/operators";
import { log } from "./logger";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: { userId?: string } }>();
    const response = http.getResponse<Response>();
    const started = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          log("info", "http.request", {
            method: request.method,
            path: request.originalUrl?.split("?")[0] ?? request.url?.split("?")[0],
            status: response.statusCode,
            ms: Date.now() - started,
            userId: request.user?.userId,
          });
        },
        error: () => {
          log("warn", "http.request", {
            method: request.method,
            path: request.originalUrl?.split("?")[0] ?? request.url?.split("?")[0],
            status: response.statusCode || 500,
            ms: Date.now() - started,
            userId: request.user?.userId,
          });
        },
      }),
    );
  }
}
