import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class RegisterClientDto {
  @IsString() @IsNotEmpty() @Trim() document: string;
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() @Trim() phone: string;
}

export class TopupDto {
  @IsString() @IsNotEmpty() @Trim() document: string;
  @IsString() @IsNotEmpty() @Trim() phone: string;
  @Type(() => Number) @IsNumber() @IsPositive() amountCents: number;
}

export class InitiatePaymentDto {
  @IsString() @IsNotEmpty() @Trim() document: string;
  @IsString() @IsNotEmpty() @Trim() phone: string;
  @Type(() => Number) @IsNumber() @IsPositive() amountCents: number;
}

export class ConfirmPaymentDto {
  @IsString() @IsNotEmpty() sessionId: string;
  @IsString() @Length(6, 6) token6: string;
}
