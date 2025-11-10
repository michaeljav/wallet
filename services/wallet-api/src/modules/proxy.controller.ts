import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import axios from 'axios';

const DB = process.env.WALLET_DB_BASE_URL!;

@Controller()
export class ProxyController {
  @Post('clients/register')
  register(@Body() b: any) {
    return axios.post(`${DB}/clients/register`, b).then((r) => r.data);
  }

  @Post('wallet/topup')
  topup(@Body() b: any) {
    return axios.post(`${DB}/wallet/topup`, b).then((r) => r.data);
  }

  @Post('payments/initiate')
  initiate(@Body() b: any) {
    return axios.post(`${DB}/payments/initiate`, b).then((r) => r.data);
  }

  @Post('payments/confirm')
  confirm(@Body() b: any) {
    return axios.post(`${DB}/payments/confirm`, b).then((r) => r.data);
  }

  @Get('wallet/balance')
  balance(@Query('document') d: string, @Query('phone') p: string) {
    return axios
      .get(`${DB}/wallet/balance`, { params: { document: d, phone: p } })
      .then((r) => r.data);
  }
}
