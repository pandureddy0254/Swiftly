/**
 * Creates a public tunnel to expose the local dev server to Monday.com.
 * Monday.com needs to load the app in an iframe from a public URL.
 *
 * Usage: node scripts/tunnel.js
 * This will print a URL that you paste into the Monday.com Developer Center
 * as your app's "Build URL".
 */
import localtunnel from 'localtunnel';

const PORT = 3000; // Vite dev server port

async function startTunnel() {
  console.log(`\n  Starting tunnel to localhost:${PORT}...\n`);

  const tunnel = await localtunnel({
    port: PORT,
    subdomain: 'swiftly-dev', // Will try to use this subdomain
  });

  console.log(`  ╔═══════════════════════════════════════════════════════╗`);
  console.log(`  ║  Swiftly Dev Tunnel Active                           ║`);
  console.log(`  ║                                                       ║`);
  console.log(`  ║  Public URL: ${tunnel.url.padEnd(40)}║`);
  console.log(`  ║                                                       ║`);
  console.log(`  ║  Paste this URL in Monday.com Developer Center:       ║`);
  console.log(`  ║  App Features → Board View → Custom URL               ║`);
  console.log(`  ║                                                       ║`);
  console.log(`  ║  Press Ctrl+C to stop                                 ║`);
  console.log(`  ╚═══════════════════════════════════════════════════════╝\n`);

  tunnel.on('close', () => {
    console.log('  Tunnel closed.');
    process.exit(0);
  });

  tunnel.on('error', (err) => {
    console.error('  Tunnel error:', err.message);
  });
}

startTunnel().catch(console.error);
