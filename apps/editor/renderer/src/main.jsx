import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css';
import './styles.css';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
