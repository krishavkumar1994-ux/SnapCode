import { useEffect, useState } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { Header } from './components/Header';
import { ScreenshotUploader } from './components/ScreenshotUploader';
import { extractCode } from './lib/api';

function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [code, setCode] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileSelected(selectedFile) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setCode('');
    setError('');
    setCopied(false);
  }

  function handleRemoveFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl('');
    setCode('');
    setError('');
    setCopied(false);
  }

  async function handleExtract() {
    if (!file || isExtracting) return;

    setIsExtracting(true);
    setError('');
    setCopied(false);

    try {
      const extractedCode = await extractCode(file);
      setCode(extractedCode);
    } catch (extractionError) {
      setError(extractionError.message || 'Something went wrong while extracting the code. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleCopy() {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy the code. Please select it and copy manually.');
    }
  }

  function handleReset() {
    handleRemoveFile();
    setIsExtracting(false);
  }

  return (
    <div className="app-shell">
      <Header />

      <main className="main-content">
        <section className="intro">
          <div>
            <p className="kicker">Code extraction utility</p>
            <h1>From screenshot<br /><em>to source code.</em></h1>
          </div>
          <p className="intro-copy">Turn a frame from your favorite coding tutorial into a clean, editable starting point.</p>
        </section>

        <div className="workflow-line" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="workspace-grid">
          <ScreenshotUploader
            file={file}
            previewUrl={previewUrl}
            onFileSelected={handleFileSelected}
            onRemove={handleRemoveFile}
            disabled={isExtracting}
          />

          <section className="action-column" aria-label="Extraction controls">
            <div className="action-rail">
              <span className="rail-dot" />
              <span className="rail-line" />
              <span className="rail-dot" />
            </div>
            <button className="extract-button" type="button" onClick={handleExtract} disabled={!file || isExtracting}>
              {isExtracting ? (
                <><span className="spinner" aria-hidden="true" /> Extracting...</>
              ) : (
                <>Extract code <span aria-hidden="true">→</span></>
              )}
            </button>
            <p className="action-note">{isExtracting ? 'Reading the screenshot...' : 'Vision-powered extraction'}</p>
          </section>

          <CodeEditor
            code={code}
            onChange={(value) => {
              setCode(value);
              setCopied(false);
            }}
            onCopy={handleCopy}
            copied={copied}
            disabled={isExtracting}
          />
        </div>

        {error && <p className="global-error" role="alert">{error}</p>}

        <footer className="workspace-footer">
          <span>Screenshot to source, without the retyping.</span>
          <button className="reset-button" type="button" onClick={handleReset} disabled={!file && !code && !error}>
            <span aria-hidden="true">↻</span> Clear workspace
          </button>
        </footer>
      </main>
    </div>
  );
}

export default App;
