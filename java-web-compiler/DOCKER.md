# Docker Setup

This project can run the Java execution backend inside Docker so Java and Node are installed in the container instead of on your laptop.

## 1. Install Docker Desktop

On macOS:

1. Download and install Docker Desktop
2. Open Docker Desktop once and wait until it says Docker is running

Check it:

```bash
docker --version
docker compose version
```

## 2. Start the backend in Docker

From the project root:

```bash
cd /Users/bollareddypranoyraj/java-compiler-2/java-web-compiler
docker compose up --build backend
```

For development with automatic backend restarts on save:

```bash
docker compose -f docker-compose.dev.yml up --build backend
```

When it works, you should see:

```bash
Backend running on http://0.0.0.0:5000
```

Your backend will then be available at:

```bash
http://localhost:5001
```

## 3. Run the frontend

In another terminal:

```bash
cd /Users/bollareddypranoyraj/java-compiler-2/java-web-compiler/frontend
npm run dev
```

Open the Vite URL in your browser and test `Run Code`.

## 4. Stop Docker

Press `Ctrl + C` in the terminal running Docker Compose, or run:

```bash
docker compose down
```

## 5. Useful commands

Rebuild after backend changes:

```bash
docker compose up --build backend
```

For backend code changes only in dev mode, just save the file and `nodemon` will restart automatically inside Docker.

If you change `Dockerfile.backend` or install new tools, rebuild with:

```bash
docker compose -f docker-compose.dev.yml up --build backend
```

Run in background:

```bash
docker compose up -d --build backend
```

See logs:

```bash
docker compose logs -f backend
```

Dev mode logs:

```bash
docker compose -f docker-compose.dev.yml logs -f backend
```

Stop and remove containers:

```bash
docker compose down
```

Stop dev mode:

```bash
docker compose -f docker-compose.dev.yml down
```

## Why this helps

- Java is installed inside the container
- Node is installed inside the container
- The backend temp folder is stored in container memory using `tmpfs`
- You can deploy the same container to a server later

## Important production note

This is safer than running directly on your laptop, but it is still not a full security boundary for untrusted public code execution. For public deployment you should eventually add:

- container CPU and memory limits
- network restrictions
- one isolated execution container per run or a separate runner service
- a queue to avoid too many jobs at once
