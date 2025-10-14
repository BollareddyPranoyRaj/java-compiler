import { useState } from 'react';
import CodeEditor from './CodeEditor';
import Console from './Console';


export default function App(){
  const [code,setCode]=useState(`public class main(){
    public static void main(String[] args){
        System.out.println("Hello, BPR's Web Compiler!");
    }
}`);
const [stdin,setStdin]=useState("");
const [output,setOutput]=useState("");
const [running,setRunning]=useState(false);
const [timeoutSeconds,setTimeoutSeconds]=useState(3);
async function runCode(){
  setRunning(true);
  setOutput("");
  try{
    const response = await fetch("api/run",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        language:"java",
        code,
        stdin,
        timeout: Number(timeoutSeconds) || 3  
      })
    });
    if(!response.ok){
      const text = await response.text();
      setOutput(`Server error: ${response.status}\n${text}`);
    }
    else{
     const json = await response.json();
        const parts = [];
        if (json.stdout) parts.push("=== stdout ===\n" + json.stdout);
        if (json.stderr) parts.push("=== stderr ===\n" + json.stderr);
        if (json.exitCode !== undefined)
          parts.push("=== exit code ===\n" + json.exitCode);
        if (json.error) parts.push("=== error ===\n" + json.error);
        setOutput(parts.join("\n\n") || "No output.");
    }
  } catch (error) {
    setOutput(`Error: ${error.message}`);
  } finally {
    setRunning(false);
  }
}
function formatCode(){
  try{
    const formatted = window.javaFormatter.format(code);
    setCode(formatted);
  } catch (error) {
    setOutput(`Formatting error: ${error.message}`);
  }
}
  return (
  <div className="app">
      <header className="header">
        <h1>Java Web Compiler — Frontend</h1>
        <div className="controls">
          <button onClick={runCode} disabled={running}>
            {running ? "Running..." : "Run"}
          </button>
          <button onClick={() => { setCode(`public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, Java Web Compiler!\");\n    }\n}`); }}>
            Reset
          </button>
          <button onClick={formatCode}>Trim</button>

          <label className="small">
            Timeout (s):
            <input
              type="number"
              min="1"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(e.target.value)}
            />
          </label>
        </div>
      </header>

      <main className="main">
        <section className="editor-area">
          <CodeEditor code={code} onChange={setCode} />
        </section>

        <aside className="side-area">
          <div className="stdin">
            <label>stdin</label>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Input for the program (optional)"
            />
          </div>

          <Console output={output} />
        </aside>
      </main>

      <footer className="footer">
        <small>Note: This frontend calls POST /api/run with JSON &#123; "language", "code", "stdin", "timeout" &#125;.</small>
      </footer>
    </div>
  );
}