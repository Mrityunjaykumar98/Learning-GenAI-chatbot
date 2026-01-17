import Groq from "groq-sdk";
import dotenv from "dotenv";
import { tavily } from "@tavily/core";
import NodeCache from "node-cache";

dotenv.config();

const tvly = tavily({ apiKey: process.env.TAVILY_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });

export async function generate(query, threadId) {
  const baseMessages = [
    {
      role: "system",
      content: `You are a helpful assistant that can search the web for current information.  
                if you know the answer to a question,answer it directly in plain english.
                When you need current information, use the webSearch tool by making a proper function call.
                Decide when to use your own knowledge and when to use the tool.
                Do not mention the tool unless needed.
                
                Examples:
                Q.What is the capital of Russia?.
                A.The capital of Russia is Moscow.
                
                Q.What's the weather in mumbai right now?
                A.(use the webSearch tool to find the latest weather)
                
                Q.Who is the prime minister of india?.
                A.The current prime minister of india is Narendra modi.
                
                Q.Tell me the latest gold price in india?.
                A.(use the webSearch tool to find the latest gold price.)
                
                current date and time:${new Date().toUTCString()}`,
    },
    { role: "user", content: query },
  ];

  const messages = cache.get(threadId) ?? baseMessages;
  messages.push({
    role: "user",
    content: query,
  });

  let retry = 0;
  const maxRetry = 5;

  while (retry < maxRetry) {
    retry++;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.1, // Important for consistent tool use
        tools: [
          {
            type: "function",
            function: {
              name: "webSearch",
              description:
                "Search the web for current information and real-time data",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query",
                  },
                },
                required: ["query"],
              },
            },
          },
        ],
        tool_choice: "auto",
        parallel_tool_calls: false,
      });

      const message = completion.choices[0].message;
      messages.push(message);

      const toolCalls = message.tool_calls;

      if (!toolCalls) {
        cache.set(threadId, messages);
        return message.content;
      }

      // Process tool calls
      for (const tool of toolCalls) {
        const fnName = tool.function.name;
        const fnParams = JSON.parse(tool.function.arguments);

        if (fnName === "webSearch") {
          console.log(`Searching for: ${fnParams.query}`);
          const result = await webSearch(fnParams);
          messages.push({
            tool_call_id: tool.id,
            role: "tool",
            content: result,
          });
        }
      }
    } catch (error) {
      console.error("Error:", error.message);
      if (error.message.includes("tool_use_failed")) {
        return "I encountered an error using the search tool. Please try rephrasing your question.";
      }
      throw error;
    }
  }

  return "Maximum retries reached. Please try again.";
}

async function webSearch({ query }) {
  const response = await tvly.search(query);
  const finalResult = response.results.map((res) => res.content).join("\n\n");
  return finalResult;
}
