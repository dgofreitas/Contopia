const { unauthorized, forbidden } = require('./errors');

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

module.exports = { requireParent, requireChild };
