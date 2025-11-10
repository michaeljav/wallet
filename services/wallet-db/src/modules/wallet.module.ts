import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from './schemas/client.schema';
import {
  PaymentSession,
  PaymentSessionSchema,
} from './schemas/payment-session.schema';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: PaymentSession.name, schema: PaymentSessionSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
