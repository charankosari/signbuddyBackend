const axios = require("axios");
const { config } = require("dotenv");
config({ path: "config/config.env" });

const GROK_API_KEY = process.env.GROK_API_KEY;

// Token limits
const TOKEN_LIMITS = {
  section: 500,
  full: 4000,
};

/**
 * Generates an agreement document or a section of it using the Grok API.
 * @param {string} prompt - User input specifying what needs to be generated.
 * @param {string} type - "full" for entire agreement, "section" for a specific part.
 * @returns {Promise<string>} - The generated text.
 */
const generateAgreement = async (prompt, type = "full") => {
  try {
    const maxTokens = TOKEN_LIMITS[type] || 500; // Default to section if type is invalid

    const response = await axios.post(
      "https://api.grok.com/chat",
      {
        model: "grok-1",
        messages: [
          {
            role: "system",
            content:
              type === "full"
                ? "Generate a legally structured full agreement based on the prompt."
                : "Generate only the specified section of the agreement based on the prompt.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens, // Ensure correct token limit
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROK_API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(
      "Error generating agreement:",
      error.response?.data || error.message
    );
    throw new Error("Failed to generate agreement. Please try again.");
  }
};

module.exports = generateAgreement;
