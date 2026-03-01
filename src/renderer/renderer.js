const messagesDiv = document.getElementById('messages');
const promptInput = document.getElementById('prompt');
const sendButton = document.getElementById('send');

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

  // Add user bubble
  addMessage('user', userText);
  promptInput.value = '';

  // Create empty Lumi bubble for streaming
  const lumiBubble = addMessage('lumi', '');

  // Prepare messages array for Lumi backend
  const messages = [
    { role: 'user', content: userText }
  ];

  // Stream tokens into the Lumi bubble
  await window.lumi.ask(messages, token => {
    lumiBubble.textContent += token;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

sendButton.addEventListener('click', sendMessage);

promptInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
