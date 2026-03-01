export async function askLumi(messages, onToken) {
  const response = await fetch('http://127.0.0.1:1925/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'lumi-core-mistral.gguf',
      messages,
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;

      const json = line.replace(/^data:\s*/, '').trim();
      
      if (json === '[DONE]') return;

      try {
        const parsed = JSON.parse(json);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch (err) {
        console.error('Stream parse error:', err);
      }
    }
  }
}
