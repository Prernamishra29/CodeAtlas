import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { GithubUrlError } from "./github-url";
import { log } from "./logger";

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<{ method?: string; url?: string }>();

    if (exception instanceof GithubUrlError) {
      response.status(HttpStatus.BAD_REQUEST).json({ statusCode: 400, message: exception.message });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : body && typeof body === "object" && "message" in body
            ? (body as { message: string | string[] }).message
            : "Request failed";
      response.status(status).json({
        statusCode: status,
        message,
      });
      return;
    }

    log("error", "unhandled_exception", {
      method: request.method,
      path: request.url?.split("?")[0],
      err: exception instanceof Error ? exception.name : "unknown",
      code: exception && typeof exception === "object" && "code" in exception ? String((exception as { code: unknown }).code) : undefined,
    });
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: "An unexpected error occurred.",
    });
  }
}
