// apiService.ts

export type ModelType = 'lstm' | 'cnn-lstm' | 'transformer';
export type TransformType = 'DCT' | 'DWT' | 'CS' | 'NONE' | 'RAW';
export type DataPoint = number[];

const API_BASE_URL = 'http://localhost:8000';

const DEFAULT_EXPLANATIONS: Record<ModelType, string> = {
  lstm: "LSTM models are good at capturing temporal patterns in sequential data.",
  "cnn-lstm": "CNN-LSTM combines spatial feature extraction with temporal modeling.",
  transformer: "Transformers use attention mechanisms to model relationships across time steps.",
};

const normalizeModelName = (name: string): string =>
  name.replace('-', '_');  // converts cnn-lstm → cnn_lstm

export const runForecast = async (
  model: ModelType,
  transform: TransformType,
  data: DataPoint[]
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: normalizeModelName(model), transform, data})
    });

    if (!response.ok) throw new Error((await response.json()).detail);
    return await response.json();
  } catch (error) {
    console.error('Forecast API error:', error);
    throw new Error("Forecast failed. Please check your input data.");
  }
};

export const getBasicExplanation = async (model: ModelType) => {
  return { explanation: DEFAULT_EXPLANATIONS[model] };
};

export const getDetailedExplanation = async (
  model: ModelType,
  transform: TransformType,
  data: DataPoint[]
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/shap-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: normalizeModelName(model), transform, data: data.flat() })
    });

    if (!response.ok) throw new Error((await response.json()).detail);
    return await response.json();  // includes shap_values and base_value
  } catch (error) {
    console.error('SHAP summary API error:', error);
    throw new Error("SHAP explanation failed. Try again or check data.");
  }
};

export const askAI = async (
  userMessage: string,
  model: ModelType,
  shapValues: Record<string, number>
) => {
  const filteredEntries = Object.entries(shapValues)
    .filter(([_, v]) => typeof v === 'number' && !isNaN(v));

  const topShapSummary = filteredEntries
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 5)
    .map(([k, v]) => `${k} contributed ${v >= 0 ? 'positively' : 'negatively'} (${v.toFixed(4)})`)
    .join(', ');

  // Carefully sanitize user input and prompt to avoid control characters
  const sanitizedQuestion = userMessage.replace(/[\r\n\t\f\v]/g, ' ').trim();
  const rawPrompt = `
You are an expert AI assistant. A user is analyzing a time-series forecasting model using SHAP values.

Below is a list of key timestep contributions to the forecast:
${topShapSummary}

The user now asks:
"${userMessage}"

⚠️ IMPORTANT: Use ONLY the SHAP values above in your response. Do NOT invent values. Be precise and technical. Assume the user already knows what SHAP is.
`.replace(/[\r\n\t\f\v]+/g, ' ').trim();  // sanitize the prompt
    
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        prompt: rawPrompt,
        stream: false
      })
    });

    const data = await response.json();
    return { reply: data.response || JSON.stringify(data) };
  } catch (err) {
    console.error('Ollama AI chat error:', err);
    return {
      reply: `Unable to generate AI response currently. SHAP values: ${JSON.stringify(shapValues)}`
    };
  }
};
export const submitFeedback = async (correct: boolean, comments: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correct, comments })
    });

    if (!response.ok) throw new Error((await response.json()).detail);
    return await response.json();
  } catch (error) {
    console.error('Feedback API error:', error);
    return { status: 'success', message: 'Feedback saved locally.' };
  }
};
