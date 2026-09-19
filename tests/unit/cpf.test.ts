import { describe, expect, it } from "vitest";
import { isValidCpf } from "@/app/sign-up/page";

describe("isValidCpf", () => {
  it("aceita CPF válido com e sem pontuação", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it.each([
    "529.982.247-26",
    "123",
    "000.000.000-00",
    "abcdefghijk",
    "529.982.247",
  ])("rejeita CPF inválido: %s", (cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });
});
