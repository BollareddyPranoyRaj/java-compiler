const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// These two lines are needed to make __dirname work in ESM mode
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
    
    // 1. Generate a unique ID for this execution to avoid file conflicts
    const id = uuidv4();
    const folderPath = path.join(tempDir, id);
    fs.mkdirSync(folderPath);

    // 2. Save the code into Main.java (Assuming class name is Main)
    const filePath = path.join(folderPath, 'Main.java');
    fs.writeFileSync(filePath, code);

    // 3. Command to Compile and Run
    // We use a timeout to prevent infinite loops (e.g., while(true))
    const compileCmd = `javac ${filePath}`;
    const runCmd = `java -cp ${folderPath} Main`;

    exec(compileCmd, (compileError, stdout, stderr) => {
        if (compileError) {
            return res.json({ stdout: "", stderr: stderr || compileError.message, exitCode: 1 });
        }

        // Compilation successful, now run it
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

        // Pass stdin to the Java process
        if (stdin) {
            child.stdin.write(stdin);
            child.stdin.end();
        }
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));