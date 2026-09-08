const vscode = require('vscode');

const viewId = 'snapcode.sidebar';
const containerCommand = 'workbench.view.extension.snapcode';
const backendUrl = 'http://localhost:3000/api/extract';

class SnapCodeViewProvider {
  constructor(context) {
    this.context = context;
  }

  resolveWebviewView(webviewView) {
    webviewView.webview.options = {
      enableScripts: true
    };
    webviewView.webview.html = getWebviewContent(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(
      (message) => this.handleMessage(webviewView.webview, message),
      undefined,
      this.context.subscriptions
    );
  }

  async handleMessage(webview, message) {
    if (message.command === 'extractCode') {
      try {
        const result = await extractCodeFromBackend(message.dataUrl, message.mimeType, message.filename);
        webview.postMessage({ command: 'extractionResult', success: true, code: result });
      } catch (error) {
        webview.postMessage({
          command: 'extractionResult',
          success: false,
          message: error.message || 'Unable to extract code.'
        });
      }
      return;
    }

    if (message.command === 'copyCode') {
      try {
        await vscode.env.clipboard.writeText(message.code || '');
        webview.postMessage({ command: 'copyResult', success: true });
      } catch {
        webview.postMessage({ command: 'copyResult', success: false, message: 'Unable to copy code.' });
      }
    }
  }
}

async function extractCodeFromBackend(dataUrl, mimeType, filename) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) throw new Error('The pasted image could not be prepared.');

  const imageBuffer = Buffer.from(match[2], 'base64');
  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: mimeType || match[1] }), filename || 'pasted-screenshot.png');

  let response;
  try {
    response = await fetch(backendUrl, { method: 'POST', body: formData });
  } catch {
    throw new Error('Could not reach the extraction server. Is the backend running?');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The extraction server returned an invalid response.');
  }

  if (!result || typeof result !== 'object') {
    throw new Error('The extraction server returned an unexpected response.');
  }

  if (!response.ok || result.success !== true) {
    throw new Error(typeof result.message === 'string' ? result.message : 'Unable to extract code.');
  }

  if (typeof result.code !== 'string' || !result.code.trim()) {
    throw new Error('The extraction server returned empty code.');
  }

  return result.code;
}

function getWebviewContent(webview) {
  const nonce = createNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src blob:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
  <title>SnapCode</title>
  <style nonce="${nonce}">
    :root {
      color-scheme: light dark;
      --border: var(--vscode-panel-border, var(--vscode-widget-border, transparent));
      --muted: var(--vscode-descriptionForeground);
      --accent: var(--vscode-textLink-foreground);
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px 16px 24px;
      color: var(--vscode-sideBar-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      line-height: 1.5;
    }
    .brand { display: flex; align-items: center; gap: 9px; margin-bottom: 28px; }
    .mark {
      display: grid;
      place-items: center;
      width: 25px;
      height: 23px;
      border: 1px solid var(--accent);
      color: var(--accent);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      font-weight: 700;
    }
    .brand-name { font-size: 15px; font-weight: 700; }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--muted);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    h1 { margin: 0 0 10px; font-size: 23px; line-height: 1.15; }
    .intro { margin: 0 0 26px; color: var(--muted); }
    .drop-zone {
      min-height: 168px;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border: 1px dashed var(--border);
      color: var(--vscode-sideBar-foreground);
      text-align: center;
      cursor: default;
    }
    .drop-zone:focus { outline: 1px solid var(--accent); outline-offset: 2px; }
    .drop-icon { margin-bottom: 6px; color: var(--accent); font-size: 22px; }
    .drop-title { font-weight: 600; }
    .drop-copy { color: var(--muted); font-size: 12px; }
    .shortcut {
      margin-top: 12px;
      padding: 3px 6px;
      color: var(--muted);
      background: var(--vscode-input-background);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
    }
    .divider { height: 1px; margin: 25px 0 19px; background: var(--border); }
    .future { margin: 0; color: var(--muted); font-size: 12px; }
    .future strong { display: block; margin-bottom: 4px; color: var(--vscode-sideBar-foreground); font-size: 13px; }
    .preview { display: none; }
    .preview.is-visible { display: block; }
    .preview-image { display: block; width: 100%; max-height: 220px; object-fit: contain; border: 1px solid var(--border); background: var(--vscode-editor-background); }
    .preview-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 9px; color: var(--muted); font-size: 12px; }
    .clear-button { padding: 3px 7px; border: 1px solid var(--border); background: var(--vscode-button-secondaryBackground, transparent); color: var(--vscode-button-secondaryForeground, var(--vscode-sideBar-foreground)); cursor: pointer; font: inherit; font-size: 11px; }
    .clear-button:hover { background: var(--vscode-button-secondaryHoverBackground, var(--vscode-toolbar-hoverBackground)); }
    .actions { display: flex; gap: 8px; margin-top: 12px; }
    .action-button { flex: 1; padding: 7px 9px; border: 1px solid var(--border); background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; font: inherit; font-size: 12px; }
    .action-button:disabled { opacity: .55; cursor: default; }
    .secondary-button { background: var(--vscode-button-secondaryBackground, transparent); color: var(--vscode-button-secondaryForeground, var(--vscode-sideBar-foreground)); }
    .status { min-height: 18px; margin: 9px 0 0; color: var(--muted); font-size: 12px; }
    .status.error { color: var(--vscode-errorForeground); }
    .result { display: none; margin-top: 20px; }
    .result.is-visible { display: block; }
    .result-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; color: var(--vscode-sideBar-foreground); font-size: 13px; font-weight: 600; }
    .result-code { max-height: 270px; overflow: auto; margin: 0; padding: 12px; border: 1px solid var(--border); background: var(--vscode-textCodeBlock-background, var(--vscode-editor-background)); color: var(--vscode-textPreformat-foreground, var(--vscode-editor-foreground)); font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; line-height: 1.55; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="brand">
    <span class="mark" aria-hidden="true">&gt;_</span>
    <span class="brand-name">SnapCode</span>
  </div>

  <p class="eyebrow">Code extraction utility</p>
  <h1>Turn code screenshots<br>into editable code.</h1>
  <p class="intro">Bring a frame from a coding tutorial into your editor as a clean starting point.</p>

  <div id="drop-zone" class="drop-zone" role="button" aria-label="Paste screenshot area" tabindex="0">
    <span class="drop-icon" aria-hidden="true">↑</span>
    <strong class="drop-title">Paste Screenshot</strong>
    <span class="drop-copy">Take a screenshot and paste it here.</span>
    <span class="shortcut">Ctrl + V / Cmd + V</span>
  </div>

  <div id="preview" class="preview" aria-live="polite">
    <img id="preview-image" class="preview-image" alt="Pasted screenshot preview">
    <div class="preview-meta">
      <span>Screenshot pasted ✓</span>
      <button id="preview-clear-button" class="clear-button" type="button">Clear</button>
    </div>
  </div>
  <div class="actions">
    <button id="extract-button" class="action-button" type="button" disabled>Extract Code</button>
    <button id="clear-button" class="action-button secondary-button" type="button">Clear</button>
  </div>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <section id="result" class="result" aria-labelledby="result-heading">
    <div class="result-heading">
      <span id="result-heading">Extracted Code</span>
      <button id="copy-button" class="clear-button" type="button">Copy Code</button>
    </div>
    <pre id="result-code" class="result-code"></pre>
  </section>
  <div class="divider"></div>
  <p class="future"><strong>Review the extracted code here.</strong>Copy it when you are ready to use it.</p>

  <script nonce="${nonce}">
    (() => {
      const dropZone = document.getElementById('drop-zone');
      const preview = document.getElementById('preview');
      const previewImage = document.getElementById('preview-image');
      const extractButton = document.getElementById('extract-button');
      const clearButton = document.getElementById('clear-button');
      const previewClearButton = document.getElementById('preview-clear-button');
      const copyButton = document.getElementById('copy-button');
      const status = document.getElementById('status');
      const result = document.getElementById('result');
      const resultCode = document.getElementById('result-code');
      const vscode = acquireVsCodeApi();
      let previewUrl = '';
      let imageDataUrl = '';
      let extractedCode = '';
      let isExtracting = false;

      function showImage(file) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        previewImage.src = previewUrl;
        imageDataUrl = '';
        extractButton.disabled = true;
        const reader = new FileReader();
        reader.onload = () => {
          imageDataUrl = String(reader.result || '');
          extractButton.disabled = false;
        };
        reader.onerror = () => setStatus('The pasted image could not be read.', true);
        reader.readAsDataURL(file);
        dropZone.style.display = 'none';
        preview.classList.add('is-visible');
        result.classList.remove('is-visible');
        resultCode.textContent = '';
        extractedCode = '';
        setStatus('Screenshot pasted ✓', false);
      }

      function clearImage() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = '';
        previewImage.removeAttribute('src');
        imageDataUrl = '';
        extractButton.disabled = true;
        preview.classList.remove('is-visible');
        result.classList.remove('is-visible');
        resultCode.textContent = '';
        extractedCode = '';
        setStatus('', false);
        dropZone.style.display = 'flex';
        dropZone.focus();
      }

      function setStatus(message, isError) {
        status.textContent = message;
        status.classList.toggle('error', Boolean(isError));
      }

      function setExtractingState(value) {
        isExtracting = value;
        extractButton.disabled = value || !imageDataUrl;
        clearButton.disabled = value;
        extractButton.textContent = value ? 'Extracting code...' : 'Extract Code';
      }

      document.addEventListener('paste', (event) => {
        const imageItem = Array.from(event.clipboardData?.items || [])
          .find((item) => item.kind === 'file' && item.type.startsWith('image/'));

        if (!imageItem) return;

        const file = imageItem.getAsFile();
        if (!file) return;

        event.preventDefault();
        showImage(file);
      });

      clearButton.addEventListener('click', clearImage);
      previewClearButton.addEventListener('click', clearImage);
      extractButton.addEventListener('click', () => {
        if (isExtracting || !imageDataUrl) return;
        setExtractingState(true);
        setStatus('Extracting code...', false);
        vscode.postMessage({
          command: 'extractCode',
          dataUrl: imageDataUrl,
          mimeType: imageDataUrl.match(/^data:([^;]+);/)?.[1] || 'image/png',
          filename: 'pasted-screenshot.png'
        });
      });

      copyButton.addEventListener('click', () => {
        if (extractedCode) vscode.postMessage({ command: 'copyCode', code: extractedCode });
      });

      window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.command === 'extractionResult') {
          setExtractingState(false);
          if (message.success) {
            extractedCode = message.code;
            resultCode.textContent = extractedCode;
            result.classList.add('is-visible');
            setStatus('Code extracted ✓', false);
          } else {
            setStatus(message.message || 'Unable to extract code.', true);
          }
        }

        if (message.command === 'copyResult') {
          setStatus(message.success ? 'Code copied ✓' : (message.message || 'Unable to copy code.'), !message.success);
        }
      });

      window.addEventListener('unload', () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    })();
  </script>
</body>
</html>`;
}

function createNonce() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let index = 0; index < 32; index += 1) {
    value += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return value;
}

function activate(context) {
  const provider = new SnapCodeViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(viewId, provider),
    vscode.commands.registerCommand('snapcode.open', () => {
      vscode.commands.executeCommand(containerCommand);
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
