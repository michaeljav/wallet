import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentSessionDocument = HydratedDocument<PaymentSession>;

@Schema({ timestamps: true })
export class PaymentSession {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ required: true })
  amountCents: number;

  @Prop({ required: true })
  token6: string;

  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({
    required: true,
    default: 'PENDING',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'],
  })
  status: string;
}

export const PaymentSessionSchema =
  SchemaFactory.createForClass(PaymentSession);
