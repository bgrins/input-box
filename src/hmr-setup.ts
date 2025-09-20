// HMR setup for Lit components to preserve state
// Type augmentation for Vite's HMR API is already provided by Vite
// We'll just use the existing types

export function enableHMR<T extends new (...args: any[]) => any>(
  componentClass: T,
  tagName: string,
): T {
  // This entire block is removed in production builds
  if (import.meta.hot) {
    // Store component states globally during HMR
    const componentStates = new WeakMap<any, any>();
    // Store state before hot reload
    import.meta.hot.dispose(() => {
      const elements = document.querySelectorAll(tagName);
      elements.forEach((el) => {
        const state: Record<string, any> = {};

        // Save all properties and internal state
        const proto = Object.getPrototypeOf(el);
        const descriptors = Object.getOwnPropertyDescriptors(proto);

        for (const [key, descriptor] of Object.entries(descriptors)) {
          if (descriptor.get && key !== "updateComplete") {
            try {
              state[key] = (el as any)[key];
            } catch {}
          }
        }

        // Also save any private fields marked with @state
        const constructor = el.constructor as any;
        if (constructor.__reactivePropertyKeys) {
          constructor.__reactivePropertyKeys.forEach((key: string) => {
            if (key in el) {
              state[key] = (el as any)[key];
            }
          });
        }

        componentStates.set(el, state);
      });
    });

    // Restore state after hot reload
    import.meta.hot.accept(() => {
      const elements = document.querySelectorAll(tagName);
      elements.forEach((el) => {
        const savedState = componentStates.get(el);
        if (savedState) {
          // Restore saved state
          Object.entries(savedState).forEach(([key, value]) => {
            try {
              (el as any)[key] = value;
            } catch {}
          });

          // Force update
          (el as any).requestUpdate?.();
        }
      });
    });
  }

  return componentClass;
}

// Example mixin for components
export const HMRMixin = <T extends new (...args: any[]) => any>(
  superClass: T,
) => {
  return class extends superClass {
    connectedCallback() {
      super.connectedCallback?.();

      if (import.meta.hot) {
        // Restore any saved state for this instance
        const savedState = import.meta.hot.data[this.tagName];
        if (savedState) {
          Object.entries(savedState).forEach(([key, value]) => {
            (this as any)[key] = value;
          });
        }
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();

      if (import.meta.hot) {
        // Save state before component is removed
        const state: Record<string, any> = {};
        for (const key in this) {
          if (typeof (this as any)[key] !== "function") {
            state[key] = (this as any)[key];
          }
        }
        import.meta.hot!.data[this.tagName] = state;
      }
    }
  };
};
