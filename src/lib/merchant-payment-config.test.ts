import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { configuredMerchantPayments } from "./merchant-payment-config";

describe("verified merchant payment channels", () => {
  it("defaults to no payment methods without operator verification", () => {
    assert.deepEqual(configuredMerchantPayments({}), []);
    assert.deepEqual(configuredMerchantPayments({
      verified: "false", vodafoneCashNumber: "01120016502",
    }), []);
  });

  it("never uses the sample bank account number even if explicitly entered", () => {
    const methods = configuredMerchantPayments({
      verified: "true", bankNameAr: "بنك مصر", bankNameEn: "Bank",
      bankBeneficiaryAr: "شركة", bankBeneficiaryEn: "Company",
      bankAccountNumber: "1234567890123",
    });
    assert.deepEqual(methods, []);
  });

  it("accepts an operator-verified Egyptian Vodafone Cash number", () => {
    const methods = configuredMerchantPayments({
      verified: "true", vodafoneCashNumber: "01012345678",
    });
    assert.equal(methods.length, 1);
    assert.equal(methods[0].id, "vodafone_cash");
    assert.match(methods[0].instructionAr, /01012345678/);
    assert.match(methods[0].instructionEn, /01012345678/);
  });

  it("does not accept invalid phone numbers or missing bank beneficiary details", () => {
    assert.deepEqual(configuredMerchantPayments({
      verified: "true", vodafoneCashNumber: "1234",
      bankAccountNumber: "987654321098", bankNameEn: "Bank",
    }), []);
  });

  it("requires complete bilingual, nonplaceholder bank recipient details", () => {
    const methods = configuredMerchantPayments({
      verified: "true", bankAccountNumber: "987654321098",
      bankNameAr: "البنك", bankNameEn: "Bank",
      bankBeneficiaryAr: "المستفيد", bankBeneficiaryEn: "Beneficiary",
    });
    assert.equal(methods.length, 1);
    assert.equal(methods[0].id, "bank_transfer");
    assert.match(methods[0].instructionAr, /987654321098/);
  });

  it("removes invalid placeholders without removing a separately verified channel", () => {
    const methods = configuredMerchantPayments({
      verified: "true", bankAccountNumber: "0000000000000",
      bankNameAr: "البنك", bankNameEn: "Bank",
      bankBeneficiaryAr: "المستفيد", bankBeneficiaryEn: "Beneficiary",
      vodafoneCashNumber: "+201012345678",
    });
    assert.deepEqual(methods.map((p) => p.id), ["vodafone_cash"]);
  });
});
