import { useEffect, useState } from "react";
import { sendToActiveTab } from "../shared/bridge";
import type { PickerMode, Snapshot } from "../shared/types";

export function App() {
  const [status, setStatus] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void sendToActiveTab({ type: "GET_SNAPSHOT" }, { inject: false }).then((res) => {
      if (res.ok && res.snapshot) setSnapshot(res.snapshot);
    });
  }, []);

  async function runPicker(mode: PickerMode): Promise<void> {
    setBusy(true);
    const res = await sendToActiveTab({ type: "START_PICKER", mode });
    setBusy(false);
    if (!res.ok) {
      setStatus(res.error);
      return;
    }
    window.close();
  }

  async function copyField(kind: "selector" | "xpath"): Promise<void> {
    if (snapshot) {
      const value = kind === "selector" ? snapshot.selector : snapshot.xpath;
      await navigator.clipboard.writeText(value);
      setStatus(kind === "selector" ? "✓ CSS selector copied" : "✓ XPath copied");
      return;
    }
    await runPicker(kind === "selector" ? "copy-selector" : "copy-xpath");
  }

  return (
    <main>
      <header>
        <h1>DOMPilot</h1>
        <p>Inspect any element. Get selectors, HTML, styles, attributes, and DOM context instantly.</p>
      </header>

      <button
        className="inspect"
        disabled={busy}
        onClick={() => void runPicker("inspect")}
      >
        Inspect Element
      </button>

      <section>
        <h2>Quick actions</h2>
        <div className="row">
          <span>CSS Selector</span>
          <button onClick={() => void copyField("selector")}>Copy</button>
        </div>
        <div className="row">
          <span>XPath</span>
          <button onClick={() => void copyField("xpath")}>Copy</button>
        </div>
        {snapshot ? (
          <p className="target">
            Last target: <code>{snapshot.tagName.toLowerCase()}</code>
            {snapshot.id ? <code>#{snapshot.id}</code> : null}
          </p>
        ) : (
          <p className="target">No element yet — Copy starts picker mode.</p>
        )}
      </section>

      {status ? <p className="status">{status}</p> : null}

      <footer>v2.0.0 · local only</footer>
    </main>
  );
}
