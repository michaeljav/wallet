import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { Model, Types } from 'mongoose';
import {
  RegisterClientDto,
  TopupDto,
  InitiatePaymentDto,
  ConfirmPaymentDto,
} from './dtos';
import {
  PaymentSession,
  PaymentSessionDocument,
} from './schemas/payment-session.schema';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(PaymentSession.name)
    private sessionModel: Model<PaymentSessionDocument>,
  ) {}

  /**
   * Crea un transporte de correo dinámico según las variables de entorno
   * - MAIL_TRANSPORT=ethereal  → correo temporal de prueba
   * - MAIL_TRANSPORT=smtp      → usa MailHog local
   */
  private async createTransport() {
    if (process.env.MAIL_TRANSPORT === 'ethereal') {
      const acc = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: acc.user, pass: acc.pass },
      });
      return { transporter, previewUrl: nodemailer.getTestMessageUrl };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAILHOG_HOST || '127.0.0.1',
      port: Number(process.env.MAILHOG_PORT || 1025),
      secure: false,
    });
    return { transporter, previewUrl: () => null };
  }

  /** =======================
   *  Registrar un nuevo cliente
   *  ======================= */
  async registerClient(dto: RegisterClientDto) {
    const exists = await this.clientModel.findOne({
      $or: [{ document: dto.document }, { email: dto.email }],
    });
    if (exists) throw new Error('Client already exists');

    const created = await this.clientModel.create({
      ...dto,
      balanceCents: 0,
    });

    return { success: true, id: created._id.toString() };
  }

  /** =======================
   *  Recargar saldo
   *  ======================= */
  async topup(dto: TopupDto) {
    const client = await this.findByDocumentPhone(dto.document, dto.phone);
    if (!client) throw new Error('Client not found / mismatch');

    client.balanceCents += dto.amountCents;
    await client.save();

    return {
      success: true,
      balanceCents: client.balanceCents,
      message: 'Top-up successful',
    };
  }

  /** =======================
   *  Iniciar pago
   *  ======================= */
  async initiatePayment(dto: InitiatePaymentDto) {
    const client = await this.findByDocumentPhone(dto.document, dto.phone);
    if (!client) throw new Error('Client not found / mismatch');
    if (client.balanceCents < dto.amountCents)
      throw new Error('Insufficient funds');

    const token6 = String(Math.floor(100000 + Math.random() * 900000));
    const sessionId = crypto.randomUUID();

    await this.sessionModel.create({
      clientId: new Types.ObjectId(client._id),
      amountCents: dto.amountCents,
      token6,
      sessionId,
      status: 'PENDING',
    });

    const { transporter, previewUrl } = await this.createTransport();
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@wallet.local',
      to: client.email,
      subject: 'Token de confirmación de pago',
      text: `Tu token de confirmación es: ${token6}`,
    });

    const preview = previewUrl(info);
    if (preview) console.log('📧 Email Preview URL:', preview);

    return {
      success: true,
      sessionId,
      message: 'Token enviado por email',
    };
  }

  /** =======================
   *  Confirmar pago
   *  ======================= */
  async confirmPayment(dto: ConfirmPaymentDto) {
    const session = await this.sessionModel.findOne({
      sessionId: dto.sessionId,
    });
    if (!session) throw new Error('Session not found');
    if (session.status !== 'PENDING') throw new Error('Invalid session state');
    if (session.token6 !== dto.token6) throw new Error('Invalid token');

    const client = await this.clientModel.findById(session.clientId);
    if (!client) throw new Error('Client missing');

    if (client.balanceCents < session.amountCents) {
      session.status = 'CANCELLED';
      await session.save();
      throw new Error('Insufficient funds at confirmation');
    }

    client.balanceCents -= session.amountCents;
    await client.save();

    session.status = 'CONFIRMED';
    await session.save();

    return {
      success: true,
      balanceCents: client.balanceCents,
      message: 'Payment confirmed successfully',
    };
  }

  /** =======================
   *  Consultar saldo
   *  ======================= */
  async balance(document: string, phone: string) {
    const client = await this.findByDocumentPhone(document, phone);
    if (!client) throw new Error('Client not found / mismatch');
    return {
      success: true,
      balanceCents: client.balanceCents,
    };
  }

  /** =======================
   *  Buscar cliente
   *  ======================= */
  private async findByDocumentPhone(document: string, phone: string) {
    return this.clientModel.findOne({ document, phone });
  }
}
