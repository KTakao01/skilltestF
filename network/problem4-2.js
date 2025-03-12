const fs = require('fs');
const path = require('path');
const forge = require('node-forge');
const pki = forge.pki;

// CA証明書（問題文に記載されていたもの）
const caCertPEM = `-----BEGIN CERTIFICATE-----
MIIEjjCCAvagAwIBAgIRAPAvh+4z0ve7Z59+Q1Phxi0wDQYJKoZIhvcNAQELBQAw
XzEeMBwGA1UEChMVbWtjZXJ0IGRldmVsb3BtZW50IENBMRowGAYDVQQLDBFyb290
QGRlNTc1NDFlM2NkNjEhMB8GA1UEAwwYbWtjZXJ0IHJvb3RAZGU1NzU0MWUzY2Q2
MB4XDTIyMTIwNDEwNDYyMloXDTMyMTIwNDEwNDYyMlowXzEeMBwGA1UEChMVbWtj
ZXJ0IGRldmVsb3BtZW50IENBMRowGAYDVQQLDBFyb290QGRlNTc1NDFlM2NkNjEh
MB8GA1UEAwwYbWtjZXJ0IHJvb3RAZGU1NzU0MWUzY2Q2MIIBojANBgkqhkiG9w0B
AQEFAAOCAY8AMIIBigKCAYEAvKxR4a5XmWHwPWj3EL7ksV0jgsgcMjrv4JvCObZ1
mKdH7LEo18JNUZSeRJqRTv1rLMjpM+1yq2EfjqZesELsnc6mabYAV01nSEMiHuzi
hM7WsHDzJwtbXu/hqxxUUKlszrqIhPtpvPzSpA04wzKWQJ0CnKvAnETjSoKdVF4A
/J8OIv9yslkhzpI3eiZdVWye9zUcm6YDaGVxhFjXVgh7+QfnkZk/j4Xd4e8WJnjI
hjESmMzKHadYKlsJXPcPllebY4N5Ew8MK8OPNnyZm5+doyhv9HE4Uvb7WYU+tB3X
rdXrYWYH67+1Dv/6CYMcawY+MA41rTPkAp4KklP9dotj2JLEMVYR7tdMTM5Zqbw8
tpx3MtvH4mMB/6bHkLcUlEEBuNNtM41YAsRZJqm2Ds+PmCNptf+v/TNMdrjVB6JR
yA2bwIYNssYeh8jyfRmLYdVkiJa081d0IOpxSP0rG0BlUtPFrRDmFW+FE2KArt+i
UHpWsPElLCcZ1W+c5w5jeBjHAgMBAAGjRTBDMA4GA1UdDwEB/wQEAwICBDASBgNV
HRMBAf8ECDAGAQH/AgEAMB0GA1UdDgQWBBQmyECRhDPUKM3wC41d4LhKgxbgLzAN
BgkqhkiG9w0BAQsFAAOCAYEAWkpEl8o/lYj27lv6awkZLU0aLBLwCQh8f5UGxio7
gypzLMsMZw332MYxnf1Xk1gFo8ejGqzfwosrybjeZT7tILzgsKL55W1iiEZgrTg7
kCGTF1RRN2LR04eNb/AHu1ruxtyKjI0sxU43wgWKD8F6puq0Niq3isaKqWS8Eqyh
2pNW+xSELnCd2F6voR+NkfqxGa9dD8jYBXGZFRJeyZmVNaSQvTbBV2/9+LDTM+XS
dngmFiGrRgNNBCfSrIfgjDg1nd0lrAVdp2ws6nSAm28OAXK9Esw4teMdukZ44j2W
E3r8YRjD5co0atJ1iuTHJMisDqYmgxFJOaR5svuupSmWMI/pwgbh+6abEnMEfDov
Bn8p02C+Bv4fS1Nm/6V0dJEhseB60EqnJx+QidZrtjK14MzXC1inBXRE5BLv7y4q
+B1+ikT/LMTIvrK+Y4Gtb+Id6f7T2g6tPQS+xSAugKmE68YTnv2covCewBxlkAPI
3zDJwVhklIb7P6aGjIK8v5aF
-----END CERTIFICATE-----`;

// 証明書ディレクトリのパス
const certsDir = path.join(__dirname, 'certs');

// CA証明書をパース
let caCert;
try {
  caCert = pki.certificateFromPem(caCertPEM);
  console.log('CA証明書を正常にパースしました');
} catch (error) {
  console.error('CA証明書のパースに失敗しました:', error);
  process.exit(1);
}

// 証明書を検証する関数
function verifyCertificate(certPath) {
  try {
    // 証明書ファイルを読み込む
    const certPEM = fs.readFileSync(certPath, 'utf8');
    
    // 証明書をパース
    const cert = pki.certificateFromPem(certPEM);
    
    // 証明書の発行者情報を取得
    const issuer = cert.issuer.attributes.map(attr => `${attr.name}=${attr.value}`).join(', ');
    const subject = cert.subject.attributes.map(attr => `${attr.name}=${attr.value}`).join(', ');
    
    console.log(`\n証明書: ${path.basename(certPath)}`);
    console.log(`発行者: ${issuer}`);
    console.log(`サブジェクト: ${subject}`);
    
    // 証明書を検証
    try {
      const result = caCert.verify(cert);
      if (result) {
        console.log(`検証結果: 成功 - この証明書は指定されたCAによって署名されています`);
        console.log(`FLAG: ${path.basename(certPath).replace(/f1nat3xthd\{|\}\.pem/g, '')}`);
        return true;
      } else {
        console.log('検証結果: 失敗 - 署名が一致しません');
        return false;
      }
    } catch (verifyError) {
      console.log(`検証エラー: ${verifyError.message || verifyError}`);
      return false;
    }
  } catch (error) {
    console.error(`証明書の読み込みまたはパースに失敗しました: ${certPath}`, error);
    return false;
  }
}

// メイン関数
async function findCertificatesIssuedByCA() {
  try {
    // ディレクトリが存在するか確認
    if (!fs.existsSync(certsDir)) {
      console.error(`ディレクトリが存在しません: ${certsDir}`);
      return;
    }
    
    // 証明書ファイルの一覧を取得
    const files = fs.readdirSync(certsDir);
    console.log(`${files.length} 個の証明書ファイルを見つけました`);
    
    // 各証明書をチェック
    let foundMatch = false;
    for (const file of files) {
      if (foundMatch) break; // 一致する証明書が見つかったらループを終了
      
      if (file.endsWith('.pem')) {
        const certPath = path.join(certsDir, file);
        
        // 証明書を検証
        if (verifyCertificate(certPath)) {
          foundMatch = true;
          console.log(`\n=== 一致する証明書を見つけました！ ===`);
          console.log(`ファイル名: ${file}`);
          const flag = file.replace(/f1nat3xthd\{|\}\.pem/g, '');
          console.log(`FLAG: ${flag}`);
          console.log('=======================================\n');
          
          // 結果を大きく表示
          console.log('\n');
          console.log('##################################################');
          console.log(`#                                                #`);
          console.log(`#  発見したFLAG: ${flag}  #`);
          console.log(`#                                                #`);
          console.log('##################################################');
          console.log('\n');
          
          // ループを終了
          break;
        }
      }
    }
    
    if (!foundMatch) {
      console.log(`検索完了: 一致する証明書は見つかりませんでした`);
    } else {
      console.log(`検索完了: 一致する証明書を見つけました！`);
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

// node-forgeがインストールされているか確認
try {
  require.resolve('node-forge');
  console.log('node-forgeが見つかりました。処理を開始します...');
  findCertificatesIssuedByCA();
} catch (e) {
  console.error('node-forgeがインストールされていません。以下のコマンドでインストールしてください:');
  console.error('npm install node-forge');
} 