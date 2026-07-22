import https from 'https';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
    this.code = code;
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const callGroqApi = (messages: ChatMessage[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return reject(new GroqError('Groq API Key has not been configured. Please add a valid GROQ_API_KEY to the backend .env file.', 500, 'MISSING_API_KEY'));
    }

    const requestBody = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(GROQ_URL, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            const replyText = parsed.choices?.[0]?.message?.content;
            if (replyText) {
              resolve(replyText.trim());
            } else {
              reject(new GroqError('Invalid response structure returned by Groq API.', 502, 'BAD_GATEWAY'));
            }
          } else {
            let errorMsg = 'Groq API call failed';
            let errorCode = 'API_ERROR';
            try {
              const parsed = JSON.parse(data);
              errorMsg = parsed.error?.message || errorMsg;
              errorCode = parsed.error?.code || parsed.error?.type || errorCode;
            } catch (_) {}
            reject(new GroqError(errorMsg, res.statusCode || 500, errorCode));
          }
        } catch (err: any) {
          reject(new GroqError(`Failed to parse Groq response: ${err.message}`, 500, 'PARSE_ERROR'));
        }
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new GroqError('Connection to Groq API timed out.', 504, 'TIMEOUT'));
    });

    req.on('error', (err) => {
      reject(new GroqError(`Network connection error to Groq: ${err.message}`, 500, 'NETWORK_ERROR'));
    });

    req.write(requestBody);
    req.end();
  });
};

export const testGroqConnection = async (): Promise<void> => {
  const apiKey = process.env.GROQ_API_KEY;
  const exists = apiKey ? 'YES' : 'NO';
  const len = apiKey ? apiKey.length : 0;
  
  console.log(`[Groq Audit] GROQ_API_KEY detected: ${exists}`);
  console.log(`[Groq Audit] Key length: ${len}`);

  if (!apiKey) {
    console.warn('[Groq Audit] API Key is missing. Skipping startup test request.');
    return;
  }

  try {
    console.log('[Groq Audit] Sending startup test request to Groq API...');
    const response = await callGroqApi([{ role: 'user', content: 'Hi' }]);
    console.log('[Groq Audit] Startup test request succeeded. Response:', response);
  } catch (error: any) {
    console.error('[Groq Audit] Startup test request FAILED.');
    if (error instanceof GroqError) {
      console.error(`[Groq Audit] HTTP Status: ${error.status}`);
      console.error(`[Groq Audit] Error Code: ${error.code || 'N/A'}`);
      console.error(`[Groq Audit] Error Message: ${error.message}`);
    } else {
      console.error(`[Groq Audit] Error details: ${error.message || error}`);
    }
  }
};
