// test-data.js — Shared E2E test data for STORY-061
// Central repository for test credentials, form data, and edge cases.
// All E2E specs import from here to keep test data consistent.

export const testParentEmail = 'test-parent-061@example.com';
export const testParentPassword = 'test1234';
export const testChildName = 'Julia';
export const invalidEmail = 'not-an-email';
export const shortPassword = 'abc';

export const validParentRegistration = {
  email: testParentEmail,
  password: testParentPassword,
  ageConsent: true,
  childFirstName: testChildName,
};

export const duplicateParentRegistration = {
  email: testParentEmail,
  password: testParentPassword,
  ageConsent: true,
  childFirstName: testChildName,
};

export const invalidEmailRegistration = {
  email: invalidEmail,
  password: testParentPassword,
  ageConsent: true,
  childFirstName: testChildName,
};

export const shortPasswordRegistration = {
  email: 'another-parent@example.com',
  password: shortPassword,
  ageConsent: true,
  childFirstName: testChildName,
};

export const noConsentRegistration = {
  email: 'no-consent-parent@example.com',
  password: testParentPassword,
  ageConsent: false,
  childFirstName: testChildName,
};

export const validLogin = {
  email: testParentEmail,
  password: testParentPassword,
};

export const invalidPasswordLogin = {
  email: testParentEmail,
  password: 'wrongpassword123',
};

export const nonExistentLogin = {
  email: 'nobody@example.com',
  password: testParentPassword,
};

export const rateLimitEmail = 'ratelimit-test@example.com';