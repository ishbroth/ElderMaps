// The password behind a hearth number. A hearth number is only four digits, so the real password is NOT the digits: it is a long value only the server can work out
// (an HMAC of the account id and the digits, with a secret that lives in the server's settings). That way nobody can guess four digits straight at the sign-in service:
// every guess has to come through the hearth-sign-in function, which counts wrong tries and locks the account after five.

const hex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hearthPassword(userId: string, digits: string): Promise<string> {
  const secret = Deno.env.get('HEARTH_PW_SECRET');
  if (!secret) throw new Error('HEARTH_PW_SECRET is not set');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return 'h1-' + hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${userId}|${digits}`)));
}
