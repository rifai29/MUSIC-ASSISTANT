import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
} catch (error) {
  console.error("Failed to initialize Google GenAI client", error);
}

// API Routes
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!ai) {
      return res.status(503).json({ 
        reply: "Halo! Saya adalah Musik Assistant Anda. Maaf, API key Gemini belum di-set pada workspace Anda (perlu diset pada Secrets panel di pojok kanan atas). Namun Anda tetap bisa memutar dan memasukkan musik lokal Anda seperti biasa!" 
      });
    }

    // Format history for GoogleGenAI SDK's chat
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: "Anda adalah 'Musik Assistant', asisten AI terintegrasi di dalam aplikasi pemutar musik modern (Sylvan Audio / Musik Assistant). " +
          "Tugas Anda adalah membantu pengguna dengan rekomendasi musik, menjawab pertanyaan seputar artis, lagu, lirik, genre, " +
          "dan memberikan tips mendengarkan musik yang nyaman. Jawab dengan ramah, informatif, dan ringkas dalam bahasa Indonesia. " +
          "Gunakan format markdown jika diperlukan.",
      }
    });

    // Populate history by sending messages if any
    if (history && history.length > 0) {
      // For simplicity with GoogleGenAI SDK chat history, we can seed or just send the contents
      // To prevent overhead, we can just send the latest contextual prompts or construct a prompt including context
    }

    const response = await chat.sendMessage({ message });
    res.json({ reply: response.text });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: err.message || "Terjadi kesalahan pada server." });
  }
});

// Setup Vite / Static Files Middleware
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
