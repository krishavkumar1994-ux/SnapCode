function getLineCount(code) {
  return Math.max(code.split('\n').length, 1);
}

export function CodeEditor({ code, onChange, onCopy, copied, disabled }) {
  const lineNumbers = Array.from({ length: getLineCount(code) }, (_, index) => index + 1);

  return (
    <section className="panel editor-panel" aria-labelledby="output-heading">
      <div className="panel-heading editor-heading">
        <div>
          <p className="eyebrow">02 / Extracted code</p>
          <h2 id="output-heading">Your source, ready to use</h2>
        </div>
        <button className="copy-button" type="button" onClick={onCopy} disabled={!code || disabled}>
          <span aria-hidden="true">□</span>
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>

      <div className="editor-shell">
        <div className="editor-toolbar">
          <span className="file-tab"><span className="js-dot" aria-hidden="true" /> extracted.js</span>
          <span className="editor-hint">Editable</span>
        </div>
        <div className="code-area">
          <div className="line-numbers" aria-hidden="true">
            {lineNumbers.map((lineNumber) => <span key={lineNumber}>{lineNumber}</span>)}
          </div>
          <textarea
            className="code-editor"
            value={code}
            onChange={(event) => onChange(event.target.value)}
            spellCheck="false"
            aria-label="Extracted source code editor"
            placeholder="Extracted code will appear here..."
          />
        </div>
      </div>
    </section>
  );
}
