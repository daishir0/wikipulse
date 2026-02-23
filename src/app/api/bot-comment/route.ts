import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

const CLAUDE_PATH = '/home/ec2-user/.npm-global/bin/claude';
const TIMEOUT_MS = 60000; // 60s timeout

const ANGLES = [
  '意味・定義（その語が何を表すか、どういう概念か）',
  '歴史・起源（その語やテーマがいつ・どこで生まれたか）',
  '最近のニュース・時事（最近話題になった理由やニュース）',
  '語源・名前の由来（なぜそう呼ばれるか、語源は何か）',
  '文化・社会的な影響（その語が文化や社会にどんな影響を与えたか）',
  '科学・技術の視点（科学的・技術的に面白い側面）',
  '地理・場所との関係（どこの国・地域と関係があるか）',
  '意外な豆知識・トリビア（ほとんどの人が知らない面白い事実）',
  '他のものとの比較・つながり（似たものや関連するもの）',
  '未来・展望（今後どうなりそうか、どう発展しそうか）',
];

const LANG_REGION: Record<string, string> = {
  en: 'アメリカ・イギリス圏',
  ja: '日本',
  zh: '中国',
  de: 'ドイツ',
  fr: 'フランス',
  es: 'スペイン語圏',
  pt: 'ブラジル・ポルトガル',
  ru: 'ロシア',
  it: 'イタリア',
  ko: '韓国',
  ar: 'アラブ圏',
  hi: 'インド',
  nl: 'オランダ',
  pl: 'ポーランド',
  sv: 'スウェーデン',
  vi: 'ベトナム',
  uk: 'ウクライナ',
  cs: 'チェコ',
  id: 'インドネシア',
  th: 'タイ',
  fa: 'イラン',
  he: 'イスラエル',
  tr: 'トルコ',
};

interface EditSummary {
  title: string;
  lang: string;
  byteDiff: number;
  type: string;
  bot: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { edits } = (await req.json()) as { edits: EditSummary[] };

    if (!edits || edits.length === 0) {
      return NextResponse.json({ comment: '' });
    }

    // Build a concise edit summary for the prompt (no byteDiff, with region)
    const humanEdits = edits.filter((e) => !e.bot).slice(0, 8);
    console.log(`[bot-comment] Calling Claude CLI with ${humanEdits.length} human edits`);
    const editLines = humanEdits
      .map((e) => {
        const typeLabel = e.type === 'new' ? '[新規]' : '[編集]';
        const region = LANG_REGION[e.lang] || e.lang.toUpperCase() + '語圏';
        return `${typeLabel} ${region}(${e.lang.toUpperCase()}版)「${e.title}」`;
      })
      .join('\n');

    console.log(`[bot-comment] editLines:\n${editLines}`);

    if (!editLines) {
      return NextResponse.json({ comment: '' });
    }

    // Pick a random angle
    const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];

    const prompt = `あなたはWikiPulseというWikipediaリアルタイム可視化サイトのマスコットキャラ「ウィキまる」です。

以下は直近にWikipediaで行われた編集の一部です：

${editLines}

上記の中から1つ選んで、【${angle}】の角度からコメントしてください。

ルール：
- 話し始めは以下のパターンからランダムに選んで使うこと（地域名と記事名を含めること）：
  「さっき○○（地域）のWikipediaで《記事名》が編集されたね！これはね、」
  「おっ、○○（地域）で《記事名》が更新されてる！○○（地域）でこれが注目されてるってことは、」
  「いま○○（地域）のWikipediaで《記事名》が編集されたよ！」
  「○○（地域）から《記事名》の編集が来てるね！これって、」
- 記事名は必ず《》で囲むこと（例：《東京タワー》）。《》は記事名にだけ使うこと。
- 地域名は《》で囲まないこと。
- この分野を全く知らない素人にもわかるように、かみくだいて説明すること。専門用語は使わず、小学生でもわかるくらい簡単な言葉で。
- 読んだ人が「もっと知りたい！」と思えるように、意外性や驚きのある内容を入れること。
- 3文くらいで説明すること。1文だけは短すぎるのでNG。
- 親しみやすいカジュアルな口調（「〜だよ」「〜なんだって！」「〜らしいよ」）
- 絵文字は使わない
- 「ウィキまる」としての一人称は使わない
- 出力はコメント本文のみ（説明や前置き不要）`;

    console.log(`[bot-comment] prompt length: ${prompt.length} chars`);

    const comment = await runClaude(prompt);
    console.log(`[bot-comment] Claude returned (${comment.length} chars): ${comment ? comment.slice(0, 80) + '...' : '(empty)'}`);
    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Bot comment error:', error);
    return NextResponse.json({ comment: '' }, { status: 500 });
  }
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { CLAUDECODE, ...restEnv } = process.env;

    // Write prompt to temp file to avoid stdin pipe issues
    const tmpFile = `/tmp/claude-prompt-${Date.now()}.txt`;
    try {
      writeFileSync(tmpFile, prompt, 'utf8');
      console.log(`[bot-comment] Prompt written to ${tmpFile} (${prompt.length} chars)`);
    } catch (err) {
      console.error(`[bot-comment] Failed to write prompt file:`, err);
      resolve('');
      return;
    }

    // Use bash to cat the file into claude's stdin
    const proc = spawn('bash', ['-c', `cat "${tmpFile}" | ${CLAUDE_PATH} --print --dangerously-skip-permissions`], {
      cwd: '/tmp',
      env: { ...restEnv, HOME: '/home/ec2-user' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill();
      console.log(`[bot-comment] CLI timeout after ${TIMEOUT_MS}ms`);
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      resolve('');
    }, TIMEOUT_MS);

    proc.on('close', (code) => {
      clearTimeout(timer);
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      const stdoutHex = Buffer.from(stdout).toString('hex').slice(0, 40);
      console.log(`[bot-comment] CLI exit code=${code}, stdout=${stdout.length}bytes (hex:${stdoutHex}), stderr=${stderr.length}bytes`);
      if (stderr) console.log(`[bot-comment] stderr: ${stderr.slice(0, 200)}`);
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        console.error('Claude CLI error:', stderr || '(empty stderr)');
        resolve('');
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      console.error('Claude CLI spawn error:', err);
      resolve('');
    });
  });
}
