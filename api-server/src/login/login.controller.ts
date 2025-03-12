import { Controller, Put, Body, HttpCode } from '@nestjs/common';
import { LoginService } from './login.service';

@Controller()
export class LoginController {
    constructor(private readonly loginService: LoginService) {}

    @Put('login')
    @HttpCode(200)
    async login(@Body() body: { username: string, password: string}) {
        const token = this.loginService.generateToken(body.username, body.password);
        return { token };
    }

    @Put('flag')
    @HttpCode(200)
    async getFlag(@Body() body: { flag: string}) {
        console.log('フラグ', body.flag);
        return { success: true};
    }
}
