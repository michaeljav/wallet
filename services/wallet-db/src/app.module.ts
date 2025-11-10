import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletModule } from './modules/wallet.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    WalletModule,
  ],
})
export class AppModule {}
