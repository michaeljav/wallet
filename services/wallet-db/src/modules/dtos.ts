import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';

export class RegisterClientDto {
  @IsString() @IsNotEmpty() document: string;
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() phone: string;
}

export class TopupDto {
  @IsString() @IsNotEmpty() document: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsNumber() @IsPositive() amountCents: number;
}

export class InitiatePaymentDto {
  @IsString() @IsNotEmpty() document: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsNumber() @IsPositive() amountCents: number;
}

export class ConfirmPaymentDto {
  @IsString() @IsNotEmpty() sessionId: string;
  @IsString() @Length(6, 6) token6: string;
}
