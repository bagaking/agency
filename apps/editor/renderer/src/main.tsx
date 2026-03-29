import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const rootElement = document.getElementById('root');

async function bootstrap() {
  if (!rootElement) {
    return;
  }
  const root = createRoot(rootElement);
  const params = new URLSearchParams(window.location.search);
  const isCapture = params.get('capture') === '1';

  if (isCapture) {
    const [{ ModalProvider }, { CaptureOverlay }] = await Promise.all([
      import('./components/modals/ModalSystem'),
      import('./components/capture/CaptureOverlay'),
    ]);
    root.render(
      <ModalProvider>
        <CaptureOverlay />
      </ModalProvider>
    );
    return;
  }

  const { default: App } = await import('./App');
  root.render(<App />);
}

void bootstrap();
