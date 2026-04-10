import { spawn } from 'child_process';

const server = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });
const client = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

process.on('SIGINT', () => {
  server.kill();
  client.kill();
  process.exit();
});
