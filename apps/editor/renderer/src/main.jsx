import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { CaptureOverlay } from './components/capture/CaptureOverlay.jsx';
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css';
import './styles.css';

const root = createRoot(document.getElementById('root'));
const params = new URLSearchParams(window.location.search);
const isCapture = params.get('capture') === '1';
root.render(isCapture ? <CaptureOverlay /> : <App />);
