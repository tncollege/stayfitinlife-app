exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, message: "Method not allowed" }),
    };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const body = JSON.parse(event.body || "{}");
    const { screen = "home", mode = "auto", message = "", data = {}, quota = {} } = body;

    if (!apiKey) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          mode: "fallback",
          reply: "AI Coach is not connected yet. Using local coaching logic.",
        }),
      };
    }

    const selectModel = (screen, mode) => {
      if (mode === "deep") return "gpt-5.4";
      if (screen === "progress") return "gpt-5.4";
      if (screen === "settings") return "gpt-5.4";
      return "gpt-5.4-mini";
    };

    const model = selectModel(screen, mode);

    const systemPrompt = [
      "You are Stayfitinlife Coach, a practical fitness, nutrition, recovery, and supplement coach.",
      "Use only the provided current-screen data and compact recent context.",
      "Give concise, actionable guidance.",
      "Do not pretend to know missing data.",
      "Do not give medical diagnosis.",
      "If appropriate, provide 3 short next actions."
    ].join(" ");

    const userPrompt = [
      `Screen: ${screen}`,
      `Mode: ${mode}`,
      `Daily AI quota status: ${JSON.stringify(quota)}`,
      `Question: ${message || "Give guidance based on this screen."}`,
      `Data: ${JSON.stringify(data, null, 2)}`
    ].join("\n\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
          { role: "user", content: [{ type: "input_text", text: userPrompt }] }
        ],
        max_output_tokens: mode === "deep" ? 500 : 250
      })
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          mode: "fallback",
          reply: (json && json.error && json.error.message) || "AI Coach request failed. Using local coaching logic."
        }),
      };
    }

    let reply = "AI Coach could not generate a response.";
    if (Array.isArray(json.output)) {
      for (const item of json.output) {
        if (Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.text) {
              reply = c.text;
              break;
            }
          }
        }
        if (reply !== "AI Coach could not generate a response.") break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        model,
        screen,
        reply
      }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: false,
        mode: "fallback",
        reply: "AI Coach is unavailable right now. Using local coaching logic.",
        error: String(err && err.message ? err.message : err)
      }),
    };
  }
};
