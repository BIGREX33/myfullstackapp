


// Initialize in-memory store for conversation history
const conversationHistory = {};

// Middleware to initialize conversation history for each user
app.use((req, res, next) => {
  if (!conversationHistory[req.sessionID]) {
    conversationHistory[req.sessionID] = [];
  }
  next();
});

// Endpoint to handle AI chat
app.post('/ai/chat', isAuthenticated, async (req, res) => {
  const userMessage = req.body.message;
  const userId = req.sessionID;

  // Append user's message to conversation history
  conversationHistory[userId].push({ role: 'user', content: userMessage });

  try {
    const response = await fetch("https://api.ai21.com/studio/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${APIKEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "jamba-large-1.6",
        messages: conversationHistory[userId],
        n: 1,
        max_tokens: 2048,
        temperature: 0.4,
        top_p: 1,
        stop: [],
        response_format: { type: "text" },
      }),
    });

    const data = await response.json();

    const aiReply = data?.choices?.[0]?.message?.content;

    // Append AI's reply to conversation history
    conversationHistory[userId].push({ role: 'assistant', content: aiReply });

    res.json({
      success: true,
      response: aiReply || "Sorry, I didn't get a response from AI.",
    });
  } catch (error) {
    console.error("Error contacting AI21:", error);
    res.status(500).json({
      success: false,
      response: "Failed to contact AI.",
    });
  }
});
