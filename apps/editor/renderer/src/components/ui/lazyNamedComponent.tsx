import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export function lazyNamedComponent<
  TModule extends Record<string, unknown>,
  TExport extends keyof TModule,
>(
  loader: () => Promise<TModule>,
  exportName: TExport
): LazyExoticComponent<ComponentType<any>> {
  return lazy(async () => {
    const mod = await loader();
    return {
      default: mod[exportName] as ComponentType<any>,
    };
  });
}
