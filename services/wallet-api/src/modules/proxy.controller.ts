import { Body, Controller, Get, Post, Query, HttpCode } from '@nestjs/common';
import axios from 'axios';

const DB = process.env.WALLET_DB_BASE_URL!;

@Controller()
export class ProxyController {
  @Post('clients/register')
  @HttpCode(200)
  register(@Body() b: any) {
    return axios.post(`${DB}/clients/register`, b).then((r) => r.data);
  }

  @Post('wallet/topup')
  @HttpCode(200)
  topup(@Body() b: any) {
    return axios.post(`${DB}/wallet/topup`, b).then((r) => r.data);
  }

  @Post('payments/initiate')
  @HttpCode(200)
  initiate(@Body() b: any) {
    return axios.post(`${DB}/payments/initiate`, b).then((r) => r.data);
  }

  @Post('payments/confirm')
  @HttpCode(200)
  confirm(@Body() b: any) {
    return axios.post(`${DB}/payments/confirm`, b).then((r) => r.data);
  }

  @Get('wallet/balance')
  @HttpCode(200)
  balance(@Query('document') d: string, @Query('phone') p: string) {
    return axios
      .get(`${DB}/wallet/balance`, { params: { document: d, phone: p } })
      .then((r) => r.data);
  }

  @Get('health')
  @HttpCode(200)
  health() {
    return axios.get(`${DB}/health`).then((r) => r.data);
  }
}
