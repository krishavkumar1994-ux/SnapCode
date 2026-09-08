import { useCallback, useEffect, useRef, useState } from 'react';

const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];

export function ScreenshotUploader({ file, previewUrl, onFileSelected, onRemove, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');

  const handleFile = useCallback((candidate) => {
    if (!candidate) return;

    if (!acceptedTypes.includes(candidate.type)) {
      setFileError('Please choose a PNG, JPG, or WebP image.');
      return;
    }

    if (candidate.size > 10 * 1024 * 1024) {
      setFileError('Images must be smaller than 10 MB.');
      return;
    }

    setFileError('');
    onFileSelected(candidate);
  }, [onFileSelected]);

  useEffect(() => {
    function handlePaste(event) {
      if (disabled) return;

      const target = event.target;
      const isEditableTarget = target instanceof HTMLElement
        && (target.isContentEditable
          || target.tagName === 'INPUT'
          || target.tagName === 'TEXTAREA');

      if (isEditableTarget) return;

      const imageItem = Array.from(event.clipboardData?.items || [])
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'));

      if (!imageItem) return;

      const blob = imageItem.getAsFile();
      if (!blob) return;

      event.preventDefault();
      const extension = blob.type.split('/')[1] || 'png';
      const pastedFile = new File([blob], `pasted-screenshot.${extension}`, { type: blob.type });
      handleFile(pastedFile);
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [disabled, handleFile]);

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  function openFilePicker() {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <section className="panel upload-panel" aria-labelledby="upload-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">01 / Screenshot</p>
          <h2 id="upload-heading">Bring in your code</h2>
        </div>
        <span className="step-indicator">Input</span>
      </div>

      {!file ? (
        <button
          className={`drop-zone${isDragging ? ' is-dragging' : ''}`}
          type="button"
          onClick={openFilePicker}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          disabled={disabled}
        >
          <span className="upload-icon" aria-hidden="true">↑</span>
          <span className="drop-title">Drop a screenshot here</span>
          <span className="drop-subtitle">Drop an image, choose a file, or press Ctrl + V / Cmd + V</span>
          <span className="format-note">PNG, JPG, or WebP · up to 10 MB</span>
        </button>
      ) : (
        <div className="preview-wrap">
          <img className="screenshot-preview" src={previewUrl} alt="Selected code screenshot" />
          <div className="preview-meta">
            <div>
              <strong>{file.name}</strong>
              <span>{(file.size / 1024).toFixed(1)} KB · Ready to extract</span>
            </div>
            <button className="text-button" type="button" onClick={onRemove} disabled={disabled}>
              Remove
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => handleFile(event.target.files[0])}
        disabled={disabled}
      />
      {fileError && <p className="inline-error" role="alert">{fileError}</p>}
    </section>
  );
}
