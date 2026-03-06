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

interface ArticleContext {
  summary: string;
  diffSnippet: string;
}

async function fetchArticleContext(title: string, lang: string): Promise<ArticleContext> {
  const result: ArticleContext = { summary: '', diffSnippet: '' };

  try {
    // Fetch article summary
    const summaryRes = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (summaryRes.ok) {
      const data = await summaryRes.json();
      result.summary = (data.extract || '').slice(0, 300);
    }
  } catch { /* ignore */ }

  try {
    // Fetch latest diff snippet
    const revRes = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=revisions&rvprop=ids&rvlimit=1&format=json&origin=*`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (revRes.ok) {
      const revData = await revRes.json();
      const pages = revData.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0] as { revisions?: { revid: number; parentid: number }[] };
        const rev = page.revisions?.[0];
        if (rev && rev.parentid) {
          const diffRes = await fetch(
            `https://${lang}.wikipedia.org/w/api.php?action=compare&fromrev=${rev.parentid}&torev=${rev.revid}&format=json&origin=*`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (diffRes.ok) {
            const diffData = await diffRes.json();
            const diffHtml = diffData.compare?.['*'] || '';
            // Strip HTML tags and extract text
            const diffText = diffHtml
              .replace(/<ins[^>]*>(.*?)<\/ins>/g, '[追加: $1]')
              .replace(/<del[^>]*>(.*?)<\/del>/g, '[削除: $1]')
              .replace(/<[^>]+>/g, '')
              .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
              .trim();
            result.diffSnippet = diffText.slice(0, 500);
          }
        }
      }
    }
  } catch { /* ignore */ }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { edits, requestedArticle } = (await req.json()) as { edits: EditSummary[]; requestedArticle?: string | null };

    if (!edits || edits.length === 0) {
      return NextResponse.json({ comment: '' });
    }

    // Build a concise edit summary for the prompt (with byteDiff and region)
    const humanEdits = edits.filter((e) => !e.bot).slice(0, 8);
    console.log(`[bot-comment] Calling Claude CLI with ${humanEdits.length} human edits`);
    const editLines = humanEdits
      .map((e) => {
        const typeLabel = e.type === 'new' ? '[新規記事作成]' : '[編集]';
        const region = LANG_REGION[e.lang] || e.lang.toUpperCase() + '語圏';
        const diffLabel = e.type === 'new' ? '' : e.byteDiff >= 0 ? ` (+${e.byteDiff}バイト)` : ` (${e.byteDiff}バイト)`;
        return `${typeLabel} ${region}(${e.lang.toUpperCase()}版)「${e.title}」${diffLabel}`;
      })
      .join('\n');

    console.log(`[bot-comment] editLines:\n${editLines}`);

    if (!editLines) {
      return NextResponse.json({ comment: '' });
    }

    // Fetch article context (summary + diff) in parallel
    console.log(`[bot-comment] Fetching article context for ${humanEdits.length} articles...`);
    const contexts = await Promise.all(
      humanEdits.map((e) => fetchArticleContext(e.title, e.lang))
    );

    const contextLines = humanEdits.map((e, i) => {
      const ctx = contexts[i];
      const parts: string[] = [];
      if (ctx.summary) parts.push(`記事概要: ${ctx.summary}`);
      if (ctx.diffSnippet) parts.push(`変更内容: ${ctx.diffSnippet}`);
      if (parts.length === 0) return '';
      return `\n「${e.title}」の詳細:\n${parts.join('\n')}`;
    }).filter(Boolean).join('\n');

    console.log(`[bot-comment] contextLines length: ${contextLines.length} chars`);

    // Pick a random angle
    const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];

    let prompt: string;

    if (requestedArticle) {
      // User specifically requested this article via "ウィキまるに送る"
      prompt = `あなたはWikiPulseというWikipediaリアルタイム可視化サイトのマスコットキャラ「ウィキまる」です。

ユーザーが「ウィキまるに送る」ボタンを押して、以下の記事について教えてほしいとリクエストしてきました：

${editLines}
${contextLines}

上記の記事概要と変更内容を踏まえて、【${angle}】の角度から解説してください。

ルール：
- 最初の一文は、ユーザーがこの記事を送ってくれたことに触れる書き出しにすること。例：
  「《記事名》について聞いてくれたんだね！これはね、〜〜」
  「おっ、《記事名》が気になったんだ！いい質問だね〜。実はこれ、〜〜」
  「《記事名》を送ってくれてありがとう！これについて話せるの嬉しいな〜。〜〜」
- どんな編集がされたかにも軽く触れること。上記の「変更内容」や「記事概要」を参考に、具体的に何が追加・修正されたかを自然に織り込むこと。
- 記事名は必ず《》で囲むこと（例：《東京タワー》）。《》は記事名にだけ使うこと。
- 地域名は《》で囲まないこと。
- この分野を全く知らない素人にもわかるように、かみくだいて説明すること。専門用語は使わず、小学生でもわかるくらい簡単な言葉で。
- 読んだ人が「もっと知りたい！」と思えるように、意外性や驚きのある内容を入れること。
- 3〜4文くらいで説明すること。1文だけは短すぎるのでNG。
- 親しみやすいカジュアルな口調（「〜だよ」「〜なんだって！」「〜らしいよ」）
- 絵文字は使わない
- 「ウィキまる」としての一人称は使わない
- 出力はコメント本文のみ（説明や前置き不要）`;
    } else {
      // Normal periodic comment
      prompt = `あなたはWikiPulseというWikipediaリアルタイム可視化サイトのマスコットキャラ「ウィキまる」です。

以下は直近にWikipediaで行われた編集の一部です：

${editLines}
${contextLines}

上記の中から1つ選んで、記事概要や変更内容を踏まえた上で、【${angle}】の角度から「問いかけ→答え」の形式でコメントしてください。

ルール：
- まず読者に問いかけてから、自分で答える形式にすること。例：
  「○○（地域）で《記事名》が編集されてるけど、なんでこれが今注目されてると思う？実はね、〜〜なんだよ」
  「○○（地域）のWikipediaで《記事名》が更新されたんだけど、そもそもこれって何か知ってる？これはね、〜〜なんだって！」
  「いま○○（地域）から《記事名》の編集が来てるんだけど、これの何がすごいか分かる？実は〜〜らしいよ」
- どんな編集がされたかにも軽く触れること。上記の「変更内容」や「記事概要」を参考に、具体的に何が追加・修正されたかを自然に織り込むこと。
- 記事名は必ず《》で囲むこと（例：《東京タワー》）。《》は記事名にだけ使うこと。
- 地域名は《》で囲まないこと。
- この分野を全く知らない素人にもわかるように、かみくだいて説明すること。専門用語は使わず、小学生でもわかるくらい簡単な言葉で。
- 読んだ人が「もっと知りたい！」と思えるように、意外性や驚きのある内容を入れること。
- 3文くらいで説明すること。1文だけは短すぎるのでNG。
- 親しみやすいカジュアルな口調（「〜だよ」「〜なんだって！」「〜らしいよ」）
- 絵文字は使わない
- 「ウィキまる」としての一人称は使わない
- 出力はコメント本文のみ（説明や前置き不要）`;
    }

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
