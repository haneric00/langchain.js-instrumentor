import { Tracer } from '@opentelemetry/api';

export interface OpenTelemetryCallbackHandlerConfig {
  tracer: Tracer;
}

export class OpenTelemetryCallbackHandler {
  private tracer: Tracer;

  constructor(config: OpenTelemetryCallbackHandlerConfig) {
    this.tracer = config.tracer;
  }
}