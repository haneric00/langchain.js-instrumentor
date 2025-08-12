import { InstrumentationBase } from '@opentelemetry/instrumentation';
import type { Instrumentation, InstrumentationConfig } from '@opentelemetry/instrumentation';
import  { trace } from '@opentelemetry/api';
import type { MeterProvider, TracerProvider } from '@opentelemetry/api';
import type { LoggerProvider } from '@opentelemetry/api-logs';

import { VERSION } from './version.js';
import { OpenTelemetryCallbackHandler } from './callback-handler.js';
import { CallbackManager } from '@langchain/core/callbacks/manager';
export * from './callback-handler.js';


export class LangChainInstrumentation implements Instrumentation<InstrumentationConfig> {
  private static instance: LangChainInstrumentation;
  private handler: OpenTelemetryCallbackHandler;
  readonly instrumentationName = 'opentelemetry-instrumentation-langchain-v2';
  readonly instrumentationVersion = VERSION;
  private _config: InstrumentationConfig = {};
  private _tracerProvider: TracerProvider | undefined;
  private _meterProvider: MeterProvider | undefined;
  private _loggerProvider: LoggerProvider | undefined;
  
  public constructor(config: InstrumentationConfig = {}) {
    this._config = config;
    const tracer = trace.getTracer(this.instrumentationName, this.instrumentationVersion);
    // const tracerProvider = trace.getTracerProvider();
    // this.setTracerProvider(tracerProvider);
    this.handler = new OpenTelemetryCallbackHandler(tracer);
    this.init();
  }
  
  /**
   * Get the singleton instance of the auto-instrumentation
   */
  public static getInstance(): LangChainInstrumentation {
    if (!LangChainInstrumentation.instance) {
      LangChainInstrumentation.instance = new LangChainInstrumentation();
    }
    return LangChainInstrumentation.instance;
  }
  
  /**
   * Initialize the auto-instrumentation
   */
  public init(): void {
    this.enable();
  }
  
  /**
   * Enable the instrumentation
   */
  public enable(): void {    
    try {
      // The issue is with how CallbackManager.configure works
      // It expects a function that transforms existing handlers, not just an array
      CallbackManager.configure((existingHandlers: any[]) => {
        console.log("Configuring CallbackManager with handlers:", 
                  existingHandlers.length, "existing handlers");
        
        // Check if our handler is already registered to avoid duplication
        const alreadyRegistered = existingHandlers.some(
          (          h: any) => h instanceof OpenTelemetryCallbackHandler
        );
        
        if (alreadyRegistered) {
          console.log("Handler already registered, skipping");
          return existingHandlers;
        }
        
        console.log("Adding OpenTelemetry callback handler");
        return [...existingHandlers, this.handler];
      });
      
      console.log("LangChain auto-instrumentation initialized successfully");
    } catch (error) {
      console.error("Failed to initialize LangChain auto-instrumentation:", error);
    }
  }
  
  /**
   * Disable the auto-instrumentation
   */
  public disable(): void {  
    try {
      // In newer versions of LangChain, we can remove our handler
      CallbackManager.configure([]);
      
      console.log("LangChain auto-instrumentation disabled");
    } catch (error) {
      console.error("Failed to disable LangChain auto-instrumentation:", error);
    }
  }
  
  /**
   * Set the tracer provider
   */
  public setTracerProvider(tracerProvider: TracerProvider): void {
    this._tracerProvider = tracerProvider;
    const tracer = tracerProvider.getTracer(this.instrumentationName, this.instrumentationVersion);
    // if (this.handler) {
    //   this.handler.tracer = tracer;
    // } else {
    //   this.handler = new OpenTelemetryCallbackHandler(tracer);
    // }
    this.handler = new OpenTelemetryCallbackHandler(tracer);

    // CallbackManager.configure([this.handler]);
  }
  
  /**
   * Set the meter provider
   */
  public setMeterProvider(meterProvider: MeterProvider): void {
    this._meterProvider = meterProvider;
    // Implement meter usage if needed
  }
  
  /**
   * Set the logger provider
   */
  public setLoggerProvider(loggerProvider: LoggerProvider): void {
    this._loggerProvider = loggerProvider;
    // Implement logger usage if needed
  }
  
  /**
   * Set the instrumentation config
   */
  public setConfig(config: InstrumentationConfig): void {
    this._config = config;
    // Apply configuration changes if needed
  }
  
  /**
   * Get the instrumentation config
   */
  public getConfig(): InstrumentationConfig {
    return this._config;
  }
  
  /**
   * Customize the handler with additional configuration
   */
  public configureHandler(config: Partial<OpenTelemetryCallbackHandler>): void {
    Object.assign(this.handler, config);
  }
  
  /**
   * Get the callback handler
   */
  public getHandler(): OpenTelemetryCallbackHandler {
    return this.handler;
  }
}

// Export function to get the instrumentation instance
export function getInstrumentation(): LangChainInstrumentation {
  return LangChainInstrumentation.getInstance();
}