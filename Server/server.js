import express from "express";
import cors from "cors";
import { generate } from "./index.js";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/chat", async (req, res) => {
  const { message, threadId } = req.body;
  const result = await generate(message, threadId);
  res.json({ message: result });
});

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
