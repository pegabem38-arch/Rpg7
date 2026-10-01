import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // YouTube search API proxy
  app.get('/api/youtube/search', async (req, res) => {
    try {
      const query = (req.query.q as string || '').trim();
      if (!query) {
        return res.json({ results: [] });
      }

      // Add 'música' or 'audio' context if query doesn't specify
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

      const html = await new Promise<string>((resolve, reject) => {
        const request = https.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache'
          }
        }, (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => resolve(data));
        });

        request.on('error', (err) => reject(err));
        request.setTimeout(8000, () => {
          request.destroy();
          reject(new Error('YouTube request timeout'));
        });
      });

      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (!match) {
        return res.json({ results: [] });
      }

      const json = JSON.parse(match[1]);
      const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
      const itemSection = contents?.find((c: any) => c.itemSectionRenderer)?.itemSectionRenderer;
      
      const rawResults = (itemSection?.contents || [])
        .filter((c: any) => c.videoRenderer && c.videoRenderer.videoId)
        .map((c: any) => {
          const v = c.videoRenderer;
          const id = v.videoId;
          const title = v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || 'Música';
          const artist = v.ownerText?.runs?.map((r: any) => r.text).join('') || v.shortBylineText?.runs?.map((r: any) => r.text).join('') || 'Artista';
          const duration = v.lengthText?.simpleText || '';
          
          let thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
          if (v.thumbnail?.thumbnails && v.thumbnail.thumbnails.length > 0) {
            thumbnail = v.thumbnail.thumbnails[v.thumbnail.thumbnails.length - 1].url;
          }

          return {
            id,
            title,
            artist,
            duration,
            thumbnail,
            youtube_url: `https://www.youtube.com/watch?v=${id}`
          };
        })
        .slice(0, 15);

      return res.json({ results: rawResults });
    } catch (err: any) {
      console.error('YouTube search error:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar no YouTube', details: err.message, results: [] });
    }
  });

  // Suggest queries autocomplete from YouTube
  app.get('/api/youtube/suggest', async (req, res) => {
    try {
      const query = (req.query.q as string || '').trim();
      if (!query) {
        return res.json({ suggestions: [] });
      }

      const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
      const data = await new Promise<string>((resolve, reject) => {
        https.get(suggestUrl, (response) => {
          let str = '';
          response.on('data', chunk => str += chunk);
          response.on('end', () => resolve(str));
        }).on('error', reject);
      });

      const parsed = JSON.parse(data);
      const suggestions = (parsed && Array.isArray(parsed[1])) ? parsed[1] : [];
      return res.json({ suggestions: suggestions.slice(0, 8) });
    } catch (err: any) {
      return res.json({ suggestions: [] });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development with Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
