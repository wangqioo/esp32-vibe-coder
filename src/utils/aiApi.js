// AI API abstraction — supports any OpenAI-compatible endpoint
// Also supports Anthropic API natively

const ANTHROPIC_BASE = 'https://api.anthropic.com'

function isAnthropicEndpoint(baseUrl) {
  return baseUrl.includes('anthropic.com')
}

export async function streamChat({ baseUrl, apiKey, model, messages, onChunk, onDone, onError }) {
  try {
    if (isAnthropicEndpoint(baseUrl)) {
      await streamAnthropicChat({ baseUrl, apiKey, model, messages, onChunk, onDone, onError })
    } else {
      await streamOpenAIChat({ baseUrl, apiKey, model, messages, onChunk, onDone, onError })
    }
  } catch (err) {
    onError?.(err.message || 'Request failed')
  }
}

async function streamOpenAIChat({ baseUrl, apiKey, model, messages, onChunk, onDone, onError }) {
  const url = baseUrl.endsWith('/') ? baseUrl + 'chat/completions' : baseUrl + '/chat/completions'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`API error ${res.status}: ${errText}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') { onDone?.(); return }
      try {
        const json = JSON.parse(data)
        const content = json.choices?.[0]?.delta?.content
        if (content) onChunk?.(content)
      } catch {}
    }
  }
  onDone?.()
}

async function streamAnthropicChat({ baseUrl, apiKey, model, messages, onChunk, onDone, onError }) {
  // Separate system message from user/assistant messages
  let systemContent = ''
  const filteredMessages = []
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemContent = msg.content
    } else {
      filteredMessages.push(msg)
    }
  }

  const url = (baseUrl || ANTHROPIC_BASE).replace(/\/$/, '') + '/v1/messages'

  const body = {
    model: model || 'claude-sonnet-4-6',
    max_tokens: 4096,
    stream: true,
    messages: filteredMessages,
  }
  if (systemContent) body.system = systemContent

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${errText}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      try {
        const json = JSON.parse(data)
        if (json.type === 'content_block_delta') {
          const text = json.delta?.text
          if (text) onChunk?.(text)
        } else if (json.type === 'message_stop') {
          onDone?.(); return
        }
      } catch {}
    }
  }
  onDone?.()
}

// Common model suggestions per provider
export const PROVIDER_PRESETS = [
  {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini'],
    keyPlaceholder: 'sk-...',
  },
  {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001'],
    keyPlaceholder: 'sk-ant-...',
  },
  {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    keyPlaceholder: 'sk-...',
  },
  {
    name: '阿里云百炼 (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-coder-plus', 'qwen-max', 'qwen-plus'],
    keyPlaceholder: 'sk-...',
  },
  {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    keyPlaceholder: 'gsk_...',
  },
  {
    name: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    models: ['qwen2.5-coder:7b', 'codellama:7b', 'deepseek-coder:6.7b'],
    keyPlaceholder: 'ollama',
  },
]
