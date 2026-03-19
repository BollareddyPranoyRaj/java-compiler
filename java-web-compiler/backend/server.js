import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const allowedOrigins = new Set([
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
]);

app.use(cors({
    origin(origin, callback) {
        // Allow browserless requests and known local dev frontends.
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

app.post('/api/run', (req, res) => {
    const { code, stdin } = req.body;
    
    if (!code) {
        return res.status(400).json({ stderr: "No code provided" });
    }

    const id = uuidv4();
    const folderPath = path.join(tempDir, id);
    
    try {
        fs.mkdirSync(folderPath);
        const filePath = path.join(folderPath, 'Main.java');
        fs.writeFileSync(filePath, code);

        // UPDATE 2: Improved Command Strings
        // Using quotes around paths to handle spaces in folder names
        const compileCmd = `javac "${filePath}"`;
        const runCmd = `java -cp "${folderPath}" Main`;

        exec(compileCmd, (compileError, stdout, stderr) => {
            if (compileError) {
                fs.rmSync(folderPath, { recursive: true, force: true });
                return res.json({ stdout: "", stderr: stderr || compileError.message, exitCode: 1 });
            }

            const child = exec(runCmd, { timeout: 5000 }, (runError, runStdout, runStderr) => {
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

            if (stdin) {
                child.stdin.write(stdin);
                child.stdin.end();
            }
        });
    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).json({ stderr: "Internal Server Error during execution" });
    }
});
app.get("/", (req, res) => {
  res.send("Backend is working 🚀");
});
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
