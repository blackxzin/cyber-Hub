import { describe, it, expect } from 'vitest';
import { isIP, isCVE, normalizeDomain, parseCvss, isEmail } from './validate';

describe('isIP', () => {
  it('aceita IPv4 válidos', () => {
    expect(isIP('8.8.8.8')).toBe(true);
    expect(isIP('192.168.0.1')).toBe(true);
    expect(isIP('255.255.255.255')).toBe(true);
  });
  it('rejeita IPv4 inválidos', () => {
    expect(isIP('999.1.1.1')).toBe(false);
    expect(isIP('8.8.8')).toBe(false);
    expect(isIP('abc')).toBe(false);
    expect(isIP('')).toBe(false);
  });
});

describe('isCVE', () => {
  it('aceita CVEs no formato padrão (case-insensitive)', () => {
    expect(isCVE('CVE-2023-44487')).toBe(true);
    expect(isCVE('cve-2021-1234')).toBe(true);
  });
  it('rejeita strings que não são CVE', () => {
    expect(isCVE('CVE-23-1')).toBe(false);
    expect(isCVE('CVE-2023-44')).toBe(false);
    expect(isCVE('2023-44487')).toBe(false);
  });
});

describe('normalizeDomain', () => {
  it('lowercase, trim e remove trailing dot', () => {
    expect(normalizeDomain('  Example.COM. ')).toBe('example.com');
    expect(normalizeDomain('sub.Example.org')).toBe('sub.example.org');
  });
});

describe('parseCvss', () => {
  it('clampa em [0,10] e aceita string|number|null', () => {
    expect(parseCvss(9.8)).toBe(9.8);
    expect(parseCvss('7.5')).toBe(7.5);
    expect(parseCvss(null)).toBe(null);
    expect(parseCvss('')).toBe(null);
    expect(parseCvss(15)).toBe(10);
    expect(parseCvss(-2)).toBe(0);
    expect(parseCvss('abc')).toBe(null);
  });
});

describe('isEmail', () => {
  it('valida básico', () => {
    expect(isEmail('admin@cyberhub.ai')).toBe(true);
    expect(isEmail('nao-valido')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
  });
});