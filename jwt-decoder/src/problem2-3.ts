import dotenv from 'dotenv';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as sshpk from 'sshpk';
import * as path from 'path';

dotenv.config();

// Base64URLデコード
function base64UrlDecode(input: string): Buffer {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
        base64 += '=';       
    }
    return Buffer.from(base64, 'base64'); 
}

// JWTを検証する
function verifyJWT(token: string, publicKey: string): boolean {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return false;
        }

        // ヘッダーとペイロードを取得
        const headerAndPayload = parts[0] + '.' + parts[1];
        // 署名を取得
        const signature = base64UrlDecode(parts[2]);

        // ヘッダーを解析してアルゴリズムを確認
        const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
        console.log('header:',header);
        // アルゴリズムを確認
        let algorithm: string;
        switch (header.alg) {
            case 'RS256':
                algorithm = 'RSA-SHA256';
                break;
            case 'RS384':
                algorithm = 'RSA-SHA384';
                break;
            case 'RS512':
                algorithm = 'RSA-SHA512';
                break;
            case 'PS256':
                algorithm = 'RSA-SHA256'; // PS256はRSA-PSSを使用する
                break;
            case 'PS384':
                algorithm = 'RSA-SHA384';
                break;
            case 'PS512':
                algorithm = 'RSA-SHA512';
                break;
            default:
                console.log(`サポートされていないアルゴリズム: ${header.alg}`);
                return false;
        }

        // 署名を検証
        const verify = crypto.createVerify(algorithm);
        verify.update(headerAndPayload);
                
        if (header.alg.startsWith('PS')) {
            // PS* アルゴリズム(RSA-PSS)用の処理
            return verify.verify({
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING
            }, signature);
        } else {
            // RS* アルゴリズム(RSASSA-PKCS1-v1_5)用の処理
            return verify.verify(publicKey, signature);
        }
    } catch (error) {
        console.error('JWT検証エラー:', error);
        return false;
    }
}

// JWTのペイロードを取得する関数
function getJWTPayload(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
    }
    return JSON.parse(base64UrlDecode(parts[1]).toString());
}

// 秘密鍵から公開鍵を導出する関数
// 秘密鍵から公開鍵を導出する関数
function derivePublicKey(privateKeyPem: string): string {
    try {
        // 秘密鍵をNode.jsの鍵オブジェクトに変換
        const privateKeyObj = crypto.createPrivateKey({
            key: privateKeyPem,
            format: 'pem'
        });
        
        // 秘密鍵から公開鍵を導出
        const publicKeyObj = crypto.createPublicKey(privateKeyObj);
        
        // 公開鍵をPEM形式の文字列として出力
        const publicKeyPem = publicKeyObj.export({
            type: 'spki',
            format: 'pem'
        }).toString();
        
        console.log("生成された公開鍵:");
        console.log(publicKeyPem);
        
        return publicKeyPem;
    } catch (error) {
        console.error('秘密鍵から公開鍵の導出中にエラーが発生:', error);
        throw error;
    }
}

// 問題2-3の回答
function problem2_3(): string {
    // ファイルから秘密鍵を読み込む
    const privateKeyPath = process.env.PRIVATE_KEY_PATH || './private-key.pem';
    if (!fs.existsSync(privateKeyPath)) {
        throw new Error(`Private key file not found: ${privateKeyPath}`);
    }
    
    const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
    
    console.log('秘密鍵から公開鍵を導出中...');
    // 秘密鍵から公開鍵を導出
    const publicKeyPem = derivePublicKey(privateKeyPem);
    console.log('公開鍵の導出が完了しました');
    
    // JWTファイルのパスを環境変数から取得
    const jwtsFilePath = process.env.JWTS_FILE_PATH2 || path.join(__dirname, '../data/jwts.rand2.txt');

    // ファイルが存在するか確認
    if (!fs.existsSync(jwtsFilePath)) {
        throw new Error(`JWT file not found: ${jwtsFilePath}`);
    }
    
    // JWTのリストを読み込む
    const jwts = fs.readFileSync(jwtsFilePath, 'utf-8').split('\n').filter(Boolean);

    console.log(`読み込まれたJWT数: ${jwts.length}`);

    // 有効なJWTを見つける
    for (let i = 0; i < jwts.length; i++) {
        const jwt = jwts[i];
        console.log(`JWT ${i + 1}を検証中...`);

        if (verifyJWT(jwt, publicKeyPem)) {
            console.log(`JWT ${i + 1}は有効です！`);
            const payload = getJWTPayload(jwt);
            return payload.flag;
        }
    }
    return 'No valid JWT found';
}

// 関数を実行して結果を表示
console.log(problem2_3());

