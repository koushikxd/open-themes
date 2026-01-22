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
      <div className="w-[380px] p-4 font-sans">
        <div className="mb-4">
          <h1 className="m-0 mb-1 text-lg font-semibold">Theme Variables</h1>
        </div>
        <pre className="m-0 mb-4 p-3 bg-slate-800 text-slate-200 rounded-md font-mono text-[11px] leading-relaxed max-h-[300px] overflow-auto whitespace-pre-wrap break-all">{cssOutput}</pre>
        <div className="flex gap-2">
          <button onClick={copyToClipboard} className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity border-none cursor-pointer">
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={downloadFile} className="px-4 py-2 bg-slate-200 text-slate-900 rounded-md text-sm font-medium hover:opacity-90 transition-opacity border-none cursor-pointer">
            Download
          </button>
          <button onClick={goBack} className="px-4 py-2 bg-transparent text-slate-500 rounded-md text-sm font-medium hover:opacity-90 transition-opacity border-none cursor-pointer">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[380px] p-4 font-sans">
      <div className="mb-4">
        <h1 className="m-0 mb-1 text-lg font-semibold">OpenThemes</h1>
        <p className="m-0 text-[13px] text-slate-600">Extract CSS theme variables from any website</p>
      </div>
      <button onClick={extractTheme} disabled={loading} className="w-full px-4 py-3 bg-slate-900 text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity border-none cursor-pointer">
        {loading ? "Extracting..." : "Extract Theme"}
      </button>
      {logs.length > 0 && (
        <div className="mt-4 p-3 bg-slate-50 rounded-md text-xs">
          {logs.map((log, i) => (
            <div key={i} className="py-1 text-slate-600 not-last:border-b not-last:border-slate-200">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
