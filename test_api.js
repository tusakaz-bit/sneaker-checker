const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k].replace(/^"|"$/g, '');
  }
}

async function run() {
  const keyword = "New Balance 550 BB550BBB";
  const paramsObj = {
    applicationId: process.env.RAKUTEN_APP_ID,
    keyword: keyword,
    availability: '1',
    sort: '+itemPrice',
    hits: '5',
    imageFlag: '1',
    format: 'json',
    genreId: '558885',
  };
  const searchParams = new URLSearchParams(paramsObj);
  const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${searchParams.toString()}`;
  
  const res = await fetch(url);
  const data = await res.json();
  if (data.Items) {
    data.Items.forEach(item => {
      console.log(`¥${item.Item.itemPrice} - ${item.Item.itemName.substring(0, 50)}`);
    });
  } else {
    console.log(data);
  }
}
run();
