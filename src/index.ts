// Export the main instrumentation class
import { LangChainInstrumentation } from './instrumentation.js';
export { LangChainInstrumentation } from './instrumentation.js';

// Export the callback handler
export { OpenTelemetryCallbackHandler } from './callback-handler.js';

// Export span attributes constants
export { GenAIOperationValues, Span_Attributes } from './span-attributes.js';

// Export package version
export { VERSION } from './version.js';

// Default export for easy importing
export default {
  LangChainInstrumentation,
};

// Register the instrumentation with the auto-instrumentation registry
import { registerInstrumentations } from '@opentelemetry/instrumentation';

/**
 * Function to register this instrumentation library with auto instrumentation
 * @param config - Optional configuration for the instrumentation
 */
// export function registerLangChainInstrumentation(config = {}) {

//   registerInstrumentations({
//     instrumentations: [
//       new LangChainInstrumentation(),
//     ],
//   });
// }