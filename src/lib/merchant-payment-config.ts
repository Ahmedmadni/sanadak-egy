/**
 * Never publish sample bank details or treat a contact phone as a payment account.
 * Payment configuration is public UI data; all details require an explicit
 * operator verification flag plus complete values.
 *
 * This is a client-side safety gate, not proof of receiving funds.
 */
export type MerchantPaymentMethod = "bank_transfer" | "vodafone_cash";

export type PaymentChannel = {
  id: MerchantPaymentMethod;
  instructionAr: string;
  instructionEn: string;
};

export type MerchantPaymentSettings = {
  verified?: string;
  vodafoneCashNumber?: string;
  bankNameAr?: string;
  bankNameEn?: string;
  bankBeneficiaryAr?: string;
  bankBeneficiaryEn?: string;
  bankAccountNumber?: string;
};

const DUMMY_BANK_NUMBERS = new Set([
  "1234567890123",
  "1234567890",
  "0000000000000",
]);

function trim(value?: string): string {
  return (value ?? "").trim();
}

function validEgyptMobile(number: string): boolean {
  return /^(?:\+20|0)1[0125][0-9]{8}$/.test(number);
}

function validBankAccount(value: string): boolean {
  // Egyptian domestic account or Egyptian IBAN. This does not replace bank
  // account/beneficiary verification by the operator.
  const normalized = value.replace(/\s+/g, "").toUpperCase();
  return (
    !DUMMY_BANK_NUMBERS.has(normalized) &&
    (/^[0-9]{10,28}$/.test(normalized) || /^EG[0-9]{27}$/.test(normalized)) &&
    !/^(.)\1+$/.test(normalized)
  );
}

/** Safe-by-default: with no verified payment configuration, return no channels. */
export function configuredMerchantPayments(settings: MerchantPaymentSettings): PaymentChannel[] {
  if (trim(settings.verified) !== "true") return [];
  const methods: PaymentChannel[] = [];
  const vodafone = trim(settings.vodafoneCashNumber);
  if (validEgyptMobile(vodafone)) {
    methods.push({
      id: "vodafone_cash",
      instructionAr: `فودافون كاش — رقم السداد المعتمد: ${vodafone}`,
      instructionEn: `Vodafone Cash — verified payment number: ${vodafone}`,
    });
  }
  const bankNameAr = trim(settings.bankNameAr);
  const bankNameEn = trim(settings.bankNameEn);
  const beneficiaryAr = trim(settings.bankBeneficiaryAr);
  const beneficiaryEn = trim(settings.bankBeneficiaryEn);
  const bankAccount = trim(settings.bankAccountNumber);
  if (
    bankNameAr && bankNameEn && beneficiaryAr && beneficiaryEn &&
    validBankAccount(bankAccount)
  ) {
    methods.push({
      id: "bank_transfer",
      instructionAr: `تحويل بنكي إلى: ${bankNameAr} — رقم الحساب: ${bankAccount} — المستفيد: ${beneficiaryAr}`,
      instructionEn: `Bank transfer: ${bankNameEn} — Account: ${bankAccount} — Beneficiary: ${beneficiaryEn}`,
    });
  }
  return methods;
}
