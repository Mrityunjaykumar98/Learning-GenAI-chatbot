const input = document.querySelector("#input");
const chatContainer = document.querySelector("#chat-container");
const askBtn = document.querySelector("#ask-btn");

input?.addEventListener("keyup", handleEnter);
askBtn?.addEventListener("click", handleAsk);

const threadId =
  Date.now().toString(36) + Math.random().toString(36).substring(2, 10);

const loading = document.createElement("div");
loading.className = "my-6 animate-pulse";
loading.textContent = "Thinking...";

async function generate(text) {
  const msg = document.createElement("div");
  msg.className = `my-6 bg-neutral-800 p-3 rounded-xl ml-auto max-w-fit`;
  msg.textContent = text;
  chatContainer?.appendChild(msg);
  input.value = "";

  chatContainer?.appendChild(loading);

  const assistantMsg = await callServer(text);

  const assistantResp = document.createElement("div");
  assistantResp.className = `max-w-fit`;
  assistantResp.textContent = assistantMsg;

  loading.remove();

  chatContainer?.appendChild(assistantResp);
}

async function callServer(text) {
  const response = await fetch("http://localhost:5000/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ message: text, threadId }),
  });
  if (!response.ok) {
    throw new Error("Error generating the response");
  }
  const result = await response.json();
  return result.message;
}

function handleAsk() {
  const text = input?.value.trim();
  if (!text) {
    return;
  }
  generate(text);
}

function handleEnter(e) {
  if (e.key === "Enter") {
    const text = input?.value.trim();
    if (!text) {
      return;
    }
    generate(text);
  }
}
