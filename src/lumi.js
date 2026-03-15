export async function askLumi(messages, settings, onToken) {
  // Prepend system persona message ONLY if it exists
  const fullMessages = [
    ...(settings.persona
      ? [{ role: "system", content: settings.persona }]
      : []),
    ...messages
  ];

  // Build the request body with persona + sampling parameters
  const body = {
    model: settings.modelName,   // <-- dynamic model name
    messages: fullMessages,
    stream: true,

    // Sampling parameters
    temperature: settings.temperature,
    top_p: settings.top_p,
    top_k: settings.top_k,
    min_p: settings.min_p,
    repeat_penalty: settings.repetition_penalty,
    max_tokens: settings.max_tokens
  };

  const response = await fetch('http://127.0.0.1:1925/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
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
