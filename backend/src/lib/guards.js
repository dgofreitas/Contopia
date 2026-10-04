const { unauthorized, forbidden, notFound } = require('./errors');
const Parent = require('../models/parent');

// Exige um responsável logado (com ou sem uma criança ativa).
function requireParent(req, res, next) {
  if (!req.session) return next(unauthorized());
  if (req.session.role !== 'parent') return next(forbidden('PARENT_ONLY'));
  next();
}

// Exige uma criança ativa: a própria criança logada ou o responsável usando o perfil dela.
function requireChild(req, res, next) {
  if (!req.session) return next(unauthorized());
  if (!req.session.childId) return next(forbidden('CHILD_PROFILE_REQUIRED'));
  next();
}

// Painel do admin: só os responsáveis cujo e-mail está em ADMIN_EMAILS. Para os
// outros a rota responde como se não existisse.
function requireAdmin(adminEmails) {
  return async (req, res, next) => {
    try {
      if (req.session?.role !== 'parent' || adminEmails.length === 0) return next(notFound());
      const parent = await Parent.findById(req.session.parentId, { email: 1 }).lean();
      if (!parent || !adminEmails.includes(parent.email)) return next(notFound());
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireParent, requireChild, requireAdmin };
