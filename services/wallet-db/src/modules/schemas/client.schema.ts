import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClientDocument = HydratedDocument<Client>;

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true, unique: true })
  document: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, default: 0 })
  balanceCents: number;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
