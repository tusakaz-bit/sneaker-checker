require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const RAKUTEN_APP_ID = process.env.NEXT_PUBLIC_RAKUTEN_APP_ID || process.env.RAKUTEN_APP_ID;

const FALLBACK_IMAGES = {
  'DD1391-100': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Nike_Dunk_Low_Black_White.jpg/800px-Nike_Dunk_Low_Black_White.jpg',
};

function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchImageBuffer(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch image: ${res.statusCode}`));
      }
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

function fetchRakutenImageUrl(keyword) {
  return new Promise((resolve, reject) => {
    if (!RAKUTEN_APP_ID) return resolve(null);
    const url = `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?format=json&keyword=${keyword}&applicationId=${RAKUTEN_APP_ID}&hits=3&imageFlag=1`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.Items && json.Items.length > 0) {
            resolve(json.Items[0].Item.mediumImageUrls[0].imageUrl);
          } else {
            resolve(null);
          }
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function uploadImageToSupabase(buffer, styleCode) {
  const fileName = `${styleCode}.jpg`;
  const { data, error } = await supabase.storage
    .from('sneaker-images')
    .upload(fileName, buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    
  if (error) {
    console.error(`Upload failed for ${styleCode}:`, error);
    return null;
  }
  const { data: publicData } = supabase.storage.from('sneaker-images').getPublicUrl(fileName);
  return publicData.publicUrl;
}

async function run() {
  console.log('Fetching all sneakers from DB...');
  const { data: sneakers, error } = await supabase.from('sneakers').select('*');
  if (error) {
    console.error('Error fetching sneakers:', error);
    return;
  }
  
  for (const sneaker of sneakers) {
    console.log(`Processing ${sneaker.name} (${sneaker.style_code})...`);
    
    let sourceUrl = FALLBACK_IMAGES[sneaker.style_code];
    if (!sourceUrl) {
      sourceUrl = await fetchRakutenImageUrl(sneaker.style_code);
    }
    if (!sourceUrl) {
      console.log(`No image source found for ${sneaker.style_code}, using placehold.co`);
      sourceUrl = `https://placehold.co/400x400/eeeeee/333333.png?text=${encodeURIComponent(sneaker.model)}`;
    }
    
    console.log(`Downloading image from ${sourceUrl}...`);
    try {
      const buffer = await fetchImageBuffer(sourceUrl);
      console.log(`Uploading ${sneaker.style_code} to Supabase...`);
      const publicUrl = await uploadImageToSupabase(buffer, sneaker.style_code);
      
      if (publicUrl) {
        await supabase
          .from('sneakers')
          .update({ image_url: publicUrl })
          .eq('style_code', sneaker.style_code);
        console.log(`Success: ${sneaker.style_code} -> ${publicUrl}`);
      }
    } catch(err) {
      console.error(`Failed to process ${sneaker.style_code}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('Migration complete!');
}
run();


