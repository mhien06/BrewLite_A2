import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { PaymentEvidence, PaymentGateway, PaymentRequest } from '../payments/payment-gateway';

// VNPay dùng giờ Việt Nam, không phụ thuộc múi giờ của máy chạy backend.
export function vnpayDate(date: Date): string {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace(/[-T:]/g, '');
}

export function signVnpay(data: string, secret: string): string {
  return createHmac('sha512', secret).update(data, 'utf8').digest('hex');
}

export function encodeVnpay(parameters: Record<string, string>): string {
  const encode = (value: string) => encodeURIComponent(value).replace(/%20/g, '+');
  return Object.keys(parameters).sort().map(key => `${encode(key)}=${encode(parameters[key])}`).join('&');
}

function validSignature(data: string, signature: string, secret: string): boolean {
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = Buffer.from(signVnpay(data, secret), 'hex');
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

function stringParameters(input: Record<string, unknown>): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    // Từ chối query có khóa lặp (array), object hoặc giá trị quá dài.
    if (typeof value !== 'string' || value.length > 2048) return null;
    result[key] = value;
  }
  return result;
}

const queryResponseFields = [
  'vnp_ResponseId', 'vnp_Command', 'vnp_ResponseCode', 'vnp_Message', 'vnp_TmnCode',
  'vnp_TxnRef', 'vnp_Amount', 'vnp_BankCode', 'vnp_PayDate', 'vnp_TransactionNo',
  'vnp_TransactionType', 'vnp_TransactionStatus', 'vnp_OrderInfo', 'vnp_PromotionCode', 'vnp_PromotionAmount',
];

@Injectable()
export class VnpayGateway implements PaymentGateway {
  private configuration() {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secret = process.env.VNPAY_HASH_SECRET;
    const paymentUrl = process.env.VNPAY_PAYMENT_URL;
    const queryUrl = process.env.VNPAY_QUERY_URL;
    const returnUrl = process.env.VNPAY_RETURN_URL;
    if (!tmnCode || !secret || !paymentUrl || !queryUrl || !returnUrl ||
        !/^[A-Za-z0-9]{8}$/.test(tmnCode) || /^(replace|your|placeholder)/i.test(secret)) {
      throw new ServiceUnavailableException({ code: 'PAYMENT_NOT_CONFIGURED', message: 'VNPay Sandbox A2 is not configured.' });
    }
    try {
      // A2 chỉ sử dụng Sandbox, tránh vô tình gọi môi trường thanh toán thật.
      for (const address of [paymentUrl, queryUrl]) {
        const url = new URL(address);
        if (url.protocol !== 'https:' || url.hostname !== 'sandbox.vnpayment.vn' || url.username || url.password || url.search || url.hash) throw new Error();
      }
      const url = new URL(returnUrl);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error();
    } catch {
      throw new ServiceUnavailableException({ code: 'PAYMENT_NOT_CONFIGURED', message: 'Invalid VNPay Sandbox URLs.' });
    }
    return { tmnCode, secret, paymentUrl, queryUrl, returnUrl };
  }

  createPaymentUrl(request: PaymentRequest): string {
    const config = this.configuration();
    if (!Number.isSafeInteger(request.amount) || request.amount <= 0 || request.amount * 100 > 999_999_999_999) {
      throw new ServiceUnavailableException('Unsupported payment amount.');
    }
    const returnUrl = new URL(config.returnUrl);
    returnUrl.searchParams.set('orderId', String(request.orderId));
    const parameters = {
      vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: config.tmnCode,
      vnp_Amount: String(request.amount * 100), vnp_CurrCode: 'VND',
      vnp_TxnRef: request.transactionRef, vnp_OrderInfo: `Thanh toan don hang ${request.orderId}`,
      vnp_OrderType: 'other', vnp_Locale: 'vn', vnp_ReturnUrl: returnUrl.toString(),
      vnp_IpAddr: isIP(request.ipAddress) ? request.ipAddress : '127.0.0.1',
      vnp_CreateDate: vnpayDate(request.createdAt), vnp_ExpireDate: vnpayDate(request.expiresAt),
    };
    const data = encodeVnpay(parameters);
    return `${config.paymentUrl}?${data}&vnp_SecureHash=${signVnpay(data, config.secret)}`;
  }

  verifyNotification(query: Record<string, unknown>): PaymentEvidence | null {
    const parameters = stringParameters(query);
    if (!parameters) return null;
    const signature = parameters.vnp_SecureHash ?? '';
    delete parameters.vnp_SecureHash;
    delete parameters.vnp_SecureHashType;
    const config = this.configuration();
    if (!validSignature(encodeVnpay(parameters), signature, config.secret)) return null;
    if (parameters.vnp_TmnCode !== config.tmnCode) return null;
    return this.readEvidence(parameters, false);
  }

  async queryTransaction(request: PaymentRequest): Promise<PaymentEvidence | null> {
    const config = this.configuration();
    const ipAddress = process.env.VNPAY_QUERY_IP ?? '127.0.0.1';
    if (!isIP(ipAddress)) return null;
    const parameters: Record<string, string> = {
      vnp_RequestId: randomUUID().replace(/-/g, ''), vnp_Version: '2.1.0', vnp_Command: 'querydr',
      vnp_TmnCode: config.tmnCode, vnp_TxnRef: request.transactionRef,
      vnp_TransactionDate: vnpayDate(request.createdAt), vnp_CreateDate: vnpayDate(new Date()),
      vnp_IpAddr: ipAddress, vnp_OrderInfo: `Truy van don hang ${request.orderId}`,
    };
    // QueryDR ký bằng chuỗi có dấu |, KHÁC với cách ký URL thanh toán.
    parameters.vnp_SecureHash = signVnpay(Object.values(parameters).join('|'), config.secret);
    try {
      const response = await fetch(config.queryUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parameters), signal: AbortSignal.timeout(10_000), redirect: 'error',
      });
      if (!response.ok) return null;
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
      const result = stringParameters(body as Record<string, unknown>);
      if (!result) return null;
      const data = queryResponseFields.map(field => result[field] ?? '').join('|');
      if (!validSignature(data, result.vnp_SecureHash ?? '', config.secret)) return null;
      if (result.vnp_TmnCode !== config.tmnCode || result.vnp_Command !== 'querydr' ||
          result.vnp_ResponseCode !== '00' || result.vnp_TransactionType !== '01' ||
          result.vnp_TxnRef !== request.transactionRef) return null;
      const evidence = this.readEvidence(result, true);
      if (!evidence || evidence.amount !== request.amount) return null;
      return evidence;
    } catch {
      // Timeout, lỗi mạng hoặc JSON sai không đồng nghĩa giao dịch thất bại.
      return null;
    }
  }

  private readEvidence(parameters: Record<string, string>, isQuery: boolean): PaymentEvidence | null {
    if (!/^[A-Za-z0-9]{1,100}$/.test(parameters.vnp_TxnRef ?? '') ||
        !/^\d{1,12}$/.test(parameters.vnp_Amount ?? '') ||
        !/^\d{2}$/.test(parameters.vnp_ResponseCode ?? '') ||
        !/^\d{2}$/.test(parameters.vnp_TransactionStatus ?? '')) return null;
    const amount = Number(parameters.vnp_Amount) / 100;
    if (!Number.isSafeInteger(amount) || amount <= 0) return null;
    const responseCode = parameters.vnp_ResponseCode;
    const transactionStatus = parameters.vnp_TransactionStatus;
    let status: PaymentEvidence['status'] = 'UNKNOWN';
    if (responseCode === '00' && transactionStatus === '00') {
      if (!/^[1-9]\d{0,14}$/.test(parameters.vnp_TransactionNo ?? '') || !/^\d{14}$/.test(parameters.vnp_PayDate ?? '')) return null;
      status = 'SUCCESS';
    } else if (transactionStatus === '02' && (isQuery || ['09', '10', '11', '12', '13', '24', '51', '65', '75', '79', '99'].includes(responseCode))) {
      status = !isQuery && responseCode === '11' ? 'EXPIRED' : 'FAILED';
    }
    // 01 (chưa hoàn tất), 04 (đảo), 07 (nghi ngờ) không cho phép thanh toán lại.
    return {
      transactionRef: parameters.vnp_TxnRef, amount, status, responseCode, transactionStatus,
      transactionNo: parameters.vnp_TransactionNo ?? '', bankCode: parameters.vnp_BankCode ?? '',
      payDate: parameters.vnp_PayDate ?? '',
    };
  }
}
