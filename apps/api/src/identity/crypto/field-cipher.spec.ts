import { FieldCipher } from './field-cipher';

describe('FieldCipher (AES-256-GCM)', () => {
  it('roundtrip preserva o valor', () => {
    const cipher = new FieldCipher();
    const payload = 'edata = CPF/TOTP qualquer 12345678900';
    const encrypted = cipher.encrypt(payload);

    expect(encrypted.startsWith('v1.')).toBe(true);
    expect(cipher.decrypt(encrypted)).toBe(payload);
  });

  it('payload adulterado é rejeitado (auth tag GCM)', () => {
    const cipher = new FieldCipher();
    const encrypted = cipher.encrypt('segredo');
    const parts = encrypted.split('.');

    // Corrige os 2 primeiros chars do ciphertext: posições iniciais do
    // base64 são 100% significativas (o último char pode conter bits de
    // padding — flip ali pode decodificar IGUAL e falhar o teste)
    const tampered = [parts[0], parts[1], parts[2], `${parts[3]!.slice(0, 2) === 'zz' ? 'yy' : 'zz'}${parts[3]!.slice(2)}`].join('.') as string;
    expect(tampered).not.toBe(encrypted);

    expect(() => cipher.decrypt(tampered!)).toThrow(/autenticidade|corrompido|desconhecido|Falha/i);
  });

  it('formato desconhecido é rejeitado sem vazar conteúdo', () => {
    const cipher = new FieldCipher();
    expect(() => cipher.decrypt('nonsense')).toThrow('Formato de payload desconhecido');
  });

  it('chaves distintas não destravam o payload', () => {
    const chaveA = new FieldCipher();
    // segunda instância sem env = nova chave efêmera independente
    const chaveB = new FieldCipher();
    const encrypted = chaveA.encrypt('cruz-e');

    expect(() => chaveB.decrypt(encrypted)).toThrow();
  });

  it('env com hex inválido falha rápido (não inicia com chave fraca)', () => {
    process.env.IDENTITY_FIELD_KEY = 'curta';
    expect(() => new FieldCipher()).toThrow(/IDENTITY_FIELD_KEY inválida/);
    delete process.env.IDENTITY_FIELD_KEY;
  });

  it('env com hex válido carrega a chave explicitamente', () => {
    const hex = 'a'.repeat(64);
    process.env.IDENTITY_FIELD_KEY = hex;
    const explicitly = new FieldCipher();
    const cipher = new FieldCipher(); // mesma env → mesma chave
    const encrypted = explicitly.encrypt('determinismo');
    expect(cipher.decrypt(encrypted)).toBe('determinismo');
    expect(explicitly.isEphemeralKey).toBe(false);
    delete process.env.IDENTITY_FIELD_KEY;
  });
});
