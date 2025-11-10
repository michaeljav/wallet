import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
  async register(@Body() dto: RegisterClientDto) {
    try {
      return ok(await this.service.registerClient(dto), 'Cliente registrado');
    } catch (e: any) {
      return fail(e.message);
    }
  }

  @Post('wallet/topup')
  async topup(@Body() dto: TopupDto) {
    try {
      return ok(await this.service.topup(dto), 'Recarga exitosa');
    } catch (e: any) {
      return fail(e.message);
    }
  }

  @Post('payments/initiate')
  async initiate(@Body() dto: InitiatePaymentDto) {
    try {
      return ok(await this.service.initiatePayment(dto), 'Pago iniciado');
    } catch (e: any) {
      return fail(e.message);
    }
  }

  @Post('payments/confirm')
  async confirm(@Body() dto: ConfirmPaymentDto) {
    try {
      return ok(await this.service.confirmPayment(dto), 'Pago confirmado');
    } catch (e: any) {
      return fail(e.message);
    }
  }

  @Get('wallet/balance')
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
}
