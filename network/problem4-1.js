const dns = require('dns');
const util = require('util');

// DNSのTXTレコードを取得する関数をPromise化
const resolveTxt = util.promisify(dns.resolveTxt);

async function getDkimFlag() {
  try {
    // DKIM-Signatureからセレクタとドメインを抽出
    const selector = 'dk4419';
    const domain = 'st.fntxt.co';
    
    // DKIMの公開鍵が存在するDNSレコードのパスを構築
    const dkimDomain = `${selector}._domainkey.${domain}`;
    
    console.log(`Querying TXT record for: ${dkimDomain}`);
    
    // DNSのTXTレコードを照会
    const txtRecords = await resolveTxt(dkimDomain);
    
    console.log('TXTレコード:', txtRecords);
    // TXTレコードは配列の配列として返されるので、最初のレコードを取得
    const txtRecord = txtRecords[0].join('');
    console.log('Found TXT record:', txtRecord);
    
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// 関数を実行
getDkimFlag().then(flag => {
  if (flag) {
    console.log('Success! Flag:', flag);
  } else {
    console.log('Failed to retrieve the flag');
  }
});