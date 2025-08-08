import { diag, DiagConsoleLogger, Tracer } from '@opentelemetry/api';
import { InstrumentationBase, InstrumentationConfig } from '@opentelemetry/instrumentation';
import { OpenTelemetryCallbackHandler } from './opentelemetry-callback-handler';

const VERSION = '1.0.0'; // Define version directly or import from package.json

// Set logging level
diag.setLogger(new DiagConsoleLogger(), 'info');

/**
 * LangChain Instrumentation for OpenTelemetry
 */
class LangChainInstrumentation extends InstrumentationBase {
  private _callbackHandler: OpenTelemetryCallbackHandler | null;
  private _patched: Map<any, Map<string, any>>;

  /**
   * Constructor
   * @param config Configuration options
   */
  constructor(config: InstrumentationConfig = {}) {
    super('langchain-instrumentation', VERSION, config);
    this._callbackHandler = null;
    this._patched = new Map();
  }

  /**
   * Initialize instrumentation
   */
  init() {
    return [
      {
        moduleExports: {},
        name: 'langchain',
        patch: this._patchLangChain.bind(this),
        unpatch: this._unpatchLangChain.bind(this),
      }
    ];
  }

  /**
   * Patch LangChain modules
   */
  async _patchLangChain() {
    if (this._moduleNotLoaded('langchain')) {
      return;
    }

    // Import langchain dynamically
    try {
      const langchain = await import('langchain');
      const { CallbackManager } = await import('langchain/callbacks');
      
      // Create and store callback handler
      this._callbackHandler = new OpenTelemetryCallbackHandler({
        tracer: this.tracer
      });
      
      // Patch CallbackManager
      this._wrap(
        CallbackManager.prototype,
        'constructor',
        this._patchCallbackManagerConstructor.bind(this)
      );
      
      // Also patch addHandler method
      this._wrap(
        CallbackManager.prototype,
        'addHandler',
        this._patchAddHandler.bind(this)
      );
      
      diag.debug('LangChain instrumentation patched');
    } catch (error) {
      diag.error(`LangChain instrumentation failed to patch: \${error.message}`);
    }
  }

  /**
   * Patch CallbackManager constructor to add our handler
   */
  _patchCallbackManagerConstructor(original) {
    const instrumentation = this;
    
    return function patchedConstructor(...args) {
      // Call original constructor
      const result = original.apply(this, args);
      
      // Add our callback handler if not already present
      const hasOtelHandler = this.handlers?.some(
        handler => handler instanceof OpenTelemetryCallbackHandler
      );
      
      if (!hasOtelHandler && instrumentation._callbackHandler) {
        // Add handler with inheritable flag set to true
        this.addHandler(instrumentation._callbackHandler, true);
      }
      
      return result;
    };
  }

  /**
   * Patch addHandler method to avoid duplicating our handler
   */
  _patchAddHandler(original) {
    const instrumentation = this;
    
    return function patchedAddHandler(handler, ...args) {
      // Skip adding our handler again if one is already present
      if (handler instanceof OpenTelemetryCallbackHandler) {
        const hasOtelHandler = this.handlers?.some(
          h => h instanceof OpenTelemetryCallbackHandler
        );
        
        if (hasOtelHandler) {
          return this;
        }
      }
      
      return original.apply(this, [handler, ...args]);
    };
  }

  /**
   * Helper to check if a module is loaded
   */
  _moduleNotLoaded(name: string): boolean {
    try {
      // For ES modules, we'll assume the module is available
      // In a real implementation, you might want to use dynamic import
      return false;
    } catch (e) {
      return true;
    }
  }

  /**
   * Wrap target method with patched version and record it for later unwrapping
   */
  _wrap(target: any, methodName: string, wrapper: (original: any) => any) {
    if (!target || !methodName) return;
    
    const original = target[methodName];
    if (!original) return;
    
    const wrapped = wrapper(original);
    target[methodName] = wrapped;
    
    // Record what we've patched
    if (!this._patched.has(target)) {
      this._patched.set(target, new Map());
    }
    this._patched.get(target).set(methodName, original);
  }

  /**
   * Unpatch LangChain modules
   */
  _unpatchLangChain() {
    for (const [target, methods] of this._patched.entries()) {
      for (const [methodName, original] of methods.entries()) {
        target[methodName] = original;
      }
    }
    this._patched.clear();
    diag.debug('LangChain instrumentation unpatched');
  }
}

export default LangChainInstrumentation;