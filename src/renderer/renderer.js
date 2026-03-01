const messagesDiv = document.getElementById('messages');
const promptInput = document.getElementById('prompt');
const sendButton = document.getElementById('send');

// Global conversation history for the backend
let messages = [];

function addMessage(role, text) {
  const div = document.createElement('div');
  div.classList.add('message', role);
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return div;
}

async function sendMessage() {
  const userText = promptInput.value.trim();
  if (!userText) return;

  // Add user bubble to UI
  addMessage('user', userText);
  promptInput.value = '';

  // Add user message to conversation history
  messages.push({
    role: 'user',
    content: userText
  });

  // Create empty Lumi bubble for streaming
  const lumiBubble = addMessage('lumi', '');

  // We'll accumulate the assistant's full reply here
  let assistantText = '';

  // Stream tokens into the Lumi bubble
  await window.lumi.ask(messages, token => {
    assistantText += token;
    lumiBubble.textContent = assistantText;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

  // After streaming finishes, add assistant reply to conversation history
  messages.push({
    role: 'assistant',
    content: assistantText
  });
}

sendButton.addEventListener('click', sendMessage);

promptInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
