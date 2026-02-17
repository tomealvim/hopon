import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Valida se o número de telefone é válido usando libphonenumber-js
 * Aceita números internacionais no formato E.164 (ex: +351912345678)
 * 
 * A validação verifica:
 * - Formato internacional válido
 * - Comprimento correto baseado no código de país
 * - Números possíveis (não aceita números impossíveis)
 * 
 * A validação final será feita via OTP/SMS quando o utilizador verificar o telefone
 */
export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Se o valor for undefined ou null e o campo for opcional, aceitar
          if (value === undefined || value === null) {
            return true;
          }

          // Deve ser string
          if (typeof value !== 'string') {
            return false;
          }

          // Deve começar com +
          if (!value.startsWith('+')) {
            return false;
          }

          // Validar usando libphonenumber-js
          try {
            // Verificar se é um número válido (aceita qualquer país)
            if (!isValidPhoneNumber(value)) {
              return false;
            }

            // Tentar parsear para verificar formato
            const phoneNumber = parsePhoneNumber(value);
            
            // Verificar se tem número nacional válido
            if (!phoneNumber.isValid()) {
              return false;
            }

            return true;
          } catch (error) {
            // Se houver erro ao parsear, número inválido
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser um número de telefone internacional válido (ex: +351912345678)`;
        },
      },
    });
  };
}

