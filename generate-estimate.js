export default async function handler(req, res) {
  // CORSヘッダー
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'プロンプトが必要です' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `あなたはWeb制作・システム開発・コンサルティング会社の見積作成AIアシスタントです。
以下の依頼内容から、適切な見積明細を作成してください。

【依頼内容】
${prompt}

【出力形式】
必ず以下のJSON形式のみで回答してください。説明文は不要です。
{
  "clientName": "クライアント名（推測または「要確認」）",
  "projectName": "案件名",
  "items": [
    {"name": "項目名", "quantity": 数量, "unitPrice": 単価（円）}
  ],
  "notes": "備考（あれば）",
  "probability": 成約確度（30-80の数値）
}

【単価の目安】
- Webサイトデザイン: 200,000〜500,000円
- コーディング: 100,000〜300,000円
- システム開発: 300,000〜1,000,000円
- コンサルティング: 100,000〜300,000円/月
- 保守運用: 30,000〜100,000円/月
- AI導入支援: 200,000〜500,000円`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error:', errorData);
      return res.status(response.status).json({ error: 'AI APIエラー' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // JSONを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.status(200).json(parsed);
    } else {
      return res.status(500).json({ error: 'AIの応答を解析できませんでした' });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
