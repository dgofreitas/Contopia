const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const Parent = require('../../models/parent');
const Child = require('../../models/child');
const { PICTURE_PASSWORD_LENGTH, PICTURES, THEMES } = require('../../lib/constants');
const { wrap, parse, badRequest, unauthorized, notFound, conflict, tooMany, forbidden } = require('../../lib/errors');
const { requireParent } = require('../../lib/guards');

const BCRYPT_COST = 12;
const CHILD_MAX_FAILURES = 5;
const CHILD_LOCK_SECONDS = 15 * 60;
// Código de família errado: depois de tantas tentativas, o aparelho espera um pouco.
// Assim ninguém fica chutando códigos fáceis para achar as crianças de outra família.
const LOOKUP_MAX_FAILURES = 20;
const LOOKUP_WINDOW_SECONDS = 15 * 60;

// Sem 0/O e 1/I/L, que as crianças confundem ao digitar.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function newFamilyCode() {
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

// Código escolhido pelo responsável: letras e números, com pelo menos um de cada,
// para não ser só o sobrenome.
const familyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{6,20}$/)
  .refine((code) => /[0-9]/.test(code) && /[A-Za-z]/.test(code), 'letras e números')
  .transform((code) => code.toUpperCase());

// Nome público: minúsculas, números, ponto, hífen e sublinhado, começando por letra ou número.
const familyNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,29}$/);

const pictureSchema = z
  .array(z.number().int().min(0).max(PICTURES.length - 1))
  .length(PICTURE_PASSWORD_LENGTH);

const pictureKey = (picture) => picture.join('-');

// Senha normal da criança: curta o bastante para ela lembrar.
const textPasswordSchema = z.string().min(4).max(64);

function loginMethods(child) {
  const methods = [];
  if (child.picturePasswordHash) methods.push('picture');
  if (child.textPasswordHash) methods.push('text');
  return methods;
}

function publicParent(parent) {
  return { id: String(parent._id), email: parent.email, familyCode: parent.familyCode, familyName: parent.familyName || null };
}

function publicChild(child) {
  return { id: String(child._id), nickname: child.nickname, avatar: child.avatar, theme: child.theme, methods: loginMethods(child) };
}

function createAuthRouter({ sessions, redis }) {
  const router = express.Router();

  const lookupKey = (req) => `lock:lookup:${req.ip}`;
  const checkLookups = async (req) => {
    if ((Number(await redis.get(lookupKey(req))) || 0) >= LOOKUP_MAX_FAILURES) throw tooMany('TOO_MANY_TRIES');
  };
  const failLookup = async (req) => {
    const count = await redis.incr(lookupKey(req));
    if (count === 1) await redis.expire(lookupKey(req), LOOKUP_WINDOW_SECONDS);
  };

  router.post(
    '/register',
    wrap(async (req, res) => {
      const body = parse(
        z.object({
          email: z.string().email().max(200),
          password: z.string().min(8).max(200),
          consent: z.literal(true),
        }),
        req.body,
      );

      if (await Parent.exists({ email: body.email.toLowerCase() })) throw conflict('EMAIL_TAKEN');

      let parent;
      for (let attempt = 0; attempt < 5 && !parent; attempt += 1) {
        try {
          parent = await Parent.create({
            email: body.email,
            passwordHash: await bcrypt.hash(body.password, BCRYPT_COST),
            consentAt: new Date(),
            familyCode: newFamilyCode(),
          });
        } catch (err) {
          // Colisão de código da família: tenta outro. E-mail duplicado em corrida: 409.
          if (err.code !== 11000) throw err;
          if (err.keyPattern?.email) throw conflict('EMAIL_TAKEN');
        }
      }
      if (!parent) throw new Error('Não foi possível gerar um código de família');

      await sessions.create(res, { role: 'parent', parentId: String(parent._id), childId: null });
      res.status(201).json({ parent: publicParent(parent), child: null });
    }),
  );

  router.post(
    '/login',
    wrap(async (req, res) => {
      const body = parse(z.object({ email: z.string().email(), password: z.string().min(1) }), req.body);
      const parent = await Parent.findOne({ email: body.email.toLowerCase() });
      // Compara mesmo sem usuário para não revelar pelo tempo de resposta se o e-mail existe.
      const ok = await bcrypt.compare(body.password, parent?.passwordHash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
      if (!parent || !ok) throw unauthorized('INVALID_CREDENTIALS');

      await sessions.destroy(req, res);
      await sessions.create(res, { role: 'parent', parentId: String(parent._id), childId: null });
      res.json({ parent: publicParent(parent), child: null });
    }),
  );

  router.post(
    '/logout',
    wrap(async (req, res) => {
      await sessions.destroy(req, res);
      res.status(204).end();
    }),
  );

  router.get(
    '/me',
    wrap(async (req, res) => {
      if (!req.session) throw unauthorized();
      const [parent, child] = await Promise.all([
        req.session.role === 'parent' ? Parent.findById(req.session.parentId) : null,
        req.session.childId ? Child.findById(req.session.childId) : null,
      ]);
      if (req.session.role === 'parent' && !parent) throw unauthorized();
      res.json({ role: req.session.role, parent: parent ? publicParent(parent) : null, child: child ? publicChild(child) : null });
    }),
  );

  // Lista os perfis de uma família para a criança escolher o seu na tela de entrada.
  router.get(
    '/family/:code',
    wrap(async (req, res) => {
      await checkLookups(req);
      const code = String(req.params.code).toUpperCase();
      const parent = await Parent.findOne({ familyCode: code });
      if (!parent) {
        await failLookup(req);
        throw notFound('FAMILY_NOT_FOUND');
      }
      const children = await Child.find({ parentId: parent._id }).sort({ createdAt: 1 });
      res.json({
        children: children.map((c) => ({ id: String(c._id), nickname: c.nickname, avatar: c.avatar, methods: loginMethods(c) })),
      });
    }),
  );

  router.post(
    '/child/login',
    wrap(async (req, res) => {
      const body = parse(
        z
          .object({
            familyCode: z.string().min(4).max(20),
            childId: z.string().regex(/^[a-f0-9]{24}$/),
            picture: pictureSchema.optional(),
            password: z.string().min(1).max(64).optional(),
          })
          .refine((b) => (b.picture === undefined) !== (b.password === undefined), 'picture ou password'),
        req.body,
      );

      const lockKey = `lock:child:${body.childId}`;
      const failures = Number(await redis.get(lockKey)) || 0;
      if (failures >= CHILD_MAX_FAILURES) throw tooMany('CHILD_LOCKED');

      await checkLookups(req);
      const parent = await Parent.findOne({ familyCode: body.familyCode.toUpperCase() });
      const child = parent ? await Child.findOne({ _id: body.childId, parentId: parent._id }) : null;
      if (!child) {
        await failLookup(req);
        throw notFound('CHILD_NOT_FOUND');
      }

      const [secret, hash, failCode] = body.picture
        ? [pictureKey(body.picture), child.picturePasswordHash, 'INVALID_PICTURE_PASSWORD']
        : [body.password, child.textPasswordHash, 'INVALID_TEXT_PASSWORD'];
      const ok = hash ? await bcrypt.compare(secret, hash) : false;
      if (!ok) {
        const count = await redis.incr(lockKey);
        if (count === 1) await redis.expire(lockKey, CHILD_LOCK_SECONDS);
        throw unauthorized(failCode);
      }
      await redis.del(lockKey);

      await sessions.destroy(req, res);
      await sessions.create(res, { role: 'child', parentId: String(parent._id), childId: String(child._id) });
      res.json({ role: 'child', parent: null, child: publicChild(child) });
    }),
  );

  // O responsável abre a estante de uma criança sem precisar da senha de figuras.
  router.post(
    '/switch',
    requireParent,
    wrap(async (req, res) => {
      const body = parse(z.object({ childId: z.string().regex(/^[a-f0-9]{24}$/).nullable() }), req.body);
      let child = null;
      if (body.childId) {
        child = await Child.findOne({ _id: body.childId, parentId: req.session.parentId });
        if (!child) throw notFound('CHILD_NOT_FOUND');
      }
      const { id, ...data } = req.session;
      await sessions.update(id, { ...data, childId: child ? String(child._id) : null });
      res.json({ child: child ? publicChild(child) : null });
    }),
  );

  router.patch(
    '/me/theme',
    wrap(async (req, res) => {
      if (!req.session?.childId) throw forbidden('CHILD_PROFILE_REQUIRED');
      const body = parse(z.object({ theme: z.enum(THEMES) }), req.body);
      const child = await Child.findByIdAndUpdate(req.session.childId, { theme: body.theme }, { new: true });
      if (!child) throw badRequest('CHILD_NOT_FOUND');
      res.json({ child: publicChild(child) });
    }),
  );

  // Troca o código de entrada: por um escolhido ou, sem code, por um novo aleatório.
  // Quem já está dentro continua; na próxima entrada as crianças usam o código novo.
  router.patch(
    '/me/family-code',
    requireParent,
    wrap(async (req, res) => {
      const body = parse(z.object({ code: z.string().optional() }), req.body);
      const parent = await Parent.findById(req.session.parentId);
      if (body.code !== undefined) {
        const code = parse(familyCodeSchema, body.code);
        // O nome é público; se o código fosse igual, ele deixaria de ser segredo.
        if (parent.familyName && code.toLowerCase() === parent.familyName) throw badRequest('FAMILY_CODE_IS_NAME');
        if (code !== parent.familyCode && (await Parent.exists({ familyCode: code }))) throw conflict('FAMILY_CODE_TAKEN');
        parent.familyCode = code;
      } else {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const code = newFamilyCode();
          if (!(await Parent.exists({ familyCode: code }))) {
            parent.familyCode = code;
            break;
          }
        }
      }
      try {
        await parent.save();
      } catch (err) {
        if (err.code === 11000) throw conflict('FAMILY_CODE_TAKEN');
        throw err;
      }
      res.json({ parent: publicParent(parent) });
    }),
  );

  // Define, troca ou (com name: null) tira o nome público da família.
  router.patch(
    '/me/family-name',
    requireParent,
    wrap(async (req, res) => {
      const body = parse(z.object({ name: familyNameSchema.nullable() }), req.body);
      const parent = await Parent.findById(req.session.parentId);
      if (body.name === null) {
        parent.familyName = undefined;
      } else {
        if (body.name === parent.familyCode.toLowerCase()) throw badRequest('FAMILY_CODE_IS_NAME');
        if (body.name !== parent.familyName && (await Parent.exists({ familyName: body.name }))) throw conflict('FAMILY_NAME_TAKEN');
        parent.familyName = body.name;
      }
      try {
        await parent.save();
      } catch (err) {
        if (err.code === 11000) throw conflict('FAMILY_NAME_TAKEN');
        throw err;
      }
      res.json({ parent: publicParent(parent) });
    }),
  );

  return router;
}

module.exports = { createAuthRouter, pictureSchema, pictureKey, textPasswordSchema, publicChild, BCRYPT_COST };
