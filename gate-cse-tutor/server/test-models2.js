import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;

async function listModels() {
  try {
    const res = await fetch('https://api.cerebras.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`
      }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

listModels();
