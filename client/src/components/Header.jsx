export function Header() {
  return (
    <header className="app-header">
      <a className="brand" href="/" aria-label="SnapCode home">
        <span className="brand-mark" aria-hidden="true">&gt;_</span>
        <span>SnapCode</span>
      </a>
      <span className="header-status">
        <span className="status-dot" aria-hidden="true" />
        Local workspace
      </span>
    </header>
  );
}
