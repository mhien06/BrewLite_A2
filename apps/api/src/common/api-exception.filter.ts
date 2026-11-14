import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

type HttpResponse = { status(code: number): HttpResponse; json(body: unknown): void };
type HttpRequest = { url: string };

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponse>();
    const request = context.getRequest<HttpRequest>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const original = exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = typeof original === 'object' && original !== null ? original as Record<string, unknown> : null;
    const rawMessage = body?.message ?? (typeof original === 'string' ? original : 'Internal server error');
    const details = body && Object.fromEntries(
      Object.entries(body).filter(([key]) => !['statusCode', 'error', 'code', 'message'].includes(key)),
    );
    response.status(status).json({
      statusCode: status,
      error: body?.error ?? (status >= 500 ? 'Internal Server Error' : 'Request Error'),
      code: body?.code,
      message: Array.isArray(rawMessage) ? rawMessage.join('; ') : rawMessage,
      ...(details && Object.keys(details).length ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
