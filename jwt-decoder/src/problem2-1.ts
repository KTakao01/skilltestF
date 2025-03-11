import dotenv from 'dotenv';

dotenv.config();

// base64URLデコード
function base64UrlDecode(input: string): string {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
        base64 += '=';
    }

    return Buffer.from(base64, 'base64').toString('utf-8');
}

// JWTのペイロード（クレーム）を取得する
function getJWTPayload(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
    }

    const payload = base64UrlDecode(parts[1]);
    return JSON.parse(payload); // JSON→オブジェクトに変換して操作できるようにする
}

//　問題２-1の回答
function problem2_1(): string {
    const jwt = process.env.JWT_TOKEN;
    if (!jwt) {
        throw new Error('JWT_TOKEN is not set');
    }
    
    const payload = getJWTPayload(jwt);
    return payload.flag;
}

console.log(problem2_1());
