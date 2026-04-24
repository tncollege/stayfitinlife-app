// Netlify Function: AI Coach
// Add OPENAI_API_KEY in Netlify Environment Variables.
// Frontend calls: /.netlify/functions/ai-coach

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { question, context } = JSON.parse(event.body || '{}');

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: 'AI Coach is not connected yet. Add OPENAI_API_KEY in Netlify environment variables.'
        })
      };
    }

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are the STAYFITINLIFE AI Coach. Give practical, safe, concise fitness, nutrition, workout and recovery guidance based on the user context. Do not provide medical diagnosis.'
        },
        {
          role: 'user',
          content: JSON.stringify({ question, context })
        }
      ],
      temperature: 0.4
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errorText })
      };
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No answer generated.';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
