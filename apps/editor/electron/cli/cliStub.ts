process.stdout.write('Agency CLI stub ready. Type "exit" to close.\r\n');
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  const input = chunk.toString();
  if (input.trim() === 'exit') {
    process.stdout.write('Goodbye.\r\n');
    process.exit(0);
  }
  process.stdout.write(`echo: ${input}`);
});
