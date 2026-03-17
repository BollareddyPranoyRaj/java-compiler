import { useState } from 'react';
import CodeEditor from './CodeEditor';
import Console from './Console';

export default function App() {
  const [code, setCode] = useState(`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, BPR's Web Compiler!");
    }
}`);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  async function runCode() {
  setRunning(true);
  setOutput("Compiling and running...");
  try {
    const response = await fetch("http://127.0.0.1:5000/api/run", {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, stdin })
    });

    // Check if the response is OK and if it's actually JSON
    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error (${response.status}): ${errorText}`);
    }

    if (!contentType || !contentType.includes("application/json")) {
      const plainText = await response.text();
      throw new Error(`Expected JSON but got: ${plainText.substring(0, 100)}...`);
    }

    const json = await response.json();
    const parts = [];
    if (json.stdout) parts.push(json.stdout);
    if (json.stderr) parts.push("ERROR:\n" + json.stderr);
    
    setOutput(parts.join("\n") || "No output.");
  } catch (error) {
    console.error("Fetch error:", error);
    setOutput(`Error: ${error.message}`);
  } finally {
    setRunning(false);
  }
}
  // Improved Trim function to replace the broken formatter
  function trimCode() {
    const trimmed = code.split('\n').map(line => line.trimEnd()).join('\n').trim();
    setCode(trimmed);
  }

  return (
    <div className="app">
      <header className="header" style={{ padding: '10px', background: '#222', color: '#fff' }}>
        <h1>Java Web Compiler</h1>
        <div className="controls">
          <button onClick={runCode} disabled={running} style={{ marginRight: '10px' }}>
            {running ? "Running..." : "Run Code"}
          </button>
          <button onClick={trimCode} style={{ marginRight: '10px' }}>Trim Space</button>
          <button onClick={() => setOutput("")}>Clear Console</button>
        </div>
      </header>

      <main className="main-content" style={{ display: 'flex', height: '80vh' }}>
        <section className="editor-area" style={{ flex: 2, borderRight: '1px solid #ccc' }}>
          <CodeEditor code={code} onChange={setCode} />
        </section>

        <aside className="side-area" style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column' }}>
          <div className="stdin-area" style={{ marginBottom: '20px' }}>
            <label><strong>Input (stdin):</strong></label>
            <textarea
              style={{ width: '100%', height: '100px', marginTop: '5px' }}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter inputs here..."
            />
          </div>
          <Console output={output} />
        </aside>
      </main>
    </div>
  );
}