import dotenv from 'dotenv';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as sshpk from 'sshpk';

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
            default:
                return false;
        }

        // 署名を検証
        const verify = crypto.createVerify(algorithm);
        verify.update(headerAndPayload);
        return verify.verify(publicKey, signature);
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

// 問題2-2の回答
function problem2_2(): string {
    // 環境変数からSSH公開鍵を取得
    const sshPublicKey = process.env.SSH_PUBLIC_KEY;
    if (!sshPublicKey) {
        throw new Error('SSH_PUBLIC_KEY is not set');
    }

    // SSH公開鍵をPEM形式に変換（sshpkを使用）
    const key = sshpk.parseKey(sshPublicKey, 'ssh');
    const pemPublicKey = key.toString('pem');
    
    // JWTファイルのパスを環境変数から取得
    const jwtsFilePath = process.env.JWTS_FILE_PATH || './data/jwts.rand.txt';

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

        if (verifyJWT(jwt, pemPublicKey)) {
            console.log(`JWT ${i + 1}は有効です！`);
            const payload = getJWTPayload(jwt);
            return payload.flag;
        }
    }
    return 'No valid JWT found';
}

// 関数を実行して結果を表示
console.log(problem2_2());