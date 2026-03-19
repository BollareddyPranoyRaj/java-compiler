import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_CODE_SIZE = 50_000;
const MAX_STDIN_SIZE = 10_000;
const MAX_OUTPUT_SIZE = 64 * 1024;
const COMPILE_TIMEOUT_MS = 8_000;
const RUN_TIMEOUT_MS = 5_000;
const JAVA_HEAP_MB = 128;
const TEMP_ROOT = path.join(__dirname, 'temp');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

fs.mkdirSync(TEMP_ROOT, { recursive: true });

function cleanupDir(folderPath) {
  try {
    fs.rmSync(folderPath, { recursive: true, force: true });
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

function killProcessTree(child) {
  if (!child || child.killed) {
    return;
  }

  try {
    child.kill('SIGKILL');
  } catch (error) {
    console.error('Failed to kill child process:', error);
  }
}

function runCommand(command, args, options = {}) {
  const {
    cwd,
    stdin = '',
    timeoutMs,
    maxOutputBytes = MAX_OUTPUT_SIZE
  } = options;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: {
        PATH: process.env.PATH || '',
        JAVA_HOME: process.env.JAVA_HOME || ''
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let outputExceeded = false;
    let settled = false;

    const settle = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      resolve(result);
    };

    const appendChunk = (chunk, streamName) => {
      const text = chunk.toString();
      const bytes = Buffer.byteLength(text);

      if (streamName === 'stdout') {
        stdoutBytes += bytes;
        if (stdoutBytes <= maxOutputBytes) {
          stdout += text;
        }
      } else {
        stderrBytes += bytes;
        if (stderrBytes <= maxOutputBytes) {
          stderr += text;
        }
      }

      if (stdoutBytes + stderrBytes > maxOutputBytes) {
        outputExceeded = true;
        killProcessTree(child);
      }
    };

    child.stdout.on('data', (chunk) => appendChunk(chunk, 'stdout'));
    child.stderr.on('data', (chunk) => appendChunk(chunk, 'stderr'));

    child.on('error', (error) => {
      settle({
        ok: false,
        exitCode: 1,
        stdout,
        stderr: error.message
      });
    });

    child.on('close', (code, signal) => {
      if (timedOut) {
        settle({
          ok: false,
          exitCode: 124,
          stdout,
          stderr: `Execution timed out after ${timeoutMs}ms`
        });
        return;
      }

      if (outputExceeded) {
        settle({
          ok: false,
          exitCode: 413,
          stdout,
          stderr: `Output exceeded ${maxOutputBytes} bytes`
        });
        return;
      }

      settle({
        ok: code === 0,
        exitCode: code ?? 1,
        signal,
        stdout,
        stderr
      });
    });

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      killProcessTree(child);
    }, timeoutMs);

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

app.post('/api/run', async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const stdin = typeof req.body?.stdin === 'string' ? req.body.stdin : '';

  if (!code.trim()) {
    return res.status(400).json({ stdout: '', stderr: 'No code provided', exitCode: 1 });
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_SIZE) {
    return res.status(413).json({
      stdout: '',
      stderr: `Code exceeds ${MAX_CODE_SIZE} bytes limit`,
      exitCode: 1
    });
  }

  if (Buffer.byteLength(stdin, 'utf8') > MAX_STDIN_SIZE) {
    return res.status(413).json({
      stdout: '',
      stderr: `Input exceeds ${MAX_STDIN_SIZE} bytes limit`,
      exitCode: 1
    });
  }

  const requestId = uuidv4();
  const folderPath = path.join(TEMP_ROOT, requestId);

  try {
    fs.mkdirSync(folderPath, { recursive: true, mode: 0o700 });
    const filePath = path.join(folderPath, 'Main.java');
    fs.writeFileSync(filePath, code, { encoding: 'utf8', mode: 0o600 });

    const compileResult = await runCommand(
      'javac',
      [`-J-Xmx${JAVA_HEAP_MB}m`, 'Main.java'],
      {
        cwd: folderPath,
        timeoutMs: COMPILE_TIMEOUT_MS
      }
    );

    if (!compileResult.ok) {
      cleanupDir(folderPath);
      return res.json({
        stdout: compileResult.stdout,
        stderr: compileResult.stderr,
        exitCode: compileResult.exitCode
      });
    }

    const runResult = await runCommand(
      'java',
      [`-Xmx${JAVA_HEAP_MB}m`, '-cp', folderPath, 'Main'],
      {
        cwd: folderPath,
        stdin,
        timeoutMs: RUN_TIMEOUT_MS
      }
    );

    cleanupDir(folderPath);
    return res.json({
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      exitCode: runResult.exitCode
    });
  } catch (error) {
    cleanupDir(folderPath);
    console.error('Server Error:', error);
    return res.status(500).json({
      stdout: '',
      stderr: 'Internal Server Error during execution',
      exitCode: 1
    });
  }
});

app.get('/', (req, res) => {
  res.send('Backend is working');
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Backend running on http://${HOST}:${PORT}`);
});

server.on('error', (error) => {
  console.error('Failed to start backend server:', error);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
