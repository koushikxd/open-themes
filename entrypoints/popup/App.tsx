import { useState } from "react";
import "./App.css";

function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [cssOutput, setCssOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const extractTheme = async () => {
    setLoading(true);
    setLogs([]);
    setCssOutput(null);

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setLogs(["No active tab found"]);
        setLoading(false);
        return;
      }

      const response = await browser.tabs.sendMessage(tab.id, { action: "extract_theme" });
      setLogs(response.logs);

      if (response.css) {
        setCssOutput(response.css);
      } else {
        setLogs((prev) => [...prev, "No CSS variables found"]);
      }
    } catch (err) {
      setLogs(["Error: Could not extract theme. Make sure to refresh the page first."]);
    }

    setLoading(false);
  };

  const copyToClipboard = async () => {
    if (!cssOutput) return;
    await navigator.clipboard.writeText(cssOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    if (!cssOutput) return;
    const blob = new Blob([cssOutput], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "globals.css";
    a.click();
    URL.revokeObjectURL(url);
  };

  const goBack = () => {
    setCssOutput(null);
    setLogs([]);
  };

  if (cssOutput) {
    return (
      <div className="container">
        <div className="header">
          <h1>Theme Variables</h1>
        </div>
        <pre className="css-preview">{cssOutput}</pre>
        <div className="actions">
          <button onClick={copyToClipboard} className="btn btn-primary">
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={downloadFile} className="btn btn-secondary">
            Download
          </button>
          <button onClick={goBack} className="btn btn-ghost">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>OpenThemes</h1>
        <p>Extract CSS theme variables from any website</p>
      </div>
      <button onClick={extractTheme} disabled={loading} className="btn btn-primary btn-large">
        {loading ? "Extracting..." : "Extract Theme"}
      </button>
      {logs.length > 0 && (
        <div className="logs">
          {logs.map((log, i) => (
            <div key={i} className="log-item">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
