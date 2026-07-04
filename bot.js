import Anthropic from '@anthropic-ai/sdk';
import {bundle} from '@remotion/bundler';
import {renderMedia} from '@remotion/renderer';
import {google} from 'googleapis';
import fs from 'fs';

const topic = process.argv[2];
const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});

const res = await anthropic.messages.create({
  model: "claude-3-haiku-20240307",
  max_tokens: 3000,
  messages: [{role: "user", content: `اعمل كود Remotion لفيديو 20 ثانية 1080x1920 عن: ${topic}. رجع JSON فيه code,title,description,tags. الكود يكون في Video.tsx بسيط: خلفية متحركة ونص كبير في النص باسم الموضوع`}
]});

const {code, title, description, tags} = JSON.parse(res.content[0].text);
fs.writeFileSync('./src/Video.tsx', code);
fs.writeFileSync('./src/index.ts', `import {registerRoot} from 'remotion'; import {Video} from './Video'; registerRoot(Video);`);

const bundleLocation = await bundle('./src/index.ts');
await renderMedia({
  composition: {id: 'Video', durationInFrames: 600, fps: 30, width: 1080, height: 1920},
  serveUrl: bundleLocation,
  codec: 'h264',
  outputLocation: `out/video.mp4`,
});

const auth = new google.auth.OAuth2(process.env.YT_CLIENT_ID, process.env.YT_SECRET);
auth.setCredentials({refresh_token: process.env.YT_REFRESH});
const youtube = google.youtube({version: 'v3', auth});
await youtube.videos.insert({
  part: ['snippet','status'],
  requestBody: {snippet: {title, description, tags, categoryId: '22'}, status: {privacyStatus: 'public'}},
  media: {body: fs.createReadStream(`out/video.mp4`)},
});
console.log('Done:', title);
