import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Re-creating __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Create a directory for temporary Java files if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

app.post('/api/run', (req, res) => {
    const { code, stdin } = req.body;
    
    // 1. Generate a unique ID for this execution
    const id = uuidv4();
    const folderPath = path.join(tempDir, id);
    fs.mkdirSync(folderPath);

    // 2. Save the code into Main.java
    const filePath = path.join(folderPath, 'Main.java');
    fs.writeFileSync(filePath, code);

    // 3. Command to Compile and Run
    const compileCmd = `javac "${filePath}"`;
    const runCmd = `java -cp "${folderPath}" Main`;

    exec(compileCmd, (compileError, stdout, stderr) => {
        if (compileError) {
            // Cleanup on compilation failure
            fs.rmSync(folderPath, { recursive: true, force: true });
            return res.json({ stdout: "", stderr: stderr || compileError.message, exitCode: 1 });
        }

        // 4. Compilation successful, now run it
        const child = exec(runCmd, { timeout: 5000 }, (runError, runStdout, runStderr) => {
            // Cleanup: Delete the folder and files after execution
            fs.rmSync(folderPath, { recursive: true, force: true });

            if (runError && runError.killed) {
                return res.json({ stdout: "", stderr: "Execution Timed Out (5s limit)", exitCode: 124 });
            }

            res.json({
                stdout: runStdout,
                stderr: runStderr,
                exitCode: runError ? runError.code : 0
            });
        });

        // 5. Pass stdin to the Java process if provided
        if (stdin) {
            child.stdin.write(stdin);
            child.stdin.end();
        }
    });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));