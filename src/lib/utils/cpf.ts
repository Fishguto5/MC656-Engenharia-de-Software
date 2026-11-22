export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value)

  if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) {
    return false
  }

  const calculateDigit = (length: number) => {
    let sum = 0

    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index)
    }

    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  return (
    calculateDigit(9) === Number(cpf[9])
    && calculateDigit(10) === Number(cpf[10])
  )
}

export function formatCpf(value: string) {
  const cpf = onlyDigits(value).slice(0, 11)

  return cpf
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
