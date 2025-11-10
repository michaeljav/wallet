import { Body, Controller, Get, Post, Query, HttpCode, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  RegisterClientDto,
  TopupDto,
  InitiatePaymentDto,
  ConfirmPaymentDto,
} from './dtos';
import { ok, fail } from './response';

@Controller()
export class WalletController {
  constructor(private readonly service: WalletService) {}

  @Post('clients/register')
  @HttpCode(200)
  async register(@Body() dto: RegisterClientDto) {
    try {
      return ok(await this.service.registerClient(dto), 'Cliente registrado');
    } catch (e: any) {
      return fail(e.message);
    }
  }

  @Post('wallet/topup')
  @HttpCode(200)
  async topup(@Body() dto: TopupDto) {
    try {
      return ok(await this.service.topup(dto), 'Recarga exitosa');
    } catch (e: any) {
      return fail(e.message);
    }
  }

  @Post('payments/initiate')
  @HttpCode(200)
  async initiate(@Body() dto: InitiatePaymentDto) {
    try {
      return ok(await this.service.initiatePayment(dto), 'Pago iniciado');
    } catch (e: any) {
      return fail(e.message);
    }
  }

  @Post('payments/confirm')
  @HttpCode(200)
  async confirm(@Body() dto: ConfirmPaymentDto) {
    try {
      return ok(await this.service.confirmPayment(dto), 'Pago confirmado');
    } catch (e: any) {
      return fail(e.message);
    }
  }

  @Get('wallet/balance')
  @HttpCode(200)
  async balance(
    @Query('document') document: string,
    @Query('phone') phone: string,
  ) {
    try {
      return ok(await this.service.balance(document, phone), 'Saldo');
    } catch (e: any) {
      return fail(e.message);
    }
  }

  @Get('health')
  @HttpCode(200)
  health() {
    return ok({ status: 'ok' }, 'Health OK');
  }

  @Get('payments/dev-token/:sessionId')
  @HttpCode(200)
  async devToken(@Param('sessionId') sessionId: string) {
    const expose = String(process.env.EXPOSE_TOKENS || '').toLowerCase() === 'true';
    if (!expose) {
      return fail('Not allowed', -1);
    }
    const svc: any = this.service as any;
    const session = await svc.sessionModel.findOne({ sessionId });
    if (!session) return fail('Session not found', -1);
    return ok({ token6: session.token6 }, 'Dev token');
  }
}
