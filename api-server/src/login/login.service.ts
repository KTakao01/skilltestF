import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class LoginService {
    generateToken(username: string, password: string): string {
        const combined = username + password;
        return crypto.createHash('sha1').update(combined).digest('hex')
    }
}
