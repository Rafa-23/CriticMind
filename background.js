const API_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'analyzeLink') {
    handleAnalysisRequest(request, sendResponse);
    return true;
  }
});

async function handleAnalysisRequest(request, sendResponse) {
  try {
    const result = await analyzeUrl(request.url);
    sendResponse(result);
  } catch (error) {
    console.error('Analysis Error:', error);
    sendResponse({
      error: true,
      message: 'Content analysis failed',
      details: error.message,
      retryable: error.retryable !== false
    });
  }
}

async function analyzeUrl(url) {
  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  
  if (!apiKey) {
    throw new Error('Please configure your API key in extension settings');
  }

  const prompt = `Analyze the content at this URL: ${url}
  - Provide a 3-sentence summary
  - Identify key entities/organizations
  - Assess credibility (Low/Medium/High)
  - Highlight potential biases
  - Categorize main topic
  
  Format response as markdown with bold headings. Max 150 words.`;

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-r1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw handleApiError(errorData, response.status);
  }

  const data = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response format from API');
  }

  return { content: data.choices[0].message.content };
}

function handleApiError(errorData, statusCode) {
  const error = new Error(errorData.error?.message || 'API request failed');
  
  switch (statusCode) {
    case 401:
      error.message = 'Invalid API key - update in extension settings';
      error.retryable = false;
      break;
    case 429:
      error.message = 'API rate limit exceeded - try again later';
      error.retryable = true;
      break;
    case 500:
      error.message = 'Server error - please retry';
      error.retryable = true;
      break;
  }

  return error;
}
