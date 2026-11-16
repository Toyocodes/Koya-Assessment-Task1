import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";

function messageFrom(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === "string") {
    return response;
  }
  if (response && typeof response === "object" && "message" in response) {
    const message = (response as { message: unknown }).message;
    if (Array.isArray(message)) {
      return String(message[0] ?? exception.message);
    }
    if (typeof message === "string") {
      return message;
    }
  }
  return exception.message;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = status === HttpStatus.NOT_FOUND && /^Cannot \w+ /.test(messageFrom(exception)) ? "route not found" : messageFrom(exception);
      response.status(status).json({ error: message });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "internal server error" });
  }
}
