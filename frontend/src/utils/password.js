/** Mirrors the backend rule so users get feedback before a round trip. */
export const PASSWORD_HINT =
  'At least 8 characters, with an uppercase letter, a lowercase letter and a number.';

export const validatePassword = (password) => {
  if (!password || password.length < 8) return PASSWORD_HINT;
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return PASSWORD_HINT;
  }
  return null;
};
