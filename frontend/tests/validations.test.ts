import { describe, expect, it } from 'vitest';
import { loginSchema, profileSchema, registerSchema } from '@/lib/validations/auth';
import { LOAN_STEP_FIELDS, isValidExpiry, makeLoanSchema, validateLoanStep, type LoanFormValues } from '@/lib/validations/loan';
import { formatCode, formatDigitGroups } from '@/lib/utils';

const BANK = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';
const CARD = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const valid: LoanFormValues = {
  amount: '5000', currency: 'EUR',
  purposeCode: 'personal', purposeDetails: '', bankId: BANK, demoNumber: 'AB12 CD34 EF56 GH78 IJ90 KL12 MN3', demoFruit: 'Mangue', demoAnimal: 'Iguane', cardTypeId: CARD, otherCardName: '',
  demoColor: '1234', demoDigit: '7', demoYear: '08/26',
};
const errs = (v: unknown) => {
  const r = makeLoanSchema().safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => `${String(i.path[0])}:${i.message}`);
};

describe('inscription', () => {
  const ok = { lastName: 'Dupont', firstName: 'Jean', phone: '+590 690 00 00 00', email: 'Jean@Exemple.com', demoColor: 'Bleu', demoCity: 'Pointe-à-Pitre', password: 'Motdepasse1', terms: 'on' };
  it('accepte une inscription valide et normalise l’e-mail', () => {
    const r = registerSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe('jean@exemple.com');
  });
  it('impose 8 caractères, une lettre et un chiffre', () => {
    const msg = (password: string) => { const r = registerSchema.safeParse({ ...ok, password }); return r.success ? [] : r.error.issues.map((i) => i.message); };
    expect(msg('abc12')).toContain('v.password.min');
    expect(msg('12345678')).toContain('v.password.letter');
    expect(msg('abcdefgh')).toContain('v.password.digit');
    expect(msg('abcdefg1')).toEqual([]);
  });
  it('exige les conditions, un téléphone valide et les champs fictifs', () => {
    expect(registerSchema.safeParse({ ...ok, terms: '' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, phone: 'abc' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, demoCity: '' }).success).toBe(false);
  });
  it('valide la connexion et le profil', () => {
    expect(loginSchema.safeParse({ email: 'pas-un-email', password: 'x' }).success).toBe(false);
    expect(profileSchema.safeParse({ lastName: 'Dupont', firstName: 'Jean', phone: '+590 690 00 00 00', demoColor: '', demoCity: '', demoDigit: '' }).success).toBe(true);
    expect(profileSchema.safeParse({ lastName: 'Dupont', firstName: 'Jean', phone: '+590 690 00 00 00', demoColor: '', demoCity: '', demoDigit: '12' }).success).toBe(false);
  });
});

describe('demande de financement', () => {
  it('accepte une demande valide', () => expect(errs(valid)).toEqual([]));
  it('n\'impose aucune limite de montant (seulement un montant positif)', () => {
    expect(errs({ ...valid, amount: '1' })).toEqual([]);
    expect(errs({ ...valid, amount: '100' })).toEqual([]);
    expect(errs({ ...valid, amount: '999999' })).toEqual([]);
    expect(errs({ ...valid, amount: '250000000' })).toEqual([]);
    expect(errs({ ...valid, amount: '0' })).toContain('amount:v.amount.invalid');
    expect(errs({ ...valid, amount: '1000000000000' })).toContain('amount:v.amount.tooBig');
    expect(errs({ ...valid, amount: '-5' })).toContain('amount:v.amount.invalid');
    expect(errs({ ...valid, amount: 'abc' })).toContain('amount:v.amount.invalid');
  });
  it('exige la précision uniquement pour « Autre »', () => {
    expect(errs({ ...valid, purposeCode: 'other' })).toContain('purposeDetails:v.purposeDetails');
    expect(errs({ ...valid, purposeCode: 'other', purposeDetails: 'Achat de matériel' })).toEqual([]);
    expect(errs({ ...valid, purposeDetails: 'texte' })).toContain('purposeDetails:v.purposeUnexpected');
  });
  it('exige le nom de la banque uniquement pour « Autre banque »', () => {
    expect(errs({ ...valid, bankId: 'other' })).toContain('bankId:v.bank'); // plus d'option « Autre banque »
    expect(errs({ ...valid, bankId: '' })).toContain('bankId:v.bank');
    expect(errs({ ...valid, bankId: 'pas-un-uuid' })).toContain('bankId:v.bank');
  });
  it('valide les champs fictifs', () => {
    expect(errs({ ...valid, demoNumber: '' })).toContain('demoNumber:v.codeLength');
    expect(errs({ ...valid, demoNumber: 'A' })).toEqual([]); // 1 caractère suffit : 27 au plus
    expect(errs({ ...valid, demoNumber: 'AB12 CD34' })).toEqual([]);
    expect(errs({ ...valid, demoNumber: 'AB12 CD34 EF56 GH78 IJ90 KL12 MN3' })).toEqual([]); // 27 : accepté
    expect(errs({ ...valid, demoNumber: 'AB12 CD34 EF56 GH78 IJ90 KL12 MN34' })).toContain('demoNumber:v.codeLength'); // 28 : refusé
    expect(errs({ ...valid, demoNumber: 'AB12-CD34-EF56' })).toContain('demoNumber:v.codeLength');
    expect(errs({ ...valid, demoNumber: 'ab12cd34ef56gh78ij90kl12mn3' })).toEqual([]); // sans espaces / minuscules : accepté puis normalisé
    const parsed = makeLoanSchema().safeParse({ ...valid, demoNumber: 'ab12 cd34ef56 gh78ij90 kl12mn3' });
    expect(parsed.success && parsed.data.demoNumber).toBe('AB12CD34EF56GH78IJ90KL12MN3');
    expect(errs({ ...valid, demoDigit: 'abc' })).toContain('demoDigit:v.number');
    expect(errs({ ...valid, demoColor: '' })).toContain('demoColor:v.colorDigits');
    expect(errs({ ...valid, demoColor: 'Bleu' })).toContain('demoColor:v.colorDigits');
    expect(errs({ ...valid, demoColor: '1234 5678 9012 3456' })).toEqual([]); // les espaces de mise en forme sont acceptés
    expect(errs({ ...valid, demoColor: '1234567890123456' })).toEqual([]);
    expect(errs({ ...valid, demoColor: '1234 5678 9012 3456 7' })).toContain('demoColor:v.colorDigits'); // 17 chiffres
    expect(errs({ ...valid, demoColor: '1234 56a8' })).toContain('demoColor:v.colorDigits');
    const color = makeLoanSchema().safeParse({ ...valid, demoColor: '1234 5678 9012 3456' });
    expect(color.success && color.data.demoColor).toBe('1234567890123456'); // envoyé au serveur sans espaces
    expect(errs({ ...valid, demoDigit: '1234' })).toContain('demoDigit:v.number');
    expect(errs({ ...valid, currency: 'XPF' })).toEqual([]);
    expect(errs({ ...valid, currency: 'GBP' })).toContain('currency:v.currency');
  });
  it('le choix de la carte est obligatoire (plus de « Aucun »)', () => {
    expect(errs({ ...valid, cardTypeId: '' })).toContain('cardTypeId:v.card');
    expect(errs({ ...valid, cardTypeId: 'pas-un-uuid' })).toContain('cardTypeId:v.card');
    expect(errs({ ...valid, cardTypeId: 'other' })).toContain('otherCardName:v.otherCard');
    expect(errs({ ...valid, cardTypeId: 'other', otherCardName: 'Carte locale' })).toEqual([]);
    expect(errs({ ...valid, otherCardName: 'Carte locale' })).toContain('otherCardName:v.otherCardUnexpected');
  });
  it('le formulaire n\u2019a plus de champ « description »', () => {
    expect('description' in valid).toBe(false);
    expect(LOAN_STEP_FIELDS.flat()).not.toContain('description');
  });
  it('3 étapes : 1 = informations + motif + banque, 2 = carte + vérification, 3 = récapitulatif', () => {
    expect(LOAN_STEP_FIELDS).toHaveLength(3);
    expect(LOAN_STEP_FIELDS[0]).toEqual(['amount', 'currency', 'purposeCode', 'purposeDetails', 'bankId', 'demoNumber', 'demoFruit', 'demoAnimal']);
    expect(LOAN_STEP_FIELDS[1]).toEqual(['cardTypeId', 'otherCardName', 'demoColor', 'demoDigit', 'demoYear']);
    expect(LOAN_STEP_FIELDS[2]).toEqual([]);
  });
  it('valide étape par étape', () => {
    // étape 1
    expect(validateLoanStep(0, valid)).toEqual({});
    expect(validateLoanStep(0, { ...valid, amount: '' }).amount).toBeTruthy();
    expect(validateLoanStep(0, { ...valid, purposeCode: '' }).purposeCode).toBeTruthy();
    expect(validateLoanStep(0, { ...valid, purposeCode: 'other' }).purposeDetails).toBe('v.purposeDetails');
    expect(validateLoanStep(0, { ...valid, bankId: '' }).bankId).toBeTruthy();
    expect(validateLoanStep(0, { ...valid, demoNumber: '' }).demoNumber).toBe('v.codeLength');
    expect(validateLoanStep(0, { ...valid, demoFruit: '' }).demoFruit).toBeTruthy();
    expect(validateLoanStep(0, { ...valid, demoAnimal: '' }).demoAnimal).toBeTruthy();
    // étape 2 (les erreurs de l'étape 1 n'y apparaissent pas, et inversement)
    expect(validateLoanStep(1, valid)).toEqual({});
    expect(validateLoanStep(1, { ...valid, cardTypeId: '' }).cardTypeId).toBe('v.card');
    expect(validateLoanStep(1, { ...valid, demoColor: '' }).demoColor).toBe('v.colorDigits');
    expect(validateLoanStep(1, { ...valid, demoDigit: '' }).demoDigit).toBeTruthy();
    expect(validateLoanStep(1, { ...valid, demoYear: '12/2' }).demoYear).toBe('v.year');
    expect(validateLoanStep(1, { ...valid, amount: '' })).toEqual({});
    expect(validateLoanStep(0, { ...valid, cardTypeId: '' })).toEqual({});
    // étape 3 : rien à saisir
    expect(validateLoanStep(2, { ...valid, amount: '', cardTypeId: '' })).toEqual({});
  });
  it('ne contient aucun champ de carte bancaire', () => {
    const keys = Object.keys(valid);
    expect(keys.some((k) => /cvv|iban|cardnumber|expiry|pin/i.test(k))).toBe(false);
  });
});

describe('formatCode', () => {
  it('met en majuscules, ignore les symboles, groupe par 4 et limite à 27', () => {
    expect(formatCode('ab12')).toBe('AB12');
    expect(formatCode('ab123')).toBe('AB12 3');
    expect(formatCode('ab12-cd34 ef56')).toBe('AB12 CD34 EF56');
    expect(formatCode('a'.repeat(40))).toBe([...Array(6).fill('AAAA'), 'AAA'].join(' '));
    expect(formatCode('é!?')).toBe('');
  });
});

describe('formatDigitGroups', () => {
  it('chiffres uniquement, groupes de 4, 16 maximum', () => {
    expect(formatDigitGroups('1234')).toBe('1234');
    expect(formatDigitGroups('12345')).toBe('1234 5');
    expect(formatDigitGroups('1234 5678 9012 3456')).toBe('1234 5678 9012 3456');
    expect(formatDigitGroups('12345678901234567890')).toBe('1234 5678 9012 3456');
    expect(formatDigitGroups('ab12-34 cd5')).toBe('1234 5');
    expect(formatDigitGroups('abc')).toBe('');
  });
});

describe('isValidExpiry', () => {
  it('exige MM/AA complet, mois 01-12, année 2025 à 2100', () => {
    for (const v of ['12/25', '12/29', '01/26', '06/00']) expect(isValidExpiry(v), v).toBe(true);
    for (const v of ['', '1', '12', '12/', '12/2', '13/25', '00/25', '12/24', '1225', '12/259']) expect(isValidExpiry(v), v).toBe(false);
  });
});
